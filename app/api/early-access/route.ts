import { NextResponse } from 'next/server';
import { isValidEmail } from '@/lib/waitlist';
import { saveEarlyAccess, getEarlyAccessCount, isEarlyAccessOpen, EARLY_ACCESS_LIMIT } from '@/lib/earlyAccess';
import { sendReportEmail } from '@/lib/email';
import type { ScanResult } from '@/lib/scan';

export const runtime = 'nodejs';
export const maxDuration = 30;

// GET /api/early-access — returns current count and open status
export async function GET() {
  const count = await getEarlyAccessCount();
  return NextResponse.json({
    ok:        true,
    count,
    limit:     EARLY_ACCESS_LIMIT,
    open:      count < EARLY_ACCESS_LIMIT,
    remaining: Math.max(0, EARLY_ACCESS_LIMIT - count),
  });
}

// POST /api/early-access — save email + send full pro report
export async function POST(req: Request) {
  try {
    const body   = await req.json();
    const email  = body?.email as string | undefined;
    const result = body?.result as ScanResult | undefined;
    const shareId = body?.shareId as string | undefined;

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ ok: false, error: 'invalid_email' }, { status: 400 });
    }

    if (!result || typeof result.score !== 'number') {
      return NextResponse.json({ ok: false, error: 'invalid_result' }, { status: 400 });
    }

    // Check capacity
    const open = await isEarlyAccessOpen();
    if (!open) {
      return NextResponse.json({ ok: false, error: 'early_access_full' }, { status: 403 });
    }

    // Save to DB
    const { alreadyRegistered } = await saveEarlyAccess(email, result);

    // Build share URL
    const shareUrl = shareId
      ? `${process.env.NEXT_PUBLIC_BASE_URL ?? 'https://lead-radar-lake.vercel.app'}/scan/${shareId}`
      : null;

    // Always send the email (even if already registered — they might have lost it)
    await sendReportEmail(email, result, shareUrl, { fullPro: true, isBeta: true });

    const count = await getEarlyAccessCount();

    return NextResponse.json({
      ok: true,
      alreadyRegistered,
      count,
      remaining: Math.max(0, EARLY_ACCESS_LIMIT - count),
    });
  } catch (err) {
    console.error('[early-access]', err);
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 });
  }
}
