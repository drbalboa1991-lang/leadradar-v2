import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getScan, isPaid } from '@/lib/scanStore';
import ScanResultCard from '@/app/_components/ScanResultCard';
import PremiumUpsell from '@/app/_components/PremiumUpsell';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id }   = await params;
  const result   = await getScan(id);
  if (!result) return { title: 'Report not found — LeadRadar' };
  const domain   = result.url.replace(/^https?:\/\//, '').replace(/\/$/, '');
  return {
    title: `${domain} scored ${result.grade} — LeadRadar`,
    description: `This site is missing ~${result.missedLeadsPerMonth} leads/month. See the full audit on LeadRadar.`,
    robots: { index: false, follow: false },
  };
}

export default async function ScanSharePage({ params }: Props) {
  const { id }   = await params;
  const [result, paid] = await Promise.all([getScan(id), isPaid(id)]);

  if (!result) notFound();

  const scannedDate = new Date(result.scannedAt).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });

  return (
    <main className="max-w-2xl mx-auto px-5 md:px-6 py-14">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="inline-block text-xs font-semibold px-3 py-1 rounded-full mb-4"
          style={{ background: 'color-mix(in srgb,var(--brand) 12%,transparent)', color: 'var(--brand)' }}>
          LeadRadar Report
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-2" style={{ color: 'var(--ink)' }}>
          Website Lead Audit
        </h1>
        <p className="text-sm" style={{ color: 'var(--muted, #6b7280)' }}>
          Scanned {scannedDate}
          {paid && <span className="ml-2 text-xs font-semibold" style={{ color: 'var(--brand)' }}>· ✓ Pro</span>}
        </p>
      </div>

      <ScanResultCard result={result} />

      {/* Premium section — shows full content if paid, locked if not */}
      <PremiumUpsell result={result} scanId={id} paid={paid} />

      <div className="my-10 border-t" style={{ borderColor: 'var(--line)' }} />

      <div className="text-center">
        <p className="text-sm mb-5" style={{ color: 'var(--muted, #6b7280)' }}>
          Want to know how many leads <em>your</em> site is losing?
        </p>
        <a href="/"
          className="inline-block px-7 py-3 rounded-xl text-sm font-bold transition-opacity hover:opacity-90"
          style={{ background: 'var(--brand)', color: 'var(--brand-ink)' }}>
          Scan my site free →
        </a>
      </div>
    </main>
  );
}
