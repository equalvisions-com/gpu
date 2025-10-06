"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export default function SignOutPage() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    authClient
      .signOut({
        fetchOptions: {
          onSuccess: () => {
            if (!cancelled) router.replace("/signin");
          },
        },
      })
      .catch(() => {
        if (!cancelled) router.replace("/signin");
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main className="mx-auto max-w-sm p-6">
      <h1 className="mb-2 text-xl font-semibold">Signing you out…</h1>
      <p className="text-sm text-muted-foreground">One moment.</p>
    </main>
  );
}


