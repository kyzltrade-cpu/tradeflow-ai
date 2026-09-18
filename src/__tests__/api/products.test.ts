import { NextRequest } from 'next/server'
import { GET, POST, DELETE } from '@/app/api/admin/products/route'
import { supabaseAdmin } from '@/lib/supabase'

jest.mock('@/lib/supabase')

const mockProducts = [
  { id: '1', name: 'Widget A', company_id: 'comp-1', category: 'parts' },
  { id: '2', name: 'Widget B', company_id: 'comp-1', category: 'parts' },
]

function buildQueryChain(result: { data: unknown; error: unknown }) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(result),
    then: (resolve: (v: { data: unknown; error: unknown }) => void) =>
      resolve(result),
  }
  return chain
}

describe('/api/admin/products', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('returns products array', async () => {
      const chain = buildQueryChain({ data: mockProducts, error: null })
      ;(supabaseAdmin.from as jest.Mock).mockReturnValue(chain)

      const req = new NextRequest('http://localhost/api/admin/products?company_id=comp-1')
      const response = await GET(req)
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.products).toEqual(mockProducts)
    })

    it('returns 400 when company_id missing', async () => {
      const req = new NextRequest('http://localhost/api/admin/products')
      const response = await GET(req)
      const body = await response.json()

      expect(response.status).toBe(400)
      expect(body.error).toBe('company_id required')
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

    it('returns 400 when required fields missing', async () => {
      const req = new NextRequest('http://localhost/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const response = await POST(req)
      const body = await response.json()

      expect(response.status).toBe(400)
      expect(body.error).toBe('company_id and name required')
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
