# ChuanMen Infrastructure — ECS Fargate + EventBridge

## Architecture Overview

```
                    ┌─────────────┐
                    │   Amplify    │ ← React SPA (frontend)
                    │  (CSR/CDN)  │
                    └──────┬──────┘
                           │ API calls
                    ┌──────▼──────┐
                    │     ALB     │ ← public, HTTP/HTTPS
                    └──────┬──────┘
                           │ :4000
              ┌────────────▼────────────┐
              │   ECS Fargate Service   │ ← chuanmen-web (long-running)
              │    chuanmen-server      │
              │  CMD: prisma migrate    │
              │       + node index.js   │
              └─────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
     ┌────▼────┐    ┌─────▼─────┐   ┌──────▼──────┐
     │ RDS PG  │    │  S3 Media │   │     SES     │
     └─────────┘    └───────────┘   └─────────────┘
          │
     ┌────▼──────────────────────────┐
     │  EventBridge Schedule         │ ← rate(10 minutes)
     │    → ECS RunTask (one-shot)   │
     │    chuanmen-agent             │
     │    CMD: node agentTick.js     │
     └───────────────────────────────┘
```

| Component | Purpose |
|---|---|
| **ECS Service `chuanmen-web`** | Fastify API server (long-running, behind ALB) |
| **ECS Task `chuanmen-agent`** | AI agent worker (one-shot, triggered by EventBridge) |
| **ALB** | Routes traffic to ECS tasks, health-checks `/api/health` |
| **EventBridge Rule** | Schedules agent tick every 10 min |
| **ECR** | Docker image registry (`chuanmen-server`) |
| **Secrets Manager** | Stores `DATABASE_URL`, AWS credentials |
| **CloudWatch Logs** | `/ecs/chuanmen-server` log group |

---

## Prerequisites

1. **AWS CLI** configured with an IAM user/role that can create CloudFormation stacks
2. **Docker** installed locally (for building images)
3. **VPC** with 2 public + 2 private subnets (standard AWS setup)
4. **RDS PostgreSQL** instance accessible from the private subnets
5. **Secrets Manager** secrets created (see below)

### Create Secrets

```bash
# DATABASE_URL
aws secretsmanager create-secret \
  --name chuanmen/DATABASE_URL \
  --secret-string "postgresql://user:pass@host:5432/chuanmen?schema=public"

# AWS credentials for S3/SES (if not using task role)
aws secretsmanager create-secret \
  --name chuanmen/AWS_ACCESS_KEY_ID \
  --secret-string "AKIA..."

aws secretsmanager create-secret \
  --name chuanmen/AWS_SECRET_ACCESS_KEY \
  --secret-string "wJal..."
```

Note the ARNs from each command — you'll need them for the stack parameters.

---

## Deploy — First Time

### 1. Build & push Docker image

```bash
export AWS_ACCOUNT_ID=123456789012
export AWS_REGION=us-east-1

./infra/scripts/build-push.sh
```

This builds `server/Dockerfile`, pushes to ECR `chuanmen-server:<git-sha>` + `:latest`.

### 2. Create CloudFormation stack

```bash
aws cloudformation create-stack \
  --stack-name chuanmen \
  --template-body file://infra/cloudformation.yml \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameters \
    ParameterKey=VpcId,ParameterValue=vpc-xxxxx \
    ParameterKey=PublicSubnet1,ParameterValue=subnet-aaa \
    ParameterKey=PublicSubnet2,ParameterValue=subnet-bbb \
    ParameterKey=PrivateSubnet1,ParameterValue=subnet-ccc \
    ParameterKey=PrivateSubnet2,ParameterValue=subnet-ddd \
    ParameterKey=ImageUri,ParameterValue=123456789012.dkr.ecr.us-east-1.amazonaws.com/chuanmen-server:latest \
    ParameterKey=DatabaseUrlSecretArn,ParameterValue=arn:aws:secretsmanager:us-east-1:123456789012:secret:chuanmen/DATABASE_URL-xxxxxx \
    ParameterKey=AwsAccessKeyIdSecretArn,ParameterValue=arn:aws:secretsmanager:us-east-1:123456789012:secret:chuanmen/AWS_ACCESS_KEY_ID-xxxxxx \
    ParameterKey=AwsSecretAccessKeySecretArn,ParameterValue=arn:aws:secretsmanager:us-east-1:123456789012:secret:chuanmen/AWS_SECRET_ACCESS_KEY-xxxxxx \
    ParameterKey=FrontendOrigin,ParameterValue=https://www.chuanmen.co \
    ParameterKey=S3Bucket,ParameterValue=chuanmen-media \
    ParameterKey=SesFromEmail,ParameterValue=noreply@chuanmen.co
```

