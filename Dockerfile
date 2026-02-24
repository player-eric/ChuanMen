# Combined SSR frontend + API backend Dockerfile
# Builds both the Vite SSR frontend and the Fastify API server
# into a single container. ssr-server.mjs auto-starts the API as a child process.

FROM node:22-alpine AS base
RUN corepack enable

# ── Stage 1: Build the Fastify API server ──────────────────
FROM base AS api-build
WORKDIR /app/server

COPY server/package.json server/package-lock.json* ./
RUN npm ci

COPY server/tsconfig.json ./
COPY server/prisma ./prisma
COPY server/src_v2 ./src_v2
RUN npx prisma generate && npm run build

# ── Stage 2: Build the Vite SSR frontend ──────────────────
FROM base AS frontend-build
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY tsconfig.json ./
COPY vite.config.ts ./
COPY tailwind.config.ts ./
COPY postcss.config.cjs ./
COPY index.html ./
COPY src ./src
RUN npm run build

# ── Stage 3: Production runtime ──────────────────────────
FROM base AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Root-level SSR deps
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# API server production deps
COPY server/package.json server/package-lock.json* ./server/
RUN cd server && npm ci --omit=dev

# Copy built artifacts
COPY --from=frontend-build /app/dist ./dist
COPY --from=api-build /app/server/dist ./server/dist
COPY --from=api-build /app/server/prisma ./server/prisma
COPY --from=api-build /app/server/node_modules/.prisma ./server/node_modules/.prisma

# Regenerate Prisma client for runtime node_modules
RUN cd server && npx prisma generate

# Copy the SSR server entry point
COPY ssr-server.mjs ./

# Render provides PORT dynamically
EXPOSE ${PORT:-4173}

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:${PORT:-4173}/api/health || exit 1

CMD ["sh", "-c", "cd server && npx prisma migrate deploy && cd .. && node ssr-server.mjs"]
