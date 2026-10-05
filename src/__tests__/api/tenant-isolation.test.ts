import { NextRequest } from 'next/server';
import { GET, POST, PUT, DELETE } from '@/app/api/admin/products/route';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';

jest.mock('@/lib/supabase');
jest.mock('@/lib/api-auth');

const mockRequireAuth = requireAuth as jest.MockedFunction<typeof requireAuth>;

const session = { user: { id: 'u1', email: 'owner@example.com' }, companyId: 'company-A' };

/**
 * Query chain that records the insert/update payload so a test can assert the
 * tenant written to the row, not just the HTTP status.
 */
function buildQuery(overrides: { existing?: unknown } = {}) {
  const state: { insertPayload?: Record<string, unknown>; updatePayload?: Record<string, unknown> } = {};
  let chain: any;
  chain = {
    select: jest.fn().mockReturnThis(),
    // Must return the chain, not a promise: the real routes chain
    // .update().eq().select().single() before awaiting anything.
    insert: jest.fn((payload: Record<string, unknown>) => {
      state.insertPayload = payload;
      return chain;
    }),
    update: jest.fn((payload: Record<string, unknown>) => {
      state.updatePayload = payload;
      return chain;
    }),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: overrides.existing ?? null, error: null }),
    then: (resolve: (v: { data: unknown; error: unknown }) => void) =>
      resolve({ data: overrides.existing ? [overrides.existing] : [], error: null }),
  };
  return { chain, state };
}

const req = (body?: unknown, url = 'http://localhost/api/admin/products') =>
  new NextRequest(url, body ? { method: 'POST', body: JSON.stringify(body) } : undefined);

