import { NextResponse } from 'next/server';
import { scanWebsite } from '@/lib/scan';
import { saveScan } from '@/lib/scanStore';
import { validateScanUrl } from '@/lib/urlValidator';
import { checkRateLimit } from '@/lib/rateLimit';

export const runtime = 'nodejs';
export const maxDuration = 30; // Vercel: up to 30 s for the full scan

export async function POST(request: Request) {
  // ── Rate limiting ────────────────────────────────────────────────────────
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1';
  const allowed = await checkRateLimit(ip);
  if (!allowed) {
    return NextResponse.json(
      { ok: false, error: 'rate_limited', message: 'Too many scans. Please wait an hour and try again.' },
      { status: 429 },
    );
  }

  try {
    const body = await request.json();
    const raw  = typeof body?.url === 'string' ? body.url.trim() : '';

    if (!raw) {
      return NextResponse.json({ ok: false, error: 'url_required' }, { status: 400 });
    }

    // ── SSRF protection ──────────────────────────────────────────────────
    const validation = await validateScanUrl(raw);
    if (!validation.ok) {
      return NextResponse.json(
        { ok: false, error: 'invalid_url', message: validation.message },
        { status: 400 },
      );
    }

    const result = await scanWebsite(raw);

    // Persist so the result can be retrieved via /scan/[id]
    let shareId: string | undefined;
    try {
      shareId = await saveScan(result);
    } catch (saveErr) {
      console.error('[scan] failed to save result:', saveErr);
    }

    return NextResponse.json({ ok: true, data: result, shareId });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('abort') || msg.includes('timeout')) {
      return NextResponse.json(
        { ok: false, error: 'timeout', message: 'Site took too long to respond.' },
        { status: 504 },
      );
    }
    console.error('[scan] error:', err);
    return NextResponse.json(
      { ok: false, error: 'scan_failed', message: 'Scan failed. Please try again.' },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
