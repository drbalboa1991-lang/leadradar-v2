import type { Metadata } from 'next';
import LegalPage from '../_components/LegalPage';

export const metadata: Metadata = {
  title: 'Terms of Use — LeadRadar',
  description: 'Terms and conditions governing your use of LeadRadar.',
  robots: { index: true, follow: true },
};

export default function TermsPage() {
  return <LegalPage filename="TERMS.md" title="Terms of Use" />;
}