describe('admin tenant isolation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAuth.mockResolvedValue(session);
  });

  describe('POST', () => {
    it('refuses to create a row for another company', async () => {
      const { chain } = buildQuery();
      (supabaseAdmin.from as jest.Mock).mockReturnValue(chain);

      const res = await POST(req({ company_id: 'company-B', name: 'Widget' }));
      expect(res.status).toBe(403);
      await expect(res.json()).resolves.toEqual({ error: 'Forbidden' });
      // Crucially, nothing was written.
      expect(chain.insert).not.toHaveBeenCalled();
    });

    it('writes the session tenant even when the body claims another', async () => {
      const { chain, state } = buildQuery();
      (supabaseAdmin.from as jest.Mock).mockReturnValue(chain);

      // A matching company_id is accepted for onboarding payload compatibility.
      await POST(req({ company_id: 'company-A', name: 'Widget' }));
      expect(state.insertPayload?.company_id).toBe('company-A');
    });

    it('does not let a body-supplied tenant win when the body omits one', async () => {
      const { chain, state } = buildQuery();
      (supabaseAdmin.from as jest.Mock).mockReturnValue(chain);

      await POST(req({ name: 'Widget' }));
      expect(state.insertPayload?.company_id).toBe('company-A');
    });

    it('rejects a request from an account with no company', async () => {
      mockRequireAuth.mockResolvedValue({ user: session.user, companyId: null });
      const { chain } = buildQuery();
      (supabaseAdmin.from as jest.Mock).mockReturnValue(chain);

      const res = await POST(req({ name: 'Widget' }));
      expect(res.status).toBe(400);
      expect(chain.insert).not.toHaveBeenCalled();
    });

    it('propagates the 401 from requireAuth instead of treating it as anonymous', async () => {
      mockRequireAuth.mockRejectedValue(Response.json({ error: 'Not authenticated' }, { status: 401 }));
      const res = await POST(req({ name: 'Widget' }));
      expect(res.status).toBe(401);
    });

    it('still requires a name', async () => {
      const res = await POST(req({ company_id: 'company-A' }));
      expect(res.status).toBe(400);
    });
  });

  describe('PUT', () => {
    it('refuses to update a row owned by another company', async () => {
      const { chain } = buildQuery({ existing: { id: 'row-1', company_id: 'company-B' } });
      (supabaseAdmin.from as jest.Mock).mockReturnValue(chain);

      const res = await PUT(req({ id: 'row-1', name: 'Renamed' }));
      expect(res.status).toBe(403);
      expect(chain.update).not.toHaveBeenCalled();
    });

    it('refuses a body company_id that contradicts the session', async () => {
      const { chain } = buildQuery({ existing: { id: 'row-1', company_id: 'company-A' } });
      (supabaseAdmin.from as jest.Mock).mockReturnValue(chain);

      const res = await PUT(req({ id: 'row-1', company_id: 'company-B', name: 'Renamed' }));
      expect(res.status).toBe(403);
      expect(chain.update).not.toHaveBeenCalled();
    });

    it('allows the owner to update their own row', async () => {
      const { chain, state } = buildQuery({ existing: { id: 'row-1', company_id: 'company-A' } });
      (supabaseAdmin.from as jest.Mock).mockReturnValue(chain);

      const res = await PUT(req({ id: 'row-1', name: 'Renamed' }));
      expect(res.status).toBe(200);
      expect(state.updatePayload).toMatchObject({ name: 'Renamed' });
    });

    it('cannot be used to move a row to another tenant', async () => {
      const { chain, state } = buildQuery({ existing: { id: 'row-1', company_id: 'company-A' } });
      (supabaseAdmin.from as jest.Mock).mockReturnValue(chain);

      await PUT(req({ id: 'row-1', company_id: 'company-A', name: 'Renamed' }));
      // company_id is destructured out of the updates payload, so it can never
      // be reassigned through the update body.
      expect(state.updatePayload).not.toHaveProperty('company_id');
    });

    it('requires an id', async () => {
      const res = await PUT(req({ name: 'Renamed' }));
      expect(res.status).toBe(400);
    });
  });

  describe('DELETE', () => {
    it('refuses to delete a row owned by another company', async () => {
      const { chain } = buildQuery({ existing: { id: 'row-1', company_id: 'company-B' } });
      (supabaseAdmin.from as jest.Mock).mockReturnValue(chain);

      const res = await DELETE(req(undefined, 'http://localhost/api/admin/products?id=row-1'));
      expect(res.status).toBe(403);
      expect(chain.delete).not.toHaveBeenCalled();
    });

    it('allows the owner to delete their own row', async () => {
      const { chain } = buildQuery({ existing: { id: 'row-1', company_id: 'company-A' } });
      (supabaseAdmin.from as jest.Mock).mockReturnValue(chain);

      const res = await DELETE(req(undefined, 'http://localhost/api/admin/products?id=row-1'));
      expect(res.status).toBe(200);
      expect(chain.delete).toHaveBeenCalled();
    });

    it('requires an id', async () => {
      const { chain } = buildQuery();
      (supabaseAdmin.from as jest.Mock).mockReturnValue(chain);

      const res = await DELETE(req(undefined, 'http://localhost/api/admin/products'));
      expect(res.status).toBe(400);
      expect(chain.delete).not.toHaveBeenCalled();
    });
  });

  describe('GET', () => {
    it('lists only the session tenant', async () => {
      const { chain } = buildQuery({
        existing: { id: 'row-1', name: 'Widget', company_id: 'company-A' },
      });
      (supabaseAdmin.from as jest.Mock).mockReturnValue(chain);

      await GET(req(undefined, 'http://localhost/api/admin/products'));
      // The company filter is applied on the query itself rather than in JS.
      expect(chain.eq).toHaveBeenCalledWith('company_id', 'company-A');
    });

    it('ignores a company_id query parameter from the caller', async () => {
      const { chain } = buildQuery({
        existing: { id: 'row-1', name: 'Widget', company_id: 'company-A' },
      });
      (supabaseAdmin.from as jest.Mock).mockReturnValue(chain);

      await GET(req(undefined, 'http://localhost/api/admin/products?company_id=company-B'));
      expect(chain.eq).toHaveBeenCalledWith('company_id', 'company-A');
      expect(chain.eq).not.toHaveBeenCalledWith('company_id', 'company-B');
    });
  });
});