import { supabaseAdmin } from '@/lib/supabase';

export const DEMO_COMPANY_ID = '99b52405-c9f2-4ac0-bf7e-69b10c3cfea5';

function daysAgo(iso?: string | null, now = Date.now()): string {
  if (!iso) return 'unknown';
  const diff = Math.round((now - new Date(iso).getTime()) / 86400000);
  if (diff <= 0) return 'today';
  if (diff === 1) return '1 day ago';
  if (diff < 30) return `${diff} days ago`;
  return new Date(iso).toISOString().slice(0, 10);
}

function clip(s: string | null | undefined, n: number): string {
  if (!s) return '';
  return s.length > n ? `${s.slice(0, n).trimEnd()}…` : s;
}

function fmtValue(v: number | null | undefined, cur: string | null | undefined): string {
  if (v == null || v <= 0) return '—';
  return `${Intl.NumberFormat('en-US').format(v)} ${cur || 'USD'}`;
}

/**
 * Builds a compact "Active inquiries, deals & follow-ups" context block for the
 * demo chat. Lets the AI answer questions about individual clients/inquiries,
 * quote status, pipelines, and scheduled follow-ups.
 */
export async function buildInquiryContext(companyId: string): Promise<string> {
  const blocks: string[] = [];

  const now = Date.now();
  try {
    const { data: convs } = await supabaseAdmin
      .from('conversations')
      .select('contact_name, subject, product_summary, status, channel, needs_reply, next_action, updated_at, estimated_value, currency')
      .eq('company_id', companyId)
      .order('updated_at', { ascending: false })
      .limit(15);

    if (convs?.length) {
      const lines = convs.map((c: any) => {
        const topic = clip(c.subject || c.product_summary, 60);
        const status = c.status || 'active';
        const reply = c.needs_reply === true ? '(needs my reply)' : '(waiting on customer)';
        const next = c.next_action ? ` · next: ${clip(c.next_action, 40)}` : '';
        const val = c.estimated_value ? ` · value ${fmtValue(c.estimated_value, c.currency)}` : '';
        return `- ${c.contact_name || 'Unknown'} — ${topic} — ${status} ${reply}${next}${val} (last activity ${daysAgo(c.updated_at, now)}, channel ${c.channel || 'email'})`;
      });
      blocks.push(`## Active client inquiries (mailbox)\n${lines.join('\n')}`);
    }
  } catch (err) {
    console.error('[inquiry-context] conversations failed:', err);
  }

  try {
    const { data: opps } = await supabaseAdmin
      .from('opportunities')
      .select('id, title, stage, product_name, estimated_order_value, currency, next_action, last_activity_at')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('last_activity_at', { ascending: false })
      .limit(12);

    if (opps?.length) {
      const lines = opps.map((o: any) => {
        const next = o.next_action ? ` · next: ${clip(o.next_action, 40)}` : '';
        const stage = o.stage || 'NEW';
        const last = o.last_activity_at ? ` · last activity ${daysAgo(o.last_activity_at, now)}` : '';
        return `- ${clip(o.title, 60)} — stage ${stage}, value ${fmtValue(o.estimated_order_value, o.currency)}${next}${last}`;
      });
      blocks.push(`## Open opportunities / deals\n${lines.join('\n')}`);
    }
  } catch (err) {
    console.error('[inquiry-context] opportunities failed:', err);
  }

  try {
    const { data: quotes } = await supabaseAdmin
      .from('quotes')
      .select('id, quote_number, status, total_amount, total_margin, opportunity_id, customer_id, contact_id, updated_at, sent_at')
      .eq('company_id', companyId)
      .order('updated_at', { ascending: false })
      .limit(12);

    if (quotes?.length) {
      const oppIds = [...new Set((quotes as any[]).map((q) => q.opportunity_id).filter(Boolean))];
      const custIds = [...new Set((quotes as any[]).map((q) => q.customer_id).filter(Boolean))];
      const contactIds = [...new Set((quotes as any[]).map((q) => q.contact_id).filter(Boolean))];

      const [, custRes, contactRes] = await Promise.all([
        oppIds.length
          ? supabaseAdmin.from('opportunities').select('id, title').in('id', oppIds)
          : Promise.resolve({ data: [] as any[] }),
        custIds.length
          ? supabaseAdmin.from('customers').select('id, trading_name, legal_name').in('id', custIds)
          : Promise.resolve({ data: [] as any[] }),
        contactIds.length
          ? supabaseAdmin.from('contacts').select('id, name, trading_name').in('id', contactIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const custNames = new Map((custRes.data || []).map((c: any) => [c.id, c.trading_name || c.legal_name]));
      const contactNames = new Map((contactRes.data || []).map((c: any) => [c.id, c.trading_name || c.name]));

      const lines = (quotes as any[]).map((q) => {
        const customer = q.customer_id
          ? custNames.get(q.customer_id)
          : q.contact_id
            ? contactNames.get(q.contact_id)
            : null;
        const margin = q.total_amount && q.total_margin != null
          ? `, margin ${((q.total_margin / q.total_amount) * 100).toFixed(0)}%`
          : '';
        return `- ${q.quote_number} — ${customer || 'unknown customer'} — ${q.status}${margin} (${q.sent_at ? `sent ${daysAgo(q.sent_at, now)}` : 'not sent yet'})`;
      });
      blocks.push(`## Quotes\n${lines.join('\n')}`);
    }
  } catch (err) {
    console.error('[inquiry-context] quotes failed:', err);
  }

  try {
    const { data: seqs } = await supabaseAdmin
      .from('follow_up_sequences')
      .select('id, opportunity_id, status, channel, created_at, follow_up_items(step_number, status, scheduled_for, sent_at)')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(6);

    if (seqs?.length) {
      const oppIds = [...new Set((seqs as any[]).map((s) => s.opportunity_id).filter(Boolean))];
      const opMap = new Map<string, string>();
      if (oppIds.length) {
        const { data: opps } = await supabaseAdmin
          .from('opportunities')
          .select('id, title')
          .in('id', oppIds);
        for (const o of opps || []) opMap.set(o.id, o.title);
      }

      const lines = (seqs as any[]).map((s) => {
        const items: any[] = (s.follow_up_items as any[]) || [];
        const sent = items.filter((i) => i.status === 'sent' || i.sent_at).length;
        const next = items
          .filter((i) => i.status === 'scheduled')
          .sort((a, b) => new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime())[0];
        const nextTxt = next
          ? `, next ${new Date(next.scheduled_for).toISOString().slice(0, 10)}`
          : '';
        return `- ${clip(opMap.get(s.opportunity_id) || s.opportunity_id.slice(0, 8), 50)} — ${s.status} (${sent}/${items.length || 0} steps done${nextTxt}), channel ${s.channel || 'email'}`;
      });
      blocks.push(`## Follow-up sequences\n${lines.join('\n')}`);
    }
  } catch (err) {
    console.error('[inquiry-context] follow-ups failed:', err);
  }

  if (!blocks.length) return '';
  return `\n\n## Current Business Snapshot (live demo data — answer confidently from this)\n${blocks.join('\n\n')}`;
}