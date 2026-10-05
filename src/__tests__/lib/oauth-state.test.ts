// `server-only` is a Next.js build-time guard that is not installed as a
// resolvable package outside the Next compiler; the virtual mock lets these
// server-module assertions run under Jest.
jest.mock('server-only', () => ({}), { virtual: true });

// `process.env.NODE_ENV` is typed as a read-only literal union by Next's env
// types, so these tests write it through a widened record.
const mutableEnv = process.env as Record<string, string | undefined>;
const setNodeEnv = (value: string) => {
  mutableEnv.NODE_ENV = value;
};

const SECRET = 'a'.repeat(48);
process.env.OAUTH_STATE_SECRET = SECRET;

import crypto from 'crypto';
import {
  STATE_TTL_MS,
  createState,
  verifyState,
  encryptSecret,
  decryptSecret,
  PROVIDERS,
} from '@/lib/oauth';

describe('OAuth state secret', () => {
  const originalNodeEnv = process.env.NODE_ENV ?? '';
  const originalSecret = process.env.OAUTH_STATE_SECRET;
  const originalServiceKey = process.env.SUPABASE_SECRET_KEY;

  afterEach(() => {
    setNodeEnv(originalNodeEnv);
    process.env.OAUTH_STATE_SECRET = originalSecret;
    process.env.SUPABASE_SECRET_KEY = originalServiceKey;
  });

  it('refuses a secret shorter than 32 characters', () => {
    process.env.OAUTH_STATE_SECRET = 'too-short';
    expect(() => createState({ companyId: 'c1', provider: 'google' })).toThrow(/too weak/i);
  });

  it('refuses the known insecure placeholder', () => {
    process.env.OAUTH_STATE_SECRET = 'changeme-insecure-state-secret';
    expect(() => createState({ companyId: 'c1', provider: 'google' })).toThrow(/too weak/i);
  });

  it('does not fall back to the Supabase service key in production', () => {
    // Falling back would make the token-encryption key rotate whenever the
    // service key rotates, invalidating every stored mailbox token.
    setNodeEnv('production');
    delete process.env.OAUTH_STATE_SECRET;
    process.env.SUPABASE_SECRET_KEY = 'b'.repeat(48);
    expect(() => createState({ companyId: 'c1', provider: 'google' })).toThrow(/OAUTH_STATE_SECRET/);
  });

  it('allows the service-key fallback outside production, for local dev', () => {
    setNodeEnv('development');
    delete process.env.OAUTH_STATE_SECRET;
    process.env.SUPABASE_SECRET_KEY = 'c'.repeat(48);
    expect(() => createState({ companyId: 'c1', provider: 'google' })).not.toThrow();
  });
});

describe('verifyState', () => {
  const originalNodeEnv = process.env.NODE_ENV ?? '';

  afterEach(() => {
    setNodeEnv(originalNodeEnv);
  });

  it('round-trips company and provider', () => {
    const state = createState({ companyId: 'company-123', provider: 'microsoft' });
    expect(verifyState(state)).toEqual({ companyId: 'company-123', provider: 'microsoft' });
  });

  it('accepts both supported providers', () => {
    for (const provider of Object.keys(PROVIDERS) as Array<keyof typeof PROVIDERS>) {
      const state = createState({ companyId: 'co', provider });
      expect(verifyState(state)?.provider).toBe(provider);
    }
  });

  it('returns null for a missing state', () => {
    expect(verifyState('')).toBeNull();
  });

  it('returns null for a payload with no signature', () => {
    const payload = Buffer.from(JSON.stringify({ companyId: 'c', provider: 'google', ts: Date.now() })).toString(
      'base64url'
    );
    expect(verifyState(payload)).toBeNull();
  });

  it('returns null when the payload is altered', () => {
    const state = createState({ companyId: 'company-123', provider: 'google' });
    const [payload] = state.split('.');
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    decoded.companyId = 'someone-elses-company';
    const forged = `${Buffer.from(JSON.stringify(decoded)).toString('base64url')}.${state.split('.')[1]}`;
    expect(verifyState(forged)).toBeNull();
  });

  it('returns null when the signature is altered', () => {
    const state = createState({ companyId: 'company-123', provider: 'google' });
    const [payload, sig] = state.split('.');
    const flipped = sig[0] === 'a' ? 'b' : 'a';
    expect(verifyState(`${payload}.${flipped}${sig.slice(1)}`)).toBeNull();
  });

  it('returns null for a state signed with a different secret', () => {
    const state = createState({ companyId: 'company-123', provider: 'google' });
    process.env.OAUTH_STATE_SECRET = 'd'.repeat(48);
    expect(verifyState(state)).toBeNull();
  });

  it('returns null for an unknown provider', () => {
    const payload = Buffer.from(
      JSON.stringify({ companyId: 'c', provider: 'evilcorp', ts: Date.now() })
    ).toString('base64url');
    // Sign it correctly so only the provider check can reject it.
    const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
    expect(verifyState(`${payload}.${sig}`)).toBeNull();
  });

  it('returns null for a non-string companyId', () => {
    const payload = Buffer.from(
      JSON.stringify({ companyId: 42, provider: 'google', ts: Date.now() })
    ).toString('base64url');
    const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
    expect(verifyState(`${payload}.${sig}`)).toBeNull();
  });

  it('rejects a pre-expiry state that carries no timestamp', () => {
    // States minted before the TTL fix had no `ts`; they must read as expired
    // rather than valid-forever.
    const payload = Buffer.from(JSON.stringify({ companyId: 'c', provider: 'google' })).toString('base64url');
    const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
    expect(verifyState(`${payload}.${sig}`)).toBeNull();
  });

  it('returns null rather than throwing on malformed input', () => {
    expect(verifyState('not-a-state')).toBeNull();
    expect(verifyState('...')).toBeNull();
    expect(verifyState('%%%.%%%')).toBeNull();
    expect(verifyState('a.b.c.d')).toBeNull();
  });
});

