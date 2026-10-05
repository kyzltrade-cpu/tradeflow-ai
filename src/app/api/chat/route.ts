import { NextRequest } from 'next/server';
import { TRADEFLOW_KNOWLEDGE } from '@/lib/tradeflow-knowledge';
import { detectLanguage, buildLanguageInstruction } from '@/lib/language-detect';
import { supabaseAdmin } from '@/lib/supabase';
import { webSearch, needsWebSearch } from '@/lib/web-search';
import { DEMO_COMPANY_ID, buildInquiryContext } from '@/lib/inquiry-context';
import { requireAuth } from '@/lib/api-auth';
import { checkRateLimit, createRateLimitResponse, getClientIp } from '@/lib/rate-limit';

const NIM_BASE_URL = process.env.NIM_BASE_URL || 'https://integrate.api.nvidia.com/v1';
const NIM_API_KEY = process.env.NIM_API_KEY!;
const NIM_MODEL = process.env.NIM_MODEL || 'meta/llama-3.2-11b-vision-instruct';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * Resolve which tenant a chat request is allowed to read.
 *
 * Only a verified Supabase session (Authorization header or auth cookie) may
 * name a tenant. Anonymous callers get the seeded demo company, or nothing.
 * This endpoint previously trusted a caller-supplied `x-company-id`, which let
 * anyone read any company's knowledge base, catalog and live inquiry data.
 */
async function resolveChatCompanyId(req: NextRequest, demoMode: unknown): Promise<string | null> {
  try {
    const auth = await requireAuth(req, { requireCompany: false });
    if (auth.companyId) return auth.companyId;
  } catch {
    // Not signed in — fall through to the public demo tenant.
  }
  return demoMode ? DEMO_COMPANY_ID : null;
}

/**
 * CORS: allow exactly one origin, and only when it is configured.
 *
 * This used to send `Access-Control-Allow-Origin: *`, which let any website
 * script the endpoint from a visitor's browser. Combined with the anonymous
 * tenant read below, a malicious page could use a logged-in visitor's session
 * to read a company's knowledge base and business snapshot from their own
 * browser (audit H3).
 *
 * The widget is served from the same origin (`src/components/landing/SupportChat.tsx`),
 * so it never needed a cross-origin grant. When NEXT_PUBLIC_APP_URL is unset we
 * send no origin header at all, which makes the browser fall back to normal
 * same-origin rules.
 */
const ALLOWED_ORIGIN = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '');

function corsHeaders(req: Request): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    // The response varies by request Origin now that it is echoed conditionally.
    Vary: 'Origin',
  };
  const origin = req.headers.get('origin');
  if (ALLOWED_ORIGIN && origin === ALLOWED_ORIGIN) {
    headers['Access-Control-Allow-Origin'] = ALLOWED_ORIGIN;
  }
  return headers;
}

export async function OPTIONS(req: NextRequest) {
  return new Response(null, { status: 204, headers: corsHeaders(req) });
}

