import '@testing-library/jest-dom'

// Polyfill Request/Response/NextResponse for Node test environment
if (typeof globalThis.Request === 'undefined') {
  // @ts-expect-error polyfill
  globalThis.Request = class Request {
    url: string
    method: string
    headers: Record<string, string>
    body: unknown
    constructor(input: string | Request, init?: RequestInit) {
      this.url = typeof input === 'string' ? input : input.url
      this.method = init?.method ?? 'GET'
      this.headers = {}
      if (init?.headers) {
        const h = init.headers as Record<string, string>
        for (const k in h) this.headers[k] = h[k]
      }
      this.body = init?.body ?? null
    }
    json() {
      return Promise.resolve(this.body ? JSON.parse(this.body as string) : {})
    }
  }
}

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
process.env.npm_package_version = '0.1.0'

jest.mock('@/lib/supabase', () => {
  const mockQuery = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    then: jest.fn().mockResolvedValue({ data: [], error: null }),
  }

  return {
    supabase: {
      from: jest.fn(() => mockQuery),
    },
    supabaseAdmin: {
      from: jest.fn(() => mockQuery),
    },
  }
})
