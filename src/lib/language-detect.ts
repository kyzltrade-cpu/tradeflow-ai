// Language detection for Sailwise chatbot
// Supports: English, Traditional Chinese, Simplified Chinese, Cantonese, Spanish

export type SupportedLanguage = 'en' | 'zh' | 'yue' | 'es';

const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  en: 'English',
  zh: 'Chinese',
  yue: 'Cantonese',
  es: 'Spanish',
};

/**
 * Detect the primary language of a text string
 * Uses character range heuristics for CJK detection
 */
export function detectLanguage(text: string): SupportedLanguage {
  if (!text || text.trim().length === 0) return 'en';

  const counts = { latin: 0, cjk: 0, hangul: 0, other: 0 };

  for (const char of text) {
    const code = char.charCodeAt(0);

    // Latin characters (including accented)
    if ((code >= 0x0041 && code <= 0x005a) || (code >= 0x0061 && code <= 0x007a) || (code >= 0x00c0 && code <= 0x024f)) {
      counts.latin++;
    }
    // CJK Unified Ideographs (Chinese)
    else if (code >= 0x4e00 && code <= 0x9fff) {
      counts.cjk++;
    }
    // CJK Extension A
    else if (code >= 0x3400 && code <= 0x4dbf) {
      counts.cjk++;
    }
    // Hangul (Korean)
    else if (code >= 0xac00 && code <= 0xd7af) {
      counts.hangul++;
    }
    // Other characters (numbers, punctuation, etc.)
    else {
      counts.other++;
    }
  }

  const total = counts.latin + counts.cjk + counts.hangul + counts.other;

  if (total === 0) return 'en';

  // If CJK characters are > 30% of text, it's Chinese
  const cjkRatio = counts.cjk / total;
  if (cjkRatio > 0.3) {
    // Check for Cantonese-specific characters
    if (hasCantoneseMarkers(text)) {
      return 'yue';
    }
    return 'zh';
  }

  // Check for Spanish words (before defaulting to English)
  if (hasSpanishMarkers(text)) {
    return 'es';
  }

  return 'en';
}

/**
 * Check for Cantonese-specific characters/particles
 */
function hasCantoneseMarkers(text: string): boolean {
  // Common Cantonese characters and particles
  const cantoneseMarkers = [
    '嘅', '係', '冇', '唔', '哋', '呢', '嗰', '乜', '揾', '嘢',
    '畀', '咗', '㗎', '啦', '喺', '啱', '攞', '揼', '嘥', '冚',
    '嬲', '鍾意', '几点', '几钱', '咩', '嗰啲', '咁',
  ];

  return cantoneseMarkers.some((marker) => text.includes(marker));
}

/**
 * Check for Spanish-specific words
 */
function hasSpanishMarkers(text: string): boolean {
  const spanishWords = [
    'hola', 'buenos', 'buenas', 'gracias', 'por favor', 'cómo', 'qué',
    'cuánto', 'dónde', 'cuándo', 'quién', 'puedo', 'quiero', 'necesito',
    'tengo', 'somos', 'son', 'está', 'están', 'hay', 'tiene', 'tienen',
    'producto', 'productos', 'precio', 'precios', 'pedido', 'pedidos',
    'envío', 'envíos', 'entrega', 'cantidad', 'mínima', 'muestra',
    'proveedor', 'cliente', 'empresa', 'negocio', 'venta', 'ventas',
    'cómo funciona', 'cuéntame', 'quiero saber', 'me interesa',
    'español', 'latinoamérica', 'méxico', 'colombia', 'argentina',
  ];

  const lower = text.toLowerCase();
  return spanishWords.some((word) => lower.includes(word));
}

/**
 * Get the language name for display
 */
export function getLanguageName(lang: SupportedLanguage): string {
  return LANGUAGE_NAMES[lang] || 'English';
}

/**
 * Build language instruction for the AI system prompt
 */
export function buildLanguageInstruction(detectedLang: SupportedLanguage): string {
  const langName = getLanguageName(detectedLang);

  return `
<language_rules>
- The user's message appears to be in: ${langName}
- ALWAYS respond in ${langName}
- If the input mixes languages, respond in the PRIMARY language (the one with more words)
- Preserve technical terms (API, webhook, SSO, MOQ, SKU, CSV, Excel) in their original language
- For Cantonese input, respond in Traditional Chinese (Hong Kong style)
- For Spanish input, respond in Spanish
</language_rules>
`;
}

/**
 * Detect if text contains mixed languages (code-switching)
 */
export function isMixedLanguage(text: string): boolean {
  const counts = { latin: 0, cjk: 0 };

  for (const char of text) {
    const code = char.charCodeAt(0);
    if ((code >= 0x0041 && code <= 0x007a) || (code >= 0x00c0 && code <= 0x024f)) {
      counts.latin++;
    } else if (code >= 0x4e00 && code <= 0x9fff) {
      counts.cjk++;
    }
  }

  const total = counts.latin + counts.cjk;
  if (total === 0) return false;

  // If both scripts are > 20% of text, it's mixed
  const latinRatio = counts.latin / total;
  const cjkRatio = counts.cjk / total;

  return latinRatio > 0.2 && cjkRatio > 0.2;
}
