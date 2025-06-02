type RecordingType = "not-saved" | "saved" | "clip";

export interface Recording {
  start: Date;
  duration: number;
  url: string;
  type?: RecordingType;
  id?: string;
}

export interface GetRecordingsListResponse {
  ok: boolean;
  recordings: Array<Recording>;
}

export interface DeleteRecordingResponse {
  ok: boolean;
  message?: string;
}

export interface SaveRecordingResponse {
  ok: boolean;
  recording?: Recording;
  message?: string;
}

export interface VideoBase64 {
  i: string;
  d: number;
  t: "n" | "s" | "c"; // not-saved, saved, clip
}