Wait for completion:
```bash
aws cloudformation wait stack-create-complete --stack-name chuanmen
```

### 3. Get ALB DNS

```bash
aws cloudformation describe-stacks --stack-name chuanmen \
  --query 'Stacks[0].Outputs[?OutputKey==`AlbDnsName`].OutputValue' \
  --output text
```

Point your API domain (e.g., `api.chuanmen.co`) CNAME to this ALB DNS.

---

## Deploy — Updates

```bash
# Quick deploy: build, push, rolling update
export AWS_ACCOUNT_ID=123456789012
./infra/scripts/deploy.sh

# Or with a specific tag
./infra/scripts/deploy.sh v1.2.3
```

To update stack parameters (e.g., scaling, schedule):
```bash
aws cloudformation update-stack \
  --stack-name chuanmen \
  --template-body file://infra/cloudformation.yml \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameters ParameterKey=DesiredCount,ParameterValue=2
```

---

## HTTPS Setup

1. Request an ACM certificate for your API domain
2. Update the stack with the certificate ARN:

```bash
aws cloudformation update-stack \
  --stack-name chuanmen \
  --template-body file://infra/cloudformation.yml \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameters ParameterKey=CertificateArn,ParameterValue=arn:aws:acm:us-east-1:123456789012:certificate/xxxxx
```

HTTP traffic will automatically redirect to HTTPS.

---

## Monitoring

```bash
# Service status
aws ecs describe-services --cluster chuanmen --services chuanmen-web \
  --query 'services[0].{status:status,running:runningCount,desired:desiredCount}'

# Recent logs
aws logs tail /ecs/chuanmen-server --follow

# Agent logs only
aws logs tail /ecs/chuanmen-server --filter-pattern '"agent"' --follow
```

---

## File Reference

| File | Purpose |
|---|---|
| `infra/cloudformation.yml` | Full CloudFormation stack (ECS, ALB, EventBridge, IAM, SGs) |
| `infra/ecs/taskdef.template.json` | Web server task def (standalone, for CI/CD pipelines) |
| `infra/ecs/taskdef-agent.template.json` | Agent worker task def (standalone, for CI/CD pipelines) |
| `infra/scripts/build-push.sh` | Build Docker image → push to ECR |
| `infra/scripts/deploy.sh` | Full deploy: build + push + rolling ECS update |
| `server/Dockerfile` | Multi-stage Docker build |
| `server/.dockerignore` | Files excluded from Docker context |

---

## RDS Security Group

Make sure the RDS security group allows inbound PostgreSQL (port 5432) from the
ECS security group (`EcsSg`). After stack creation, get the ECS SG ID:

```bash
aws cloudformation describe-stack-resource \
  --stack-name chuanmen \
  --logical-resource-id EcsSg \
  --query 'StackResourceDetail.PhysicalResourceId' --output text
```

Then add it to the RDS SG inbound rules.

---

## NAT Gateway Requirement

Since ECS tasks run in **private subnets** with `AssignPublicIp: DISABLED`, they need
a **NAT Gateway** in each public subnet to reach:
- ECR (pull images)
- Secrets Manager
- CloudWatch Logs
- External APIs

If your VPC doesn't have NAT Gateways, either:
1. Add NAT Gateways (recommended for production)
2. Change `AssignPublicIp: ENABLED` and put tasks in public subnets (simpler, less secure)
3. Use VPC Endpoints for ECR, Secrets Manager, and CloudWatch
