# ─── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY . .
RUN npm run build

# Prune dev dependencies
RUN npm prune --production

# ─── Stage 2: Production runner ───────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Required for bcrypt (native bindings)
RUN apk add --no-cache libc6-compat

# Copy only what's needed at runtime
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json

# Create uploads directory
RUN mkdir -p uploads

EXPOSE 3000

# Run migrations then start the server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
