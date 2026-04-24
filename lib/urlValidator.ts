/**
 * SSRF protection for user-supplied scan URLs.
 * Blocks private, loopback, link-local, and cloud-metadata addresses.
 */

import dns from 'node:dns/promises';
import net from 'node:net';

// ── Private / special IP ranges ────────────────────────────────────────────

function ipToLong(ip: string): number {
  return ip.split('.').reduce((acc, octet) => ((acc << 8) | parseInt(octet, 10)) >>> 0, 0);
}

const BLOCKED_RANGES: Array<{ start: number; end: number }> = [
  // Loopback
  { start: ipToLong('127.0.0.0'),   end: ipToLong('127.255.255.255') },
  // RFC 1918 private
  { start: ipToLong('10.0.0.0'),    end: ipToLong('10.255.255.255') },
  { start: ipToLong('172.16.0.0'),  end: ipToLong('172.31.255.255') },
  { start: ipToLong('192.168.0.0'), end: ipToLong('192.168.255.255') },
  // Link-local / AWS EC2 metadata
  { start: ipToLong('169.254.0.0'), end: ipToLong('169.254.255.255') },
  // "This network"
  { start: ipToLong('0.0.0.0'),     end: ipToLong('0.255.255.255') },
  // Carrier-grade NAT (RFC 6598)
  { start: ipToLong('100.64.0.0'),  end: ipToLong('100.127.255.255') },
  // Documentation / TEST-NET
  { start: ipToLong('192.0.2.0'),   end: ipToLong('192.0.2.255') },
  { start: ipToLong('198.51.100.0'),end: ipToLong('198.51.100.255') },
  { start: ipToLong('203.0.113.0'), end: ipToLong('203.0.113.255') },
];

function isPrivateIp(ip: string): boolean {
  // Block all IPv6 except well-known public checks — simpler is safer
  if (net.isIPv6(ip)) return true;
  if (!net.isIPv4(ip)) return true;
  const long = ipToLong(ip);
  return BLOCKED_RANGES.some(({ start, end }) => long >= start && long <= end);
}

// ── Public validator ────────────────────────────────────────────────────────

type ValidResult   = { ok: true;  url: URL };
type InvalidResult = { ok: false; message: string };

export async function validateScanUrl(raw: string): Promise<ValidResult | InvalidResult> {
  // Normalise — prepend https:// if no scheme
  const urlStr = /^https?:\/\//i.test(raw.trim()) ? raw.trim() : `https://${raw.trim()}`;

  let url: URL;
  try {
    url = new URL(urlStr);
  } catch {
    return { ok: false, message: 'That doesn\'t look like a valid URL.' };
  }

  // Only http/https
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { ok: false, message: 'Only http:// and https:// URLs are allowed.' };
  }

  const { hostname } = url;

  // Block localhost variants
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname.endsWith('.localhost')
  ) {
    return { ok: false, message: 'That address is not reachable from the internet.' };
  }

  // If the hostname is a raw IPv4 literal, check it immediately
  if (net.isIPv4(hostname)) {
    if (isPrivateIp(hostname)) {
      return { ok: false, message: 'That IP address is not reachable from the internet.' };
    }
    return { ok: true, url };
  }

  // Block raw IPv6 literals (they arrive as [::1] in URL hostname)
  if (hostname.startsWith('[')) {
    return { ok: false, message: 'IPv6 addresses are not supported.' };
  }

  // DNS lookup — make sure the hostname resolves to a public IP
  let address: string;
  try {
    const result = await dns.lookup(hostname);
    address = result.address;
  } catch {
    return { ok: false, message: 'Could not resolve that domain. Check the URL and try again.' };
  }

  if (isPrivateIp(address)) {
    return { ok: false, message: 'That domain resolves to a private address.' };
  }

  return { ok: true, url };
}
