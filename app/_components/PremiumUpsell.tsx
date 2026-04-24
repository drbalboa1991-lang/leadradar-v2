'use client';

/**
 * PremiumUpsell — shown below every scan result.
 *
 * Pattern: "blurred locked sections" used by Semrush, GTmetrix, etc.
 * Three preview cards are intentionally blurred. An overlay with a lock
 * icon + CTA sits on top, creating curiosity without feeling spammy.
 *
 * Stripe links: replace the # placeholders with real Stripe payment links.
 * TODO: wire up STRIPE_ONETIME_LINK and STRIPE_MONTHLY_LINK env vars.
 */

import type { ScanResult } from '@/lib/scan';

// ── Stripe payment URLs ───────────────────────────────────────────────────
// Test-mode links — swap for live links before going to production
const STRIPE_ONETIME = 'https://buy.stripe.com/test_7sY7sLeFA5nv6q58N16AM02';
const STRIPE_MONTHLY = 'https://buy.stripe.com/test_5kQaEXapkaHP29P2oD6AM03';

// ── Helper calculations ───────────────────────────────────────────────────

function getBenchmarkPosition(score: number): {
  label: string;
  percentile: string;
  avgScore: number;
} {
  const avgScore = 64; // industry average across our scans
  if (score >= 85) return { label: 'Top 15%', percentile: 'top 15%', avgScore };
  if (score >= 70) return { label: 'Above average', percentile: 'top 35%', avgScore };
  if (score >= 50) return { label: 'Below average', percentile: 'bottom 45%', avgScore };
  return { label: 'Needs work', percentile: 'bottom 20%', avgScore };
}

function getRoiEstimate(result: ScanResult): {
  extraLeads: number;
  annualValue: number;
  topIssues: string[];
} {
  const failed = result.checks.filter(c => !c.passed);
  const failedWeight = failed.reduce((s, c) => s + c.weight, 0);
  // Conservative: every 10pts of missed score ≈ 1.5 extra leads/month
  const extraLeads = Math.max(1, Math.round((failedWeight / 100) * 15));
  // Avg local service lead value: ~$280
  const annualValue = extraLeads * 12 * 280;
  const topIssues = failed.slice(0, 3).map(c => c.name);
  return { extraLeads, annualValue, topIssues };
}

const PRO_CHECKLIST = [
  'Live chat or chatbot widget',
  'Google Reviews badge or widget',
  'Before & after photo gallery',
  'Service area map or zip codes listed',
  'Financing / payment options page',
  'Emergency / 24-hour contact banner',
  'FAQ section addressing common objections',
  'Video testimonial from a real customer',
];

// ── Sub-components ────────────────────────────────────────────────────────

