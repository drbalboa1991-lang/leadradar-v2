'use client';

import { useState } from 'react';

type Status = 'idle' | 'submitting' | 'success' | 'already' | 'error';

export default function WaitlistForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('submitting');
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setStatus(res.status === 400 ? 'error' : 'error');
        return;
      }
      setStatus(data.alreadyRegistered ? 'already' : 'success');
    } catch {
      setStatus('error');
    }
  }

  const message: Record<Exclude<Status, 'idle' | 'submitting'>, string> = {
    success: "You're on the list — we'll be in touch.",
    already: "You're already on the list. We'll be in touch soon.",
    error: 'Please enter a valid email address.',
  };

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 w-full">
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          disabled={status === 'submitting' || status === 'success' || status === 'already'}
          className="flex-1 px-4 py-2.5 rounded-lg border text-sm"
          style={{
            background: 'color-mix(in srgb, var(--bg) 80%, transparent)',
            borderColor: 'var(--line)',
            color: 'var(--ink)',
          }}
        />
        <button
          type="submit"
          disabled={status === 'submitting' || status === 'success' || status === 'already'}
          className="px-5 py-2.5 rounded-lg text-sm font-semibold shrink-0 disabled:opacity-50 transition-opacity"
          style={{ background: 'var(--brand)', color: 'var(--brand-ink)' }}
        >
          {status === 'submitting' ? 'Joining…' : 'Join waitlist'}
        </button>
      </form>
      {status !== 'idle' && status !== 'submitting' && (
        <p
          className="text-sm text-center"
          style={{ color: status === 'error' ? '#ef4444' : 'var(--ink)' }}
        >
          {message[status]}
        </p>
      )}
    </div>
  );
}
