/**
 * Middleware — intentionally a pass-through.
 *
 * The password gate has been removed. The app is fully public.
 * Login/logout routes and auth helpers are kept for a future
 * admin-only area if needed.
 */

import { NextResponse } from 'next/server';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function middleware() {
  return NextResponse.next();
}

// Only run on requests that used to be gated — keeps the edge bundle tiny.
export const config = {
  matcher: [],
};
