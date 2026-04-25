import type { ScanResult } from './scan';

const BRAND   = '#006E52';
const MUTED   = '#6b7280';
const BG      = '#f9fafb';
const INK     = '#111827';
const RED     = '#ef4444';
const YELLOW  = '#f59e0b';

const GRADE_COLOR: Record<string, string> = {
  A: '#006E52',
  B: '#84cc16',
  C: '#f59e0b',
  D: '#f97316',
  F: '#ef4444',
};

function checkRow(passed: boolean, name: string, tip: string): string {
  return `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;">
        <span style="font-size:14px;">${passed ? '✅' : '❌'}</span>
        <span style="font-size:13px;color:${INK};margin-left:8px;font-weight:${passed ? '400' : '600'};">${name}</span>
        ${!passed ? `<div style="font-size:12px;color:${MUTED};margin-left:24px;margin-top:2px;">${tip}</div>` : ''}
      </td>
    </tr>
  `;
}

function starRating(rating: number): string {
  const full  = Math.round(rating);
  const empty = 5 - full;
  return '★'.repeat(full) + '☆'.repeat(empty);
}

export function buildReportHtml(
  result:   ScanResult,
  shareUrl: string | null,
  options?: { fullPro?: boolean; isBeta?: boolean }
): string {
  const domain      = result.url.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const gradeColor  = GRADE_COLOR[result.grade] ?? MUTED;
  const failed      = result.checks.filter(c => !c.passed);
  const passed      = result.checks.filter(c =>  c.passed);
  const revenueLost = failed.reduce((s, c) => s + c.weight, 0);
  const annualLoss  = Math.round((revenueLost / result.maxScore) * 15) * 12 * 280;

  const proChecks   = result.proChecks ?? [];
  const showPro     = options?.fullPro && proChecks.length > 0;
  const proFailed   = proChecks.filter(c => !c.passed);
  const proPassed   = proChecks.filter(c =>  c.passed);

  const gp          = result.googlePresence;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">

        <!-- Header -->
        <tr>
          <td style="background:${BRAND};padding:28px 32px;text-align:center;">
            ${options?.isBeta ? `<p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.6);">🚀 Beta — Full Pro Report (Free)</p>` : ''}
            <p style="margin:0;font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.7);">LeadRadar Report</p>
            <h1 style="margin:8px 0 0;font-size:22px;font-weight:800;color:#fff;">${domain}</h1>
          </td>
        </tr>

        <!-- Score hero -->
        <tr>
          <td style="padding:32px;text-align:center;border-bottom:1px solid #e5e7eb;">
            <div style="display:inline-block;background:${gradeColor}18;border-radius:50%;width:88px;height:88px;line-height:88px;font-size:48px;font-weight:900;color:${gradeColor};">${result.grade}</div>
            <p style="margin:12px 0 4px;font-size:18px;font-weight:800;color:${INK};">${result.score} / ${result.maxScore} pts</p>
            <p style="margin:0;font-size:15px;color:${RED};font-weight:700;">Estimated ~${result.missedLeadsPerMonth} missed leads / month</p>
            ${annualLoss > 0 ? `<p style="margin:8px 0 0;font-size:13px;color:${MUTED};">Potential annual impact: <strong style="color:${RED};">-$${annualLoss.toLocaleString()}</strong></p>` : ''}
          </td>
        </tr>

        <!-- Issues to fix -->
        ${failed.length > 0 ? `
        <tr>
          <td style="padding:24px 32px;border-bottom:1px solid #e5e7eb;">
            <h2 style="margin:0 0 16px;font-size:15px;font-weight:700;color:${INK};">❌ ${failed.length} issue${failed.length !== 1 ? 's' : ''} costing you leads</h2>
            <table width="100%" cellpadding="0" cellspacing="0">
              ${failed.map(c => checkRow(false, c.name, c.tip)).join('')}
            </table>
          </td>
        </tr>` : ''}

        <!-- What's working -->
        ${passed.length > 0 ? `
        <tr>
          <td style="padding:24px 32px;border-bottom:1px solid #e5e7eb;">
            <h2 style="margin:0 0 16px;font-size:15px;font-weight:700;color:${INK};">✅ ${passed.length} thing${passed.length !== 1 ? 's' : ''} working well</h2>
            <table width="100%" cellpadding="0" cellspacing="0">
              ${passed.map(c => checkRow(true, c.name, '')).join('')}
            </table>
          </td>
        </tr>` : ''}

        <!-- PRO: deep checks -->
        ${showPro ? `
        <tr>
          <td style="padding:24px 32px;border-bottom:1px solid #e5e7eb;background:#f0fdf4;">
            <h2 style="margin:0 0 4px;font-size:15px;font-weight:700;color:${INK};">✨ Pro Deep Scan — 6 advanced checks</h2>
            <p style="margin:0 0 16px;font-size:12px;color:${MUTED};">Live chat, reviews, video, FAQ, financing, guarantee</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              ${[...proFailed, ...proPassed].map(c => checkRow(c.passed, c.name, c.tip)).join('')}
            </table>
          </td>
        </tr>` : ''}

        <!-- PRO: Google Maps presence -->
        ${showPro && gp ? `
        <tr>
          <td style="padding:24px 32px;border-bottom:1px solid #e5e7eb;">
            <h2 style="margin:0 0 16px;font-size:15px;font-weight:700;color:${INK};">🗺️ Google Maps Presence</h2>
            ${gp.found ? `
              <p style="margin:0 0 8px;font-size:13px;color:${INK};">✅ <strong>${gp.name ?? domain}</strong> found on Google Maps${gp.isVerified ? ' · <span style="color:' + BRAND + '">Verified</span>' : ''}</p>
              ${gp.rating ? `
              <p style="margin:0 0 4px;font-size:28px;font-weight:900;color:${INK};">${gp.rating.toFixed(1)}
                <span style="font-size:14px;color:${YELLOW};margin-left:4px;">${starRating(gp.rating)}</span>
                <span style="font-size:13px;font-weight:400;color:${MUTED};margin-left:8px;">${gp.reviewCount} reviews</span>
              </p>
              <p style="margin:0 0 12px;font-size:12px;color:${MUTED};">
                ${(gp.reviewCount ?? 0) < 20 ? '⚠️ Under 20 reviews — many customers won\'t trust you yet. Ask every happy customer to leave a review.' :
                  (gp.reviewCount ?? 0) < 50 ? '📈 Getting there — 50+ reviews is the local trust threshold.' :
                  '💪 Good review volume. Keep asking for reviews after every job.'}
              </p>` : ''}
              ${gp.mapsUrl ? `<a href="${gp.mapsUrl}" style="font-size:13px;color:${BRAND};">View your Google Maps listing →</a>` : ''}
              ${gp.isMock ? `<p style="margin:8px 0 0;font-size:11px;color:${MUTED};font-style:italic;">* Estimated data — live Google lookup coming soon</p>` : ''}
            ` : `
              <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:${RED};">❌ Your business was not found on Google Maps</p>
              <p style="margin:0 0 12px;font-size:13px;color:${MUTED};">"Near me" searches are the #1 way local customers find service businesses. Without a Google Business Profile you are invisible to most mobile searchers.</p>
              <a href="https://business.google.com" style="font-size:13px;color:${BRAND};">Claim your free Google Business Profile →</a>
            `}
          </td>
        </tr>` : ''}

        <!-- CTA -->
        <tr>
          <td style="padding:32px;text-align:center;background:#f0fdf4;">
            ${options?.fullPro ? `
              <p style="margin:0 0 6px;font-size:16px;font-weight:800;color:${INK};">Your full report is above ☝️</p>
              <p style="margin:0 0 20px;font-size:13px;color:${MUTED};">Share it with your web developer or use it as your fix checklist.</p>
              ${shareUrl ? `<a href="${shareUrl}" style="display:inline-block;background:${BRAND};color:#fff;font-size:14px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:10px;">View report online →</a>` : ''}
            ` : `
              <p style="margin:0 0 6px;font-size:16px;font-weight:800;color:${INK};">Want the full pro analysis?</p>
              <p style="margin:0 0 20px;font-size:13px;color:${MUTED};">6 deep checks · Google Maps · industry benchmark · revenue calculator</p>
              ${shareUrl
                ? `<a href="${shareUrl}" style="display:inline-block;background:${BRAND};color:#fff;font-size:14px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:10px;">View full report →</a>`
                : `<a href="https://lead-radar-lake.vercel.app" style="display:inline-block;background:${BRAND};color:#fff;font-size:14px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:10px;">Get full report →</a>`
              }
            `}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;text-align:center;border-top:1px solid #e5e7eb;">
            <p style="margin:0;font-size:12px;color:${MUTED};">
              Sent by <a href="https://lead-radar-lake.vercel.app" style="color:${BRAND};text-decoration:none;">LeadRadar</a>
              &nbsp;·&nbsp; <a href="https://lead-radar-lake.vercel.app/privacy" style="color:${MUTED};text-decoration:none;">Privacy</a>
              &nbsp;·&nbsp; <a href="mailto:support@leadradar.app" style="color:${BRAND};text-decoration:none;">support@leadradar.app</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendReportEmail(
  to:      string,
  result:  ScanResult,
  shareUrl: string | null,
  options?: { fullPro?: boolean; isBeta?: boolean }
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY is not set');

  const { Resend } = await import('resend');
  const resend = new Resend(apiKey);

  const domain  = result.url.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const subject = options?.fullPro
    ? `Your LeadRadar PRO report for ${domain} — Grade ${result.grade} · Full analysis inside`
    : `Your LeadRadar report for ${domain} — Grade ${result.grade} (${result.score}/${result.maxScore})`;

  const { error } = await resend.emails.send({
    from: 'LeadRadar <onboarding@resend.dev>',
    to,
    subject,
    html: buildReportHtml(result, shareUrl, options),
  });

  if (error) throw new Error(error.message);
}
