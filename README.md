### Dev

1 - `docker compose -f docker-compose-dev.yml up -d`

2 - `pnpm install`

3 - `pnpm prisma generate`

4 - `pnpm prisma migrate dev`

5 - `pnpm run startup`

6 - `pnpm run dev`

### Default credentials for administrator account

Email: `chan@ge.me`

Password: `changeme`

<details open>
<summary>Required settings for MediaMTX</summary>

```yaml
authMethod: http
authHTTPAddress: http://localhost:3000/api/stream/auth
api: yes
rtsp: no
rtmp: no
hls: no
srt: no

pathDefaults:
  record: yes
  recordPath: /recordings/%path/%Y-%m-%d_%H-%M-%S-%f
  recordSegmentDuration: 1m
  recordDeleteAfter: 2d
  runOnRecordSegmentComplete: curl http://localhost:3000/api/videos/segmentComplete/$MTX_PATH?segment=$MTX_SEGMENT_PATH&duration=$MTX_SEGMENT_DURATION
```

</details>
