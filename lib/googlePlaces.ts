/**
 * Google Places lookup — business presence on Google Maps.
 *
 * MODE: mock
 *   Returns deterministic fake data based on the domain so the same
 *   URL always gets the same result (useful for demos/screenshots).
 *   Results are clearly flagged with isMock: true.
 *
 * TO SWITCH TO LIVE:
 *   1. Get a Google Cloud API key with Places API enabled
 *   2. Set GOOGLE_PLACES_API_KEY in .env.local / Vercel env
 *   3. The function auto-detects the key and uses the real API
 */

export interface GooglePresence {
  found:       boolean;
  name?:       string;
  rating?:     number;   // 1.0 – 5.0
  reviewCount?: number;
  hasPhotos?:  boolean;
  isVerified?: boolean;  // Google-verified listing
  mapsUrl?:    string;
  isMock:      boolean;  // always true until real API key is set
}

// ── Extract a candidate business name from raw HTML ───────────────────────

export function extractBusinessName(html: string): string | null {
  // 1. JSON-LD LocalBusiness name
  const ldMatch = html.match(/"@type"\s*:\s*"(?:LocalBusiness|Organization|Plumber|HVACBusiness|Electrician|Locksmith|RoofingContractor|Landscaper|HomeAndConstructionBusiness|GeneralContractor)[^}]*?"name"\s*:\s*"([^"]{2,80})"/i)
    ?? html.match(/"name"\s*:\s*"([^"]{2,80})"[^}]*?"@type"\s*:\s*"(?:LocalBusiness|Organization)/i);
  if (ldMatch) return ldMatch[1];

  // 2. og:site_name
  const ogMatch = html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']{2,80})["']/i)
    ?? html.match(/<meta[^>]+content=["']([^"']{2,80})["'][^>]+property=["']og:site_name["']/i);
  if (ogMatch) return ogMatch[1];

  // 3. <title> — strip common suffixes like " | Miami, FL" or " - Home"
  const titleMatch = html.match(/<title>([^<]{2,80})<\/title>/i);
  if (titleMatch) {
    return titleMatch[1]
      .split(/[|\-–—]/)[0]
      .trim()
      .replace(/\s+(home|official site|website|llc|inc|co\.?)\s*$/i, '')
      .trim() || null;
  }

  // 4. First <h1>
  const h1Match = html.match(/<h1[^>]*>([^<]{2,80})<\/h1>/i);
  if (h1Match) return h1Match[1].trim();

  return null;
}

// ── Deterministic hash (same domain → same mock result) ───────────────────

function simpleHash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

// ── Mock lookup ───────────────────────────────────────────────────────────

function mockLookup(domain: string, name: string | null): GooglePresence {
  const h = simpleHash(domain);

  // ~72 % of local biz sites have a Google listing
  const found = (h % 100) < 72;

  if (!found) {
    return { found: false, isMock: true };
  }

  // Deterministic but realistic numbers
  const rating      = 3.5 + ((h % 15) / 10);          // 3.5 – 5.0
  const reviewCount = 4 + (h % 197);                   // 4 – 200
  const isVerified  = (h % 3) !== 0;                   // ~67 % verified
  const hasPhotos   = (h % 4) !== 0;                   // ~75 % have photos
  const encodedName = encodeURIComponent(name ?? domain);

  return {
    found:       true,
    name:        name ?? undefined,
    rating:      Math.round(rating * 10) / 10,
    reviewCount,
    isVerified,
    hasPhotos,
    mapsUrl:     `https://www.google.com/maps/search/${encodedName}`,
    isMock:      true,
  };
}

// ── Real API lookup (skeleton — activated when key is present) ────────────

async function realLookup(domain: string, name: string | null, apiKey: string): Promise<GooglePresence> {
  const query  = name ? `${name}` : domain;
  const url    = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json`
    + `?input=${encodeURIComponent(query)}`
    + `&inputtype=textquery`
    + `&fields=name,rating,user_ratings_total,photos,business_status,url`
    + `&key=${apiKey}`;

  const res  = await fetch(url, { next: { revalidate: 86400 } }); // cache 24 h
  const data = await res.json() as {
    status: string;
    candidates?: Array<{
      name?: string;
      rating?: number;
      user_ratings_total?: number;
      photos?: unknown[];
      url?: string;
    }>;
  };

  if (data.status !== 'OK' || !data.candidates?.length) {
    return { found: false, isMock: false };
  }

  const c = data.candidates[0];
  return {
    found:       true,
    name:        c.name,
    rating:      c.rating,
    reviewCount: c.user_ratings_total,
    hasPhotos:   (c.photos?.length ?? 0) > 0,
    isVerified:  true,
    mapsUrl:     c.url,
    isMock:      false,
  };
}

// ── Public function ───────────────────────────────────────────────────────

export async function lookupGooglePresence(
  rawUrl:   string,
  html:     string,
): Promise<GooglePresence> {
  let domain = rawUrl;
  try { domain = new URL(rawUrl).hostname.replace(/^www\./, ''); } catch { /* keep raw */ }

  const name   = extractBusinessName(html);
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (apiKey) {
    try {
      return await realLookup(domain, name, apiKey);
    } catch (err) {
      console.error('[googlePlaces] real API failed, falling back to mock:', err);
    }
  }

  return mockLookup(domain, name);
}
