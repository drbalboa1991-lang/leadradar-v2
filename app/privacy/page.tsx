import type { Metadata } from 'next';
import LegalPage from '../_components/LegalPage';

export const metadata: Metadata = {
  title: 'Privacy Policy — LeadRadar',
  description: 'How LeadRadar collects, uses, and protects your information.',
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return <LegalPage filename="PRIVACY.md" title="Privacy Policy" />;
}
