type StreamAction =
  | "publish"
  | "read"
  | "playback"
  | "api"
  | "metrics"
  | "pprof";

type StreamProtocol = "rtsp" | "rtmp" | "hls" | "webrtc" | "srt";

export interface StreamInfo {
  user: string;
  password: string;
  ip: string;
  action: StreamAction;
  path: string;
  protocol: StreamProtocol;
  id: string;
  query: string;
}
