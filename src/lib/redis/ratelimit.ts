import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Use Upstash Redis env config for ratelimit (separate from our json client)
const redis = Redis.fromEnv();

// Writes: stricter
export const writeLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(100, "24 h"),
  prefix: "ratelimit:write",
});