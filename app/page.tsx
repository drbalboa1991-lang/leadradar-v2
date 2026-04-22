import { promises as fs } from 'node:fs';
import path from 'node:path';

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
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
