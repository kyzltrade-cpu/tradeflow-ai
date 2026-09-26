// Live FX rate lookup with short in-memory caching. Safe to call from server
// routes / edge functions. Falls back to the stored rate when the network
// sources are unreachable.

export interface LiveFx {
  rate: number;
  pair: string;
  source: 'open.er-api' | 'frankfurter' | 'stored';
  live: boolean;
  updated_at: string;
}

interface Fetched {
  rate: number;
  source: LiveFx['source'];
  updated_at: string;
}

const CACHE_TTL_MS = 60 * 60 * 1000;

const cache = new Map<string, { expiresAt: number; data: Promise<Fetched> }>();
const inFlight = new Map<string, Promise<Fetched>>();

function parsePair(pair: string): { base: string; target: string } {
  const m = String(pair || '').match(/([A-Z]{3})[^A-Z]*([A-Z]{3})/i);
  if (m) return { base: m[1].toUpperCase(), target: m[2].toUpperCase() };
  return { base: 'USD', target: 'HKD' };
}

function iso(v?: string): string {
  try {
    if (v && Date.parse(v)) return v;
  } catch {
    /* ignore */
  }
  return new Date().toISOString();
}

async function fetchFromApi(base: string, target: string): Promise<Fetched> {
  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${base}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const data = (await res.json()) as { rates?: Record<string, number>; time_last_update_utc?: string };
      const rate = data?.rates?.[target];
      if (typeof rate === 'number' && isFinite(rate) && rate > 0) {
        return { rate, source: 'open.er-api', updated_at: iso(data.time_last_update_utc) };
      }
    }
  } catch {
    // fall through to next source
  }

  try {
    const res = await fetch(`https://api.frankfurter.app/latest?from=${base}&to=${target}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const data = (await res.json()) as { rates?: Record<string, number>; date?: string };
      const rate = data?.rates?.[target];
      if (typeof rate === 'number' && isFinite(rate) && rate > 0) {
        return { rate, source: 'frankfurter', updated_at: iso(data.date) };
      }
    }
  } catch {
    // fall through
  }

  throw new Error('FX sources unreachable');
}

export async function getLiveFx(pair: string, fallbackRate: number): Promise<LiveFx> {
  const { base, target } = parsePair(pair);
  const key = `${base}:${target}`;
  const now = Date.now();

  const hit = cache.get(key);
  if (hit && hit.expiresAt > now) {
    try {
      const data = await hit.data;
      return { rate: data.rate, pair, source: data.source, live: true, updated_at: data.updated_at };
    } catch {
      cache.delete(key);
    }
  }

  let task = inFlight.get(key);
  if (!task) {
    task = fetchFromApi(base, target);
    inFlight.set(key, task);
    task.then(
      (data) => {
        cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, data: Promise.resolve(data) });
      },
      () => {
        cache.delete(key);
      }
    ).finally(() => {
      inFlight.delete(key);
    });
  }

  try {
    const data = await task;
    return { rate: data.rate, pair, source: data.source, live: true, updated_at: data.updated_at };
  } catch {
    return { rate: fallbackRate, pair, source: 'stored', live: false, updated_at: new Date().toISOString() };
  }
}