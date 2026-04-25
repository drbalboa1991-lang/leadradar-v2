'use client';

import { useState, useEffect } from 'react';
import type { ScanResult } from '@/lib/scan';
import ScanResultCard from './ScanResultCard';
import PremiumUpsell from './PremiumUpsell';

type Status      = 'idle' | 'scanning' | 'done' | 'error';
type EmailStatus = 'idle' | 'sending' | 'sent' | 'error';

export default function ScanForm() {
  const [url,         setUrl]         = useState('');
  const [status,      setStatus]      = useState<Status>('idle');
  const [result,      setResult]      = useState<ScanResult | null>(null);
  const [shareId,     setShareId]     = useState<string | null>(null);
  const [paid,        setPaid]        = useState(false);
  const [error,       setError]       = useState('');
  const [copied,      setCopied]      = useState(false);
  const [email,       setEmail]       = useState('');
  const [emailStatus, setEmailStatus] = useState<EmailStatus>('idle');

  // Listen for postMessage from the Stripe thank-you tab — verify origin to prevent spoofing
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === 'PAYMENT_SUCCESS' && e.data?.scanId === shareId) {
        setPaid(true);
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [shareId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('scanning');
    setResult(null);
    setShareId(null);
    setPaid(false);
    setError('');
    setCopied(false);
    setEmail('');
    setEmailStatus('idle');

    try {
      const res  = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.message || 'Could not scan that site. Check the URL and try again.');
        setStatus('error');
        return;
      }
      setResult(data.data);
      setShareId(data.shareId ?? null);
      setStatus('done');
    } catch {
      setError('Network error. Please try again.');
      setStatus('error');
    }
  }

  async function handleEmailReport(e: React.FormEvent) {
    e.preventDefault();
    if (!result || !email) return;
    setEmailStatus('sending');
    try {
      const res  = await fetch('/api/email-report', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, shareId, result }),
      });
      const data = await res.json();
      setEmailStatus(data.ok ? 'sent' : 'error');
    } catch {
      setEmailStatus('error');
    }
  }

  function buildShareUrl() {
    return `${window.location.origin}/scan/${shareId}`;
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(buildShareUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Scan input form */}
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="yourwebsite.com"
          required
          disabled={status === 'scanning'}
          className="flex-1 px-4 py-3 rounded-lg border text-sm"
          style={{ background: 'color-mix(in srgb,var(--bg) 80%,transparent)', borderColor: 'var(--line)', color: 'var(--ink)' }}
        />
        <button
          type="submit"
          disabled={status === 'scanning'}
          className="px-6 py-3 rounded-lg text-sm font-bold shrink-0 disabled:opacity-60 transition-opacity"
          style={{ background: 'var(--brand)', color: 'var(--brand-ink)' }}
        >
          {status === 'scanning' ? 'Scanning…' : 'Scan my site'}
        </button>
      </form>

      {status === 'scanning' && (
        <p className="mt-4 text-sm text-center" style={{ color: 'var(--ink)' }}>
          Checking your site — this takes about 10 seconds…
        </p>
      )}

      {status === 'error' && (
        <p className="mt-4 text-sm text-center" style={{ color: '#ef4444' }}>{error}</p>
      )}

      {status === 'done' && result && (
        <div className="mt-8 space-y-6">
          <ScanResultCard result={result} />

          {/* Email report capture */}
          <div className="p-5 rounded-2xl border"
            style={{ borderColor: 'var(--line)', background: 'color-mix(in srgb,var(--bg) 90%,transparent)' }}>
            <p className="text-sm font-bold mb-1" style={{ color: 'var(--ink)' }}>
              📬 Email me this report
            </p>
            <p className="text-xs mb-3" style={{ color: 'var(--muted, #6b7280)' }}>
              Get a copy of your full score and action list sent straight to your inbox.
            </p>

            {emailStatus === 'sent' ? (
              <p className="text-sm font-semibold" style={{ color: 'var(--brand)' }}>
                ✅ Report sent! Check your inbox.
              </p>
            ) : (
              <form onSubmit={handleEmailReport} className="flex flex-col sm:flex-row gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  disabled={emailStatus === 'sending'}
                  className="flex-1 px-3 py-2 rounded-lg border text-sm disabled:opacity-60"
                  style={{ background: 'color-mix(in srgb,var(--bg) 80%,transparent)', borderColor: 'var(--line)', color: 'var(--ink)' }}
                />
                <button
                  type="submit"
                  disabled={emailStatus === 'sending'}
                  className="px-4 py-2 rounded-lg text-sm font-bold shrink-0 disabled:opacity-60 transition-opacity"
                  style={{ background: 'var(--brand)', color: 'var(--brand-ink)' }}
                >
                  {emailStatus === 'sending' ? 'Sending…' : 'Send report'}
                </button>
              </form>
            )}

            {emailStatus === 'error' && (
              <p className="text-xs mt-2" style={{ color: '#ef4444' }}>
                Could not send. Please try again.
              </p>
            )}
          </div>

          <PremiumUpsell result={result} scanId={shareId} paid={paid} />

          {/* Share URL */}
          {shareId && (
            <div className="p-4 rounded-xl border"
              style={{ borderColor: 'var(--line)', background: 'color-mix(in srgb,var(--bg) 90%,transparent)' }}>
              <p className="text-xs font-semibold mb-2" style={{ color: 'var(--ink)' }}>Share this report</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs break-all" style={{ color: 'var(--muted, #6b7280)' }}>
                  {buildShareUrl()}
                </code>
                <button
                  onClick={handleCopy}
                  className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                  style={{
                    background: copied ? 'color-mix(in srgb,var(--brand) 15%,transparent)' : 'color-mix(in srgb,var(--line) 60%,transparent)',
                    color: copied ? 'var(--brand)' : 'var(--ink)',
                  }}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          )}

          <button
            onClick={() => { setStatus('idle'); setResult(null); setShareId(null); setPaid(false); setUrl(''); setEmail(''); setEmailStatus('idle'); }}
            className="text-sm underline"
            style={{ color: 'var(--muted, #6b7280)' }}
          >
            Scan another site
          </button>
        </div>
      )}
    </div>
  );
}
