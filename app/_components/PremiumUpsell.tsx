'use client';

import { useState, useEffect } from 'react';
import type { ScanResult, ScanCheck, GooglePresence } from '@/lib/scan';

const IS_BETA = process.env.NEXT_PUBLIC_EARLY_ACCESS === 'true';

interface Props {
  result: ScanResult;
  scanId: string | null;   // share ID — null if save failed
  paid: boolean;           // true after payment confirmed
}

// ── Helpers ───────────────────────────────────────────────────────────────

function getBenchmark(score: number) {
  const avg = 64;
  const top = 91;
  const percentile =
    score >= 85 ? 'top 15%' :
    score >= 70 ? 'top 35%' :
    score >= 50 ? 'bottom 45%' : 'bottom 20%';
  return { avg, top, percentile };
}

function getRoi(result: ScanResult) {
  const failedWeight = result.checks.filter(c => !c.passed).reduce((s, c) => s + c.weight, 0);
  const extraLeads   = Math.max(1, Math.round((failedWeight / 100) * 15));
  const annualValue  = extraLeads * 12 * 280;
  return { extraLeads, annualValue };
}

// ── Blurred preview card (shown when not paid) ────────────────────────────

function LockedCard({ icon, title, subtitle, children }: {
  icon: string; title: string; subtitle: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--line)' }}>
      <div className="px-5 py-4 border-b flex items-center gap-3"
        style={{ borderColor: 'var(--line)', background: 'color-mix(in srgb,var(--bg) 85%,transparent)' }}>
        <span className="text-xl">{icon}</span>
        <div>
          <p className="text-sm font-bold" style={{ color: 'var(--ink)' }}>{title}</p>
          <p className="text-xs" style={{ color: 'var(--muted, #6b7280)' }}>{subtitle}</p>
        </div>
        <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{ background: 'color-mix(in srgb,var(--brand) 12%,transparent)', color: 'var(--brand)' }}>
          PRO
        </span>
      </div>
      <div className="relative">
        <div className="px-5 py-4 select-none pointer-events-none"
          style={{ filter: 'blur(5px)', opacity: 0.7 }} aria-hidden="true">
          {children}
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2"
          style={{ background: 'linear-gradient(to bottom, color-mix(in srgb,var(--bg) 10%,transparent) 0%, color-mix(in srgb,var(--bg) 92%,transparent) 55%)' }}>
          <span className="text-2xl">🔒</span>
          <p className="text-xs font-semibold" style={{ color: 'var(--muted, #6b7280)' }}>Unlock to reveal</p>
        </div>
      </div>
    </div>
  );
}

// ── Unlocked card (shown after payment) ───────────────────────────────────

function UnlockedCard({ icon, title, children }: {
  icon: string; title: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--brand)' }}>
      <div className="px-5 py-4 border-b flex items-center gap-3"
        style={{ borderColor: 'var(--brand)', background: 'color-mix(in srgb,var(--brand) 8%,transparent)' }}>
        <span className="text-xl">{icon}</span>
        <p className="text-sm font-bold" style={{ color: 'var(--ink)' }}>{title}</p>
        <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{ background: 'var(--brand)', color: 'var(--brand-ink)' }}>
          ✓ UNLOCKED
        </span>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

// ── Pro checklist row ─────────────────────────────────────────────────────

function ProCheckRow({ check }: { check: ScanCheck }) {
  return (
    <div className="flex items-start gap-3 py-2 border-b last:border-0"
      style={{ borderColor: 'var(--line)' }}>
      <span className="text-base shrink-0 mt-0.5">{check.passed ? '✅' : '❌'}</span>
      <div className="flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{check.name}</span>
          <span className="text-xs shrink-0" style={{ color: 'var(--muted, #6b7280)' }}>{check.weight} pts</span>
        </div>
        {!check.passed && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted, #6b7280)' }}>{check.tip}</p>
        )}
      </div>
    </div>
  );
}

// ── Google Maps presence card ─────────────────────────────────────────────

