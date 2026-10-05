import { GET as healthGet } from '@/app/api/health/route'
import { supabaseAdmin } from '@/lib/supabase'

jest.mock('@/lib/supabase')

// This previously issued a real fetch to http://localhost:3000, so it passed
// or failed depending on whether a dev server happened to be running — which
// makes it useless as a gate. The handler is called directly instead; the
// richer cases live in api/health.test.ts.
describe('Health Check', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(supabaseAdmin.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue({ data: null, error: null }),
    })
  })

  it('should return health status', async () => {
    const response = await healthGet()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveProperty('status')
    expect(data.status).toBe('ok')
  })
})