import { RecordingVisibility } from "@/generated/enums";

type RecordingType = "COMPLETED" | "PROCESSING" | "LIVE" | "SAVED";

export interface Recording {
  start: Date;
  duration: number;
  url: string;
  type?: RecordingType;
  id?: string;
  visibility: RecordingVisibility;
  firstSegmentId?: number;
  title?: string;
}

export interface RecordingData {
  start: Date;
  duration: number;
  fileName: string;
  status: RecordingType;
  visibility: RecordingVisibility;
  firstSegmentId?: number;
}

export interface RecordingApiResponse {
  ok: boolean;
  recordings: Array<RecordingData>;
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

export type VideoBase64Type = "n" | "s"; // not-saved, saved

export interface VideoBase64 {
  i: string;
  t: VideoBase64Type;
}

export interface ChangeDefaultRecordingVisibilityResponse {
  ok: boolean;
  message?: string;
}

export interface storePastStreamsResponse {
  ok: boolean;
  message?: string;
}

export interface GetNonSavedRecordingsListResponse {
  ok: boolean;
  message?: string;
  recordings: Array<RecordingData>;
}

export interface ChangeRecordingVisibilityResponse {
  ok: boolean;
  message?: string;
}

export interface ChangeRecordingTitleResponse {
  ok: boolean;
  message?: string;
}
