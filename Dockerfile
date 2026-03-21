FROM node:25.8.1-alpine3.23 AS deps

WORKDIR /app

RUN apk add --no-cache \
    openssl \
    openssl-dev \
    openssl-libs-static \
    curl \
    ffmpeg

RUN npm install -g pnpm@10.32.1

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile


FROM node:25.8.1-alpine3.23 AS builder

WORKDIR /app

RUN apk add --no-cache \
    openssl \
    curl \
    ffmpeg

RUN npm install -g pnpm@10.32.1

COPY --from=deps /app/node_modules ./node_modules

COPY package.json pnpm-lock.yaml ./

COPY . .

# Generate Prisma types with dummy DATABASE_URL (not used, just for generation)
RUN DATABASE_URL="postgresql://dummy:dummy@localhost/dummy" pnpm prisma generate

RUN pnpm run build


FROM node:25.8.1-alpine3.23 AS runner

WORKDIR /app

RUN apk add --no-cache \
    openssl \
    curl \
    ffmpeg \
    tini

RUN npm install -g pnpm@10.32.1

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

COPY --from=builder --chown=nodejs:nodejs /app/.next ./.next
COPY --from=builder --chown=nodejs:nodejs /app/public ./public
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nodejs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nodejs:nodejs /app/src ./src
COPY --from=builder --chown=nodejs:nodejs /app/scheduler ./scheduler
COPY --from=builder --chown=nodejs:nodejs /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder --chown=nodejs:nodejs /app/tsconfig.json ./tsconfig.json


USER nodejs

EXPOSE 3000

ENV HOSTNAME="0.0.0.0"
ENV NODE_ENV="production"

ENTRYPOINT ["/sbin/tini", "--"]

CMD ["pnpm", "run", "prod:start"]