describe('state expiry', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  });
  afterEach(() => jest.useRealTimers());

  it('exposes a 10 minute TTL', () => {
    expect(STATE_TTL_MS).toBe(10 * 60 * 1000);
  });

  it('accepts a state just inside the window', () => {
    const state = createState({ companyId: 'co', provider: 'google' });
    jest.advanceTimersByTime(STATE_TTL_MS - 1_000);
    expect(verifyState(state)).not.toBeNull();
  });

  it('is valid for its full window and expires immediately after', () => {
    // The check is `age > TTL`, so a state stays usable for exactly 10 minutes
    // and is refused one millisecond later. Documented here because the
    // inclusive edge is what makes the TTL "10 minutes" to a user who just
    // clicked "Connect" in settings.
    const state = createState({ companyId: 'co', provider: 'google' });
    jest.advanceTimersByTime(STATE_TTL_MS);
    expect(verifyState(state)).not.toBeNull();

    jest.advanceTimersByTime(1);
    expect(verifyState(state)).toBeNull();
  });

  it('rejects a state a second past the window', () => {
    const state = createState({ companyId: 'co', provider: 'google' });
    jest.advanceTimersByTime(STATE_TTL_MS + 1_000);
    expect(verifyState(state)).toBeNull();
  });

  it('rejects a state captured hours earlier, blocking callback replay', () => {
    const state = createState({ companyId: 'co', provider: 'google' });
    jest.advanceTimersByTime(6 * 60 * 60 * 1000);
    expect(verifyState(state)).toBeNull();
  });

  it('rejects a state stamped in the future, blocking clock-skew replay', () => {
    // An attacker who learns the secret could otherwise mint a far-future `ts`
    // to make a captured callback valid indefinitely. Simulated by moving the
    // clock behind the state's timestamp.
    const state = createState({ companyId: 'co', provider: 'google' });
    jest.setSystemTime(new Date('2025-12-31T23:00:00Z'));
    expect(verifyState(state)).toBeNull();
  });
});

describe('secret encryption at rest', () => {
  it('round-trips a mailbox token', () => {
    const token = 'refresh-token-value-123';
    expect(decryptSecret(encryptSecret(token))).toBe(token);
  });

  it('rejects an empty plaintext rather than storing an undecryptable row', () => {
    // Encrypting '' yields an empty data segment, which cannot be told apart
    // from a truncated payload. Every production caller guards this already
    // (`tokens.refresh_token ? encryptSecret(t) : null`), and the decoder fails
    // closed, so an empty secret must never come back as a valid empty token.
    expect(() => decryptSecret(encryptSecret(''))).toThrow(/malformed/i);
  });

  it('produces a different ciphertext each time', () => {
    // Random IV: identical plaintexts must not produce identical stored rows.
    expect(encryptSecret('same')).not.toBe(encryptSecret('same'));
  });

  it('rejects a malformed payload', () => {
    expect(() => decryptSecret('not-a-payload')).toThrow(/malformed/i);
    expect(() => decryptSecret('')).toThrow(/malformed/i);
  });

  it('rejects a tampered ciphertext', () => {
    const payload = encryptSecret('refresh-token');
    const parts = payload.split('.');
    parts[2] = Buffer.from('tampered-value-here').toString('base64');
    expect(() => decryptSecret(parts.join('.'))).toThrow();
  });

  it('rejects a token encrypted under a different secret', () => {
    const payload = encryptSecret('refresh-token');
    process.env.OAUTH_STATE_SECRET = 'e'.repeat(48);
    expect(() => decryptSecret(payload)).toThrow();
  });
});