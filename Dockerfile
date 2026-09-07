# Production Dockerfile for Next.js Application on AWS Lightsail
# Multi-stage build with native SQLite (better-sqlite3) support

# Stage 1: Install dependencies
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

# Copy package manifests for monorepo workspace
COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/

# Install dependencies including native build for better-sqlite3
RUN npm ci

# Stage 2: Build the application
FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/frontend/node_modules ./frontend/node_modules
COPY package.json tsconfig.json ./
COPY frontend/ ./frontend/

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
# Optional sub-path prefix baked into the build (e.g. "/carc"); empty = root (prod).
ARG NEXT_BASE_PATH=""
ENV NEXT_BASE_PATH=$NEXT_BASE_PATH

# Build standalone Next.js bundle
RUN npm run build --workspace=frontend

# Stage 3: Production runner
FROM node:22-alpine AS runner
WORKDIR /app

RUN apk add --no-cache libc6-compat sqlite

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1
ENV SQLITE_DATABASE_PATH="/app/data/carc.db"

# Create unprivileged application user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    mkdir -p /app/data && \
    chown -R nextjs:nodejs /app/data

# Copy static assets and standalone bundle
# Next.js standalone in workspaces copies workspace layout
COPY --from=builder /app/frontend/public ./frontend/public
COPY --from=builder /app/frontend/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/frontend/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/frontend/.next/static ./frontend/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/frontend/.next/static ./.next/static
COPY --chown=nextjs:nodejs deployment/scripts/container-entrypoint.sh /usr/local/bin/carc-entrypoint.sh
RUN chmod 755 /usr/local/bin/carc-entrypoint.sh

USER nextjs

EXPOSE 3000

VOLUME ["/app/data"]

# Entrypoint detects standalone server location in root or workspace subfolder
CMD ["/usr/local/bin/carc-entrypoint.sh"]
