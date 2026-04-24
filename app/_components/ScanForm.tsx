'use client';

import { useState } from 'react';
import type { ScanResult } from '@/lib/scan';
import ScanResultCard from './ScanResultCard';

type Status = 'idle' | 'scanning' | 'done' | 'error';

export default function ScanForm() {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [shareId, setShareId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('scanning');
    setResult(null);
    setShareId(null);
    setError('');
    setCopied(false);

    try {
      const res = await fetch('/api/scan', {
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

  function buildShareUrl(): string {
    return `${window.location.origin}/scan/${shareId}`;
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(buildShareUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select the text in the input
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Input form */}
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="yourwebsite.com"
          required
          disabled={status === 'scanning'}
          className="flex-1 px-4 py-3 rounded-lg border text-sm"
          style={{
            background: 'color-mix(in srgb,var(--bg) 80%,transparent)',
            borderColor: 'var(--line)',
            color: 'var(--ink)',
          }}
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

      {/* Scanning indicator */}
      {status === 'scanning' && (
        <p className="mt-4 text-sm text-center" style={{ color: 'var(--ink)' }}>
          Checking your site — this takes about 10 seconds…
        </p>
      )}

      {/* Error */}
      {status === 'error' && (
        <p className="mt-4 text-sm text-center" style={{ color: '#ef4444' }}>
          {error}
        </p>
      )}

      {/* Results */}
      {status === 'done' && result && (
        <div className="mt-8 space-y-6">
          <ScanResultCard result={result} />

          {/* Share URL */}
          {shareId && (
            <div
              className="p-4 rounded-xl border"
              style={{
                borderColor: 'var(--line)',
                background: 'color-mix(in srgb,var(--bg) 90%,transparent)',
              }}
            >
              <p
                className="text-xs font-semibold mb-2"
                style={{ color: 'var(--ink)' }}
              >
                Share this report
              </p>
              <div className="flex items-center gap-2">
                <code
                  className="flex-1 text-xs break-all"
                  style={{ color: 'var(--muted, #6b7280)' }}
                >
                  {buildShareUrl()}
                </code>
                <button
                  onClick={handleCopy}
                  className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                  style={{
                    background: copied
                      ? 'color-mix(in srgb,var(--brand) 15%,transparent)'
                      : 'color-mix(in srgb,var(--line) 60%,transparent)',
                    color: copied ? 'var(--brand)' : 'var(--ink)',
                  }}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          )}

          {/* Scan again */}
          <button
            onClick={() => {
              setStatus('idle');
              setResult(null);
              setShareId(null);
              setUrl('');
            }}
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
