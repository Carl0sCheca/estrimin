FROM alpine:3.22.0

ARG MEDIAMTX_VERSION=v1.12.3

RUN apk add --no-cache rclone
RUN apk add ffmpeg
RUN apk add curl

ADD https://github.com/bluenviron/mediamtx/releases/download/${MEDIAMTX_VERSION}/mediamtx_${MEDIAMTX_VERSION}_linux_amd64.tar.gz /tmp/
RUN tar -xzf /tmp/mediamtx_${MEDIAMTX_VERSION}_linux_amd64.tar.gz -C /usr/local/bin/ && \
    rm /tmp/mediamtx_${MEDIAMTX_VERSION}_linux_amd64.tar.gz

ENTRYPOINT ["/usr/local/bin/mediamtx"]