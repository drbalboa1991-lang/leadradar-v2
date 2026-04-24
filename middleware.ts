import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AUTH_COOKIE, expectedToken, safeEqual } from '@/lib/auth';

/**
 * Runs on every request that matches `config.matcher` below. If the request
 * does not carry a valid `lr_auth` cookie, we redirect to /login and preserve
 * the original path in ?from=... so the user lands back where they wanted
 * after a successful login.
 *
 * Edge runtime is fine here because we only use Web Crypto (via lib/auth).
 */
export async function middleware(req: NextRequest) {
  const token = req.cookies.get(AUTH_COOKIE)?.value ?? '';
  const expected = await expectedToken();

  // If the server is missing env vars, send the user to /login so they see a
  // clear failure instead of a mysterious 500 on every page.
  if (!expected) {
    return redirectToLogin(req, 'misconfigured');
  }

  if (!token || !safeEqual(token, expected)) {
    return redirectToLogin(req);
  }

  return NextResponse.next();
}

function redirectToLogin(req: NextRequest, reason?: string) {
  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.search = ''; // wipe existing query params
  if (req.nextUrl.pathname !== '/') {
    url.searchParams.set('from', req.nextUrl.pathname + req.nextUrl.search);
  }
  if (reason) url.searchParams.set('reason', reason);
  return NextResponse.redirect(url);
}

/**
 * Match every request except:
 *  - /login  (the public gate itself)
 *  - /api/login & /api/logout (auth endpoints)
 *  - /scan/[id]  (public shareable scan reports — no auth required)
 *  - Next.js internals and static assets
 */
export const config = {
  matcher: [
    '/((?!login|scan/|api/login|api/logout|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
};
