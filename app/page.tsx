import { promises as fs } from 'node:fs';
import path from 'node:path';
import WaitlistForm from './_components/WaitlistForm';
import ScanForm from './_components/ScanForm';

/**
 * Home (protected) route.
 *
 * The landing page is a large hand-written HTML + vanilla-JS block. Rather than
 * transliterate 800+ lines into JSX, we render the body verbatim with
 * dangerouslySetInnerHTML. This works because:
 *   1. The file is loaded on the server (no client bundle cost).
 *   2. `<script>` tags inside an SSR'd HTML string execute on initial parse,
 *      which is exactly what we want — the demo is client-side anyway.
 *
 * Access control lives in middleware.ts, so by the time a request reaches this
 * component the user is already authenticated (or the edge runtime has 303'd
 * them to /login).
 */

// Cache the file contents at module scope so we only hit disk once per server
// instance, not per request.
let cachedHtml: string | null = null;

async function getLandingHtml(): Promise<string> {
  if (cachedHtml) return cachedHtml;
  const filePath = path.join(process.cwd(), 'app', 'landing.html');
  cachedHtml = await fs.readFile(filePath, 'utf8');
  return cachedHtml;
}

export default async function HomePage() {
  const html = await getLandingHtml();
  // Inline scripts in the injected HTML mutate the DOM during parse, so the
  // post-script DOM no longer matches React's SSR tree. We render the HTML
  // verbatim and opt out of hydration reconciliation for this subtree.
  return (
    <>
      {/* Scan section — above landing content so it's the first thing logged-in users see */}
      <section
        className="max-w-5xl mx-auto px-5 md:px-6 pt-14 pb-12 text-center"
      >
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3" style={{ color: 'var(--ink)' }}>
          See the customers your website is losing
        </h1>
        <p className="text-base mb-8" style={{ color: 'var(--muted, #6b7280)' }}>
          Paste your URL. Get your score in 10 seconds.
        </p>
        <ScanForm />
      </section>

      <div suppressHydrationWarning dangerouslySetInnerHTML={{ __html: html }} />
      <section
        className="max-w-5xl mx-auto px-5 md:px-6 py-16 text-center border-t"
        style={{ borderColor: 'var(--line)' }}
      >
        <h2 className="text-2xl font-extrabold tracking-tight mb-2" style={{ color: 'var(--ink)' }}>
          Get early access
        </h2>
        <p className="text-sm mb-6" style={{ color: 'var(--muted, #6b7280)' }}>
          Be first to know when LeadRadar opens to the public.
        </p>
        <WaitlistForm />
      </section>
    </>
  );
}
