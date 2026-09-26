import { NextRequest } from 'next/server';
import { TRADEFLOW_KNOWLEDGE } from '@/lib/tradeflow-knowledge';
import { detectLanguage, buildLanguageInstruction } from '@/lib/language-detect';
import { supabaseAdmin } from '@/lib/supabase';
import { webSearch, needsWebSearch } from '@/lib/web-search';
import { DEMO_COMPANY_ID, buildInquiryContext } from '@/lib/inquiry-context';

const NIM_BASE_URL = process.env.NIM_BASE_URL || 'https://integrate.api.nvidia.com/v1';
const NIM_API_KEY = process.env.NIM_API_KEY!;
const NIM_MODEL = process.env.NIM_MODEL || 'meta/llama-3.2-11b-vision-instruct';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function POST(req: NextRequest) {
  try {
    const { message, history = [], systemContext, demoMode } = await req.json();

    if (!message || typeof message !== 'string') {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
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

    // Fetch company goals and knowledge base from DB
    let companyContext = '';
    try {
      // Get company_id from request header or body
      const companyId = req.headers.get('x-company-id') || (demoMode ? DEMO_COMPANY_ID : null);
      
      if (companyId) {
        const { data: company } = await supabaseAdmin
          .from('companies')
          .select('id, name')
          .eq('id', companyId)
          .single();

        if (company) {
          // Fetch goals
          const { data: goals } = await supabaseAdmin
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

          const goalText = goals?.length
            ? `\n\n## Business Goals\n${goals.map((g: { title: string; description: string; greeting?: string; flow_steps?: Array<{ trigger: string; response: string }>; handoff_message?: string }) => {
                let block = `### ${g.title}\n${g.description || ''}`;
                if (g.greeting) block += `\nOpening message: "${g.greeting}"`;
                if (g.flow_steps?.length) {
                  block += `\nConversation flow:\n${g.flow_steps.map((s, i) => `  ${i + 1}. If customer says something about "${s.trigger}" → respond: "${s.response}"`).join('\n')}`;
                }
                if (g.handoff_message) block += `\nWhen handing off to human, notify internally: "${g.handoff_message}"`;
                return block;
              }).join('\n\n')}`
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

          companyContext = goalText + productText + kbText;
        }
      }
    } catch (err) {
      // Fallback to static knowledge if DB not available
      console.error('[chat] Failed to fetch company context:', err);
    }

    // Load the live business snapshot (inquiries, deals, quotes, follow-ups) so
    // users can ask about individual clients. Uses the demo company for the
    // public landing chat; the authenticated admin chat sends its own company.
    const companyId = req.headers.get('x-company-id') || (demoMode ? DEMO_COMPANY_ID : null);
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
        headers: { 'Content-Type': 'application/json' },
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
      },
    });
  } catch (err) {
    console.error('[chat] Unexpected error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
