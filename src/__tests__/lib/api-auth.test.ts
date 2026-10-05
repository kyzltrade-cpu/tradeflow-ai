const getUser = jest.fn();
const usersChain = {
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn(),
  update: jest.fn().mockReturnThis(),
};

jest.mock('next/headers', () => ({
  cookies: jest.fn().mockResolvedValue({ getAll: jest.fn().mockReturnValue([]) }),
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {},
  supabaseAdmin: {
    auth: { getUser: (...args: unknown[]) => getUser(...args) },
    from: jest.fn(() => usersChain),
  },
}));

// Literal inlined: jest hoists mock factories above module-level consts.
jest.mock('@/lib/inquiry-context', () => ({
  DEMO_COMPANY_ID: '99b52405-c9f2-4ac0-bf7e-69b10c3cfea5',
}));

import { requireAuth } from '@/lib/api-auth';
import { DEMO_COMPANY_ID } from '@/lib/inquiry-context';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const setCookies = (list: Array<{ name: string; value: string }>) => {
  (cookies as jest.Mock).mockResolvedValue({ getAll: jest.fn().mockReturnValue(list) });
};

const authedRequest = (token = 'a.b.c') =>
  new NextRequest('http://localhost/api/admin/products', {
    headers: { authorization: `Bearer ${token}` },
  });

async function captureStatus(fn: () => Promise<unknown>) {
  try {
    await fn();
    throw new Error('expected requireAuth to throw');
  } catch (err) {
    if (err instanceof Response) return err.status;
    if (err instanceof Error && err.message === 'expected requireAuth to throw') throw err;
    throw err;
  }
}

describe('requireAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setCookies([]);
    getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'a@example.com' } }, error: null });
    usersChain.single.mockResolvedValue({ data: { company_id: 'company-1' }, error: null });
  });

  describe('rejects unauthenticated callers', () => {
    it('401s when there is no header and no cookie', async () => {
      expect(await captureStatus(() => requireAuth())).toBe(401);
      expect(getUser).not.toHaveBeenCalled();
    });

    it('401s when an invalid session is rejected by Supabase', async () => {
      getUser.mockResolvedValue({ data: { user: null }, error: { message: 'bad jwt' } });
      expect(await captureStatus(() => requireAuth(authedRequest()))).toBe(401);
    });

    it('401s when Supabase returns no error but no user', async () => {
      getUser.mockResolvedValue({ data: { user: null }, error: null });
      expect(await captureStatus(() => requireAuth(authedRequest()))).toBe(401);
    });

    it('401s when the Authorization header is not a Bearer token', async () => {
      const req = new NextRequest('http://localhost/x', { headers: { authorization: 'Basic abc' } });
      expect(await captureStatus(() => requireAuth(req))).toBe(401);
    });

    it('401s for a malformed bearer token, never forwarding it to Supabase', async () => {
      const req = new NextRequest('http://localhost/x', { headers: { authorization: 'Bearer not-a-jwt' } });
      expect(await captureStatus(() => requireAuth(req))).toBe(401);
      expect(getUser).not.toHaveBeenCalled();
    });

    it('401s when a cookie is present but holds no token', async () => {
      setCookies([{ name: 'sb-project-auth-token', value: 'garbage' }]);
      expect(await captureStatus(() => requireAuth())).toBe(401);
    });
  });

  describe('reads the tenant from the session', () => {
    it('returns the company attached to the users row', async () => {
      const auth = await requireAuth(authedRequest());
      expect(auth.companyId).toBe('company-1');
      expect(auth.user).toEqual({ id: 'u1', email: 'a@example.com' });
    });

    it('403s when the user is not linked to a company', async () => {
      usersChain.single.mockResolvedValue({ data: { company_id: null }, error: null });
      expect(await captureStatus(() => requireAuth(authedRequest()))).toBe(403);
    });

    it('tells the caller to finish onboarding rather than just denying', async () => {
      usersChain.single.mockResolvedValue({ data: null, error: null });
      try {
        await requireAuth(authedRequest());
        throw new Error('expected requireAuth to throw');
      } catch (err) {
        expect(err).toBeInstanceOf(Response);
        await expect((err as Response).json()).resolves.toMatchObject({
          error: expect.stringMatching(/onboarding/i),
        });
      }
    });

    it('allows a company-less user through when requireCompany is false', async () => {
      // The chat route uses this so an anonymous visitor reaches the demo
      // tenant instead of being hard-rejected.
      usersChain.single.mockResolvedValue({ data: { company_id: null }, error: null });
      const auth = await requireAuth(authedRequest(), { requireCompany: false });
      expect(auth.companyId).toBeNull();
    });

    it('never accepts a company id supplied by the caller', async () => {
      const req = new NextRequest('http://localhost/x?company_id=attacker-co', {
        headers: { authorization: 'Bearer a.b.c' },
      });
      const auth = await requireAuth(req);
      expect(auth.companyId).toBe('company-1');
    });

    it('scopes the users lookup to the authenticated user id', async () => {
      await requireAuth(authedRequest());
      expect(usersChain.eq).toHaveBeenCalledWith('id', 'u1');
    });
  });

  describe('demo account pinning', () => {
    it('repoints the demo login at the demo company', async () => {
      // Protects the demo mailbox from being stranded on a scratch company
      // created by an onboarding test.
      getUser.mockResolvedValue({ data: { user: { id: 'demo-user', email: 'demo@broadust.io' } }, error: null });
      usersChain.single.mockResolvedValue({ data: { company_id: 'scratch-company' }, error: null });

      const auth = await requireAuth(authedRequest());
      expect(auth.companyId).toBe(DEMO_COMPANY_ID);
      expect(usersChain.update).toHaveBeenCalledWith({ company_id: DEMO_COMPANY_ID });
    });

    it('matches the demo email case-insensitively', async () => {
      getUser.mockResolvedValue({ data: { user: { id: 'demo-user', email: 'Demo@Broadust.io' } }, error: null });
      usersChain.single.mockResolvedValue({ data: { company_id: 'scratch-company' }, error: null });

      expect((await requireAuth(authedRequest())).companyId).toBe(DEMO_COMPANY_ID);
    });

    it('leaves an ordinary customer alone', async () => {
      usersChain.single.mockResolvedValue({ data: { company_id: 'customer-co' }, error: null });
      await requireAuth(authedRequest());
      expect(usersChain.update).not.toHaveBeenCalled();
    });

    it('does not rewrite a demo user already on the demo company', async () => {
      getUser.mockResolvedValue({ data: { user: { id: 'demo-user', email: 'demo@broadust.io' } }, error: null });
      usersChain.single.mockResolvedValue({ data: { company_id: DEMO_COMPANY_ID }, error: null });

      expect((await requireAuth(authedRequest())).companyId).toBe(DEMO_COMPANY_ID);
      expect(usersChain.update).not.toHaveBeenCalled();
    });
  });
});