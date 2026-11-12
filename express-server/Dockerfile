# ==============================================================================
# Build Stage
# ==============================================================================
FROM node:26-alpine AS builder

WORKDIR /app

# Install system dependencies needed for native bindings if required
RUN apk add --no-cache libc6-compat

# Copy package manifests
COPY package*.json ./
COPY prisma.config.ts ./
COPY prisma ./prisma/

# Install all dependencies including devDependencies for build
RUN npm ci

# Copy TypeScript configs and source code
COPY tsconfig*.json ./
COPY src ./src/

# Generate Prisma Client & compile TypeScript
RUN npx prisma generate
RUN npm run build

# Prune devDependencies to keep production image minimal
RUN npm prune --omit=dev

# ==============================================================================
# Production Stage
# ==============================================================================
FROM node:26-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=4000

# Security: Run as non-root user
USER node

# Copy production artifacts and pruned node_modules from builder
COPY --chown=node:node --from=builder /app/package*.json ./
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/dist ./dist
COPY --chown=node:node --from=builder /app/src/generated ./src/generated
COPY --chown=node:node --from=builder /app/prisma ./prisma
COPY --chown=node:node --from=builder /app/prisma.config.ts ./prisma.config.ts

# Expose HTTP port
EXPOSE 4000

# Container liveness check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/api/v1/health/live || exit 1

# Start production server
CMD ["node", "dist/server.js"]

