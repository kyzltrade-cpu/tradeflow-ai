import { supabaseAdmin } from '@/lib/supabase';

const NIM_BASE_URL = process.env.NIM_BASE_URL || 'https://integrate.api.nvidia.com/v1';
const NIM_API_KEY = process.env.NIM_API_KEY!;
const NIM_MODEL = process.env.NIM_MODEL || 'meta/llama-3.1-8b-instruct';

export interface ChatContext {
  companyId: string;
  channel: 'whatsapp' | 'wechat';
  conversationId: string;
  userMessage: string;
  contactPhone?: string;
  contactName?: string;
}

export interface ChatResponse {
  reply: string;
  tokensUsed: number;
}

function keywordMatch(message: string, keywords: string[]): boolean {
  const lower = message.toLowerCase();
  return keywords.some(kw => lower.includes(kw.toLowerCase()));
}

const HANDOFF_KEYWORDS = [
  'human', 'agent', 'talk to staff', 'speak to someone', 'speak to a person',
  'real person', 'manager', 'supervisor', '真人', '人工', '轉人', '找人',
  'talk to a human', 'speak to human', 'person please', 'someone please',
];

export function checkKeywordOverride(message: string): boolean {
  const lower = message.toLowerCase();
  return HANDOFF_KEYWORDS.some(kw => lower.includes(kw));
}

export async function generateHandoffSummary(
  conversationId: string,
  companyName: string
): Promise<string> {
  const { data: history } = await supabaseAdmin
    .from('messages')
    .select('role, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(10);

  if (!history || history.length === 0) {
    return `Customer messaged ${companyName}. AI paused — customer requested human.`;
  }

  const conversationText = history
    .map((m: { role: string; content: string }) => `${m.role}: ${m.content}`)
    .join('\n');

  const prompt = `Summarize this trade conversation in 2 lines for the sales rep.
Include: who the buyer is, what they want (product, quantity, terms), and why AI paused.

Conversation:
${conversationText}

Reply with ONLY the 2-line summary, no quotes or extra text.`;

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
        max_tokens: 150,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      return `Customer message received. AI paused — customer requested human.`;
    }

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content?.trim();
    return summary || `Customer message received. AI paused — customer requested human.`;
  } catch {
    return `Customer message received. AI paused — customer requested human.`;
  }
}

