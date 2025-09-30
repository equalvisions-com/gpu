import { redis } from "./client";

export async function getJson<T>(key: string): Promise<T | null> {
  const val = await redis.get(key as any);
  return (val as unknown as T) ?? null;
}

export async function mgetJson<T>(keys: string[]): Promise<(T | null)[]> {
  if (keys.length === 0) return [];
  // Upstash client mget is typed variadic; spread keys safely
  const vals = await (redis as unknown as { mget: (...keys: string[]) => Promise<(T | null)[]> }).mget(...keys);
  return vals ?? [];
}


