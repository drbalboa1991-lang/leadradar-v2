'use client';

import { useState } from 'react';
import type { ScanResult } from '@/lib/scan';

type Status = 'idle' | 'scanning' | 'done' | 'error';

const GRADE_COLOR: Record<string, string> = {
  A: '#22c55e',
  B: '#84cc16',
  C: '#f59e0b',
  D: '#f97316',
  F: '#ef4444',
};

export default function ScanForm() {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('scanning');
    setResult(null);
    setError('');

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
      setStatus('done');
    } catch {
      setError('Network error. Please try again.');
      setStatus('error');
    }
  }

  const failed = result?.checks.filter(c => !c.passed) ?? [];

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

      {/* Scanning indicator */}
      {status === 'scanning' && (
        <p className="mt-4 text-sm text-center" style={{ color: 'var(--ink)' }}>
          Checking your site — this takes about 10 seconds…
        </p>
      )}

      {/* Error */}
      {status === 'error' && (
        <p className="mt-4 text-sm text-center" style={{ color: '#ef4444' }}>{error}</p>
      )}

      {/* Results */}
      {status === 'done' && result && (
        <div className="mt-8 space-y-6">
          {/* Score header */}
          <div className="flex items-center gap-6 p-6 rounded-2xl border" style={{ borderColor: 'var(--line)', background: 'color-mix(in srgb,var(--bg) 90%,transparent)' }}>
            <div className="text-center shrink-0">
              <div className="text-6xl font-black" style={{ color: GRADE_COLOR[result.grade] }}>{result.grade}</div>
              <div className="text-sm font-semibold mt-1" style={{ color: 'var(--ink)' }}>{result.score}/{result.maxScore} pts</div>
            </div>
            <div>
              <p className="font-bold text-lg" style={{ color: 'var(--ink)' }}>
                You're missing ~<span style={{ color: '#ef4444' }}>{result.missedLeadsPerMonth} leads/month</span>
              </p>
              <p className="text-sm mt-1" style={{ color: 'var(--muted, #6b7280)' }}>
                {result.url}
              </p>
              {failed.length === 0 ? (
                <p className="text-sm mt-2" style={{ color: '#22c55e' }}>🎉 Perfect score! Your site is fully optimized.</p>
              ) : (
                <p className="text-sm mt-2" style={{ color: 'var(--muted, #6b7280)' }}>
                  Fix the {failed.length} issue{failed.length !== 1 ? 's' : ''} below to capture more customers.
                </p>
              )}
            </div>
          </div>

          {/* Checklist */}
          <div className="space-y-3">
            {result.checks.map(check => (
              <div
                key={check.id}
                className="flex items-start gap-3 p-4 rounded-xl border"
                style={{ borderColor: 'var(--line)', background: 'color-mix(in srgb,var(--bg) 95%,transparent)' }}
              >
                <span className="text-lg shrink-0 mt-0.5">{check.passed ? '✅' : '❌'}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{check.name}</span>
                    <span className="text-xs shrink-0" style={{ color: 'var(--muted, #6b7280)' }}>{check.weight} pts</span>
                  </div>
                  {!check.passed && (
                    <p className="text-xs mt-1" style={{ color: 'var(--muted, #6b7280)' }}>{check.tip}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Scan again */}
          <button
            onClick={() => { setStatus('idle'); setResult(null); setUrl(''); }}
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
