"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    const { error } = await authClient.signIn.email(
      { email, password, callbackURL: "/" },
      {
        onError: (ctx) => setError(ctx.error.message),
      }
    );
    setPending(false);
    if (!error) router.push("/");
  };

  return (
    <main className="mx-auto max-w-sm p-6">
      <h1 className="mb-4 text-xl font-semibold">Sign in</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input
          className="w-full rounded border px-3 py-2"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="w-full rounded border px-3 py-2"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          className="w-full rounded bg-black px-3 py-2 text-white disabled:opacity-50"
          disabled={pending}
        >
          {pending ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}