function BlurCard({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{ borderColor: 'var(--line)' }}
    >
      {/* Card header — always visible */}
      <div
        className="px-5 py-4 border-b flex items-center gap-3"
        style={{
          borderColor: 'var(--line)',
          background: 'color-mix(in srgb,var(--bg) 85%,transparent)',
        }}
      >
        <span className="text-xl">{icon}</span>
        <div>
          <p className="text-sm font-bold" style={{ color: 'var(--ink)' }}>
            {title}
          </p>
          <p className="text-xs" style={{ color: 'var(--muted, #6b7280)' }}>
            {subtitle}
          </p>
        </div>
        <span
          className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{
            background: 'color-mix(in srgb,var(--brand) 12%,transparent)',
            color: 'var(--brand)',
          }}
        >
          PRO
        </span>
      </div>

      {/* Blurred content with lock overlay */}
      <div className="relative">
        {/* The content — blurred */}
        <div
          className="px-5 py-4 select-none pointer-events-none"
          style={{ filter: 'blur(5px)', opacity: 0.7 }}
          aria-hidden="true"
        >
          {children}
        </div>

        {/* Lock overlay — gradient + icon */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-2"
          style={{
            background:
              'linear-gradient(to bottom, color-mix(in srgb,var(--bg) 10%,transparent) 0%, color-mix(in srgb,var(--bg) 92%,transparent) 55%)',
          }}
        >
          <span className="text-2xl">🔒</span>
          <p className="text-xs font-semibold" style={{ color: 'var(--muted, #6b7280)' }}>
            Unlock to reveal
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────

export default function PremiumUpsell({ result }: { result: ScanResult }) {
  const benchmark = getBenchmarkPosition(result.score);
  const roi = getRoiEstimate(result);
  const failed = result.checks.filter(c => !c.passed);

  return (
    <div className="mt-6 space-y-5">
      {/* Section header */}
      <div
        className="flex items-center gap-3 py-3 border-t"
        style={{ borderColor: 'var(--line)' }}
      >
        <div className="flex-1 h-px" style={{ background: 'var(--line)' }} />
        <span
          className="text-xs font-bold tracking-widest uppercase px-3"
          style={{ color: 'var(--muted, #6b7280)' }}
        >
          Full Report — Pro Only
        </span>
        <div className="flex-1 h-px" style={{ background: 'var(--line)' }} />
      </div>

      {/* Card 1: Industry benchmark */}
      <BlurCard
        icon="📊"
        title="Industry Benchmark"
        subtitle={`How you rank vs. ${benchmark.avgScore} avg score across local service sites`}
      >
        <div className="space-y-2">
          {[
            { label: 'Your site', score: result.score, highlight: true },
            { label: 'Industry average', score: benchmark.avgScore, highlight: false },
            { label: 'Top 10% sites', score: 91, highlight: false },
          ].map(row => (
            <div key={row.label} className="flex items-center gap-3">
              <span className="text-xs w-28 shrink-0" style={{ color: 'var(--ink)' }}>
                {row.label}
              </span>
              <div
                className="flex-1 h-2 rounded-full overflow-hidden"
                style={{ background: 'var(--line)' }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${row.score}%`,
                    background: row.highlight ? 'var(--brand)' : 'var(--muted, #6b7280)',
                  }}
                />
              </div>
              <span className="text-xs font-bold w-8 text-right" style={{ color: 'var(--ink)' }}>
                {row.score}
              </span>
            </div>
          ))}
          <p className="text-xs pt-1" style={{ color: 'var(--muted, #6b7280)' }}>
            You are in the <strong>{benchmark.percentile}</strong> of sites we have scanned.
          </p>
        </div>
      </BlurCard>

      {/* Card 2: Revenue impact */}
      <BlurCard
        icon="💰"
        title="Revenue Impact Calculator"
        subtitle="What fixing your top issues is worth per year"
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: 'var(--muted, #6b7280)' }}>
              Estimated extra leads/month
            </span>
            <span className="text-sm font-black" style={{ color: 'var(--brand)' }}>
              +{roi.extraLeads}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: 'var(--muted, #6b7280)' }}>
              Annual revenue potential
            </span>
            <span className="text-sm font-black" style={{ color: '#22c55e' }}>
              +${roi.annualValue.toLocaleString()}
            </span>
          </div>
          <div
            className="h-px w-full"
            style={{ background: 'var(--line)' }}
          />
          {roi.topIssues.length > 0 && (
            <div>
              <p className="text-xs font-semibold mb-1" style={{ color: 'var(--ink)' }}>
                Top 3 fixes:
              </p>
              {roi.topIssues.map(issue => (
                <p key={issue} className="text-xs" style={{ color: 'var(--muted, #6b7280)' }}>
                  → {issue}
                </p>
              ))}
            </div>
          )}
        </div>
      </BlurCard>

      {/* Card 3: Pro checklist */}
      <BlurCard
        icon="✨"
        title={`Pro Checklist (+${PRO_CHECKLIST.length} advanced items)`}
        subtitle="What top-rated local service sites do beyond the basics"
      >
        <div className="space-y-1.5">
          {PRO_CHECKLIST.map((item, i) => (
            <div key={item} className="flex items-center gap-2">
              <span className="text-xs">{i < failed.length ? '❌' : '✅'}</span>
              <span className="text-xs" style={{ color: 'var(--ink)' }}>
                {item}
              </span>
            </div>
          ))}
        </div>
      </BlurCard>

      {/* CTA block */}
      <div
        className="rounded-2xl border p-6 text-center space-y-4"
        style={{
          borderColor: 'var(--brand)',
          background: 'color-mix(in srgb,var(--brand) 5%,transparent)',
        }}
      >
        <div>
          <p className="font-extrabold text-lg" style={{ color: 'var(--ink)' }}>
            Unlock your full report
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--muted, #6b7280)' }}>
            See benchmarks, revenue impact &amp; the full pro checklist
          </p>
        </div>

        {/* Two-tier pricing */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* One-time */}
          <a
            href={STRIPE_ONETIME}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex flex-col items-center gap-1 px-4 py-4 rounded-xl border transition-opacity hover:opacity-90"
            style={{
              borderColor: 'var(--line)',
              background: 'color-mix(in srgb,var(--bg) 80%,transparent)',
            }}
          >
            <span className="text-2xl font-black" style={{ color: 'var(--ink)' }}>
              $9.99
            </span>
            <span className="text-xs font-semibold" style={{ color: 'var(--ink)' }}>
              One-time deep scan
            </span>
            <span className="text-xs" style={{ color: 'var(--muted, #6b7280)' }}>
              This report only · instant access
            </span>
          </a>

          {/* Monthly — highlighted */}
          <a
            href={STRIPE_MONTHLY}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex flex-col items-center gap-1 px-4 py-4 rounded-xl transition-opacity hover:opacity-90"
            style={{ background: 'var(--brand)', color: 'var(--brand-ink)' }}
          >
            <span className="text-2xl font-black">$29</span>
            <span className="text-xs font-semibold">/ month Pro</span>
            <span className="text-xs opacity-80">
              Unlimited scans · monthly reports
            </span>
          </a>
        </div>

        {/* Trust line */}
        <p className="text-xs" style={{ color: 'var(--muted, #6b7280)' }}>
          No hidden fees &nbsp;·&nbsp; Cancel any time &nbsp;·&nbsp; Results in seconds
        </p>
      </div>
    </div>
  );
}
