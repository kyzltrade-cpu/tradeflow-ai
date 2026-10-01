/**
 * Best-effort linking of demo opportunities to real contacts and customers.
 *
 * Sample/demo opportunity titles lead with the buyer name ("James Park — 5,000
 * insulated stainless bottles") or contain the customer name ("Sample — Nova
 * Retail Group: 120,000 insulated steel water bottles"). Without a contact or
 * customer on the row, the queue and the thread fall back to a blank dash or a
 * generic "Customer", which reads as broken data.
 *
 * Matching is name-based and therefore deliberately conservative: anything we
 * cannot confidently attribute is left null rather than guessed at.
 */

type Row = { data: unknown[] | null };

type Query = {
  from: (table: string) => {
    select: (cols: string) => {
      eq: (col: string, val: unknown) => PromiseLike<Row>;
    };
  };
};

export type OpportunityIdentity = {
  contact_id: string | null;
  customer_id: string | null;
};

const normalize = (s: string) =>
  s
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** "James Park — 5,000 bottles" -> "james park"; "Sample — Nova Retail Group: x" -> "sample" */
function titleLead(title: string): string {
  const cut = title.split(/\s+[—–-]\s+|:/)[0] ?? title;
  return normalize(cut);
}

export async function resolveOpportunityIdentities(
  db: Query,
  companyId: string,
  titles: string[],
): Promise<Map<string, OpportunityIdentity>> {
  const out = new Map<string, OpportunityIdentity>();
  for (const t of titles) out.set(t, { contact_id: null, customer_id: null });
  if (titles.length === 0) return out;

  const [{ data: contacts }, { data: customers }] = await Promise.all([
    db.from('contacts').select('id, full_name, customer_id, is_primary').eq('company_id', companyId),
    db.from('customers').select('id, trading_name, legal_name').eq('company_id', companyId),
  ]);

  const contactRows = (contacts ?? []) as Array<{
    id: string;
    full_name: string | null;
    customer_id: string | null;
    is_primary: boolean | null;
  }>;
  const customerRows = (customers ?? []) as Array<{
    id: string;
    trading_name: string | null;
    legal_name: string | null;
  }>;

  const byNormName = new Map<string, typeof contactRows[number]>();
  for (const c of contactRows) {
    const k = normalize(c.full_name ?? '');
    if (k && !byNormName.has(k)) byNormName.set(k, c);
  }

  for (const title of titles) {
    const lead = titleLead(title);
    const haystack = normalize(title);
    let identity: OpportunityIdentity = { contact_id: null, customer_id: null };

    // 1. The title leads with the buyer's name.
    const byLead = byNormName.get(lead);
    if (byLead) {
      identity = { contact_id: byLead.id, customer_id: byLead.customer_id ?? null };
    } else {
      // 2. Otherwise look for a contact name mentioned anywhere in the title.
      const mentioned = contactRows.find((c) => {
        const k = normalize(c.full_name ?? '');
        return k.length >= 4 && haystack.includes(k);
      });
      if (mentioned) {
        identity = { contact_id: mentioned.id, customer_id: mentioned.customer_id ?? null };
      }
    }

    // 3. Fall back to the customer named in the title, then its primary contact.
    if (!identity.customer_id && !identity.contact_id) {
      const namedCustomer = customerRows.find((c) => {
        const trading = normalize(c.trading_name ?? '');
        const legal = normalize(c.legal_name ?? '');
        return (
          (trading.length >= 4 && haystack.includes(trading)) ||
          (legal.length >= 4 && haystack.includes(legal))
        );
      });
      if (namedCustomer) {
        const ofCustomer = contactRows.filter((c) => c.customer_id === namedCustomer.id);
        const primary =
          ofCustomer.find((c) => c.is_primary) ?? ofCustomer[0] ?? null;
        identity = { contact_id: primary?.id ?? null, customer_id: namedCustomer.id };
      }
    }

    out.set(title, identity);
  }

  return out;
}
