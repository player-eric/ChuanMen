# Deploying ChuanMen on Render

Architecture: **Render Web Service** (Docker) + **Render PostgreSQL** + **AWS S3** (media) + **Resend** (email)

```
┌─────────────┐    ┌───────────────────┐    ┌────────────────┐
│  Amplify     │───▶│  Render Web       │───▶│ Render Postgres│
│  (Frontend)  │    │  chuanmen-server  │    │ chuanmen-db    │
└─────────────┘    └────────┬──────────┘    └────────────────┘
                            │
                   ┌────────┴──────────┐
                   │                   │
              ┌────▼────┐       ┌──────▼──────┐
              │ AWS S3  │       │  Resend     │
              │ (media) │       │  (email)    │
              └─────────┘       └─────────────┘

              ┌──────────────────┐
              │ Render Cron Job  │ (every 10 min)
              │ chuanmen-agent   │───▶ same DB
              └──────────────────┘
```

---

## Prerequisites

- A [Render](https://render.com) account
- AWS account with S3 bucket + IAM credentials
- (Optional) [Resend](https://resend.com) account with verified domain for transactional email

---

## Option A: One-Click Blueprint Deploy

1. Push this repo to GitHub/GitLab
2. Go to **Render Dashboard → New → Blueprint**
3. Connect the repo and select branch
4. Render reads `render.yaml` and creates:
   - `chuanmen-db` — PostgreSQL 16 database
   - `chuanmen-server` — Web service (Docker)
   - `chuanmen-agent` — Cron job (every 10 min)
5. Fill in the `sync: false` env vars when prompted:
   - `AWS_REGION` — e.g. `us-east-1`
   - `AWS_ACCESS_KEY_ID` — IAM access key
   - `AWS_SECRET_ACCESS_KEY` — IAM secret key
   - `AWS_S3_BUCKET` — e.g. `chuanmen-media-prod`
   - `RESEND_API_KEY` — Resend API key
   - `RESEND_FROM_EMAIL` — e.g. `noreply@chuanmen.co`
6. Click **Apply** — Render builds the Docker image, provisions Postgres, and deploys

---

## Option B: Manual Setup

### 1. Create PostgreSQL Database

- Render Dashboard → **New → PostgreSQL**
- Name: `chuanmen-db`
- Database: `chuanmen`, User: `chuanmen`
- PostgreSQL version: **16**
- Plan: **Starter** (or Standard for production)
- Region: **Oregon** (closest to your users)
- Copy the **Internal Database URL** — it looks like:
  ```
  postgresql://chuanmen:xxxxx@dpg-xxxxx-a.oregon-postgres.render.com/chuanmen
  ```

### 2. Create Web Service

- Render Dashboard → **New → Web Service**
- Connect your GitHub/GitLab repo
- Settings:
  - **Name**: `chuanmen-server`
  - **Region**: Same as your database
  - **Runtime**: **Docker**
  - **Dockerfile Path**: `./server/Dockerfile`
  - **Docker Context**: `./server`
  - **Health Check Path**: `/api/health`
- Environment variables:

| Key | Value |
|-----|-------|
| `APP_ENV` | `prod` |
| `NODE_ENV` | `production` |
| `TRUST_PROXY` | `true` |
| `FRONTEND_ORIGIN` | `https://www.chuanmen.co` |
| `DATABASE_URL` | *(Internal Database URL from step 1)* |
| `AWS_REGION` | `us-east-1` |
| `AWS_ACCESS_KEY_ID` | *(your IAM access key)* |
| `AWS_SECRET_ACCESS_KEY` | *(your IAM secret key)* |
| `AWS_S3_BUCKET` | `chuanmen-media-prod` |
| `RESEND_API_KEY` | *(your Resend API key)* |
| `RESEND_FROM_EMAIL` | `noreply@chuanmen.co` |

> **Tip**: Mark `AWS_SECRET_ACCESS_KEY`, `RESEND_API_KEY`, and `DATABASE_URL` as **Secret** in Render UI.

### 3. Create Cron Job (Agent Worker)

- Render Dashboard → **New → Cron Job**
- Connect same repo
- Settings:
  - **Name**: `chuanmen-agent`
  - **Runtime**: Docker
  - **Dockerfile Path**: `./server/Dockerfile`
  - **Docker Context**: `./server`
  - **Command**: `node dist/workers/agentTick.js`
  - **Schedule**: `*/10 * * * *`
- Environment variables: Same as web service (copy from env group)

---

## 3. Create S3 Bucket (AWS)

```bash
aws s3 mb s3://chuanmen-media-prod --region us-east-1
```

Give the IAM user `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject` permissions on that bucket.

For public image access, add a bucket policy:
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "PublicRead",
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::chuanmen-media-prod/*"
  }]
}
```

---

## Database

The project uses Render PostgreSQL. The `DATABASE_URL` is automatically linked via `render.yaml`'s `fromDatabase` reference.

For local development against the Render dev database, switch with:
```bash
npm run db:dev
```

To switch back to local Docker Postgres:
```bash
npm run db:local
```

---

## Verify Deployment

Once the web service is live:

```bash
# Health check
curl https://chuanmen-server.onrender.com/api/health

# Should return:
# {"service":"chuanmen-server-fastify","status":"ok","db":"ok","timestamp":"..."}
```

Check logs in Render Dashboard → your service → **Logs** tab.

---

## Custom Domain + HTTPS

Render provides free TLS certificates:

1. Render Dashboard → `chuanmen-server` → **Settings → Custom Domains**
2. Add `api.chuanmen.co`
3. Add a CNAME record: `api.chuanmen.co` → `chuanmen-server.onrender.com`
4. Render auto-provisions a Let's Encrypt certificate
5. Update `FRONTEND_ORIGIN` if your frontend domain changed

---

## Subsequent Deploys

Push to your connected branch — Render auto-builds and deploys with zero-downtime rolling updates.

Manual deploy: Render Dashboard → service → **Manual Deploy → Deploy latest commit**

---

## Environment Variable Groups

For sharing env vars between the web service and cron job:

1. Render Dashboard → **Env Groups → New Env Group**
2. Name: `chuanmen-shared`
3. Add all AWS vars (`AWS_REGION`, `AWS_ACCESS_KEY_ID`, etc.)
4. Link the env group to both `chuanmen-server` and `chuanmen-agent`

---

## Cost Estimate (Render)

| Resource | Plan | Monthly Cost |
|----------|------|-------------|
| Web Service | Starter (512 MB) | $7 |
| Cron Job | Starter | $7 (billed per run time) |
| PostgreSQL | Starter (1 GB) | Free 90 days, then $7 |
| **Total** | | **~$14–21/mo** |

Upgrade to **Standard** plans for production workloads with more RAM and auto-scaling.
