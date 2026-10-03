import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

/**
 * Guard for server-side fetches of user-supplied URLs (SSRF defence).
 *
 * The knowledge-base scraper used to fetch any URL a user handed it, including
 * `http://169.254.169.254/...` (cloud metadata), `http://localhost:PORT` and
 * internal RFC1918 hosts — an authenticated user could read the host network.
 *
 * `assertPublicHttpUrl` rejects non-HTTP(S) schemes, embedded credentials, and
 * any hostname that IS or RESOLVES TO a private / loopback / link-local /
 * multicast / reserved address.
 */

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'metadata',
  'metadata.google.internal',
  'metadata.goog',
]);

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return true; // unparseable — treat as unsafe
  }
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true; // link-local incl. cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // carrier-grade NAT
  if (a === 192 && b === 0) return true;
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking
  if (a >= 224) return true; // multicast + reserved + broadcast
  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const v = ip.toLowerCase().replace(/^\[|\]$/g, '');
  if (v === '::' || v === '::1') return true;
  if (v.startsWith('fe80')) return true; // link-local
  if (v.startsWith('fc') || v.startsWith('fd')) return true; // unique-local
  const mapped = v.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (mapped) return isPrivateIPv4(mapped[1]);
  return false;
}

export function isBlockedAddress(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) return isPrivateIPv4(ip);
  if (version === 6) return isPrivateIPv6(ip);
  return true; // not an IP at all — caller should not treat it as safe
}

/** Throws with a user-safe message when the URL is not a public http(s) target. */
export async function assertPublicHttpUrl(raw: unknown): Promise<URL> {
  if (typeof raw !== 'string' || !raw.trim()) throw new Error('URL is required');

  const candidate = raw.trim().startsWith('http') ? raw.trim() : `https://${raw.trim()}`;

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw new Error('Invalid URL');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Only http and https URLs are allowed');
  }
  if (url.username || url.password) {
    throw new Error('Credentials in URLs are not allowed');
  }

  const host = url.hostname.replace(/^\[|\]$/g, '');
  const lower = host.toLowerCase();

  if (BLOCKED_HOSTNAMES.has(lower)) throw new Error('That host is not allowed');
  if (lower.endsWith('.local') || lower.endsWith('.internal') || lower.endsWith('.localhost')) {
    throw new Error('That host is not allowed');
  }

  if (isIP(host)) {
    if (isBlockedAddress(host)) throw new Error('That address is not allowed');
    return url;
  }

  let records: Array<{ address: string }>;
  try {
    records = await lookup(host, { all: true });
  } catch {
    throw new Error('Could not resolve that host');
  }
  if (!records.length) throw new Error('Could not resolve that host');

  for (const record of records) {
    if (isBlockedAddress(record.address)) throw new Error('That address is not allowed');
  }

  return url;
}
