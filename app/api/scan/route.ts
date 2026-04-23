import { NextResponse } from 'next/server';
import { scanWebsite } from '@/lib/scan';

export const runtime = 'nodejs';
export const maxDuration = 30; // Vercel: up to 30s for scan

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const raw = typeof body?.url === 'string' ? body.url.trim() : '';

    if (!raw) {
      return NextResponse.json({ ok: false, error: 'url_required' }, { status: 400 });
    }

    // Basic sanity: must look like a domain or URL
    if (!/\w+\.\w+/.test(raw)) {
      return NextResponse.json({ ok: false, error: 'invalid_url' }, { status: 400 });
    }

    const result = await scanWebsite(raw);
    return NextResponse.json({ ok: true, data: result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    if (msg.includes('abort') || msg.includes('timeout')) {
      return NextResponse.json({ ok: false, error: 'timeout', message: 'Site took too long to respond.' }, { status: 504 });
    }
    console.error('[scan] error:', err);
    return NextResponse.json({ ok: false, error: 'scan_failed', message: msg }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
