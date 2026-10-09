import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';
import { ensureAutoDraft } from '@/lib/auto-draft';
import { getLiveFx, type LiveFx } from '@/lib/fx-rate';
import { enforcePlanLimit, planLimitResponse } from '@/lib/billing/limits';
import { sanitizeExtractionSpecs, type ExtractionSpec } from '@/lib/extraction-specs';

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
  custom_specs?: Record<string, string>;
}

interface PriceSource {
  type: 'product' | 'margin' | 'fx' | 'alert';
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
  cost_price?: number;
  margin_pct?: number;
  currency: string;
  total: number;
  at_cost: boolean;
  requires_manual_pricing: boolean;
  needs_review: boolean;
  tiers_pending_review: boolean;
  target_price?: string | null;
  sources: PriceSource[];
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

// Documents (compliance certificates, test reports, COO) are not priced
// products — never auto-match or auto-price them.
const DOC_RE = /(compliance certificate|certificate of compliance|certificate of origin|\btest report\b|inspection certificate|\btest data\b|\bdocument(s)?\b|\bcoc\b|\bcoo\b)/i;

function isDocumentRequest(text: string): boolean {
  return DOC_RE.test(text);
}

// If the customer stated exactly one batch quantity, apply it to the items
// that came back unquoted — the number is the buyer's own wording, so this
// is not inventing a figure.
function backfillQuantities(
  items: ExtractItem[],
  input: string
): ExtractItem[] {
  const raw = input;
  const unitSuffixed = [...raw.matchAll(/(\d[\d,]*(?:\.\d+)?)\s+(?:[a-z-]{1,14}\s){0,4}(pcs|pc|pieces|units?|bottles|sets?|pairs|kg|tons|cartons|bags|mugs)\b/gi)];
  // Comma-thousands (e.g. "5,000", "12,000") are almost always batch counts,
  // even when not glued to a unit word ("5,000 and want laser engraving…").
  const commaThousands = [...raw.matchAll(/\b(\d{1,3}(?:,\d{3})+(?:\.\d+)?)\b/g)];
  const candidates = [...unitSuffixed.map((m) => m[1]), ...commaThousands.map((m) => m[1])]
    .map((v) => v.replace(/,/g, ''))
    .filter((v) => { const x = parseFloat(v); return Number.isFinite(x) && x >= 100; });
  const unique = [...new Set(candidates)];
  if (unique.length !== 1) return items;
  const qty = parseFloat(unique[0]);
  if (!Number.isFinite(qty) || qty <= 0) return items;
  return items.map((it, i) =>
    it.quantity == null && i < 1 ? { ...it, quantity: qty } : it
  );
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

// The model occasionally returns numbers, objects, or the literal string
// "null" for a configured field. Only keep clean, non-empty strings — the
// Specs pod renders "missing" for anything absent.
function coerceCustomSpecs(
  raw: unknown,
  fields: ExtractionSpec[]
): Record<string, string> {
  const source = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const field of fields) {
    const value = source[field.key];
    if (value === null || value === undefined) continue;
    const text = typeof value === 'string' ? value : String(value);
    const trimmed = text.trim();
    if (!trimmed || trimmed.toLowerCase() === 'null' || trimmed.toLowerCase() === 'n/a') continue;
    out[field.key] = trimmed.slice(0, 200);
  }
  return out;
}

async function extractRequest(
  input: string,
  companyName?: string,
  confirmedFacts?: Array<{ name: string; value: string | null }>,
  customSpecs: ExtractionSpec[] = []
): Promise<ExtractedRequest & { source: 'ai' | 'heuristic' }> {
  const factsBlock = confirmedFacts && confirmedFacts.length > 0
    ? `\n\nUSER-CONFIRMED FACTS (the user already verified these on the linked inquiry — they are ground truth. Use EXACTLY these values and never contradict them, even if the email differs):\n${confirmedFacts
        .map((f) => `- ${f.name}: ${f.value ?? ''}`)
        .join('\n')}\n`
    : '';

  // Fields the company configured in Settings. They are asked for by machine
  // key so the Specs pod can match them back to the configured label.
  const specsBlock = customSpecs.length > 0
    ? `\n\nALSO FILL "custom_specs" — these fields were configured by this company, so extract them the same way (exact value if stated, null if the buyer never mentioned it):\n${customSpecs
        .map((f) => `- "${f.key}" (${f.label})${f.required ? ' [REQUIRED — always attempt this]' : ''}${f.hint ? ` — look for: ${f.hint}` : ''}`)
        .join('\n')}\n`
    : '';

  const prompt = `You are a procurement assistant for ${companyName || 'a trading company'}. Extract the buying request from this customer email.
${factsBlock}${specsBlock}
Return STRICT JSON only, no prose:
{
  "request_summary": "one-line summary of what the buyer wants",
  "currency": "the single ISO 4217 currency code the buyer used in the email (e.g. USD, EUR, CNY, HKD); if none is stated use USD. ALWAYS a single clean code, never a list.",
  "items": [
    {
      "product": "product description as written (e.g. 500ml Double-Wall Vacuum Bottle, 304 stainless)",
      "quantity": number or null,
      "unit": "pcs | sets | kg | etc, default pcs",
      "specs": "key specs if stated, else null",
      "target_price": "target price if stated, else null"
    }
  ]${customSpecs.length > 0 ? `,\n  "custom_specs": { ${customSpecs.map((f) => `"${f.key}": "value or null"`).join(', ')} }` : ''}
}

Rules:
- Split the request into ONE line item per distinct thing the buyer asks for:
  the physical product, plus a SEPARATE item for each customization service
  (printing / engraving / logo / embroidery / labeling) and a SEPARATE item
  for samples ONLY if the buyer explicitly asked for one. Never invent a
  samples line.
- Never invent quantities. quantity must be null if not stated.
- Never merge a customization service into the product item (e.g. "water bottles with
  laser engraving" becomes TWO items: the bottle, and "laser engraving of logo on the front").
- If the buyer asks about price tiers / volumes / bulk discounts (e.g. "MOQ and pricing
  tiers", "10,000 vs 25,000"), put "pricing tiers requested" in the spec of the relevant item.
- Keep product names in the customer's own words.${
  customSpecs.length > 0
    ? `\n- "custom_specs" must contain EVERY configured key, with the exact value from the email or null. Never guess, never leave a key out, and copy units, tolerances and codes verbatim. Fields marked [REQUIRED] matter most — search the whole email carefully before returning null for one.`
    : ''
}

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
        max_tokens: 500 + customSpecs.length * 40,
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
      currency: parsed.currency && String(parsed.currency).toLowerCase() !== 'null' ? String(parsed.currency).toUpperCase() : undefined,
      items: backfillQuantities(items, input),
      custom_specs: coerceCustomSpecs(parsed.custom_specs, customSpecs),
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
      custom_specs: {},
      source: 'heuristic' as const,
    };
  }
}

const CUSTOMIZATION_RE = /(printing|print|logo|laser|engrav|embroid|embroider|pad print|screen print|custom i(z|s)?|labeling|subli|decorat)/i;

function isCustomizationPhrase(item: ExtractItem): boolean {
  const text = `${item.product} ${item.specs || ''}`.toLowerCase();
  return CUSTOMIZATION_RE.test(text);
}

function matchProduct(
  item: ExtractItem,
  products: Array<Record<string, unknown>>
): { product: Record<string, unknown>; score: number; strong: boolean } | null {
  const text = `${item.product} ${item.specs || ''}`.toLowerCase();
  const tokens = tokenize(text);

  const customization = isCustomizationPhrase(item);
  // Certificate / document requests are not products — never price them.
  if (isDocumentRequest(text)) return null;

  let best: { product: Record<string, unknown>; score: number } | null = null;
  for (const p of products) {
    const name = String(p.name || '').toLowerCase();
    const category = String(p.category || '').toLowerCase();
    const desc = String(p.description || '').toLowerCase();
    const haystack = `${name} ${category} ${desc}`;

    // A pure customization/phrase item (e.g. "laser engraving of our logo")
    // must only match a customization-capable catalog entry, never a generic
    // physical product that merely shares a token (e.g. a keychain opener).
    if (customization && !/engrav|print|logo|custom|subli|decorat|embroid/.test(`${name} ${category}`)) {
      continue;
    }

    let score = 0;

    tokens.forEach((tok) => {
      if (haystack.includes(tok)) score += 1;
    });
    if (name && text.includes(name) && name.length >= 4) score += 3;
    if (category && text.includes(category)) score += 2;

    // Physical products only: a customization mention in the spec must not
    // add to a product's score, or we over-fit "engraving" to every product.
    if (customization) score = Math.min(score, 2);

    if (!best || score > best.score) best = { product: p, score };
  }
  if (!best || best.score <= 0) return null;

  // A match is only strong enough to auto-price when it is unambiguous:
  // the catalog product name appears verbatim in the request, or enough
  // request tokens are covered. A weak best-guess is surfaced for manual
  // review instead of being auto-quoted (prevents product mismatches in
  // auto-drafted quotes).
  const name = String(best.product.name || '').toLowerCase();
  const namePhraseHit = name.length >= 6 && text.includes(name);
  const strong = customization ? best.score >= 2 : best.score >= 2 || namePhraseHit;

  return { product: best.product, score: best.score, strong };
}

function applyMargin(
  item: ExtractItem,
  product: { name?: string; category?: string } | null,
  config: PricingConfig
): { marginPct: number; ruleName: string; matched: boolean } {
  const text = `${item.product} ${item.specs || ''}`.toLowerCase();

  // Samples: always at cost (an explicit, honest decision, not a failure).
  if (/(sample|free sample)/.test(text)) {
    return { marginPct: 0, ruleName: 'Sample at cost', matched: true };
  }

  // Certificates, test reports, documents: not priced products. Flag for review
  // instead of silently quoting them at cost or against the wrong catalog item.
  if (isDocumentRequest(text)) {
    return { marginPct: 0, ruleName: 'Document request — not a priced product', matched: false };
  }

  // 1. Match on the matched product's category first — this is the rule the
  //    catalog owner actually configured for that product line.
  if (product?.category) {
    const cat = String(product.category).toLowerCase();
    const names = [cat, ...String(product.name || '').toLowerCase().split(/[\s-]+/)];
    for (const rule of config.margin_rules) {
      const ruleCat = String(rule.product_category || '').toLowerCase();
      if (ruleCat && (cat.includes(ruleCat) || ruleCat.includes(cat) || names.includes(ruleCat))) {
        return { marginPct: n(rule.margin_pct), ruleName: rule.name, matched: true };
      }
    }
  } else if (isCustomizationPhrase(item)) {
    // Customization with no matched customization product — needs pricing, never auto-quoted.
    return { marginPct: 0, ruleName: 'Customization — needs your price', matched: false };
  }

  // 2. Fallback: category words mentioned in the request text.
  for (const rule of config.margin_rules) {
    if (rule.product_category) {
      const cat = rule.product_category.toLowerCase();
      if (text.includes(cat)) {
        return { marginPct: n(rule.margin_pct), ruleName: rule.name, matched: true };
      }
    }
  }

  // 3. A rule without a category is the trading default — applies to any
  //    product that no specific rule claims, so a configured catalog never
  //    silently quotes at cost.
  const defaultRule = config.margin_rules.find((r) => !r.product_category);
  if (defaultRule) {
    return { marginPct: n(defaultRule.margin_pct), ruleName: defaultRule.name, matched: true };
  }

  return { marginPct: 0, ruleName: 'Needs review — no margin rule', matched: false };
}

// GET /api/admin/inbox/[id]/suggest — auto-suggested quote (with citations) + request extraction
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireAuth(req);
    if (!auth.companyId) {
      return NextResponse.json({ error: 'No company associated with this account' }, { status: 400 });
    }
    const planGate = await enforcePlanLimit(auth.companyId, 'ai_quote_draft');
    if (!planGate.allowed) {
      return NextResponse.json(planLimitResponse(planGate), { status: planGate.status });
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
        extraction: { source: 'none' as const, items: [] },
        draft: null,
      });
    }

    const [companyRes, productsRes, settingsRes, specsRes] = await Promise.all([
      supabaseAdmin.from('companies').select('name').eq('id', auth.companyId).single(),
      supabaseAdmin.from('products').select('*').eq('company_id', auth.companyId),
      supabaseAdmin.from('company_settings').select('pricing').eq('company_id', auth.companyId).maybeSingle(),
      // Configured extraction fields arrived in migration 027, so this query
      // is isolated: on a deployment that has not run it, the error is
      // ignored and the tenant simply gets built-in specs only.
      supabaseAdmin
        .from('company_settings')
        .select('extraction_specs')
        .eq('company_id', auth.companyId)
        .maybeSingle(),
    ]);

    const companyName = companyRes.data?.name as string | undefined;
    const products = (productsRes.data || []) as Array<Record<string, unknown>>;

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

    // User-confirmed extracted fields from the linked inquiry (if any) are
    // ground truth — the re-extraction must never contradict them.
    const { data: linkedInquiries } = await supabaseAdmin
      .from('inquiries')
      .select('id')
      .eq('conversation_id', id)
      .eq('company_id', auth.companyId)
      .limit(1);

    let confirmedFacts: Array<{ name: string; value: string | null }> = [];
    const linkedInquiryId = linkedInquiries?.[0]?.id;
    if (linkedInquiryId) {
      const { data: confirmedFields } = await supabaseAdmin
        .from('extracted_fields')
        .select('field_name, field_value')
        .eq('inquiry_id', linkedInquiryId)
        .eq('company_id', auth.companyId)
        .eq('status', 'CONFIRMED');
      confirmedFacts = (confirmedFields ?? [])
        .filter((f: { field_value: string | null }) => f.field_value != null)
        .map((f: { field_name: string; field_value: string | null }) => ({
          name: f.field_name,
          value: f.field_value,
        }));
    }

    const extractionSpecs = specsRes.error ? [] : sanitizeExtractionSpecs(specsRes.data?.extraction_specs);

    const extraction = await extractRequest(userThread, companyName, confirmedFacts, extractionSpecs);

    const liveFx = await getLiveFx(config.fx_pair, config.fx_rate);
    config.fx_rate = liveFx.rate;
    const fx: { rate: number; pair: string; live: boolean; source: LiveFx['source']; updated_at: string } = {
      rate: liveFx.rate,
      pair: config.fx_pair,
      live: liveFx.live,
      source: liveFx.source,
      updated_at: liveFx.updated_at,
    };

    const currency = extraction.currency || config.currency;
    const lines: SuggestedLine[] = [];

    for (const item of extraction.items) {
      const match = matchProduct(item, products);
      const product = match?.product || null;
      const strongMatch = match?.strong ?? false;

      let unitPrice = 0;
      let costPrice: number | undefined;
      let marginPct: number | undefined;
      let requiresManual = true;
      const sources: PriceSource[] = [];

      // Buyer asked about multiple tiers / volumes / bulk discount (e.g. "MOQ and pricing
      // tiers", "10k vs 25k") — flag for review instead of silently shipping one price.
      const tierText = `${item.product} ${item.specs || ''} ${item.target_price || ''}`.toLowerCase();
      const tiersPendingReview = /(tier|tiered|volumes?|bulk|quantity discount|10[,.]?000|25[,.]?000)/.test(tierText);

      if (product) {
        const listPrice =
          parseUnitPriceFromRange(String(product.price_range || '')).price ??
          parseUnitPriceFromRange(String(product.price || '')).price;

        const productName = String(product.name || 'Matched product');

        // Only a STRONG match gets auto-priced. A weak best-guess is kept for
        // display but flagged for manual review — never quoted on the AI's word.
        if (listPrice && strongMatch) {
          const margin = applyMargin(item, product, config);
          unitPrice = Math.round(listPrice * (1 + margin.marginPct / 100) * 100) / 100;
          costPrice = listPrice;
          marginPct = margin.marginPct;

          if (margin.matched) {
            requiresManual = false;
            sources.push({ type: 'product', label: 'Product price list', ref: productName, detail: `${currency} ${listPrice.toFixed(2)} / ${item.unit || 'pc'}` });
            sources.push({ type: 'margin', label: 'Margin rule', ref: margin.ruleName, detail: margin.marginPct > 0 ? `+${margin.marginPct}%` : 'at cost' });
            sources.push({ type: 'fx', label: 'FX rate', ref: config.fx_pair, detail: `${config.fx_rate.toFixed(4)}${fx.live ? ' (live)' : ''}` });
          } else {
            sources.push({ type: 'product', label: 'Product price list', ref: productName, detail: `${currency} ${listPrice.toFixed(2)} / ${item.unit || 'pc'} — price needs your review` });
            sources.push({ type: 'margin', label: 'Margin', ref: margin.ruleName, detail: 'no rule — needs your review' });
          }
          if (tiersPendingReview) {
            sources.push({ type: 'alert', label: 'Tier pricing', ref: '—', detail: 'customer asked about tiers/volumes — pending your review' });
          }
        } else if (listPrice && !strongMatch) {
          sources.push({ type: 'product', label: 'Product price list', ref: productName, detail: `${currency} ${listPrice.toFixed(2)} / ${item.unit || 'pc'} — match needs your review` });
          sources.push({ type: 'alert', label: 'Weak match', ref: item.product.slice(0, 60), detail: 'verify product before pricing — not auto-quoted' });
        } else {
          sources.push({ type: 'product', label: 'Product price list', ref: productName, detail: 'no list price set — needs your review' });
        }
      } else {
        sources.push({ type: 'product', label: 'No matching product', ref: item.product.slice(0, 80), detail: 'no catalog match — needs your review (never auto-quoted)' });
      }

      const quantity = typeof item.quantity === 'number' ? item.quantity : undefined;
      const total = quantity ? Math.round((quantity * unitPrice) * 100) / 100 : 0;
      const atCost = sources.some((s) => s.detail === 'at cost');
      const needsReview = requiresManual || tiersPendingReview || unitPrice <= 0 || total <= 0;

      lines.push({
        id: `${Date.now()}-${lines.length}`,
        product: item.product,
        matched_product_id: product ? String(product.id) : undefined,
        matched_product_name: product ? String(product.name) : undefined,
        quantity,
        unit: item.unit || 'pcs',
        unit_price: unitPrice,
        cost_price: costPrice,
        margin_pct: marginPct,
        currency,
        total,
        at_cost: atCost,
        requires_manual_pricing: requiresManual,
        needs_review: needsReview,
        tiers_pending_review: tiersPendingReview,
        target_price: item.target_price ?? null,
        sources,
      });
    }

    const subtotal = Math.round(lines.reduce((sum, l) => sum + l.total, 0) * 100) / 100;

    const sourcesSummary: string[] = [
      `${lines.filter((l) => l.needs_review).length === 0 ? 'All line items priced' : 'Some line items need your review — nothing is sent automatically'}`,
      `${config.margin_rules.length} margin rule${config.margin_rules.length === 1 ? '' : 's'} applied · ${config.currency}`,
      `FX ${config.fx_rate.toFixed(4)} · ${config.fx_pair}${liveFx.live ? ' · live' : ''}`,
    ];

    // `?preview=1` runs the extraction + pricing so callers can render the
    // parsed specs without the side effect of auto-creating an opportunity and
    // draft quote. The explicit "Price" action omits it.
    const preview = req.nextUrl.searchParams.get('preview') === '1';
    const draft = preview
      ? null
      : await ensureAutoDraft({
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
      fx,
      margin_rules: config.margin_rules,
      sources_summary: sourcesSummary,
      extraction: {
        ...extraction,
        // Field list travels with the values so the client renders configured
        // rows in the same order the user set them in Settings.
        specs_fields: extractionSpecs,
      },
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