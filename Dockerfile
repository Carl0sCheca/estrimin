FROM node:25.6.1-alpine3.23

WORKDIR /app

RUN npm install -g pnpm@10.30.1

RUN apk add --no-cache \
    openssl \
    openssl-dev \
    openssl-libs-static \
    curl \
    ffmpeg

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

COPY . .

EXPOSE 3000

ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["pnpm", "run", "buildandstart"]