import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'LeadRadar — See the customers your website is losing. In 60 seconds.',
  description:
    'Plain-English lead scans for plumbers, HVAC, electricians, handymen, locksmiths, appliance and garage-door pros. Paste your URL. See your score, missed jobs per month, and what to fix. Free. 60 seconds.',
  robots: { index: false, follow: false }, // MVP gate: don't let search engines in yet
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FAFAF7' },
    { media: '(prefers-color-scheme: dark)', color: '#0B0D0C' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
