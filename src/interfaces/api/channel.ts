import { ChannelVisibility, RecordingVisibility } from "@/generated/enums";

export interface CreateChannelResponse {
  ok: boolean;
  data?: string;
}

export interface UpdateVisibilityStatusRequest {
  state: ChannelVisibility;
  channelId: number;
}

export interface UpdateVisibilityStatusResponse {
  ok: boolean;
}

export interface SetPasswordRequest {
  password: string;
  channelId: number;
}

export interface SetPasswordResponse {
  ok: boolean;
}

export interface AddUserAllowlistRequest {
  channelId: number;
  username: string;
  requestedBy: string;
}

export interface AllowListUser {
  id: number;
  channelId: number;
  userId: string;
  user: {
    name: string;
  };
}

export interface AddUserAllowlistResponse {
  ok: boolean;
  message?: string;
  data?: AllowListUser;
}

export interface RemoveUserAllowlistRequest {
  id: number;
}

export interface RemoveUserAllowlistResponse {
  ok: boolean;
}

export interface GetChannelRecordingsResponse {
  ok: boolean;
  recordings: Array<RecordingDto>;
}

export interface RecordingDto {
  url: string;
  thumbnail: string;
  title: string;
  duration: string;
  status: "COMPLETED" | "PROCESSING" | "LIVE" | "SAVED"; // unsaved: completed, processing and live
  date: Date;
  visibility: RecordingVisibility;
}
