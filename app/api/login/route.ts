import { NextResponse } from 'next/server';
import {
  AUTH_COOKIE,
  AUTH_MAX_AGE,
  hmacHex,
  safeEqual,
  safeRedirectPath,
} from '@/lib/auth';

/**
 * POST /api/login
 *
 * Form fields:
 *   - password: the password the user typed
 *   - from:     the original path they tried to visit (optional)
 *
 * On success: sets an httpOnly HMAC-signed cookie and 303-redirects to `from`.
 * On failure: 303-redirects back to /login with ?error=1 (and ?from preserved).
 *
 * We deliberately return `redirect` responses instead of JSON so this form
 * works without JavaScript — useful both for progressive enhancement and
 * for debugging with curl.
 */
export async function POST(request: Request) {
  const form = await request.formData();
  const submitted = String(form.get('password') ?? '');
  const from = safeRedirectPath(String(form.get('from') ?? '/'));

  const password = process.env.APP_PASSWORD;
  const secret = process.env.APP_SECRET;

  if (!password || !secret) {
    const url = new URL('/login', request.url);
    url.searchParams.set('reason', 'misconfigured');
    return NextResponse.redirect(url, { status: 303 });
  }

  const ok = safeEqual(submitted, password);

  if (!ok) {
    const url = new URL('/login', request.url);
    url.searchParams.set('error', '1');
    if (from !== '/') url.searchParams.set('from', from);
    // Small delay would help rate-limiting; for MVP keep it simple.
    return NextResponse.redirect(url, { status: 303 });
  }

  const token = await hmacHex(password, secret);
  const res = NextResponse.redirect(new URL(from, request.url), { status: 303 });
  res.cookies.set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: AUTH_MAX_AGE,
  });
  return res;
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
