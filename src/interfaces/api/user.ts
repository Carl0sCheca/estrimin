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
