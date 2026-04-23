import { NextResponse } from 'next/server';
import { addEmail, isValidEmail } from '@/lib/waitlist';

// better-sqlite3 uses native Node bindings — must run on Node, not Edge
export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body?.email === 'string' ? body.email.trim() : '';

    if (!isValidEmail(email)) {
      return NextResponse.json({ ok: false, error: 'invalid_email' }, { status: 400 });
    }

    const result = await addEmail(email);
    return NextResponse.json(result);
  } catch (err) {
    console.error('[waitlist] POST error:', err);
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
