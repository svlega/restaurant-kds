# ── Build stage ────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy only package files first — leverages Docker layer cache
COPY package*.json ./
COPY server/package*.json ./server/
COPY dashboard/package*.json ./dashboard/

RUN npm ci --workspace=dashboard --workspace=server

# Copy source
COPY dashboard/ ./dashboard/
COPY server/ ./server/

# Build the Vue dashboard (outputs to dashboard/dist)
ARG VITE_RESTAURANT_NAME=Restaurant
ENV VITE_RESTAURANT_NAME=$VITE_RESTAURANT_NAME
RUN npm run build --workspace=dashboard

# ── Production stage ────────────────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

# Only install server production deps
COPY package*.json ./
COPY server/package*.json ./server/
RUN npm ci --workspace=server --omit=dev

# Copy server source
COPY server/src ./server/src

# Copy built dashboard into server's public folder so Express can serve it
COPY --from=builder /app/dashboard/dist ./public

# Create data directory for SQLite + orders JSON
RUN mkdir -p data logs

# Non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "server/src/index.js"]
