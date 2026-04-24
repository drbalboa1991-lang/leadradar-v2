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
  /** Pro checks — always scanned, only shown to paid users */
  proChecks: ScanCheck[];
  missedLeadsPerMonth: number;
  scannedAt: string;
}

// ── Free-tier check regexes ────────────────────────────────────────────────
const PHONE_RE   = /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
const EMAIL_RE   = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i; // no `g` — stateful lastIndex breaks .test()
// Requires a day-name near a time (8am / 9:00) OR an explicit "hours" phrase
const HOURS_RE   = /\b(mon|tue|wed|thu|fri|sat|sun|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b[\s\S]{0,120}\b(\d{1,2}(:\d{2})?\s*(am|pm)|\d{1,2}:\d{2})\b|\b(business hours|opening hours|hours of operation|store hours|we.re open|we are open|open daily|open 24)\b/i;
const CTA_RE     = /\b(call|contact|get a quote|free estimate|book|schedule|request|hire|get started|click here)\b/i;
const SOCIAL_RE  = /facebook\.com|instagram\.com|twitter\.com|x\.com|linkedin\.com|yelp\.com|nextdoor\.com/i;
const ADDRESS_RE = /\b\d{2,5}\s+\w+\s+(st|street|ave|avenue|blvd|boulevard|rd|road|dr|drive|ln|lane|way|ct|court|pl|place)\b/i;

// ── Pro-tier check regexes (6 deep checks) ────────────────────────────────
const LIVE_CHAT_RE  = /intercom|drift\.com|freshchat|zendesk|tawk\.to|livechat|crisp\.chat|tidio|chat\.widget|helpscout/i;
const REVIEWS_RE    = /google.*review|review.*google|yelp.*review|trustpilot|birdeye|podium|reviews\.io|g2\.com|capterra|stamped\.io|elfsight.*review/i;
const VIDEO_RE      = /youtube\.com\/embed|youtu\.be|vimeo\.com\/video|<video\b/i;
const FAQ_RE        = /\bfaq\b|frequently.asked|common.question/i;
const FINANCING_RE  = /financ|payment.plan|pay.*month|0%.interest|interest.free|greensky|synchrony|wisetack|affirm|klarna/i;
const GUARANTEE_RE  = /\bguarantee\b|\bwarranty\b|satisfaction.guaranteed|money.back|100%.satisfaction|backed.by/i;

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
    return text.slice(0, 500_000);
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

  // ── Free checks (11 items, 100 pts max) ───────────────────────────────
  const checks: ScanCheck[] = [
    {
      id: 'https',
      name: 'Secure site (HTTPS)',
      passed: url.startsWith('https://'),
      weight: 5,
      tip: 'Switch to HTTPS. Google penalises non-HTTPS sites and customers see a "Not Secure" warning.',
    },
    {
      id: 'phone',
      name: 'Phone number visible',
      passed: PHONE_RE.test(html),
      weight: 20,
      tip: "Add your phone number prominently in the header and footer. It's the #1 way local customers contact you.",
    },
    {
      id: 'email',
      name: 'Email or contact form',
      passed: EMAIL_RE.test(html) || /contact|form|message/i.test(lower),
      weight: 10,
      tip: "Add a contact form or email address. Customers who can't find how to reach you leave.",
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
      tip: '"Are they open?" is one of the first things customers check. Add your hours.',
    },
    {
      id: 'mobile',
      name: 'Mobile-friendly',
      passed: /viewport/i.test(html),
      weight: 15,
      tip: 'Add a viewport meta tag. Over 60% of local searches happen on mobile.',
    },
    {
      id: 'title',
      name: 'Descriptive page title',
      passed: /<title>[^<]{15,}<\/title>/i.test(html),
      weight: 5,
      tip: 'Write a clear title like "Joe\'s Plumbing — Miami, FL | 24/7 Emergency". It appears in Google results.',
    },
    {
      id: 'description',
      name: 'Meta description',
      passed: /meta[^>]+name=.description./i.test(html),
      weight: 5,
      tip: "Add a meta description summarising your services and location. It's the snippet customers read in Google.",
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
      tip: 'Add LocalBusiness JSON-LD markup. It helps Google show your hours, phone, and address in search results.',
    },
  ];

  // ── Pro checks (6 deep items, 45 pts max) ─────────────────────────────
  const proChecks: ScanCheck[] = [
    {
      id: 'live_chat',
      name: 'Live chat widget',
      passed: LIVE_CHAT_RE.test(html),
      weight: 8,
      tip: 'Add a live chat widget (Tidio, Crisp, or Intercom). Visitors who chat convert 3× more than those who cannot.',
    },
    {
      id: 'reviews',
      name: 'Customer reviews displayed on-site',
      passed: REVIEWS_RE.test(html),
      weight: 10,
      tip: 'Embed Google or Yelp reviews on your homepage. 93% of customers read reviews before calling a local business.',
    },
    {
      id: 'video',
      name: 'Video content (testimonial or walkthrough)',
      passed: VIDEO_RE.test(html),
      weight: 7,
      tip: 'Add a short video testimonial or job walkthrough. Video increases conversion rates by up to 80%.',
    },
    {
      id: 'faq',
      name: 'FAQ section',
      passed: FAQ_RE.test(html),
      weight: 5,
      tip: 'A FAQ section keeps visitors on your page longer, answers objections, and helps with SEO.',
    },
    {
      id: 'financing',
      name: 'Financing or payment plan options',
      passed: FINANCING_RE.test(html),
      weight: 8,
      tip: '"Starting at $X/month" messaging converts far better than showing the full price upfront for big-ticket jobs.',
    },
    {
      id: 'guarantee',
      name: 'Guarantee or warranty mentioned',
      passed: GUARANTEE_RE.test(html),
      weight: 7,
      tip: 'A satisfaction guarantee removes the risk from hiring you. Even "100% satisfaction" copy helps.',
    },
  ];

  const maxScore = checks.reduce((s, c) => s + c.weight, 0);
  const score    = checks.filter(c => c.passed).reduce((s, c) => s + c.weight, 0);
  const pct      = score / maxScore;

  const grade: ScanResult['grade'] =
    pct >= 0.9 ? 'A' : pct >= 0.75 ? 'B' : pct >= 0.6 ? 'C' : pct >= 0.4 ? 'D' : 'F';

  const failedWeight = checks.filter(c => !c.passed).reduce((s, c) => s + c.weight, 0);
  const missedLeadsPerMonth = Math.round((failedWeight / maxScore) * 18);

  return {
    url,
    score,
    maxScore,
    grade,
    checks,
    proChecks,
    missedLeadsPerMonth,
    scannedAt: new Date().toISOString(),
  };
}
