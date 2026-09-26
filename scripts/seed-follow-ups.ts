#!/usr/bin/env tsx
/**
 * Seed demo follow-up sequences + items for the demo company.
 * Idempotent: skips if sequences already exist for the demo company.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(import.meta.dirname || __dirname, '..');
const env: Record<string, string> = {};
for (const line of readFileSync(join(ROOT, '.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}
const supabase = createClient(env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

const CID = '99b52405-c9f2-4ac0-bf7e-69b10c3cfea5';
const CREATED_BY = '3a448b81-4706-4b27-9456-f3dc1e18fb78';
const DAY = 86400000;
const now = Date.now();

async function getOpportunity(titleIncludes: string) {
  const { data, error } = await supabase
    .from('opportunities')
    .select('id, title')
    .eq('company_id', CID)
    .ilike('title', `%${titleIncludes}%`)
    .is('deleted_at', null)
    .limit(1);
  if (error) throw new Error(`opportunity lookup failed: ${error.message}`);
  return data?.[0] ?? null;
}

async function getQuote(quoteNumber: string) {
  const { data, error } = await supabase
    .from('quotes')
    .select('id, quote_number')
    .eq('company_id', CID)
    .eq('quote_number', quoteNumber)
    .limit(1);
  if (error) throw new Error(`quote lookup failed: ${error.message}`);
  return data?.[0] ?? null;
}

function iso(ms: number) {
  return new Date(ms).toISOString();
}

async function main() {
  const { data: existing, error: existingErr } = await supabase
    .from('follow_up_sequences')
    .select('id')
    .eq('company_id', CID);
  if (existingErr) throw existingErr;
  if ((existing?.length ?? 0) >= 4) {
    console.log(`Already ${existing!.length} sequences — skipping seed.`);
    return;
  }

  const chloe = await getOpportunity('Chloe Fontaine');
  const amy = await getOpportunity('Amy Liu');
  const jamesSend = await getOpportunity('5,000 insulated stainless bottles');
  const daniel = await getOpportunity('Daniel Kim');

  if (!chloe || !amy || !jamesSend || !daniel) {
    console.error('Missing opportunity. Got:', { chloe, amy, jamesSend, daniel });
    process.exit(1);
  }

  const chloeQuote = await getQuote('QT-2026-8801');
  const amyQuote = await getQuote('QT-2026-6954');
  const jamesQuote = await getQuote('QT-2026-1520');
  const danielQuote = await getQuote('QT-2026-3377');

  const sequences: any[] = [];
  const items: any[] = [];

  // 1) Chloe Fontaine — ACTIVE, halfway through: step 1 sent, step 2 due today, rest scheduled
  {
    const seqId = crypto.randomUUID();
    sequences.push({
      id: seqId,
      company_id: CID,
      opportunity_id: chloe.id,
      quote_id: chloeQuote?.id ?? null,
      status: 'active',
      channel: 'email',
      created_by: CREATED_BY,
      created_at: iso(now - 12 * DAY),
      updated_at: iso(now),
    });
    const plan = [
      { step: 1, delay: 3, status: 'sent', subject: 'Re: Checking in — recycled PET lanyard quote', at: now - 9 * DAY },
      { step: 2, delay: 7, status: 'scheduled', subject: 'Quick question about your lanyard requirements', at: now + 5 * 3600000 },
      { step: 3, delay: 14, status: 'scheduled', subject: 'Additional lanyard options for your consideration', at: now + 6 * DAY },
      { step: 4, delay: 21, status: 'scheduled', subject: 'Last follow-up on the lanyard quote', at: now + 12 * DAY },
    ];
    for (const p of plan as any[]) {
      const itemId = crypto.randomUUID();
      items.push({
        id: itemId,
        sequence_id: seqId,
        company_id: CID,
        step_number: p.step,
        delay_days: p.delay,
        scheduled_for: iso(p.at),
        status: p.status,
        message_type: p.step === 1 ? 'check_in' : p.step === 4 ? 'final' : 'needs_update',
        subject: p.subject,
        message_body: p.subject,
        sent_at: p.status === 'sent' ? iso(p.at) : null,
        created_at: iso(now - 12 * DAY),
        updated_at: iso(now),
      });
    }
  }

  // 2) Amy Liu — ACTIVE, early: step 1 sent, steps 2-4 scheduled
  {
    const seqId = crypto.randomUUID();
    sequences.push({
      id: seqId,
      company_id: CID,
      opportunity_id: amy.id,
      quote_id: amyQuote?.id ?? null,
      status: 'active',
      channel: 'email',
      created_by: CREATED_BY,
      created_at: iso(now - 2 * DAY),
      updated_at: iso(now),
    });
    const plan = [
      { step: 1, delay: 3, status: 'sent', subject: 'Checking in on your retail promo quote', at: now - 1 * DAY },
      { step: 2, delay: 7, status: 'scheduled', subject: 'Quick question about your promo requirements', at: now + 4 * DAY },
      { step: 3, delay: 14, status: 'scheduled', subject: 'Additional options for your consideration', at: now + 10 * DAY },
      { step: 4, delay: 21, status: 'scheduled', subject: 'Last follow-up — happy to help when you are ready', at: now + 16 * DAY },
    ];
    for (const p of plan as any[]) {
      items.push({
        id: crypto.randomUUID(),
        sequence_id: seqId,
        company_id: CID,
        step_number: p.step,
        delay_days: p.delay,
        scheduled_for: iso(p.at),
        status: p.status,
        message_type: p.step === 1 ? 'check_in' : p.step === 4 ? 'final' : 'needs_update',
        subject: p.subject,
        message_body: p.subject,
        sent_at: p.status === 'sent' ? iso(p.at) : null,
        created_at: iso(now - 2 * DAY),
        updated_at: iso(now),
      });
    }
  }

  // 3) James Park — PAUSED (quote sent, follow-ups paused while he negotiates)
  {
    const seqId = crypto.randomUUID();
    sequences.push({
      id: seqId,
      company_id: CID,
      opportunity_id: jamesSend.id,
      quote_id: jamesQuote?.id ?? null,
      status: 'paused',
      channel: 'email',
      created_by: CREATED_BY,
      paused_by: CREATED_BY,
      paused_at: iso(now - 2 * DAY),
      created_at: iso(now - 8 * DAY),
      updated_at: iso(now - 2 * DAY),
    });
    const plan = [
      { step: 1, delay: 3, status: 'sent', subject: 'Checking in on the insulated bottle quote', at: now - 6 * DAY },
      { step: 2, delay: 7, status: 'scheduled', subject: 'Quick question about bottle requirements', at: now + 1 * DAY },
      { step: 3, delay: 14, status: 'scheduled', subject: 'Volume pricing options for consideration', at: now + 7 * DAY },
      { step: 4, delay: 21, status: 'scheduled', subject: 'Last follow-up — happy to help when you are ready', at: now + 13 * DAY },
    ];
    for (const p of plan as any[]) {
      items.push({
        id: crypto.randomUUID(),
        sequence_id: seqId,
        company_id: CID,
        step_number: p.step,
        delay_days: p.delay,
        scheduled_for: iso(p.at),
        status: p.status,
        message_type: p.step === 1 ? 'check_in' : p.step === 4 ? 'final' : 'needs_update',
        subject: p.subject,
        message_body: p.subject,
        sent_at: p.status === 'sent' ? iso(p.at) : null,
        created_at: iso(now - 8 * DAY),
        updated_at: iso(now - 2 * DAY),
      });
    }
  }

  // 4) Daniel Kim — COMPLETED (customer declined → sequence closed)
  {
    const seqId = crypto.randomUUID();
    sequences.push({
      id: seqId,
      company_id: CID,
      opportunity_id: daniel.id,
      quote_id: danielQuote?.id ?? null,
      status: 'completed',
      channel: 'email',
      created_by: CREATED_BY,
      completed_at: iso(now - 6 * DAY),
      created_at: iso(now - 30 * DAY),
      updated_at: iso(now - 6 * DAY),
    });
    const plan = [
      { step: 1, delay: 3, status: 'sent', subject: 'Checking in on the messenger bag quote', at: now - 28 * DAY },
      { step: 2, delay: 7, status: 'sent', subject: 'Quick question about bag requirements', at: now - 24 * DAY },
      { step: 3, delay: 14, status: 'sent', subject: 'Additional bag options for consideration', at: now - 17 * DAY },
      { step: 4, delay: 21, status: 'sent', subject: 'Last follow-up — happy to help when you are ready', at: now - 10 * DAY },
    ];
    for (const p of plan as any[]) {
      items.push({
        id: crypto.randomUUID(),
        sequence_id: seqId,
        company_id: CID,
        step_number: p.step,
        delay_days: p.delay,
        scheduled_for: iso(p.at),
        status: p.status,
        message_type: p.step === 1 ? 'check_in' : p.step === 4 ? 'final' : 'needs_update',
        subject: p.subject,
        message_body: p.subject,
        sent_at: iso(p.at),
        created_at: iso(now - 30 * DAY),
        updated_at: iso(now - 6 * DAY),
      });
    }
  }

  for (const chunk of [sequences.slice(0, 2), sequences.slice(2)]) {
    const { error } = await supabase.from('follow_up_sequences').insert(chunk);
    if (error) throw new Error(`sequences insert failed: ${error.message}`);
    console.log(`Inserted ${chunk.length} sequences`);
  }
  for (const chunk of [items.slice(0, 8), items.slice(8)]) {
    const { error } = await supabase.from('follow_up_items').insert(chunk);
    if (error) throw new Error(`items insert failed: ${error.message}`);
    console.log(`Inserted ${chunk.length} items`);
  }
  console.log('Follow-up seed complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});