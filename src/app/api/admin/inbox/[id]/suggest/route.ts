import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';
import { ensureAutoDraft } from '@/lib/auto-draft';

const NIM_BASE_URL = process.env.NIM_BASE_URL || 'https://integrate.api.nvidia.com/v1';
const NIM_API_KEY = process.env.NIM_API_KEY!;
const NIM_MODEL = process.env.NIM_MODEL || 'meta/llama-3.1-8b-instruct';

type RouteParams = { params: Promise<{ id: string }> };

interface ExtractItem {
  product: string;
  quantity?: number;
  unit: string;
  specs?: string | null;
  target_price?: string | null;
}

interface ExtractedRequest {
  request_summary: string;
  currency?: string;
  items: ExtractItem[];
}

interface PriceSource {
  type: 'product' | 'margin' | 'fx';
  label: string;
  ref?: string;
  detail?: string;
}

interface SuggestedLine {
  id: string;
  product: string;
  matched_product_id?: string;
  matched_product_name?: string;
  quantity?: number;
  unit: string;
  unit_price: number;
  currency: string;
  total: number;
  at_cost: boolean;
  requires_manual_pricing: boolean;
  target_price?: string | null;
  sources: PriceSource[];
}

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

interface PricingConfig {
  currency: string;
  fx_rate: number;
  fx_pair: string;
  margin_rules: Array<{ name: string; product_category?: string; margin_pct: number }>;
}

function defaultPricing(): PricingConfig {
  return {
    currency: 'USD',
    fx_rate: 7.82,
    fx_pair: 'USD → HKD',
    margin_rules: [],
  };
}

function parseCount(raw?: string | number): number | undefined {
  if (typeof raw === 'number') return raw;
  if (!raw) return undefined;
  const m = String(raw).replace(/,/g, '').match(/(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : undefined;
}

function parseUnitPriceFromRange(range?: string | null): { price: number | null; currency: string | null } {
  if (!range) return { price: null, currency: null };
  const num = String(range).replace(/,/g, '').match(/(\d+(?:\.\d+)?)/);
  const cur = String(range).match(/(USD|HKD|RMB|CNY|EUR|GBP)/i);
  return {
    price: num ? parseFloat(num[1]) : null,
    currency: cur ? cur[1].toUpperCase() : null,
  };
}

const n = (v: number | undefined | null, fallback = 0) =>
  typeof v === 'number' && isFinite(v) ? v : fallback;

function tokenize(text: string): string[] {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3);
}

async function extractRequest(
  input: string,
  companyName?: string
): Promise<ExtractedRequest & { source: 'ai' | 'heuristic' }> {
  const prompt = `You are a procurement assistant for ${companyName || 'a trading company'}. Extract the buying request from this customer email.

Return STRICT JSON only, no prose:
{
  "request_summary": "one-line summary of what the buyer wants",
  "currency": "USD | HKD | CNY | null if not stated",
  "items": [
    {
      "product": "product description as written (e.g. 500ml Double-Wall Vacuum Bottle, 304 stainless)",
      "quantity": number or null,
      "unit": "pcs | sets | kg | etc, default pcs",
      "specs": "key specs if stated, else null",
      "target_price": "target price if stated, else null"
    }
  ]
}

Rules:
- Split the request into distinct line items (product, printing/customization, samples are separate items).
- Never invent quantities. quantity must be null if not stated.
- Keep product names in the customer's own words.

Email:
${input.slice(0, 4000)}

JSON:`;

  try {
    const response = await fetch(`${NIM_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${NIM_API_KEY}`,
      },
      body: JSON.stringify({
        model: NIM_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0,
      }),
      signal: AbortSignal.timeout(25000),
    });

    if (!response.ok) {
      console.error('[suggest] NIM extract error:', response.status);
      throw new Error('NIM extraction failed');
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || '';
    const json = raw.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
    const parsed = JSON.parse(json) as ExtractedRequest;

    const items: ExtractItem[] = (parsed.items || [])
      .filter((i: ExtractItem) => i.product && String(i.product).trim())
      .map((i: ExtractItem) => ({
        product: String(i.product).trim(),
        quantity: parseCount(i.quantity),
        unit: i.unit || 'pcs',
        specs: i.specs || null as string | null,
        target_price: i.target_price || null as string | null,
      }));

    return {
      request_summary: parsed.request_summary || (items[0]?.product || ''),
      currency: parsed.currency || undefined,
      items,
      source: 'ai',
    };
  } catch (err) {
    console.error('[suggest] Extraction fell back to heuristic:', err);
    const lines = input
      .split(/\n+/)
      .map((l) => l.replace(/^\[(?:customer|user)\]\s*/i, '').trim())
      .filter(Boolean);
    const items: ExtractItem[] = lines.slice(0, 6).map((l) => ({
      product: l.slice(0, 160),
      quantity: parseCount(l.match(/(\d[\d,]*(?:\.\d+)?)\s*(?:pcs|pc |units|bottles|sets|pairs|kg|tons|cartons)/i)?.[1]),
      unit: 'pcs',
    }));
    return {
      request_summary: items[0]?.product || 'Customer request',
      items,
      source: 'heuristic' as const,
    };
  }
}

