import { User } from "@prisma/client";

export interface UserUpdateResponse {
  ok: boolean;
  message?: string;
  data?: User;
}

export interface UserUpdateDataRequest {
  name?: string;
  email?: string;
}

export interface ChangePasswordResponse {
  ok: boolean;
  error?: string;
}

export interface LiveUserFollowingResponse {
  ok: boolean;
  following: Array<LiveChannelItem>;
}

export interface LiveChannelItem {
  id: string;
  ready: boolean;
  readyTime: Date;
  viewers: number;
}

export interface UserFollowingListResponse {
  ok: boolean;
  following: Array<string>;
}
