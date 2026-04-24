import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { markPaid } from '@/lib/scanStore';

export const runtime = 'nodejs';

// Raw body is required for Stripe signature verification — do NOT parse JSON.
export async function POST(req: Request) {
  const body = await req.text();
  const sig  = req.headers.get('stripe-signature') ?? '';
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? '';

  if (!webhookSecret) {
    console.error('[webhook] STRIPE_WEBHOOK_SECRET not set');
    return NextResponse.json({ error: 'misconfigured' }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error('[webhook] signature verification failed:', err);
    return NextResponse.json({ error: 'invalid_signature' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const scanId  = session.client_reference_id;

    if (scanId) {
      try {
        await markPaid(scanId);
        console.log('[webhook] marked paid:', scanId);
      } catch (err) {
        console.error('[webhook] markPaid failed:', err);
      }
    }
  }

  return NextResponse.json({ received: true });
}
