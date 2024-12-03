import { createAuthClient } from "better-auth/react";

export const { signIn, signUp, useSession, signOut, changePassword } =
  createAuthClient({
    baseURL: process.env.BASE_URL,
  });
