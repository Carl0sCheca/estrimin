FROM node:22-alpine3.19

WORKDIR /app

COPY package*.json ./

RUN apk add openssl
RUN apk add openssl-dev
RUN apk add openssl-libs-static
RUN apk add curl

RUN npm install

COPY . .

RUN npm run generate

EXPOSE 3000

ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["npm", "run", "buildandstart"]