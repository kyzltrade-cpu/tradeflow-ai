import { checkRateLimit, createRateLimitResponse, getClientIp } from '@/lib/rate-limit';

describe('checkRateLimit', () => {
  // The limiter's map is module-level, so each test uses its own key rather
  // than resetting shared state.
  let seq = 0;
  const freshKey = (label: string) => `${label}-${Date.now()}-${seq++}`;

  it('allows a first request and reports the remaining budget', () => {
    const result = checkRateLimit(freshKey('first'), { windowMs: 60_000, maxRequests: 3 });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it('allows exactly maxRequests within the window, then denies', () => {
    const key = freshKey('exhaust');
    const config = { windowMs: 60_000, maxRequests: 3 };

    expect(checkRateLimit(key, config).allowed).toBe(true);
    expect(checkRateLimit(key, config).allowed).toBe(true);
    expect(checkRateLimit(key, config).allowed).toBe(true);

    const blocked = checkRateLimit(key, config);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it('keeps denying every request after the budget is spent', () => {
    const key = freshKey('sustained');
    const config = { windowMs: 60_000, maxRequests: 1 };

    expect(checkRateLimit(key, config).allowed).toBe(true);
    expect(checkRateLimit(key, config).allowed).toBe(false);
    expect(checkRateLimit(key, config).allowed).toBe(false);
    expect(checkRateLimit(key, config).allowed).toBe(false);
  });

  it('counts down remaining as the window fills', () => {
    const key = freshKey('remaining');
    const config = { windowMs: 60_000, maxRequests: 4 };
    expect(checkRateLimit(key, config).remaining).toBe(3);
    expect(checkRateLimit(key, config).remaining).toBe(2);
    expect(checkRateLimit(key, config).remaining).toBe(1);
  });

  it('keys independently, so one caller cannot exhaust another', () => {
    const config = { windowMs: 60_000, maxRequests: 1 };
    const a = freshKey('tenant-a');
    const b = freshKey('tenant-b');

    expect(checkRateLimit(a, config).allowed).toBe(true);
    expect(checkRateLimit(a, config).allowed).toBe(false);
    // The second key is untouched by the first key's exhaustion.
    expect(checkRateLimit(b, config).allowed).toBe(true);
  });

  describe('window expiry', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('refills once the window has rolled over', () => {
      const key = freshKey('expiry');
      const config = { windowMs: 60_000, maxRequests: 2 };

      expect(checkRateLimit(key, config).allowed).toBe(true);
      expect(checkRateLimit(key, config).allowed).toBe(true);
      expect(checkRateLimit(key, config).allowed).toBe(false);

      // Still inside the window.
      jest.advanceTimersByTime(59_000);
      expect(checkRateLimit(key, config).allowed).toBe(false);

      // Window elapsed.
      jest.advanceTimersByTime(2_000);
      expect(checkRateLimit(key, config).allowed).toBe(true);
      expect(checkRateLimit(key, config).remaining).toBe(0);
    });

    it('issues a reset time in the future for a fresh window', () => {
      jest.setSystemTime(1_000_000);
      const { resetTime } = checkRateLimit(freshKey('reset'), { windowMs: 60_000, maxRequests: 1 });
      expect(resetTime).toBe(1_060_000);
    });
  });

  // Guards the budgets wired into the two public endpoints. These are the
  // numbers that protect the unauthenticated surfaces, so a careless edit to
  // either call site should fail here rather than silently widen the limit.
  describe('configured endpoint budgets', () => {
    it('caps demo requests at 5/minute', () => {
      const key = freshKey('demo-request-budget');
      const config = { windowMs: 60_000, maxRequests: 5 };
      for (let i = 0; i < 5; i++) expect(checkRateLimit(key, config).allowed).toBe(true);
      expect(checkRateLimit(key, config).allowed).toBe(false);
    });

    it('caps chat at 20/minute and 200/day', () => {
      const minuteKey = freshKey('chat-min');
      const minute = { windowMs: 60_000, maxRequests: 20 };
      for (let i = 0; i < 20; i++) expect(checkRateLimit(minuteKey, minute).allowed).toBe(true);
      expect(checkRateLimit(minuteKey, minute).allowed).toBe(false);

      const dayKey = freshKey('chat-day');
      const day = { windowMs: 86_400_000, maxRequests: 200 };
      for (let i = 0; i < 200; i++) expect(checkRateLimit(dayKey, day).allowed).toBe(true);
      expect(checkRateLimit(dayKey, day).allowed).toBe(false);
    });
  });
});

describe('getClientIp', () => {
  const withHeaders = (headers: Record<string, string>) =>
    new Request('http://localhost/api', { headers }) as Request;

  it('uses the first entry of x-forwarded-for, which is the originating client', () => {
    expect(getClientIp(withHeaders({ 'x-forwarded-for': '203.0.113.7, 70.41.3.18, 150.172.238.178' }))).toBe(
      '203.0.113.7',
    );
  });

  it('trims whitespace around the forwarded entry', () => {
    expect(getClientIp(withHeaders({ 'x-forwarded-for': '  203.0.113.7  ' }))).toBe('203.0.113.7');
  });

  it('falls back to a shared bucket when the header is absent', () => {
    // Not spoofable by a client, but also not per-caller: every header-less
    // request shares one budget, which fails closed rather than open.
    expect(getClientIp(withHeaders({}))).toBe('unknown');
  });

  it('groups different spoofed values into separate buckets', () => {
    const a = getClientIp(withHeaders({ 'x-forwarded-for': '198.51.100.1' }));
    const b = getClientIp(withHeaders({ 'x-forwarded-for': '198.51.100.2' }));
    expect(a).not.toBe(b);
  });
});

describe('createRateLimitResponse', () => {
  it('returns 429 with Retry-After and reset headers', () => {
    const res = createRateLimitResponse(Date.now() + 30_000);
    expect(res.status).toBe(429);
    expect(res.headers.get('Content-Type')).toBe('application/json');
    expect(Number(res.headers.get('Retry-After'))).toBeGreaterThan(0);
    expect(Number(res.headers.get('Retry-After'))).toBeLessThanOrEqual(30);
    expect(Number(res.headers.get('X-RateLimit-Reset'))).toBeGreaterThan(0);
  });

  it('tells the caller to try again rather than leaking internals', async () => {
    const res = createRateLimitResponse(Date.now() + 5_000);
    const body = await res.json();
    expect(body.error).toMatch(/too many requests/i);
    expect(Object.keys(body)).toEqual(['error']);
  });

  it('does not produce a negative Retry-After for an already-elapsed window', () => {
    const res = createRateLimitResponse(Date.now() - 10_000);
    expect(Number(res.headers.get('Retry-After'))).toBeGreaterThanOrEqual(0);
  });
});