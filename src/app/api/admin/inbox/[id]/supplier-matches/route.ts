import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';

/**
 * GET /api/admin/inbox/[id]/supplier-matches
 *
 * Cheap, heuristic supplier matching for the email detail view.
 *
 * This is deliberately separate from /suggest: that route runs AI extraction
 * and is gated behind the monthly quote quota, so matches would only ever
 * appear after the user pressed "Price". Matching here is a pure keyword
 * score over the thread, so the pod is always available on open.
 */

interface SupplierMatch {
  id: string;
  name: string;
  location: string | null;
  is_approved: boolean;
  capabilities: string[];
  match_reason: string;
  performance_score: number | null;
  typical_lead_time_days: number | null;
  payment_terms: string | null;
}

const MAX_MATCHES = 4;
const MAX_THREAD_CHARS = 6000;

/**
 * Inquiry prose is padded with words that appear in capability strings by
 * coincidence ("are", "custom", "bags"). Left in, a single filler word scores
 * every supplier in the directory and buries the real match, so generic trade
 * and courtesy vocabulary is dropped before scoring.
 */
const STOPWORDS = new Set([
  // en courtesy / prose
  'are', 'the', 'and', 'for', 'with', 'from', 'that', 'this', 'our', 'your', 'you',
  'can', 'will', 'would', 'could', 'should', 'have', 'has', 'was', 'were', 'been',
  'please', 'thanks', 'thank', 'hello', 'dear', 'regards', 'best', 'kindly', 'also',
  'not', 'but', 'they', 'them', 'their', 'there', 'here', 'what', 'when', 'which',
  'who', 'how', 'why', 'any', 'all', 'some', 'each', 'other', 'than', 'then',
  // en trade filler
  'quotation', 'quote', 'inquiry', 'enquiry', 'inquire', 'enquire', 'interested',
  'interest', 'need', 'needs', 'needed', 'require', 'requires', 'required',
  'order', 'orders', 'quantity', 'quantities', 'amount', 'price', 'prices', 'pricing',
  'cost', 'costs', 'sample', 'samples', 'details', 'detail', 'information', 'info',
  'please advise', 'kindly advise', 'advise', 'regarding', 'concerning', 'attached',
  'attach', 'attachment', 'below', 'above', 'following', 'company', 'companies',
  // zh filler
  '我们', '我們', '你们', '你們', '他们', '他們', '这个', '這個', '那个', '那個',
  '可以', '需要', '希望', '请问', '請問', '谢谢', '謝謝', '附件', '报价', '報價',
  '询价', '詢價', '采购', '採購', '数量', '數量', '价格', '價格', '公司', '产品', '產品',
]);

const CJK = /[\u4e00-\u9fff]/;

/** Latin/number words of 3+ characters, minus filler. */
function latinTerms(text: string): string[] {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !CJK.test(w) && !STOPWORDS.has(w));
}

/**
 * Chinese has no spaces, so a whole clause would be one unusable token.
 * Overlapping bigrams are the standard cheap approximation.
 */
function cjkTerms(text: string): string[] {
  const out: string[] = [];
  for (const run of (text || '').match(/[\u4e00-\u9fff]{2,}/g) || []) {
    for (let i = 0; i + 2 <= run.length; i += 1) {
      const bigram = run.slice(i, i + 2);
      if (!STOPWORDS.has(bigram)) out.push(bigram);
    }
  }
  return out;
}

/** Cheap plural folding so "bottle" matches "bottles". */
function variants(word: string): string[] {
  const out = new Set<string>([word]);
  if (word.endsWith('ies')) out.add(`${word.slice(0, -3)}y`);
  if (word.endsWith('es')) out.add(word.slice(0, -2));
  if (word.endsWith('s') && !word.endsWith('ss')) out.add(word.slice(0, -1));
  return [...out];
}

/** Word-boundary index of a supplier's capabilities and name. */
function buildIndex(text: string): Set<string> {
  const index = new Set<string>();
  for (const word of latinTerms(text)) {
    for (const v of variants(word)) index.add(v);
  }
  return index;
}

