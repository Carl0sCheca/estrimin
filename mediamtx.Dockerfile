FROM alpine:3.23.3

ARG MEDIAMTX_VERSION=v1.12.3

RUN apk add --no-cache rclone
RUN apk add ffmpeg
RUN apk add curl

RUN addgroup -g 1001 -S nodejs && \
    adduser -S -D -H -u 1001 -G nodejs nodejs

ADD https://github.com/bluenviron/mediamtx/releases/download/${MEDIAMTX_VERSION}/mediamtx_${MEDIAMTX_VERSION}_linux_amd64.tar.gz /tmp/
RUN tar -xzf /tmp/mediamtx_${MEDIAMTX_VERSION}_linux_amd64.tar.gz -C /usr/local/bin/ && \
    rm /tmp/mediamtx_${MEDIAMTX_VERSION}_linux_amd64.tar.gz

USER nodejs

ENTRYPOINT ["/usr/local/bin/mediamtx"]