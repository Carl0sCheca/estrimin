ARG NODE_VERSION=26.12.1-alpine3.24
ARG PNPM_VERSION=12.16.1

FROM node:${NODE_VERSION} AS deps

WORKDIR /app

RUN apk add --no-cache \
    openssl \
    openssl-dev \
    openssl-libs-static \
    curl \
    ffmpeg

RUN npm install -g pnpm@${PNPM_VERSION}

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile


FROM node:${NODE_VERSION} AS builder

WORKDIR /app

RUN apk add --no-cache \
    openssl \
    curl \
    ffmpeg

RUN npm install -g pnpm@${PNPM_VERSION}

COPY --from=deps /app/node_modules ./node_modules

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

COPY . .

# Generate Prisma types with dummy DATABASE_URL (not used, just for generation)
RUN DATABASE_URL="postgresql://dummy:dummy@localhost/dummy" pnpm prisma generate

RUN pnpm build
RUN pnpm build:scheduler


FROM node:${NODE_VERSION} AS runner

WORKDIR /app

RUN apk add --no-cache \
    openssl \
    curl \
    ffmpeg \
    tini \
    tar \
    mesa-va-gallium \
    libva-utils \
    mesa-dri-gallium

RUN npm install -g pnpm@${PNPM_VERSION}

RUN addgroup -g 1001 -S nodejs && \
    adduser -S -D -H -u 1001 -G nodejs nodejs && \
    addgroup -g 107 -S render && \
    addgroup nodejs video && \
    addgroup nodejs render

COPY --from=builder --chown=nodejs:nodejs /app/.next ./.next
COPY --from=builder --chown=nodejs:nodejs /app/public ./public
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nodejs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nodejs:nodejs /app/src ./src
COPY --from=builder --chown=nodejs:nodejs /app/scheduler ./scheduler
COPY --from=builder --chown=nodejs:nodejs /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder --chown=nodejs:nodejs /app/tsconfig.json ./tsconfig.json
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist


ENV PNPM_HOME="/home/nodejs/.local/share/pnpm"
ENV PATH="${PNPM_HOME}:${PATH}"
ENV HOSTNAME="0.0.0.0"
ENV NODE_ENV="production"

RUN mkdir -p /home/nodejs/.local/share/pnpm/store \
    && chown -R nodejs:nodejs /home/nodejs/.local

USER nodejs

EXPOSE 3000

ENTRYPOINT ["/sbin/tini", "--"]

CMD ["pnpm", "run", "prod:start"]