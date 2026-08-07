// api/_lib/rate-limit.js
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Create a Redis client from environment variables
const redis = Redis.fromEnv();

export const ratelimit = new Ratelimit({
    redis: redis,
    // Allow 5 orders per 10 seconds per IP address
    limiter: Ratelimit.slidingWindow(5, '10 s'),
    analytics: true, // Optional: track usage in Upstash dashboard
});
