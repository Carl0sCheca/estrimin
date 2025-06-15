### Dev

1 - `docker compose -f docker-compose-dev.yml up -d`

2 - `npm install`

3 - `npx prisma migrate dev`

4 - `npm run startup`

5 - `npm run dev`

### Default credentials for administrator account

Email: `chan@ge.me`

Password: `changeme`

<details open>
<summary>Required settings for MediaMTX</summary>

```yaml
authMethod: http
authHTTPAddress: http://localhost:3000/api/stream/auth
api: yes
playback: yes
rtsp: no
rtmp: no
hls: no
srt: no

pathDefaults:
  record: yes
  recordPath: /recordings/%path/%Y-%m-%d_%H-%M-%S-%f
  recordDeleteAfter: 2d
  runOnReady: curl http://localhost:3000/api/videos/ready/$MTX_PATH
  runOnRecordSegmentCreate: curl http://localhost:3000/api/videos/segmentCreate/$MTX_PATH?segment=$MTX_SEGMENT_PATH
  runOnRecordSegmentComplete: curl http://localhost:3000/api/videos/segmentComplete/$MTX_PATH?segment=$MTX_SEGMENT_PATH&duration=$MTX_SEGMENT_DURATION
```

</details>
