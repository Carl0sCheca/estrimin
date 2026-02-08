FROM node:24.13.0-alpine3.23

WORKDIR /app

COPY package*.json ./

RUN apk add openssl
RUN apk add openssl-dev
RUN apk add openssl-libs-static
RUN apk add curl
RUN apk add ffmpeg

RUN npm install

COPY . .

EXPOSE 3000

ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["npm", "run", "buildandstart"]