export async function handleChat(ctx: ChatContext): Promise<ChatResponse> {
  // 0. Check conversation status — skip AI if human/bookmarked
  const { data: conversation } = await supabaseAdmin
    .from('conversations')
    .select('status')
    .eq('id', ctx.conversationId)
    .single();

  if (conversation && (conversation.status === 'human' || conversation.status === 'bookmarked' || conversation.status === 'ai_paused')) {
    return { reply: '', tokensUsed: 0 };
  }

  // 1. Load company info
  const { data: company } = await supabaseAdmin
    .from('companies')
    .select('*')
    .eq('id', ctx.companyId)
    .single();

  if (!company) throw new Error('Company not found');

  // 2. Load products
  const { data: products } = await supabaseAdmin
    .from('products')
    .select('*')
    .eq('company_id', ctx.companyId)
    .order('category');

  // 3. Load FAQ rules
  const { data: faqRules } = await supabaseAdmin
    .from('faq_rules')
    .select('*')
    .eq('company_id', ctx.companyId)
    .order('priority', { ascending: false });

  // 4. Load knowledge base documents
  const { data: kbDocs } = await supabaseAdmin
    .from('knowledge_base')
    .select('name, content')
    .eq('company_id', ctx.companyId);

  // 5. Load conversation history (last 20 messages)
  const { data: history } = await supabaseAdmin
    .from('messages')
    .select('role, content')
    .eq('conversation_id', ctx.conversationId)
    .order('created_at', { ascending: true })
    .limit(20);

  // 6. Build product catalog text
  const productCatalog = (products || [])
    .map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (p: any) => `
Product: ${p.name}
Description: ${p.description || 'N/A'}
MOQ: ${p.moq || 'Contact for details'}
Price: ${p.price_range || 'Contact for quote'}
Lead Time: ${p.lead_time || 'Contact for details'}
Category: ${p.category || 'General'}
Specs: ${typeof p.specs === 'object' ? JSON.stringify(p.specs) : p.specs || 'N/A'}
`
    )
    .join('\n---\n');

  // 7. Build FAQ text — check keyword triggers first
  const matchedFaqRules: string[] = [];
  const unmatchedFaqRules: string[] = [];

  (faqRules || []).forEach(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (r: any) => {
      const keywords = r.keywords || [];
      if (keywords.length > 0 && keywordMatch(ctx.userMessage, keywords)) {
        matchedFaqRules.push(`Q Pattern: ${r.question_pattern}\nA: ${r.answer}`);
      } else {
        unmatchedFaqRules.push(`Q Pattern: ${r.question_pattern}\nA: ${r.answer}`);
      }
    }
  );

  const faqText = [
    matchedFaqRules.length > 0 ? `MATCHED FAQ (use these first):\n${matchedFaqRules.join('\n---\n')}` : '',
    unmatchedFaqRules.length > 0 ? `General FAQ:\n${unmatchedFaqRules.join('\n---\n')}` : '',
  ].filter(Boolean).join('\n\n');

  // 8. Build knowledge base text
  const kbText = (kbDocs || [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((doc: any) => `--- ${doc.name} ---\n${doc.content}`)
    .join('\n\n');

  // 9. Detect language of user message
  const hasChinese = /[\u4e00-\u9fff]/.test(ctx.userMessage);
  const hasCantonese = /[嘅係冇唔哋呢嗰乜揾嘢畀]/.test(ctx.userMessage);
  const languageHint = hasCantonese
    ? 'Cantonese'
    : hasChinese
      ? 'Mandarin Chinese'
      : 'English';

  // 10. Build system prompt
  // Cap system prompt at ~6000 chars to stay within model context window,
  // leaving room for conversation history (~4k) and response (~1k).
  // Truncation priority: KB docs (least critical) → products → FAQ rules (most critical).
  let systemPrompt = `You are a sales rep at ${company.name}, a Hong Kong trading company. You handle customer inquiries on WhatsApp. You are a real person, not an AI.

CRITICAL RULES:
- You are a HUMAN sales rep. Never reveal you are AI. If asked, say you are a sales rep at ${company.name}.
- Respond in the SAME language the customer uses. If they write in English, reply in English. If they write in Chinese (Mandarin or Cantonese), reply in Chinese.
- The customer message appears to be in: ${languageHint}
- Be professional but casual — like a real person texting on WhatsApp. Use short sentences.
- Always mention MOQ when discussing products.
- For pricing, give the range and explain what affects the price (volume, customization, etc).
- If you don't know something specific, say "Let me check with my team and get back to you" — never make up specifications or prices.
- Keep responses concise. Use bullet points for product specs.
- If asked about payment terms, say: "We typically accept T/T (bank transfer), L/C for large orders. We can discuss terms once we understand your needs."
- If asked about shipping, say: "We can arrange FOB, CIF, or DDP shipping. Exact costs depend on destination and quantity."
- Sound natural. Don't use overly formal language. Write like a real person would text.

PRODUCT CATALOG:
${productCatalog || 'No products loaded yet. Tell the customer you will get back to them with product details.'}

${faqText ? `FAQ RULES:\n${faqText}\n` : ''}
${kbText ? `KNOWLEDGE BASE:\n${kbText}\n` : ''}
COMPANY NAME: ${company.name}
YOUR ROLE: Sales assistant for ${company.name}
`;

  const MAX_SYSTEM_PROMPT_CHARS = 6000;
  if (systemPrompt.length > MAX_SYSTEM_PROMPT_CHARS) {
    // Trim least important sections first: KB, then products, then FAQ
    let excess = systemPrompt.length - MAX_SYSTEM_PROMPT_CHARS;
    if (kbText && excess > 0) {
      const kbSection = `KNOWLEDGE BASE:\n${kbText}\n`;
      const trimmed = excess >= kbSection.length ? '' : kbSection.slice(0, -(excess));
      systemPrompt = systemPrompt.replace(kbSection, trimmed ? `KNOWLEDGE BASE:\n${trimmed}\n` : '');
      excess = systemPrompt.length - MAX_SYSTEM_PROMPT_CHARS;
    }
    if (productCatalog && excess > 0) {
      const prodSection = `PRODUCT CATALOG:\n${productCatalog}\n`;
      const trimmed = excess >= prodSection.length ? '' : prodSection.slice(0, -(excess));
      systemPrompt = systemPrompt.replace(prodSection, trimmed ? `PRODUCT CATALOG:\n${trimmed}\n` : '');
      excess = systemPrompt.length - MAX_SYSTEM_PROMPT_CHARS;
    }
    if (faqText && excess > 0) {
      const faqSection = `FAQ RULES:\n${faqText}\n`;
      const trimmed = excess >= faqSection.length ? '' : faqSection.slice(0, -(excess));
      systemPrompt = systemPrompt.replace(faqSection, trimmed ? `FAQ RULES:\n${trimmed}\n` : '');
    }
  }

  // 11. Build messages array
  const messages = [
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(history || []).map((m: any) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user' as const, content: ctx.userMessage },
  ];

  // 12. Call NIM API (OpenAI-compatible)
  const response = await fetch(`${NIM_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${NIM_API_KEY}`,
    },
    body: JSON.stringify({
      model: NIM_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      max_tokens: 1024,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`NIM API error: ${response.status} - ${err}`);
  }

  const data = await response.json();
  const reply = data.choices?.[0]?.message?.content || '';
  const tokensUsed =
    (data.usage?.prompt_tokens || 0) + (data.usage?.completion_tokens || 0);

  // 13. Save messages to DB
  await supabaseAdmin.from('messages').insert([
    {
      conversation_id: ctx.conversationId,
      role: 'user',
      content: ctx.userMessage,
    },
    {
      conversation_id: ctx.conversationId,
      role: 'assistant',
      content: reply,
      tokens_used: tokensUsed,
    },
  ]);

  // 14. Update conversation timestamp and language
  const langCode = languageHint === 'Cantonese' ? 'zh' : languageHint === 'Mandarin Chinese' ? 'zh' : 'en';
  await supabaseAdmin
    .from('conversations')
    .update({ updated_at: new Date().toISOString(), detected_language: langCode })
    .eq('id', ctx.conversationId);

  return { reply, tokensUsed };
}

export async function getOrCreateConversation(
  companyId: string,
  channel: 'whatsapp' | 'wechat',
  contactIdentifier: string,
  contactName?: string
): Promise<string> {
  // Try to find existing active conversation
  const { data: existing } = await supabaseAdmin
    .from('conversations')
    .select('id')
    .eq('company_id', companyId)
    .eq('channel', channel)
    .eq(
      channel === 'whatsapp' ? 'contact_phone' : 'contact_wechat_id',
      contactIdentifier
    )
    .eq('status', 'active')
    .single();

  if (existing) return existing.id;

  // Create new conversation
  const insertData: Record<string, unknown> = {
    company_id: companyId,
    channel,
    status: 'active',
  };

  if (channel === 'whatsapp') {
    insertData.contact_phone = contactIdentifier;
    insertData.contact_name = contactName || null;
  } else {
    insertData.contact_wechat_id = contactIdentifier;
    insertData.contact_name = contactName || null;
  }

  const { data: newConv } = await supabaseAdmin
    .from('conversations')
    .insert(insertData)
    .select('id')
    .single();

  return newConv!.id;
}
