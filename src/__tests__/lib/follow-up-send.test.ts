/**
 * Tests for the shared follow-up send path.
 *
 * The invariant that matters most is not "does it send" but "does it always
 * leave a terminal status behind". `follow_up_items` is selected by
 * `status = 'scheduled'`, so a send that delivers the email but fails to flip
 * the status gets sent a second time by cron — a customer gets the same email
 * twice. These tests pin that down, along with recipient resolution and the
 * ownership check that stops one tenant addressing another's row.
 */
import { deliverFollowUp, resolveFollowUpRecipient } from '@/lib/follow-up-send'

// ── Supabase mock ─────────────────────────────────────────────────────────
// A tiny chainable stub: from().select().eq().eq().eq().maybeSingle()/.single()
type Row = Record<string, unknown>

const tables: Record<string, Row[]> = {}
const updateCalls: Array<{ table: string; patch: Row; filter: Row }> = []

jest.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from(table: string) {
      const rows = () => tables[table] || []
      const chain: Record<string, unknown> = {}
      const filters: Row = {}
      for (const method of ['select', 'eq', 'single', 'maybeSingle', 'order', 'limit'] as const) {
        chain[method] = (...args: unknown[]) => {
          if (method === 'eq') {
            const [col, val] = args as [string, unknown]
            filters[col] = val
            return chain
          }
          if (method === 'maybeSingle' || method === 'single') {
            const match = rows().find((r) =>
              Object.entries(filters).every(([c, v]) => r[c] === v)
            )
            return Promise.resolve({ data: match ?? null, error: null })
          }
          return chain
        }
      }
      // update() must stay chainable, and must record the write so a test can
      // assert the status the send left behind.
      chain.update = (patch: Row) => {
        const base = { table, patch, filter: filters }
        const uchain: Record<string, unknown> = {}
        uchain.eq = (col: string, val: unknown) => {
          base.filter[col] = val
          return uchain
        }
        uchain.then = (resolve: (v: unknown) => unknown) => {
          updateCalls.push(base)
          return Promise.resolve({ data: null, error: null }).then(resolve)
        }
        return uchain
      }
      return chain
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...({} as any),
  },
}))

const sendEmailMock = jest.fn()
jest.mock('@/lib/email', () => ({ sendEmail: (...a: unknown[]) => sendEmailMock(...a) }))

// The service-role client used for the status write goes through the same
// mock; capture those calls.
const updateSpy = jest.fn()
beforeEach(() => {
  Object.values(tables).forEach(() => undefined)
  for (const k of Object.keys(tables)) delete tables[k]
  updateCalls.length = 0
  sendEmailMock.mockReset()
  sendEmailMock.mockResolvedValue({ success: true })
  updateSpy.mockClear()
})

// Build the rows the happy path needs.
function seedFullChain(
  overrides: { contactEmail?: string | null; companyId?: string } = {}
) {
  const co = overrides.companyId ?? 'co-1'
  // Every row carries company_id because every read in the real code scopes on
  // it — a fixture that omits it fails the ownership filter, not the logic.
  tables.follow_up_sequences = [{ id: 'seq-1', opportunity_id: 'opp-1', company_id: co }]
  tables.opportunities = [{ id: 'opp-1', contact_id: 'ct-1', customer_id: 'cu-1', company_id: co }]
  tables.contacts = [
    {
      id: 'ct-1',
      email: overrides.contactEmail === undefined ? 'amy@buyer.com' : overrides.contactEmail,
      full_name: 'Amy Liu',
      company_id: co,
    },
  ]
  tables.customers = [{ id: 'cu-1', email: 'sales@buyer.com', trading_name: 'Northwind', company_id: co }]
  tables.follow_up_items = [{ id: 'item-1', sequence_id: 'seq-1', company_id: co }]
}

describe('resolveFollowUpRecipient', () => {
  it('prefers the named contact over the company address', async () => {
    seedFullChain()
    const r = await resolveFollowUpRecipient('seq-1', 'co-1')
    expect(r).toEqual({ email: 'amy@buyer.com', name: 'Amy Liu' })
  })

  it('falls back to the customer address when the contact has no email', async () => {
    seedFullChain({ contactEmail: null })
    const r = await resolveFollowUpRecipient('seq-1', 'co-1')
    expect(r?.email).toBe('sales@buyer.com')
  })

  it('falls back to the customer address when the contact is blank', async () => {
    seedFullChain({ contactEmail: '   ' })
    const r = await resolveFollowUpRecipient('seq-1', 'co-1')
    expect(r?.email).toBe('sales@buyer.com')
  })

  it('returns null when the sequence has no opportunity', async () => {
    tables.follow_up_sequences = [{ id: 'seq-1', opportunity_id: null, company_id: 'co-1' }]
    expect(await resolveFollowUpRecipient('seq-1', 'co-1')).toBeNull()
  })

  it('returns null when neither contact nor customer has an address', async () => {
    seedFullChain({ contactEmail: null })
    tables.customers = [{ id: 'cu-1', email: null, company_id: 'co-1' }]
    expect(await resolveFollowUpRecipient('seq-1', 'co-1')).toBeNull()
  })
})

