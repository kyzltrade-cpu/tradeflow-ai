const EXA_API_KEY = process.env.EXA_API_KEY;
const EXA_BASE_URL = 'https://api.exa.ai';

interface ExaResult {
  title: string;
  url: string;
  text?: string;
  highlights?: string[];
  publishedDate?: string;
}

interface ExaSearchResponse {
  results: ExaResult[];
}

/**
 * Search the web using Exa API
 * Follows Exa's recommended request pattern: query + highlights
 * @param query - Search query
 * @param numResults - Number of results (default 5)
 * @returns Formatted search results string
 */
export async function webSearch(query: string, numResults: number = 5): Promise<string> {
  if (!EXA_API_KEY) {
    return '[Web search not available — EXA_API_KEY not configured]';
  }

  try {
    const response = await fetch(`${EXA_BASE_URL}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': EXA_API_KEY,
      },
      body: JSON.stringify({
        query,
        numResults,
        type: 'auto',
        contents: { highlights: true },
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('[websearch] Exa API error:', response.status, err);
      return '[Web search failed]';
    }

    const data: ExaSearchResponse = await response.json();

    if (!data.results?.length) {
      return '[No results found]';
    }

    return data.results
      .map((r, i) => {
        const highlight = r.highlights?.[0] || r.text?.slice(0, 1000) || 'No content';
        return `[${i + 1}] ${r.title}\n${r.url}\n${highlight}`;
      })
      .join('\n\n');
  } catch (err) {
    console.error('[websearch] Error:', err);
    return '[Web search failed]';
  }
}

/**
 * Detect if a user question would benefit from web search
 */
export function needsWebSearch(message: string): boolean {
  const lower = message.toLowerCase();
  
  const patterns = [
    /what(?:'s| is) (?:the )?latest/i,
    /current (?:price|rate|cost)/i,
    /today/i,
    /recent (?:news|update|development)/i,
    /real[- ]?time/i,
    /what(?:'s| is) happening/i,
    /trend/i,
    /market/i,
    /competitor/i,
    /industry (?:news|update|report)/i,
    /search (?:for|about|the)/i,
    /look (?:up|for)/i,
    /find (?:out|information|info)/i,
    /research/i,
    /how (?:do|does|to) .*(?:work|implement|set up)/i,
    /best (?:practices?|tools?|platforms?)/i,
    /compare/i,
    /vs\.?|versus/i,
  ];

  return patterns.some(p => p.test(lower));
}
