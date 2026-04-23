export interface ScanCheck {
  id: string;
  name: string;
  passed: boolean;
  weight: number;
  tip: string;
}

export interface ScanResult {
  url: string;
  score: number;
  maxScore: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  checks: ScanCheck[];
  missedLeadsPerMonth: number;
  scannedAt: string;
}

const PHONE_RE = /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const HOURS_RE = /\b(mon|tue|wed|thu|fri|sat|sun|monday|tuesday|wednesday|thursday|friday|saturday|sunday|open|closed|hours|am|pm)\b/i;
const CTA_RE = /\b(call|contact|get a quote|free estimate|book|schedule|request|hire|get started|click here)\b/i;
const SOCIAL_RE = /facebook\.com|instagram\.com|twitter\.com|x\.com|linkedin\.com|yelp\.com|nextdoor\.com/i;
const ADDRESS_RE = /\b\d{2,5}\s+\w+\s+(st|street|ave|avenue|blvd|boulevard|rd|road|dr|drive|ln|lane|way|ct|court|pl|place)\b/i;

async function fetchPage(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'LeadRadar/1.0 (site quality scanner; +https://lead-radar-lake.vercel.app)' },
      redirect: 'follow',
    });
    const text = await res.text();
    return text.slice(0, 500_000); // cap at 500KB
  } finally {
    clearTimeout(timer);
  }
}

function normalizeUrl(raw: string): string {
  const s = raw.trim();
  if (/^https?:\/\//i.test(s)) return s;
  return `https://${s}`;
}

export async function scanWebsite(rawUrl: string): Promise<ScanResult> {
  const url = normalizeUrl(rawUrl);
  const html = await fetchPage(url);
  const lower = html.toLowerCase();

  const checks: ScanCheck[] = [
    {
      id: 'https',
      name: 'Secure site (HTTPS)',
      passed: url.startsWith('https://'),
      weight: 5,
      tip: 'Switch to HTTPS. Google penalizes non-HTTPS sites and customers see a "Not Secure" warning.',
    },
    {
      id: 'phone',
      name: 'Phone number visible',
      passed: PHONE_RE.test(html),
      weight: 20,
      tip: 'Add your phone number prominently in the header and footer. It\'s the #1 way local customers contact you.',
    },
    {
      id: 'email',
      name: 'Email or contact form',
      passed: EMAIL_RE.test(html) || /contact|form|message/i.test(lower),
      weight: 10,
      tip: 'Add a contact form or email address. Customers who can\'t find how to reach you leave.',
    },
    {
      id: 'address',
      name: 'Street address listed',
      passed: ADDRESS_RE.test(html) || /address|location|find us/i.test(lower),
      weight: 10,
      tip: 'Show your service area or address. Customers need to know you serve their area.',
    },
    {
      id: 'hours',
      name: 'Business hours listed',
      passed: HOURS_RE.test(html),
      weight: 10,
      tip: 'Add your business hours. "Are they open?" is one of the first things customers check.',
    },
    {
      id: 'mobile',
      name: 'Mobile-friendly',
      passed: /viewport/i.test(html),
      weight: 15,
      tip: 'Add a viewport meta tag. Over 60% of local searches happen on mobile — if your site looks broken, they call a competitor.',
    },
    {
      id: 'title',
      name: 'Descriptive page title',
      passed: /<title>[^<]{15,}<\/title>/i.test(html),
      weight: 5,
      tip: 'Write a clear title like "Joe\'s Plumbing — Miami, FL | 24/7 Emergency Service". It appears in Google results.',
    },
    {
      id: 'description',
      name: 'Meta description',
      passed: /meta[^>]+name=.description./i.test(html),
      weight: 5,
      tip: 'Add a meta description summarizing your services and location. It\'s the snippet customers read in Google.',
    },
    {
      id: 'cta',
      name: 'Clear call-to-action',
      passed: CTA_RE.test(html),
      weight: 10,
      tip: 'Add a prominent "Call Now" or "Get a Free Quote" button. Visitors need to be told what to do next.',
    },
    {
      id: 'social',
      name: 'Social media or review links',
      passed: SOCIAL_RE.test(html),
      weight: 5,
      tip: 'Link to your Google Business, Yelp, or Facebook. Reviews build trust and drive calls.',
    },
    {
      id: 'schema',
      name: 'Structured data (schema.org)',
      passed: /application\/ld\+json/i.test(html) || /schema\.org/i.test(html),
      weight: 5,
      tip: 'Add LocalBusiness JSON-LD markup. It helps Google show your hours, phone, and address directly in search results.',
    },
  ];

  const maxScore = checks.reduce((s, c) => s + c.weight, 0);
  const score = checks.filter(c => c.passed).reduce((s, c) => s + c.weight, 0);
  const pct = score / maxScore;

  const grade: ScanResult['grade'] =
    pct >= 0.9 ? 'A' : pct >= 0.75 ? 'B' : pct >= 0.6 ? 'C' : pct >= 0.4 ? 'D' : 'F';

  // Rough estimate: avg local service site gets 300 visitors/mo; each missed check ~= some % lost
  const failedWeight = checks.filter(c => !c.passed).reduce((s, c) => s + c.weight, 0);
  const missedLeadsPerMonth = Math.round((failedWeight / maxScore) * 18);

  return { url, score, maxScore, grade, checks, missedLeadsPerMonth, scannedAt: new Date().toISOString() };
}
