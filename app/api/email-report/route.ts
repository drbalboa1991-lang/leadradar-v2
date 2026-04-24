import { NextResponse } from 'next/server';
import type { ScanResult } from '@/lib/scan';
import { sendReportEmail } from '@/lib/email';

export const runtime = 'nodejs';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  try {
    const body     = await req.json();
    const email    = typeof body?.email  === 'string' ? body.email.trim()  : '';
    const shareId  = typeof body?.shareId === 'string' ? body.shareId.trim() : '';
    const result   = body?.result as ScanResult | undefined;

    if (!email || !EMAIL_RE.test(email) || email.length > 254) {
      return NextResponse.json({ ok: false, error: 'invalid_email' }, { status: 400 });
    }

    if (!result?.url || !Array.isArray(result?.checks)) {
      return NextResponse.json({ ok: false, error: 'missing_result' }, { status: 400 });
    }

    const shareUrl = shareId
      ? `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://lead-radar-lake.vercel.app'}/scan/${shareId}`
      : null;

    await sendReportEmail(email, result, shareUrl);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[email-report]', err);
    // Don't leak internal error details
    return NextResponse.json({ ok: false, error: 'send_failed' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
