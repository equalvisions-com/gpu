import { Redis } from '@upstash/redis';

// Initialize Redis client with Upstash
// These should be set in environment variables
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export { redis };
