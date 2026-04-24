import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Payment confirmed — LeadRadar',
  robots: { index: false, follow: false },
};

export default function ThankYouPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-5">
      <div className="max-w-md w-full text-center space-y-6">

        {/* Big success icon */}
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mx-auto text-4xl"
          style={{ background: 'color-mix(in srgb,var(--brand) 12%,transparent)' }}
        >
          ✅
        </div>

        {/* Heading */}
        <div>
          <h1
            className="text-3xl font-extrabold tracking-tight"
            style={{ color: 'var(--ink)' }}
          >
            Payment confirmed!
          </h1>
          <p className="mt-2 text-base" style={{ color: 'var(--muted, #6b7280)' }}>
            Thank you for upgrading to LeadRadar Pro.
          </p>
        </div>

        {/* What happens next */}
        <div
          className="rounded-2xl border p-6 text-left space-y-4"
          style={{
            borderColor: 'var(--line)',
            background: 'color-mix(in srgb,var(--bg) 85%,transparent)',
          }}
        >
          <p className="text-sm font-bold" style={{ color: 'var(--ink)' }}>
            What happens next
          </p>
          {[
            { icon: '📊', text: 'Your full report is being prepared' },
            { icon: '📬', text: 'Check your email for your receipt from Stripe' },
            { icon: '🚀', text: 'Full pro features are now unlocked on your account' },
          ].map(({ icon, text }) => (
            <div key={text} className="flex items-start gap-3">
              <span className="text-lg shrink-0">{icon}</span>
              <p className="text-sm" style={{ color: 'var(--muted, #6b7280)' }}>
                {text}
              </p>
            </div>
          ))}
        </div>

        {/* CTA back to app */}
        <div className="space-y-3">
          <Link
            href="/"
            className="block w-full px-6 py-3 rounded-xl text-sm font-bold text-center transition-opacity hover:opacity-90"
            style={{ background: 'var(--brand)', color: 'var(--brand-ink)' }}
          >
            Back to LeadRadar →
          </Link>
          <p className="text-xs" style={{ color: 'var(--muted, #6b7280)' }}>
            Questions? Email us at{' '}
            <a
              href="mailto:support@leadradar.app"
              className="underline"
              style={{ color: 'var(--brand)' }}
            >
              support@leadradar.app
            </a>
          </p>
        </div>

      </div>
    </main>
  );
}
