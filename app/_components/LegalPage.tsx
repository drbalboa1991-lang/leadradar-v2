import { promises as fs } from 'node:fs';
import path from 'node:path';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Props {
  filename: 'TERMS.md' | 'PRIVACY.md';
  title: string;
}

export default async function LegalPage({ filename, title }: Props) {
  const filePath = path.join(process.cwd(), filename);
  const content = await fs.readFile(filePath, 'utf8');

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      {/* Nav */}
      <div className="border-b" style={{ borderColor: 'var(--line)' }}>
        <div className="max-w-3xl mx-auto px-5 md:px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5 no-underline">
            <span
              className="w-7 h-7 rounded-full shrink-0"
              style={{ background: 'var(--brand)' }}
              aria-hidden="true"
            />
            <span
              className="font-extrabold tracking-tight text-base"
              style={{ color: 'var(--ink)' }}
            >
              LeadRadar
            </span>
          </a>
          <span className="text-sm font-semibold" style={{ color: 'var(--muted, #6b7280)' }}>
            {title}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-5 md:px-6 py-12 pb-24">
        <div
          className="prose prose-sm md:prose-base max-w-none"
          style={
            {
              '--tw-prose-body':        'var(--ink)',
              '--tw-prose-headings':    'var(--ink)',
              '--tw-prose-lead':        'var(--muted, #6b7280)',
              '--tw-prose-links':       'var(--brand)',
              '--tw-prose-bold':        'var(--ink)',
              '--tw-prose-counters':    'var(--muted, #6b7280)',
              '--tw-prose-bullets':     'var(--muted, #6b7280)',
              '--tw-prose-hr':          'var(--line)',
              '--tw-prose-quotes':      'var(--ink)',
              '--tw-prose-quote-borders': 'var(--brand)',
              '--tw-prose-captions':    'var(--muted, #6b7280)',
              '--tw-prose-code':        'var(--ink)',
              '--tw-prose-pre-code':    'var(--ink)',
              '--tw-prose-pre-bg':      'color-mix(in srgb,var(--line) 50%,transparent)',
              '--tw-prose-th-borders':  'var(--line)',
              '--tw-prose-td-borders':  'var(--line)',
            } as React.CSSProperties
          }
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {content}
          </ReactMarkdown>
        </div>
      </div>

      {/* Footer */}
      <div
        className="border-t"
        style={{ borderColor: 'var(--line)' }}
      >
        <div
          className="max-w-3xl mx-auto px-5 md:px-6 py-5 flex flex-wrap gap-4 items-center justify-between text-xs"
          style={{ color: 'var(--muted, #6b7280)' }}
        >
          <span>© {new Date().getFullYear()} LeadRadar. All rights reserved.</span>
          <span className="flex gap-4">
            <a href="/terms" style={{ color: 'var(--muted, #6b7280)' }} className="hover:underline">Terms</a>
            <a href="/privacy" style={{ color: 'var(--muted, #6b7280)' }} className="hover:underline">Privacy</a>
            <a href="/" style={{ color: 'var(--muted, #6b7280)' }} className="hover:underline">Back to app</a>
          </span>
        </div>
      </div>
    </div>
  );
}
