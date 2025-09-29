import { redis } from "./client";

export async function getJson<T>(key: string): Promise<T | null> {
  const val = await redis.get(key as any);
  return (val as unknown as T) ?? null;
}

export async function mgetJson<T>(keys: string[]): Promise<(T | null)[]> {
  if (keys.length === 0) return [];
  const vals = await (redis as any).mget(...keys);
  return (vals as (T | null)[]) ?? [];
}


