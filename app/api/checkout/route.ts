import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export const runtime = 'nodejs';

const PRICES = {
  onetime: 'price_1TPYqcHdWXDZUgBZy3V5Grvu', // $9.99 one-time
  monthly: 'price_1TPYqmHdWXDZUgBZWuN6p3wv', // $29/mo
};

export async function POST(req: Request) {
  try {
    const { scanId, plan } = await req.json() as { scanId?: string; plan?: string };

    if (!scanId || !plan || !(plan in PRICES)) {
      return NextResponse.json({ ok: false, error: 'invalid_params' }, { status: 400 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://lead-radar-lake.vercel.app';

    const session = await stripe.checkout.sessions.create({
      mode: plan === 'monthly' ? 'subscription' : 'payment',
      payment_method_types: ['card'],
      line_items: [{ price: PRICES[plan as keyof typeof PRICES], quantity: 1 }],
      // scan_id is appended so the thank-you page can postMessage it back
      success_url: `${appUrl}/scan/thank-you?scan_id=${scanId}`,
      cancel_url: `${appUrl}/`,
      client_reference_id: scanId, // also stored in Stripe for webhook lookup
    });

    return NextResponse.json({ ok: true, url: session.url });
  } catch (err) {
    console.error('[checkout]', err);
    return NextResponse.json({ ok: false, error: 'stripe_error' }, { status: 500 });
  }
}
