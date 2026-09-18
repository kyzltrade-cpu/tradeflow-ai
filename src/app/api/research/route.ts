import { NextRequest, NextResponse } from 'next/server';

const EXA_API_KEY = process.env.EXA_API_KEY;
const EXA_BASE_URL = 'https://api.exa.ai';
const NIM_BASE_URL = process.env.NIM_BASE_URL || 'https://integrate.api.nvidia.com/v1';
const NIM_API_KEY = process.env.NIM_API_KEY;
const NIM_MODEL = process.env.NIM_MODEL || 'meta/llama-3.2-11b-vision-instruct';

async function fetchWebsiteContent(url: string): Promise<string> {
  if (!EXA_API_KEY) {
    return '';
  }

  try {
    const response = await fetch(`${EXA_BASE_URL}/contents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': EXA_API_KEY,
      },
      body: JSON.stringify({
        urls: [url],
        text: { maxCharacters: 5000 },
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      console.error('[research] Exa contents error:', response.status);
      return '';
    }

    const data = await response.json();
    const results = data.results || [];
    if (results.length > 0) {
      return results[0].text || '';
    }
    return '';
  } catch (err) {
    console.error('[research] Exa fetch error:', err);
    return '';
  }
}

async function generateTailoredResponse(websiteUrl: string, websiteContent: string): Promise<string> {
  if (!NIM_API_KEY) {
    return `TradeFlow can automate your WhatsApp & WeChat customer inquiries — answering product questions, pricing, and specs 24/7 in any language. Want to see how it works for ${websiteUrl}?`;
  }

  const prompt = `You are TradeFlow AI's assistant. A potential customer shared their website: ${websiteUrl}

Here's what their website says:
${websiteContent.slice(0, 3000)}

Your job: Explain how TradeFlow can automate THEIR customer service on WhatsApp and WeChat.

TradeFlow is NOT a logistics company. TradeFlow is an AI customer service platform that:
- Auto-replies to customer inquiries 24/7 on WhatsApp & WeChat
- Answers product questions, pricing, MOQ, and specs instantly
- Supports English, Mandarin, and Cantonese
- Handles after-hours and timezone gaps
- Lets humans take over when needed

Based on THEIR specific business, write 2-3 short sentences about how TradeFlow can handle their customer inquiries automatically. Be specific to their products/industry. End with one question.`;

  try {
    const response = await fetch(`${NIM_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${NIM_API_KEY}`,
      },
      body: JSON.stringify({
        model: NIM_MODEL,
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: 'Tell me how TradeFlow can help my business' },
        ],
        max_tokens: 256,
        temperature: 0.7,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      return `Thanks for sharing! TradeFlow can handle your customer inquiries on WhatsApp and WeChat — product questions, pricing, MOQ — instantly, 24/7. Want to try it?`;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || `TradeFlow can automate your customer service on WhatsApp & WeChat. Want to see a demo?`;
  } catch (err) {
    console.error('[research] AI generation error:', err);
    return `TradeFlow can automate your customer inquiries on WhatsApp & WeChat — answering product questions and specs 24/7. Want to see how it works?`;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Validate URL
    let parsedUrl: string;
    try {
      const u = new URL(url.startsWith('http') ? url : `https://${url}`);
      parsedUrl = u.toString();
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    // Fetch website content
    const content = await fetchWebsiteContent(parsedUrl);

    // Generate tailored response
    const response = await generateTailoredResponse(parsedUrl, content);

    return NextResponse.json({ response, url: parsedUrl });
  } catch (err) {
    console.error('[research] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
