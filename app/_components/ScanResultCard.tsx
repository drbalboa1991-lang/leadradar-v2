/**
 * Pure display component for a scan result.
 * No 'use client' — works in both server and client render contexts.
 * Used by ScanForm (live result) and /scan/[id] (persisted share page).
 */
import type { ScanResult } from '@/lib/scan';

const GRADE_COLOR: Record<string, string> = {
  A: '#22c55e',
  B: '#84cc16',
  C: '#f59e0b',
  D: '#f97316',
  F: '#ef4444',
};

export default function ScanResultCard({ result }: { result: ScanResult }) {
  const failed = result.checks.filter(c => !c.passed);

  return (
    <div className="space-y-4">
      {/* Score header */}
      <div
        className="card-lift flex items-center gap-6 p-6 rounded-2xl border"
        style={{
          borderColor: 'var(--line)',
          background: 'color-mix(in srgb,var(--bg) 90%,transparent)',
        }}
      >
        <div className="text-center shrink-0">
          <div
            className="text-6xl font-black"
            style={{ color: GRADE_COLOR[result.grade] ?? '#6b7280' }}
          >
            {result.grade}
          </div>
          <div
            className="text-sm font-semibold mt-1"
            style={{ color: 'var(--ink)' }}
          >
            {result.score}/{result.maxScore} pts
          </div>
        </div>

        <div>
          <p className="font-bold text-lg" style={{ color: 'var(--ink)' }}>
            Missing ~
            <span style={{ color: '#ef4444' }}>
              {result.missedLeadsPerMonth} leads/month
            </span>
          </p>
          <p
            className="text-sm mt-1 break-all"
            style={{ color: 'var(--muted, #6b7280)' }}
          >
            {result.url}
          </p>
          {failed.length === 0 ? (
            <p className="text-sm mt-2" style={{ color: '#22c55e' }}>
              Perfect score — site is fully optimised.
            </p>
          ) : (
            <p
              className="text-sm mt-2"
              style={{ color: 'var(--muted, #6b7280)' }}
            >
              Fix {failed.length} issue{failed.length !== 1 ? 's' : ''} below to
              capture more customers.
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
            style={{
              borderColor: 'var(--line)',
              background: 'color-mix(in srgb,var(--bg) 95%,transparent)',
            }}
          >
            <span className="text-lg shrink-0 mt-0.5">
              {check.passed ? '✅' : '❌'}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span
                  className="text-sm font-semibold"
                  style={{ color: 'var(--ink)' }}
                >
                  {check.name}
                </span>
                <span
                  className="text-xs shrink-0"
                  style={{ color: 'var(--muted, #6b7280)' }}
                >
                  {check.weight} pts
                </span>
              </div>
              {!check.passed && (
                <p
                  className="text-xs mt-1"
                  style={{ color: 'var(--muted, #6b7280)' }}
                >
                  {check.tip}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