function GooglePresenceCard({ presence }: { presence?: GooglePresence }) {
  if (!presence) return null;

  const stars = presence.rating
    ? '★'.repeat(Math.round(presence.rating)) + '☆'.repeat(5 - Math.round(presence.rating))
    : null;

  return (
    <UnlockedCard icon="🗺️" title="Google Maps Presence">
      {presence.found ? (
        <div className="space-y-3">
          {/* Found row */}
          <div className="flex items-center gap-2">
            <span className="text-base">✅</span>
            <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
              {presence.name ? `"${presence.name}" found on Google Maps` : 'Business found on Google Maps'}
            </span>
            {presence.isVerified && (
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                style={{ background: 'color-mix(in srgb,var(--brand) 12%,transparent)', color: 'var(--brand)' }}>
                Verified
              </span>
            )}
          </div>

          {/* Rating */}
          {presence.rating && (
            <div className="flex items-center gap-3 p-3 rounded-xl"
              style={{ background: 'color-mix(in srgb,var(--bg) 60%,transparent)', border: '1px solid var(--line)' }}>
              <div>
                <p className="text-2xl font-black leading-none" style={{ color: 'var(--ink)' }}>
                  {presence.rating.toFixed(1)}
                </p>
                <p className="text-xs mt-0.5" style={{ color: '#f59e0b', letterSpacing: '0.05em' }}>
                  {stars}
                </p>
              </div>
              <div className="h-8 w-px" style={{ background: 'var(--line)' }} />
              <div>
                <p className="text-sm font-bold" style={{ color: 'var(--ink)' }}>
                  {presence.reviewCount} review{presence.reviewCount !== 1 ? 's' : ''}
                </p>
                <p className="text-xs" style={{ color: 'var(--muted, #6b7280)' }}>
                  {(presence.reviewCount ?? 0) < 20
                    ? 'Under 20 reviews — many customers won\'t trust you yet'
                    : (presence.reviewCount ?? 0) < 50
                    ? 'Getting there — 50+ is the trust threshold'
                    : 'Good review volume — keep it growing'}
                </p>
              </div>
            </div>
          )}

          {/* Photos */}
          <div className="flex items-center gap-2">
            <span>{presence.hasPhotos ? '✅' : '❌'}</span>
            <span className="text-xs" style={{ color: 'var(--muted, #6b7280)' }}>
              {presence.hasPhotos
                ? 'Business has photos on Google Maps'
                : 'No photos on Google Maps — listings with photos get 42% more direction requests'}
            </span>
          </div>

          {/* Link */}
          {presence.mapsUrl && (
            <a href={presence.mapsUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold hover:underline"
              style={{ color: 'var(--brand)' }}>
              View on Google Maps →
            </a>
          )}

          {/* Mock disclaimer */}
          {presence.isMock && (
            <p className="text-xs italic mt-1" style={{ color: 'var(--muted, #6b7280)' }}>
              * Preview data — live Google lookup coming soon
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-base">❌</span>
            <span className="text-sm font-semibold" style={{ color: 'var(--accent, #B8371A)' }}>
              Business not found on Google Maps
            </span>
          </div>
          <p className="text-xs" style={{ color: 'var(--muted, #6b7280)' }}>
            "Near me" searches are the #1 way local customers find service pros.
            Without a Google Business Profile you are invisible to most mobile searchers.
          </p>
          <a href="https://business.google.com" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold hover:underline"
            style={{ color: 'var(--brand)' }}>
            Claim your free Google Business Profile →
          </a>
          {presence.isMock && (
            <p className="text-xs italic" style={{ color: 'var(--muted, #6b7280)' }}>
              * Preview data — live Google lookup coming soon
            </p>
          )}
        </div>
      )}
    </UnlockedCard>
  );
}

// ── Main component ────────────────────────────────────────────────────────

export default function PremiumUpsell({ result, scanId, paid }: Props) {
  const [loading,       setLoading]       = useState<'onetime' | 'monthly' | null>(null);
  const [betaEmail,     setBetaEmail]     = useState('');
  const [betaStatus,    setBetaStatus]    = useState<'idle' | 'sending' | 'sent' | 'full' | 'error'>('idle');
  const [betaCount,     setBetaCount]     = useState<number | null>(null);
  const [betaRemaining, setBetaRemaining] = useState<number | null>(null);

  const benchmark = getBenchmark(result.score);
  const roi       = getRoi(result);
  const proChecks = result.proChecks ?? [];

  // Fetch beta counter on mount (only in beta mode)
  useEffect(() => {
    if (!IS_BETA) return;
    fetch('/api/early-access')
      .then(r => r.json())
      .then(d => {
        if (d.ok) {
          setBetaCount(d.count);
          setBetaRemaining(d.remaining);
          if (!d.open) setBetaStatus('full');
        }
      })
      .catch(() => {});
  }, []);

  async function handleBetaSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!betaEmail.trim()) return;
    setBetaStatus('sending');
    try {
      const res  = await fetch('/api/early-access', {
        method:  'POST',
        headers: { 'content-type': 'application/json' },
        body:    JSON.stringify({ email: betaEmail, result, shareId: scanId }),
      });
      const data = await res.json();
      if (data.ok) {
        setBetaStatus('sent');
        setBetaCount(data.count);
        setBetaRemaining(data.remaining);
      } else if (data.error === 'early_access_full') {
        setBetaStatus('full');
      } else {
        setBetaStatus('error');
      }
    } catch {
      setBetaStatus('error');
    }
  }

  async function handlePay(plan: 'onetime' | 'monthly') {
    if (!scanId) return;
    setLoading(plan);
    try {
      const res  = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ scanId, plan }),
      });
      const data = await res.json();
      if (data.url) window.open(data.url, '_blank');
    } catch {
      alert('Could not open checkout. Please try again.');
    } finally {
      setLoading(null);
    }
  }

  // ── UNLOCKED VIEW ──────────────────────────────────────────────────────
  if (paid) {
    const proFailed = proChecks.filter(c => !c.passed);
    const proScore  = proChecks.filter(c => c.passed).reduce((s, c) => s + c.weight, 0);
    const proMax    = proChecks.reduce((s, c) => s + c.weight, 0);

    return (
      <div className="mt-6 space-y-5">
        <div className="flex items-center gap-3 py-3 border-t" style={{ borderColor: 'var(--brand)' }}>
          <div className="flex-1 h-px" style={{ background: 'var(--brand)' }} />
          <span className="text-xs font-bold tracking-widest uppercase px-3" style={{ color: 'var(--brand)' }}>
            ✓ Pro Report Unlocked
          </span>
          <div className="flex-1 h-px" style={{ background: 'var(--brand)' }} />
        </div>

        {/* Industry benchmark */}
        <UnlockedCard icon="📊" title="Industry Benchmark">
          <div className="space-y-2">
            {[
              { label: 'Your site', score: result.score, highlight: true },
              { label: 'Industry average', score: benchmark.avg, highlight: false },
              { label: 'Top 10% sites', score: benchmark.top, highlight: false },
            ].map(row => (
              <div key={row.label} className="flex items-center gap-3">
                <span className="text-xs w-28 shrink-0" style={{ color: 'var(--ink)' }}>{row.label}</span>
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--line)' }}>
                  <div className="h-full rounded-full"
                    style={{ width: `${row.score}%`, background: row.highlight ? 'var(--brand)' : 'var(--muted, #6b7280)' }} />
                </div>
                <span className="text-xs font-bold w-8 text-right" style={{ color: 'var(--ink)' }}>{row.score}</span>
              </div>
            ))}
            <p className="text-xs pt-1" style={{ color: 'var(--muted, #6b7280)' }}>
              You are in the <strong>{benchmark.percentile}</strong> of local service sites we have scanned.
            </p>
          </div>
        </UnlockedCard>

        {/* Revenue impact */}
        <UnlockedCard icon="💰" title="Revenue Impact Calculator">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: 'var(--muted, #6b7280)' }}>Potential extra leads/month</span>
              <span className="text-sm font-black" style={{ color: 'var(--brand)' }}>+{roi.extraLeads}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: 'var(--muted, #6b7280)' }}>Annual revenue potential</span>
              <span className="text-sm font-black" style={{ color: '#22c55e' }}>+${roi.annualValue.toLocaleString()}</span>
            </div>
            <p className="text-xs" style={{ color: 'var(--muted, #6b7280)' }}>
              Based on avg $280 lead value × {roi.extraLeads} extra leads/month from fixing your top issues.
            </p>
          </div>
        </UnlockedCard>

        {/* Google Maps presence */}
        <GooglePresenceCard presence={result.googlePresence} />

        {/* Deep pro checklist */}
        <UnlockedCard icon="✨" title={`Pro Deep Scan — ${proScore}/${proMax} pts`}>
          {proChecks.length > 0 ? (
            <div>
              {proChecks.map(c => <ProCheckRow key={c.id} check={c} />)}
              {proFailed.length === 0 ? (
                <p className="text-sm mt-3 text-center" style={{ color: '#22c55e' }}>
                  Perfect pro score! Your site has everything top performers use.
                </p>
              ) : (
                <p className="text-xs mt-3" style={{ color: 'var(--muted, #6b7280)' }}>
                  Fix {proFailed.length} advanced issue{proFailed.length !== 1 ? 's' : ''} above to pull further ahead of competitors.
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs" style={{ color: 'var(--muted, #6b7280)' }}>Pro checks not available for this scan.</p>
          )}
        </UnlockedCard>
      </div>
    );
  }

  // ── LOCKED VIEW (not yet paid) ─────────────────────────────────────────
  return (
    <div className="mt-6 space-y-5">
      <div className="flex items-center gap-3 py-3 border-t" style={{ borderColor: 'var(--line)' }}>
        <div className="flex-1 h-px" style={{ background: 'var(--line)' }} />
        <span className="text-xs font-bold tracking-widest uppercase px-3" style={{ color: 'var(--muted, #6b7280)' }}>
          Full Report — Pro Only
        </span>
        <div className="flex-1 h-px" style={{ background: 'var(--line)' }} />
      </div>

      <LockedCard icon="📊" title="Industry Benchmark"
        subtitle={`How you rank vs. ${benchmark.avg} avg score across local service sites`}>
        <div className="space-y-2">
          {[
            { label: 'Your site', score: result.score },
            { label: 'Industry avg', score: benchmark.avg },
            { label: 'Top 10%', score: benchmark.top },
          ].map(row => (
            <div key={row.label} className="flex items-center gap-3">
              <span className="text-xs w-24">{row.label}</span>
              <div className="flex-1 h-2 rounded-full bg-gray-200">
                <div className="h-full rounded-full bg-gray-400" style={{ width: `${row.score}%` }} />
              </div>
              <span className="text-xs font-bold">{row.score}</span>
            </div>
          ))}
        </div>
      </LockedCard>

      <LockedCard icon="💰" title="Revenue Impact Calculator"
        subtitle="What fixing your top issues is worth per year">
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-xs">Extra leads/month</span>
            <span className="text-xs font-bold">+{roi.extraLeads}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs">Annual revenue potential</span>
            <span className="text-xs font-bold">+${roi.annualValue.toLocaleString()}</span>
          </div>
        </div>
      </LockedCard>

      <LockedCard icon="✨" title="Pro Deep Scan (+6 advanced checks)"
        subtitle="Live chat, reviews, video, FAQ, financing, guarantee">
        <div className="space-y-1">
          {['Live chat widget', 'Customer reviews on-site', 'Video content', 'FAQ section'].map(name => (
            <div key={name} className="flex items-center gap-2">
              <span className="text-xs">⬜</span>
              <span className="text-xs">{name}</span>
            </div>
          ))}
        </div>
      </LockedCard>

      {/* CTA — beta email form or Stripe */}
      {IS_BETA && betaStatus !== 'full' ? (
        <div className="rounded-2xl border p-6 space-y-4"
          style={{ borderColor: 'var(--brand)', background: 'color-mix(in srgb,var(--brand) 5%,transparent)' }}>

          {/* Counter */}
          {betaCount !== null && betaRemaining !== null && (
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--line)' }}>
                <div className="h-full rounded-full transition-all"
                  style={{ width: `${(betaCount / 1000) * 100}%`, background: 'var(--brand)' }} />
              </div>
              <span className="text-xs font-semibold shrink-0" style={{ color: 'var(--brand)' }}>
                {betaRemaining} of 1,000 spots left
              </span>
            </div>
          )}

          <div>
            <span className="text-xs font-bold tracking-widest uppercase px-2 py-0.5 rounded-full"
              style={{ background: 'var(--brand)', color: '#fff' }}>
              🚀 Beta Launch — Free
            </span>
            <p className="font-extrabold text-lg mt-2" style={{ color: 'var(--ink)' }}>
              Get your full pro analysis — free
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--muted, #6b7280)' }}>
              Enter your email. We send you the complete report instantly.
              No credit card. No catch. First 1,000 businesses only.
            </p>
          </div>

          {/* What's included */}
          <div className="grid grid-cols-2 gap-1.5 text-xs" style={{ color: 'var(--ink)' }}>
            {['📊 Industry benchmark', '💰 Revenue calculator', '✨ 6 deep checks', '🗺️ Google Maps status'].map(item => (
              <div key={item} className="flex items-center gap-1.5">
                <span>{item}</span>
              </div>
            ))}
          </div>

          {betaStatus === 'sent' ? (
            <div className="text-center py-3">
              <p className="text-2xl mb-1">✉️</p>
              <p className="font-extrabold" style={{ color: 'var(--brand)' }}>Report on its way!</p>
              <p className="text-xs mt-1" style={{ color: 'var(--muted, #6b7280)' }}>
                Check your inbox — full analysis with all pro checks inside.
              </p>
            </div>
          ) : (
            <form onSubmit={handleBetaSubmit} className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                value={betaEmail}
                onChange={e => setBetaEmail(e.target.value)}
                placeholder="your@email.com"
                required
                disabled={betaStatus === 'sending'}
                className="flex-1 px-4 py-3 rounded-xl border text-sm disabled:opacity-60 outline-none"
                style={{ borderColor: 'var(--line)', background: 'var(--bg)', color: 'var(--ink)' }}
              />
              <button
                type="submit"
                disabled={betaStatus === 'sending'}
                className="px-5 py-3 rounded-xl text-sm font-bold shrink-0 disabled:opacity-60 transition-opacity"
                style={{ background: 'var(--brand)', color: '#fff' }}
              >
                {betaStatus === 'sending' ? 'Sending…' : 'Send my free report →'}
              </button>
            </form>
          )}

          {betaStatus === 'error' && (
            <p className="text-xs" style={{ color: '#ef4444' }}>Something went wrong. Please try again.</p>
          )}

          <p className="text-xs" style={{ color: 'var(--muted, #6b7280)' }}>
            We store your email to send the report and occasional updates.
            Unsubscribe any time. See our <a href="/privacy" style={{ color: 'var(--brand)' }}>Privacy Policy</a>.
          </p>
        </div>
      ) : IS_BETA && betaStatus === 'full' ? (
        /* Beta is full — show Stripe */
        <div className="rounded-2xl border p-5 text-center space-y-2"
          style={{ borderColor: 'var(--line)', background: 'color-mix(in srgb,var(--bg) 90%,transparent)' }}>
          <p className="font-extrabold" style={{ color: 'var(--ink)' }}>Beta spots filled 🎉</p>
          <p className="text-sm" style={{ color: 'var(--muted, #6b7280)' }}>
            All 1,000 free spots are taken. Unlock your full report below.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 mt-3">
            <button onClick={() => handlePay('onetime')} disabled={!scanId || loading !== null}
              className="flex-1 px-4 py-3 rounded-xl border text-sm font-bold disabled:opacity-50 hover:opacity-90 transition-opacity"
              style={{ borderColor: 'var(--line)', background: 'color-mix(in srgb,var(--bg) 80%,transparent)', color: 'var(--ink)' }}>
              {loading === 'onetime' ? 'Opening…' : '$9.99 one-time'}
            </button>
            <button onClick={() => handlePay('monthly')} disabled={!scanId || loading !== null}
              className="flex-1 px-4 py-3 rounded-xl text-sm font-bold disabled:opacity-50 hover:opacity-90 transition-opacity"
              style={{ background: 'var(--brand)', color: '#fff' }}>
              {loading === 'monthly' ? 'Opening…' : '$29/month — unlimited'}
            </button>
          </div>
        </div>
      ) : (
        /* Not beta — show Stripe normally */
        <div className="rounded-2xl border p-6 text-center space-y-4"
          style={{ borderColor: 'var(--brand)', background: 'color-mix(in srgb,var(--brand) 5%,transparent)' }}>
          <div>
            <p className="font-extrabold text-lg" style={{ color: 'var(--ink)' }}>Unlock your full pro report</p>
            <p className="text-sm mt-1" style={{ color: 'var(--muted, #6b7280)' }}>
              Benchmark vs. industry · revenue calculator · 6 deep checks
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={() => handlePay('onetime')} disabled={!scanId || loading !== null}
              className="flex-1 flex flex-col items-center gap-1 px-4 py-4 rounded-xl border transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ borderColor: 'var(--line)', background: 'color-mix(in srgb,var(--bg) 80%,transparent)' }}>
              <span className="text-2xl font-black" style={{ color: 'var(--ink)' }}>$9.99</span>
              <span className="text-xs font-semibold" style={{ color: 'var(--ink)' }}>
                {loading === 'onetime' ? 'Opening…' : 'One-time deep scan'}
              </span>
              <span className="text-xs" style={{ color: 'var(--muted, #6b7280)' }}>This report only · instant access</span>
            </button>
            <button onClick={() => handlePay('monthly')} disabled={!scanId || loading !== null}
              className="flex-1 flex flex-col items-center gap-1 px-4 py-4 rounded-xl transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: 'var(--brand)', color: 'var(--brand-ink)' }}>
              <span className="text-2xl font-black">$29</span>
              <span className="text-xs font-semibold">
                {loading === 'monthly' ? 'Opening…' : '/ month Pro'}
              </span>
              <span className="text-xs opacity-80">Unlimited scans · monthly reports</span>
            </button>
          </div>
          <p className="text-xs" style={{ color: 'var(--muted, #6b7280)' }}>
            No hidden fees &nbsp;·&nbsp; Cancel any time
          </p>
        </div>
      )}
    </div>
  );
}
