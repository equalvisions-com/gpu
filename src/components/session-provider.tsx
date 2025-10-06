"use client";

import * as React from "react";
import { authClient } from "@/lib/auth-client";

type MinimalUser = {
  id: string;
  name?: string | null;
  image?: string | null;
};

export type AuthSnapshot =
  | { isAuthenticated: true; user: MinimalUser }
  | { isAuthenticated: false; user: null };

const AuthContext = React.createContext<AuthSnapshot | undefined>(undefined);

export function SessionProvider({
  initial,
  children,
}: {
  initial: AuthSnapshot;
  children: React.ReactNode;
}) {
  const { data, isPending } = authClient.useSession();
  const [value, setValue] = React.useState<AuthSnapshot>(initial);
  const hasSeenUserRef = React.useRef<boolean>(initial.isAuthenticated);

  React.useEffect(() => {
    if (isPending) return;
    if (data?.user) {
      hasSeenUserRef.current = true;
      const next: AuthSnapshot = {
        isAuthenticated: true,
        user: {
          id: data.user.id,
          name: data.user.name ?? null,
          image: data.user.image ?? null,
        },
      };
      setValue((prev) => {
        if (
          !prev.isAuthenticated ||
          prev.user?.id !== next.user.id ||
          prev.user?.name !== next.user.name ||
          prev.user?.image !== next.user.image
        ) {
          return next;
        }
        return prev;
      });
      return;
    }
    if (data === null) {
      // Avoid clobbering a truthful server-authenticated snapshot with a transient null
      if (initial.isAuthenticated && !hasSeenUserRef.current) return;
      setValue((prev) => {
        if (prev.isAuthenticated || prev.user !== null) {
          return { isAuthenticated: false, user: null };
        }
        return prev;
      });
    }
  }, [data, isPending, initial.isAuthenticated]);

  const memoValue = React.useMemo(() => value, [value]);

  return <AuthContext.Provider value={memoValue}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error("useAuth must be used within a SessionProvider");
  }
  return ctx;
}

export function useIsAuthenticated() {
  return useAuth().isAuthenticated;
}