function matchSuppliers(
  threadText: string,
  suppliers: Array<Record<string, unknown>>
): SupplierMatch[] {
  const terms = new Set<string>([...latinTerms(threadText), ...cjkTerms(threadText)]);
  if (terms.size === 0) return [];

  const scored: Array<{ s: Record<string, unknown>; score: number; matched: string[] }> = [];

  for (const s of suppliers) {
    const caps: string[] = Array.isArray(s.product_capabilities) ? s.product_capabilities : [];
    const nameText = `${s.trading_name || s.legal_name || ''} ${s.location || ''}`;
    // Word-boundary matching for Latin stops "con" from hitting "silicone".
    const index = buildIndex(`${caps.join(' ')} ${nameText}`);
    // CJK stays substring-based, since capabilities are stored as phrases.
    const cjkHaystack = `${caps.join(' ')} ${nameText}`;

    let score = 0;
    const matched: string[] = [];
    for (const term of terms) {
      const hit = CJK.test(term)
        ? cjkHaystack.includes(term)
        : variants(term).some((v) => index.has(v));
      if (hit) {
        score += 1;
        matched.push(term);
      }
    }
    if (score > 0) scored.push({ s, score, matched });
  }

  return scored
    .sort((a, b) => {
      // Approved suppliers outrank unapproved ones, then match depth, then
      // the supplier's own performance score.
      if (Boolean(a.s.is_approved) !== Boolean(b.s.is_approved)) {
        return a.s.is_approved ? -1 : 1;
      }
      if (b.score !== a.score) return b.score - a.score;
      return Number(b.s.performance_score || 0) - Number(a.s.performance_score || 0);
    })
    .slice(0, MAX_MATCHES)
    .map(({ s, matched }) => {
      const caps: string[] = Array.isArray(s.product_capabilities) ? s.product_capabilities : [];
      return {
        id: String(s.id),
        name: String(s.trading_name || s.legal_name || 'Supplier'),
        location: (s.location as string | null) || null,
        is_approved: Boolean(s.is_approved),
        capabilities: caps.slice(0, 3).map(String),
        match_reason: matched.length
          ? `Capabilities match: ${matched.slice(0, 4).join(', ')}`
          : 'In directory',
        performance_score:
          typeof s.performance_score === 'number' ? s.performance_score : null,
        typical_lead_time_days:
          typeof s.typical_lead_time_days === 'number' ? s.typical_lead_time_days : null,
        payment_terms: (s.payment_terms as string | null) || null,
      };
    });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(req);
    if (!auth.companyId) {
      return NextResponse.json(
        { error: 'No company associated with this account' },
        { status: 400 }
      );
    }
    const { id } = await params;

    const { data: conversation } = await supabaseAdmin
      .from('conversations')
      .select('id, subject')
      .eq('id', id)
      .eq('company_id', auth.companyId)
      .maybeSingle();

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const [{ data: suppliers }, { data: messages }] = await Promise.all([
      supabaseAdmin
        .from('suppliers')
        .select('*')
        .eq('company_id', auth.companyId)
        .is('deleted_at', null),
      supabaseAdmin
        .from('messages')
        .select('content, created_at')
        .eq('conversation_id', id)
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    const threadText = [
      conversation.subject || '',
      ...(messages || []).map((m: { content?: string | null }) => m.content || ''),
    ]
      .join(' ')
      .slice(-MAX_THREAD_CHARS);

    const matches = matchSuppliers(threadText, (suppliers || []) as Array<Record<string, unknown>>);

    return NextResponse.json({ suppliers: matches });
  } catch (e) {
    // requireAuth signals failure by throwing a Response, not an Error.
    if (e instanceof Response) return e;
    console.error('[inbox-supplier-matches]', e);
    return NextResponse.json({ error: 'Failed to match suppliers' }, { status: 500 });
  }
}