function matchProduct(
  item: ExtractItem,
  products: Array<Record<string, unknown>>
): { product: Record<string, unknown>; score: number } | null {
  const text = `${item.product} ${item.specs || ''}`.toLowerCase();
  const tokens = tokenize(text);

  let best: { product: Record<string, unknown>; score: number } | null = null;
  for (const p of products) {
    const name = String(p.name || '').toLowerCase();
    const category = String(p.category || '').toLowerCase();
    const desc = String(p.description || '').toLowerCase();
    const haystack = `${name} ${category} ${desc}`;
    let score = 0;

    tokens.forEach((tok) => {
      if (haystack.includes(tok)) score += 1;
    });
    if (name && text.includes(name) && name.length >= 4) score += 3;
    if (category && text.includes(category)) score += 2;

    if (!best || score > best.score) best = { product: p, score };
  }
  return best && best.score > 0 ? best : null;
}

function applyMargin(item: ExtractItem, productName: string, config: PricingConfig): { marginPct: number; ruleName: string } {
  const text = `${item.product} ${productName || ''}`.toLowerCase();
  if (/(sample|free sample)/.test(text)) return { marginPct: 0, ruleName: 'Sample at cost' };
  if (/(printing|print|logo|customiz|engrav|embroid)/.test(text)) return { marginPct: 0, ruleName: 'Customization at cost' };

  for (const rule of config.margin_rules) {
    if (rule.product_category) {
      const cat = rule.product_category.toLowerCase();
      if (text.includes(cat) || cat.includes(text.slice(0, Math.min(cat.length, 24)))) {
        return { marginPct: n(rule.margin_pct), ruleName: rule.name };
      }
    }
  }
  return { marginPct: 0, ruleName: 'No margin rule matched (at cost)' };
}

