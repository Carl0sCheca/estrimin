export interface ChangeUserRoleResponse {
  ok: boolean;
  message?: string;
  newRole?: string;
}

export interface DisableRegisterResponse {
  ok: boolean;
  message?: string;
}

export interface GenerateRegistrationCodeRequest {
  expirationDate?: Date;
}

export interface GenerateRegistrationCodeResponse {
  ok: boolean;
  id?: string;
  expirationDate?: Date | null;
  message?: string;
}

export interface RegistrationCodeDto {
  id: string;
  used: boolean;
  createdAt: Date;
  expirationDate: Date | null;
  user: { name: string } | null;
}

export interface GetRegistrationCodesResponse {
  ok: boolean;
  registrationCodes?: Array<RegistrationCodeDto>;
}

export interface DeleteRegistrationCodesResponse {
  ok: boolean;
  message?: string;
}

export interface LiveChannelItem {
  id: string;
  ready: boolean;
  readyTime: Date;
  viewers: number;
}

export interface GetLiveChannelsResponse {
  items: Array<LiveChannelItem>;
  message?: string;
}
