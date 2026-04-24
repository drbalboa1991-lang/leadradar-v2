/**
 * GET /api/scan/[id]
 *
 * Returns the proChecks for a scan — only if the scan has been paid for.
 * Called by ScanForm after a PAYMENT_SUCCESS postMessage to unlock the
 * pro section without requiring a full page reload.
 */

import { NextResponse } from 'next/server';
import { getScan, isPaid } from '@/lib/scanStore';

export const runtime = 'nodejs';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Validate format — 12 lowercase hex chars
  if (!/^[0-9a-f]{12}$/.test(id)) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  }

  const [result, paid] = await Promise.all([getScan(id), isPaid(id)]);

  if (!result) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  }

  if (!paid) {
    return NextResponse.json({ ok: false, error: 'payment_required' }, { status: 402 });
  }

  // Only return the proChecks — the caller already has the public result
  return NextResponse.json({ ok: true, proChecks: result.proChecks });
}
