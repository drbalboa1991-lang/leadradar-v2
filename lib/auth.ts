/**
 * Shared auth helpers — safe for both Edge (middleware) and Node (route
 * handlers). We use the global Web Crypto API, which exists in both runtimes.
 *
 * Scheme: a session cookie whose value is HMAC-SHA256(APP_PASSWORD, APP_SECRET),
 * rendered as lowercase hex. Only a server that knows both env vars can
 * produce the correct token, so it can't be forged client-side.
 */

export const AUTH_COOKIE = 'lr_auth';
export const AUTH_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

/** HMAC-SHA256 a message and return lowercase hex. */
export async function hmacHex(message: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  const bytes = new Uint8Array(sig);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

/** Constant-time string compare. Prevents timing attacks on cookie checks. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/** Compute the expected session token from env. Returns null if misconfigured. */
export async function expectedToken(): Promise<string | null> {
  const password = process.env.APP_PASSWORD;
  const secret = process.env.APP_SECRET;
  if (!password || !secret) return null;
  return hmacHex(password, secret);
}

/** Sanitize a `from` query param so we only ever redirect to same-origin paths. */
export function safeRedirectPath(from: string | undefined | null): string {
  if (!from || typeof from !== 'string') return '/';
  if (!from.startsWith('/')) return '/';
  if (from.startsWith('//')) return '/'; // protocol-relative URLs not allowed
  return from;
}
