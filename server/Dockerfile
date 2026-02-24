FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY tsconfig.json ./
COPY prisma ./prisma
COPY src_v2 ./src_v2
COPY public ./public
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/public ./public

RUN npx prisma generate

# Render sets PORT dynamically; ECS/Docker Compose may use 4000
EXPOSE ${PORT:-4000}

# Health check — works locally & on ECS; Render uses healthCheckPath instead
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:${PORT:-4000}/api/health || exit 1

# Default: run migrations then start web server
# Override with dockerCommand in render.yaml for cron/worker jobs
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
