import { NextRequest } from 'next/server'
import { GET, POST, PUT, DELETE } from '@/app/api/admin/products/route'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/api-auth'

jest.mock('@/lib/supabase')
jest.mock('@/lib/api-auth')

const mockRequireAuth = requireAuth as jest.MockedFunction<typeof requireAuth>

// The products route resolves its tenant from the verified session, so these
// tests supply one instead of a `company_id` parameter. Cross-tenant
// behaviour is covered in depth by tenant-isolation.test.ts.
const session = { user: { id: 'u1', email: 'owner@example.com' }, companyId: 'comp-1' }

const mockProducts = [
  { id: '1', name: 'Widget A', company_id: 'comp-1', category: 'parts' },
  { id: '2', name: 'Widget B', company_id: 'comp-1', category: 'parts' },
]

function buildQueryChain(result: { data: unknown; error: unknown }) {
  // Every method returns the chain so the route's
  // .insert().select().single() style calls resolve.
  const chain: Record<string, unknown> = {}
  chain.select = jest.fn().mockReturnValue(chain)
  chain.insert = jest.fn().mockReturnValue(chain)
  chain.update = jest.fn().mockReturnValue(chain)
  chain.delete = jest.fn().mockReturnValue(chain)
  chain.eq = jest.fn().mockReturnValue(chain)
  chain.order = jest.fn().mockReturnValue(chain)
  chain.single = jest.fn().mockResolvedValue(result)
  chain.then = (resolve: (v: { data: unknown; error: unknown }) => void) => resolve(result)
  return chain
}

describe('/api/admin/products', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireAuth.mockResolvedValue(session)
  })

  describe('GET', () => {
    it('returns products array', async () => {
      const chain = buildQueryChain({ data: mockProducts, error: null })
      ;(supabaseAdmin.from as jest.Mock).mockReturnValue(chain)

      const req = new NextRequest('http://localhost/api/admin/products')
      const response = await GET(req)
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.products).toEqual(mockProducts)
    })

    it('returns 500 when the query fails', async () => {
      const chain = buildQueryChain({ data: null, error: { message: 'connection reset' } })
      ;(supabaseAdmin.from as jest.Mock).mockReturnValue(chain)

      const response = await GET(new NextRequest('http://localhost/api/admin/products'))

      expect(response.status).toBe(500)
      expect((await response.json()).error).toBe('connection reset')
    })

    it('returns 400 when the session has no company', async () => {
      mockRequireAuth.mockResolvedValue({ user: session.user, companyId: null })

      const response = await GET(new NextRequest('http://localhost/api/admin/products'))
      const body = await response.json()

      expect(response.status).toBe(400)
      expect(body.error).toBe('No company associated with this account')
    })

    it('propagates the 401 from requireAuth', async () => {
      mockRequireAuth.mockRejectedValue(Response.json({ error: 'Not authenticated' }, { status: 401 }))

      const response = await GET(new NextRequest('http://localhost/api/admin/products'))
      expect(response.status).toBe(401)
    })
  })

  describe('POST', () => {
    it('creates a product', async () => {
      const newProduct = { id: '3', name: 'Widget C', company_id: 'comp-1' }
      const chain = buildQueryChain({ data: newProduct, error: null })
      ;(supabaseAdmin.from as jest.Mock).mockReturnValue(chain)

      const req = new NextRequest('http://localhost/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: 'comp-1', name: 'Widget C' }),
      })
      const response = await POST(req)
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.product).toEqual(newProduct)
    })

    it('returns 400 when the name is missing', async () => {
      const req = new NextRequest('http://localhost/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: 'comp-1' }),
      })
      const response = await POST(req)
      const body = await response.json()

      expect(response.status).toBe(400)
      expect(body.error).toBe('name required')
    })

    it('returns 403 when the body names a different company', async () => {
      const chain = buildQueryChain({ data: null, error: null })
      ;(supabaseAdmin.from as jest.Mock).mockReturnValue(chain)

      const req = new NextRequest('http://localhost/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: 'comp-2', name: 'Widget C' }),
      })
      const response = await POST(req)

      expect(response.status).toBe(403)
      expect(chain.insert).not.toHaveBeenCalled()
    })
  })

  describe('PUT', () => {
    it('updates a product the caller owns', async () => {
      const updated = { id: '1', name: 'Widget A2', company_id: 'comp-1' }
      const chain = buildQueryChain({ data: updated, error: null })
      ;(supabaseAdmin.from as jest.Mock).mockReturnValue(chain)

      const req = new NextRequest('http://localhost/api/admin/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: '1', name: 'Widget A2' }),
      })
      const response = await PUT(req)
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.product).toEqual(updated)
    })

    it('returns 400 when the id is missing', async () => {
      const req = new NextRequest('http://localhost/api/admin/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Widget A2' }),
      })
      const response = await PUT(req)

      expect(response.status).toBe(400)
      expect((await response.json()).error).toBe('id required')
    })
  })

  describe('DELETE', () => {
    it('deletes a product', async () => {
      const chain = buildQueryChain({ data: null, error: null })
      ;(supabaseAdmin.from as jest.Mock).mockReturnValue(chain)

      const req = new NextRequest('http://localhost/api/admin/products?id=1')
      const response = await DELETE(req)
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.ok).toBe(true)
    })

    it('returns 400 when id missing', async () => {
      const req = new NextRequest('http://localhost/api/admin/products')
      const response = await DELETE(req)
      const body = await response.json()

      expect(response.status).toBe(400)
      expect(body.error).toBe('id required')
    })
  })
})