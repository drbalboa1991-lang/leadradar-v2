/**
 * IP-based sliding-window rate limiter for /api/scan.
 *
 * In dev (no KV_REST_API_URL) every request is allowed so you can
 * iterate locally without hitting limits.
 *
 * In prod: 10 scans per IP per hour, tracked in Vercel KV.
 */

const WINDOW_SECONDS = 60 * 60; // 1 hour
const MAX_REQUESTS   = 10;

/**
 * Increment the counter for `ip` and return whether the request
 * should be allowed (true) or blocked (false).
 */
export async function checkRateLimit(ip: string): Promise<boolean> {
  // Always allow in local dev — no KV available
  if (!process.env.KV_REST_API_URL) return true;

  const { kv } = await import('@vercel/kv');
  const key = `lr:rl:${ip}`;

  // Atomic increment
  const count = await kv.incr(key);

  // On the first request in a new window, set the expiry
  if (count === 1) {
    await kv.expire(key, WINDOW_SECONDS);
  }

  return count <= MAX_REQUESTS;
}