function matchSuppliers(
  items: ExtractItem[],
  matchedNames: string[],
  suppliers: Array<Record<string, unknown>>
): SupplierMatch[] {
  const terms = new Set<string>();
  items.forEach((i) => tokenize(`${i.product} ${i.specs || ''}`).forEach((t) => terms.add(t)));
  matchedNames.forEach((name) => tokenize(name).forEach((t) => terms.add(t)));

  const scored: Array<{ s: Record<string, unknown>; score: number; matched: string[] }> = [];
  for (const s of suppliers) {
    const caps: string[] = Array.isArray(s.product_capabilities) ? s.product_capabilities : [];
    const capsText = caps.join(' ').toLowerCase();
    const nameText = `${s.trading_name || s.legal_name || ''} ${s.location || ''}`.toLowerCase();
    let score = 0;
    const matched: string[] = [];
    terms.forEach((t) => {
      if (capsText.includes(t) || nameText.includes(t)) {
        score += 1;
        matched.push(t);
      }
    });
    if (score > 0) scored.push({ s, score, matched });
  }

  return scored
    .sort((a, b) => {
      if (Boolean(a.s.is_approved) !== Boolean(b.s.is_approved)) return a.s.is_approved ? -1 : 1;
      if (b.score !== a.score) return b.score - a.score;
      return n(typeof b.s.performance_score === 'number' ? b.s.performance_score : 0, 0) - n(typeof a.s.performance_score === 'number' ? a.s.performance_score : 0, 0);
    })
    .slice(0, 4)
    .map(({ s, score, matched }) => {
      const caps: string[] = Array.isArray(s.product_capabilities) ? s.product_capabilities : [];
      return {
        id: String(s.id),
        name: String(s.trading_name || s.legal_name || 'Supplier'),
        location: (s.location as string | null) || null,
        is_approved: Boolean(s.is_approved),
        capabilities: caps.slice(0, 3).map(String),
        match_reason: matched.length ? `Capabilities match: ${matched.slice(0, 4).join(', ')}` : 'In directory',
        performance_score: typeof s.performance_score === 'number' ? s.performance_score : null,
        typical_lead_time_days: typeof s.typical_lead_time_days === 'number' ? s.typical_lead_time_days : null,
        payment_terms: (s.payment_terms as string | null) || null,
      };
    });
}

