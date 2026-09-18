import { GET } from '@/app/api/health/route'
import { supabaseAdmin } from '@/lib/supabase'

jest.mock('@/lib/supabase')

describe('/api/health', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 200 with status ok', async () => {
    const mockSelect = jest.fn().mockResolvedValue({ data: null, error: null })
    ;(supabaseAdmin.from as jest.Mock).mockReturnValue({ select: mockSelect })

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.status).toBe('ok')
    expect(body).toHaveProperty('timestamp')
    expect(body).toHaveProperty('version')
  })

  it('returns 500 when supabase fails', async () => {
    const mockSelect = jest.fn().mockResolvedValue({
      data: null,
      error: { message: 'Connection refused' },
    })
    ;(supabaseAdmin.from as jest.Mock).mockReturnValue({ select: mockSelect })

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.status).toBe('error')
    expect(body.error).toBe('Connection refused')
  })
})
