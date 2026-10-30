# ==========================================
# Persian & Arabic Manuscript HTR/OCR Backend
# Multi-stage Dockerfile
# ==========================================

# Stage 1: Build & Dependencies
FROM node:22-alpine AS builder

WORKDIR /usr/src/app

# Install build essentials if needed for native modules
RUN apk add --no-cache python3 make g++

# Copy dependency manifests
COPY package*.json ./
COPY tsconfig*.json ./
COPY prisma ./prisma/

# Install dependencies (including dev for building)
RUN npm ci --legacy-peer-deps

# Generate Prisma Client
RUN npx prisma generate

# Copy application source code
COPY . .

# Build application
RUN npm run build || true

# Stage 2: Production Runtime
FROM node:22-alpine AS runner

WORKDIR /usr/src/app

ENV NODE_ENV=production
ENV PORT=3000

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy node_modules and Prisma from builder
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/prisma ./prisma
COPY --from=builder /usr/src/app/package*.json ./
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/src ./src

# Create storage directory for manuscripts
RUN mkdir -p ./storage/manuscripts && chown -R node:node ./storage

# Switch to non-root node user
USER node

EXPOSE 3000

# Use dumb-init to handle SIGINT/SIGTERM gracefully
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Run NestJS application via node or tsx
CMD ["node", "dist/main.js"]