describe('deliverFollowUp', () => {
  it('sends to the resolved contact and marks the item sent', async () => {
    seedFullChain()
    const r = await deliverFollowUp({
      sequenceId: 'seq-1',
      itemId: 'item-1',
      companyId: 'co-1',
      subject: 'Following up',
      body: 'Hi Amy — any update?',
    })
    expect(r.success).toBe(true)
    expect(sendEmailMock).toHaveBeenCalledTimes(1)
    expect(sendEmailMock.mock.calls[0][0]).toMatchObject({
      to: 'amy@buyer.com',
      subject: 'Following up',
    })
  })

  it('never sends an item that belongs to another sequence', async () => {
    seedFullChain()
    const r = await deliverFollowUp({
      sequenceId: 'seq-1',
      itemId: 'item-from-another-seq',
      companyId: 'co-1',
      subject: 'x',
      body: 'y',
    })
    expect(r.success).toBe(false)
    expect(r.notFound).toBe(true)
    expect(sendEmailMock).not.toHaveBeenCalled()
  })

  it('never sends an item belonging to another company', async () => {
    // Same ids, different tenant. Every read is scoped by company_id, so
    // nothing resolves and nothing goes out.
    seedFullChain({ companyId: 'other-company' })
    const r = await deliverFollowUp({
      sequenceId: 'seq-1',
      itemId: 'item-1',
      companyId: 'co-1',
      subject: 'x',
      body: 'y',
    })
    expect(r.success).toBe(false)
    expect(sendEmailMock).not.toHaveBeenCalled()
  })

  it('does not send when there is no deliverable address', async () => {
    seedFullChain({ contactEmail: null })
    tables.customers = [{ id: 'cu-1', email: null, company_id: 'co-1' }]
    const r = await deliverFollowUp({
      sequenceId: 'seq-1',
      itemId: 'item-1',
      companyId: 'co-1',
      subject: 'x',
      body: 'y',
    })
    expect(r.success).toBe(false)
    expect(sendEmailMock).not.toHaveBeenCalled()
    expect(r.error).toMatch(/contact email/i)
  })

  it('lets an explicit recipient override resolution', async () => {
    seedFullChain()
    const r = await deliverFollowUp({
      sequenceId: 'seq-1',
      itemId: 'item-1',
      companyId: 'co-1',
      subject: 'x',
      body: 'y',
      recipientEmail: 'someone-else@buyer.com',
    })
    expect(r.success).toBe(true)
    expect(sendEmailMock.mock.calls[0][0].to).toBe('someone-else@buyer.com')
  })

  // ── The status write ────────────────────────────────────────────────
  // follow_up_items is polled with status = 'scheduled'. A delivered email
  // that leaves the row 'scheduled' is sent again by cron, so these two tests
  // guard against a duplicate email to a real customer.

  it('marks the item sent and records the exact text that went out', async () => {
    seedFullChain()
    await deliverFollowUp({
      sequenceId: 'seq-1',
      itemId: 'item-1',
      companyId: 'co-1',
      subject: 'Following up',
      body: 'Hi Amy — the exact text the human approved.',
    })

    const write = updateCalls.find((c) => c.table === 'follow_up_items')
    expect(write).toBeDefined()
    expect(write!.patch.status).toBe('sent')
    expect(write!.patch.sent_at).toEqual(expect.any(String))
    expect(write!.patch.message_body).toBe('Hi Amy — the exact text the human approved.')
    expect(write!.patch.subject).toBe('Following up')
    expect(write!.patch.error_message).toBeNull()
  })

  it('marks the item failed and leaves it retryable when the mail is refused', async () => {
    seedFullChain()
    sendEmailMock.mockResolvedValue({ success: false, error: 'domain not verified' })

    const r = await deliverFollowUp({
      sequenceId: 'seq-1',
      itemId: 'item-1',
      companyId: 'co-1',
      subject: 'x',
      body: 'y',
    })

    expect(r.success).toBe(false)
    const write = updateCalls.find((c) => c.table === 'follow_up_items')
    expect(write!.patch.status).toBe('failed')
    // No sent_at: a failed item must not look like it was delivered.
    expect(write!.patch.sent_at).toBeNull()
    expect(write!.patch.error_message).toBe('domain not verified')
  })
})
