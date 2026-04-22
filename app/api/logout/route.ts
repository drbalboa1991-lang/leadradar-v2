import { NextResponse } from 'next/server';
import { AUTH_COOKIE } from '@/lib/auth';

/**
 * POST /api/logout — wipes the auth cookie and redirects to /login.
 * Also responds to GET so a plain <a href="/api/logout"> works for users
 * without JavaScript (e.g. on the landing page).
 */
function handle(request: Request): Response {
  const res = NextResponse.redirect(new URL('/login', request.url), { status: 303 });
  res.cookies.set(AUTH_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return res;
}

export const POST = handle;
export const GET = handle;
