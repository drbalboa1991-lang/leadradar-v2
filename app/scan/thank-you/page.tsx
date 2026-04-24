'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function ThankYouContent() {
  const params = useSearchParams();
  const scanId = params.get('scan_id');

  // As soon as this page loads, postMessage to the opener tab
  // so ScanForm can flip to "paid" state immediately.
  useEffect(() => {
    if (scanId && window.opener) {
      window.opener.postMessage({ type: 'PAYMENT_SUCCESS', scanId }, '*');
    }
  }, [scanId]);

  function handleClose() {
    // postMessage again in case opener wasn't ready on load
    if (scanId && window.opener) {
      window.opener.postMessage({ type: 'PAYMENT_SUCCESS', scanId }, '*');
    }
    window.close();
    // Fallback if window.close() is blocked
    setTimeout(() => { window.location.href = '/'; }, 300);
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-5">
      <div className="max-w-md w-full text-center space-y-6">

        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto text-4xl"
          style={{ background: 'color-mix(in srgb,var(--brand) 12%,transparent)' }}>
          ✅
        </div>

        <div>
          <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: 'var(--ink)' }}>
            Payment confirmed!
          </h1>
          <p className="mt-2 text-base" style={{ color: 'var(--muted, #6b7280)' }}>
            Your pro report is ready.
          </p>
        </div>

        <div className="rounded-2xl border p-6 text-left space-y-4"
          style={{ borderColor: 'var(--line)', background: 'color-mix(in srgb,var(--bg) 85%,transparent)' }}>
          <p className="text-sm font-bold" style={{ color: 'var(--ink)' }}>What happens next</p>
          {[
            { icon: '📬', text: 'Stripe sent a receipt to your email' },
            { icon: '📊', text: 'Your full pro report is ready — benchmarks, revenue impact, and 6 deep checks' },
            { icon: '👇', text: 'Click below to close this tab and see it' },
          ].map(({ icon, text }) => (
            <div key={text} className="flex items-start gap-3">
              <span className="text-lg shrink-0">{icon}</span>
              <p className="text-sm" style={{ color: 'var(--muted, #6b7280)' }}>{text}</p>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <button onClick={handleClose}
            className="block w-full px-6 py-3 rounded-xl text-sm font-bold text-center transition-opacity hover:opacity-90 cursor-pointer"
            style={{ background: 'var(--brand)', color: 'var(--brand-ink)' }}>
            ← Close this tab &amp; see my pro report
          </button>
          <p className="text-xs" style={{ color: 'var(--muted, #6b7280)' }}>
            Questions?{' '}
            <a href="mailto:support@leadradar.app" className="underline" style={{ color: 'var(--brand)' }}>
              support@leadradar.app
            </a>
          </p>
        </div>

      </div>
    </main>
  );
}

export default function ThankYouPage() {
  return (
    <Suspense>
      <ThankYouContent />
    </Suspense>
  );
}
