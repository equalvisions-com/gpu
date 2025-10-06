"use client";

import { createAuthClient } from 'better-auth/react';

declare global {
  // eslint-disable-next-line no-var
  var __authClientSingleton: ReturnType<typeof createAuthClient> | undefined;
}

export const authClient =
  globalThis.__authClientSingleton ??
  (globalThis.__authClientSingleton = createAuthClient({}));

export const { signIn, signUp, useSession, signOut, resetPassword } = authClient;