// GET /api/admin/inbox/[id]/suggest — auto-suggested quote (with citations) + request extraction + trusted suppliers
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireAuth(req);
    if (!auth.companyId) {
      return NextResponse.json({ error: 'No company associated with this account' }, { status: 400 });
    }
    const { id } = await params;

    const { data: conversation } = await supabaseAdmin
      .from('conversations')
      .select('*')
      .eq('id', id)
      .eq('company_id', auth.companyId)
      .single();

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const { data: messages } = await supabaseAdmin
      .from('messages')
      .select('role, content, created_at')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true })
      .limit(80);

    const userThread = (messages || [])
      .filter((m: { role?: string }) => m.role === 'user' || m.role === 'customer')
      .map((m: { role: string; content?: unknown }) => `[customer] ${String(m.content ?? '')}`)
      .join('\n')
      .slice(-4500);

    if (!userThread) {
      return NextResponse.json({
        conversation,
        request_summary: null,
        currency: null,
        lines: [],
        subtotal: 0,
        fx: null,
        margin_rules: [],
        sources_summary: [],
        suppliers: [],
        extraction: { source: 'none' as const, items: [] },
        draft: null,
      });
    }

    const [companyRes, productsRes, suppliersRes, settingsRes] = await Promise.all([
      supabaseAdmin.from('companies').select('name').eq('id', auth.companyId).single(),
      supabaseAdmin.from('products').select('*').eq('company_id', auth.companyId),
      supabaseAdmin.from('suppliers').select('*').eq('company_id', auth.companyId).is('deleted_at', null),
      supabaseAdmin.from('company_settings').select('pricing').eq('company_id', auth.companyId).maybeSingle(),
    ]);

    const companyName = companyRes.data?.name as string | undefined;
    const products = (productsRes.data || []) as Array<Record<string, unknown>>;
    const suppliers = (suppliersRes.data || []) as Array<Record<string, unknown>>;

    let config = defaultPricing();
    const stored = settingsRes.data?.pricing as Record<string, unknown> | undefined;
    if (stored && typeof stored === 'object') {
      config = {
        currency: String(stored.currency || 'USD'),
        fx_rate: parseFloat(String(stored.fx_rate)) || 7.82,
        fx_pair: String(stored.fx_pair || 'USD → HKD'),
        margin_rules: Array.isArray(stored.margin_rules)
          ? stored.margin_rules.map((r: Record<string, unknown>) => ({
              name: String(r.name || 'Margin rule'),
              product_category: r.product_category ? String(r.product_category) : undefined,
              margin_pct: parseFloat(String(r.margin_pct)) || 0,
            }))
          : [],
      };
    }

    const extraction = await extractRequest(userThread, companyName);

    const currency = extraction.currency || config.currency;
    const lines: SuggestedLine[] = [];
    const matchedNames: string[] = [];

    for (const item of extraction.items) {
      const match = matchProduct(item, products);
      const product = match?.product || null;

      let unitPrice = 0;
      let requiresManual = true;
      const sources: PriceSource[] = [];

      if (product) {
        const listPrice =
          parseUnitPriceFromRange(String(product.price_range || '')).price ??
          parseUnitPriceFromRange(String(product.price || '')).price;

        const productName = String(product.name || 'Matched product');
        matchedNames.push(productName);

        if (listPrice) {
          const { marginPct, ruleName } = applyMargin(item, productName, config);
          unitPrice = Math.round(listPrice * (1 + marginPct / 100) * 100) / 100;
          requiresManual = false;

          sources.push({ type: 'product', label: 'Product price list', ref: productName, detail: `${currency} ${listPrice.toFixed(2)} / ${item.unit || 'pc'}` });
          sources.push({ type: 'margin', label: 'Margin applied', ref: ruleName, detail: marginPct > 0 ? `+${marginPct}%` : 'at cost' });
          sources.push({ type: 'fx', label: 'FX rate', ref: config.fx_pair, detail: String(config.fx_rate) });
        } else {
          sources.push({ type: 'product', label: 'Product price list', ref: productName, detail: 'no list price set' });
        }
      } else {
        sources.push({ type: 'product', label: 'No product match', ref: item.product.slice(0, 80), detail: 'requires manual pricing' });
        const { ruleName } = applyMargin(item, '', config);
        sources.push({ type: 'margin', label: 'Margin applied', ref: ruleName, detail: 'at cost' });
      }

      const quantity = typeof item.quantity === 'number' ? item.quantity : undefined;
      const total = quantity ? Math.round((quantity * unitPrice) * 100) / 100 : 0;

      lines.push({
        id: `${Date.now()}-${lines.length}`,
        product: item.product,
        matched_product_id: product ? String(product.id) : undefined,
        matched_product_name: product ? String(product.name) : undefined,
        quantity,
        unit: item.unit || 'pcs',
        unit_price: unitPrice,
        currency,
        total,
        at_cost: sources.some((s) => s.detail === 'at cost'),
        requires_manual_pricing: requiresManual,
        target_price: item.target_price ?? null,
        sources,
      });
    }

    const subtotal = Math.round(lines.reduce((sum, l) => sum + l.total, 0) * 100) / 100;

    const suppliersMatch = matchSuppliers(extraction.items, matchedNames, suppliers);

    const sourcesSummary: string[] = [
      `${lines.filter((l) => l.requires_manual_pricing).length === 0 ? 'All line items priced' : 'Some line items need manual pricing'}`,
      `${config.margin_rules.length} margin rule${config.margin_rules.length === 1 ? '' : 's'} applied · ${config.currency}`,
      `FX ${config.fx_rate} · ${config.fx_pair}`,
    ];

    const draft = await ensureAutoDraft({
      companyId: auth.companyId,
      conversationId: id,
      conversation,
      requestSummary: extraction.request_summary,
      currency,
      lines,
      subtotal,
      sourcesSummary,
      actorId: auth.user.id,
      actorEmail: auth.user.email,
    });

    return NextResponse.json({
      conversation,
      request_summary: extraction.request_summary,
      currency,
      lines,
      subtotal,
      fx: { rate: config.fx_rate, pair: config.fx_pair },
      margin_rules: config.margin_rules,
      sources_summary: sourcesSummary,
      suppliers: suppliersMatch,
      extraction,
      draft,
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[suggest:GET] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}