FROM node:20-alpine AS base

# ─── Build Stage ──────────────────────────────────────────────────────────────
FROM base AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY tsconfig.json ./
COPY src/ ./src/
COPY drizzle.config.ts ./

# Build TypeScript
RUN npx tsc

# ─── Production Stage ─────────────────────────────────────────────────────────
FROM base AS production

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S kulima && \
    adduser -S kulima -u 1001 -G kulima

# Copy built artifacts
COPY --from=builder --chown=kulima:kulima /app/dist ./dist
COPY --from=builder --chown=kulima:kulima /app/node_modules ./node_modules
COPY --from=builder --chown=kulima:kulima /app/package.json ./
COPY --from=builder --chown=kulima:kulima /app/drizzle ./drizzle

# Switch to non-root user
USER kulima

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start server
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