export async function POST(req: NextRequest) {
  // Anonymous and unmetered upstream: each request opens a NIM stream that
  // costs real tokens. Two ceilings, because the minute cap alone would still
  // allow ~28k calls/day from one IP.
  const ip = getClientIp(req);
  const perMinute = checkRateLimit(`chat:min:${ip}`, { windowMs: 60_000, maxRequests: 20 });
  if (!perMinute.allowed) return createRateLimitResponse(perMinute.resetTime);
  const perDay = checkRateLimit(`chat:day:${ip}`, { windowMs: 86_400_000, maxRequests: 200 });
  if (!perDay.allowed) return createRateLimitResponse(perDay.resetTime);

  try {
    const { message, history = [], systemContext, demoMode } = await req.json();

    if (!message || typeof message !== 'string') {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(req) },
      });
    }

    // Detect language of user message
    const detectedLang = detectLanguage(message);
    const languageInstruction = buildLanguageInstruction(detectedLang);

    // Web search for research-oriented questions
    let webSearchContext = '';
    if (needsWebSearch(message)) {
      try {
        const searchResults = await webSearch(message, 3);
        if (searchResults && !searchResults.startsWith('[')) {
          webSearchContext = `\n\n## Web Search Results\nUse these current search results to answer the user's question:\n${searchResults}`;
        }
      } catch (err) {
        console.error('[chat] Web search failed:', err);
      }
    }

    // Which tenant this request may read (verified session, else the demo tenant).
    const companyId = await resolveChatCompanyId(req, demoMode);

    // Fetch company rules and knowledge base from DB
    let companyContext = '';
    try {
      
      if (companyId) {
        const { data: company } = await supabaseAdmin
          .from('companies')
          .select('id, name')
          .eq('id', companyId)
          .single();

        if (company) {
          // Fetch AI rules (persisted in company_goals)
          const { data: rules } = await supabaseAdmin
            .from('company_goals')
            .select('title, description, enabled')
            .eq('company_id', company.id)
            .eq('enabled', true);

          // Fetch knowledge base
          const { data: kbDocs } = await supabaseAdmin
            .from('knowledge_base')
            .select('name, content')
            .eq('company_id', company.id);

          // Fetch products
          const { data: products } = await supabaseAdmin
            .from('products')
            .select('name, sku, description, price, moq, lead_time, category')
            .eq('company_id', company.id);

          const groupedRules = new Map<string, string[]>();
          for (const g of (rules ?? []) as Array<{ title: string | null; description: string | null }>) {
            const key = g.title || 'General';
            const list = groupedRules.get(key) ?? [];
            if (g.description) {
              for (const rawLine of g.description.split('\n')) {
                const item = rawLine.trim().replace(/^[-•]\s*/, '');
                if (item) list.push(item);
              }
            }
            groupedRules.set(key, list);
          }
          const ruleText = groupedRules.size
            ? `\n\n## Business Instructions\nFollow these instructions in every reply. They take priority over your general style.\n${Array.from(groupedRules.entries())
                .map(([title, items]) => `### ${title}\n${items.map((item) => `- ${item}`).join('\n')}`)
                .join('\n\n')}`
            : '';

          const productText = products?.length
            ? `\n\n## Company Products\n${products.map((p: { name: string; sku?: string; description?: string; price?: string; moq?: string; lead_time?: string; category?: string }) => {
                let block = `### ${p.name}`;
                if (p.sku) block += ` (SKU: ${p.sku})`;
                if (p.description) block += `\n${p.description}`;
                if (p.price) block += `\nPrice: ${p.price}`;
                if (p.moq) block += `\nMOQ: ${p.moq}`;
                if (p.lead_time) block += `\nLead time: ${p.lead_time}`;
                if (p.category) block += `\nCategory: ${p.category}`;
                return block;
              }).join('\n\n')}`
            : '';

          const kbText = kbDocs?.length
            ? `\n\n## Company Knowledge Base\n${kbDocs.map((d: { name: string; content: string }) => `### ${d.name}\n${d.content.slice(0, 3000)}`).join('\n\n')}`
            : '';

          companyContext = ruleText + productText + kbText;
        }
      }
    } catch (err) {
      // Fallback to static knowledge if DB not available
      console.error('[chat] Failed to fetch company context:', err);
    }

    // Load the live business snapshot (inquiries, deals, quotes, follow-ups) so
    // users can ask about individual clients.
    let inquiryContext = '';
    if (companyId) {
      try {
        inquiryContext = await buildInquiryContext(companyId);
      } catch (err) {
        console.error('[chat] Failed to fetch inquiry context:', err);
      }
    }

    // Build system prompt with full context + language rules
    const base = `${TRADEFLOW_KNOWLEDGE}${companyContext}${inquiryContext}${webSearchContext}`;
    const systemPrompt = demoMode && systemContext
      ? `${systemContext}\n${languageInstruction}`
      : `${base}\n${languageInstruction}`;

    // Build messages array (last 10 turns for context)
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-10).map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: message },
    ];

    // Call NIM API with streaming
    const response = await fetch(`${NIM_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${NIM_API_KEY}`,
      },
      body: JSON.stringify({
        model: NIM_MODEL,
        messages,
        max_tokens: 256,
        temperature: 0.8,
        stream: true,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('[chat] NIM API error:', response.status, err);
      return new Response(JSON.stringify({ error: 'AI service unavailable' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(req) },
      });
    }

    // Stream the response
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        const decoder = new TextDecoder();
        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith('data: ')) continue;

              const data = trimmed.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  controller.enqueue(encoder.encode(content));
                }
              } catch {
                // Skip invalid JSON lines
              }
            }
          }
        } catch (err) {
          console.error('[chat] Stream error:', err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'X-Content-Language': detectedLang,
        ...corsHeaders(req),
      },
    });
  } catch (err) {
    console.error('[chat] Unexpected error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(req) },
    });
  }
}
