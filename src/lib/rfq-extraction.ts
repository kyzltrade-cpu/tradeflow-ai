// =============================================================================
// TradeFlow v2 — Structured RFQ Extraction Engine
// =============================================================================
// Uses NIM API (OpenAI-compatible) to extract structured trading request data
// from email text + attachment content. Enforces strict field-level confidence
// tracking so inferences are never silently promoted to confirmed facts.
// =============================================================================

import type {
  ExtractedField,
  FieldEvidence,
  FieldStatus,
  Inquiry,
  InquiryPriority,
  ProductRequirementTemplate,
  SourceChannel,
  TradingRequest,
} from '@/types/trading';

// ---------------------------------------------------------------------------
// NIM API configuration (mirrors src/lib/ai.ts)
// ---------------------------------------------------------------------------

const NIM_BASE_URL =
  process.env.NIM_BASE_URL || 'https://integrate.api.nvidia.com/v1';
const NIM_API_KEY = process.env.NIM_API_KEY!;
const NIM_MODEL =
  process.env.NIM_MODEL || 'meta/llama-3.1-8b-instruct';

// ---------------------------------------------------------------------------
// Input / output types for the extraction pipeline
// ---------------------------------------------------------------------------

export interface ExtractionInput {
  emailText: string;
  attachmentTexts: string[];
  companyProducts: string[];
  requirementTemplate?: ProductRequirementTemplate | null;
  subject?: string | null;
  sourceChannel?: SourceChannel;
}

export interface MissingField {
  fieldName: string;
  label: string;
  description: string;
  priority: 'required' | 'recommended' | 'optional';
  suggestion: string;
  currentValue?: string | null;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function callNim(params: {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
}): Promise<string> {
  const response = await fetch(`${NIM_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${NIM_API_KEY}`,
    },
    body: JSON.stringify({
      model: NIM_MODEL,
      messages: [
        { role: 'system', content: params.systemPrompt },
        { role: 'user', content: params.userPrompt },
      ],
      max_tokens: params.maxTokens ?? 4096,
      temperature: params.temperature ?? 0.1,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`NIM API error: ${response.status} - ${err}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('NIM API returned empty response');
  return content;
}

function parseJsonResponse<T>(raw: string): T {
  // Strip markdown code fences if present
  const cleaned = raw
    .replace(/^```(?:json)?\s*\n?/i, '')
    .replace(/\n?```\s*$/i, '')
    .trim();
  return JSON.parse(cleaned) as T;
}

function buildFieldEvidence(
  value: unknown,
  confidence: number,
  source: ExtractedField['source'],
  status: FieldStatus,
  rawText?: string,
): ExtractedField {
  const evidence: FieldEvidence = {
    value,
    confidence,
    source,
    status,
    requiresConfirmation: status === 'INFERRED' || status === 'CONFLICTING',
    rawText: rawText ?? null,
  };
  return {
    name: '',
    value,
    confidence,
    source,
    status,
    evidence,
    requiresConfirmation: status === 'INFERRED' || status === 'CONFLICTING',
  };
}

// ---------------------------------------------------------------------------
// 1. extractTradingRequest
// ---------------------------------------------------------------------------

/**
 * Extract structured trading request data from an email + attachments.
 *
 * Every field is tagged with a status:
 *   - CONFIRMED: customer explicitly stated this value
 *   - EXTRACTED: text literally contains this value
 *   - INFERRED: AI derived this value from context (needs human confirmation)
 *   - MISSING: value is absent from the source material
 *   - CONFLICTING: multiple contradictory values found
 *
 * The AI must NEVER silently promote an INFERRED value to CONFIRMED.
 */
export async function extractTradingRequest(
  params: ExtractionInput,
): Promise<TradingRequest> {
  const {
    emailText,
    attachmentTexts,
    companyProducts,
    requirementTemplate,
    subject,
    sourceChannel = 'email',
  } = params;

  const systemPrompt = `You are a senior trade operations data extraction specialist. Your job is to extract structured trading request data from customer inquiry emails and their attachments.

CRITICAL RULES — READ CAREFULLY:
1. NEVER promote an inference to a confirmed fact. If you INFER a value, mark it as INFERRED.
2. If the customer explicitly states a value, mark it CONFIRMED.
3. If a value appears literally in the text (e.g. in a table), mark it EXTRACTED.
4. If contradictory values appear, mark as CONFLICTING and include both.
5. If a field cannot be determined, mark it MISSING.
6. A field marked INFERRED or CONFLICTING MUST have requiresConfirmation: true.
7. For every field, provide a confidence score from 0 to 1:
   - 1.0 = explicitly stated by customer
   - 0.8–0.9 = directly extractable from text/attachments
   - 0.5–0.7 = reasonable inference from context
   - 0.2–0.4 = weak inference, low certainty
   - 0.0 = unknown
8. NEVER fabricate data. If it's not there, it's MISSING.
9. Handle mixed Chinese/English content. Preserve original terms.
10. Extract ALL line items — one email may contain multiple products.
11. When extracting specifications, use a flat JSON object (key-value pairs).
12. Currency codes should be ISO 4217 (USD, CNY, EUR, HKD, etc.).
13. Incoterms should follow ICC rules (FOB, CIF, DDP, EXW, etc.).
14. Payment terms should be standard trade terms (T/T, L/C, D/P, etc.).

FIELD STATUS DEFINITIONS:
- CONFIRMED: Customer explicitly stated this. You are certain.
- EXTRACTED: This value appears literally in the source text.
- INFERRED: You derived this from context clues. Human MUST confirm.
- MISSING: No information about this field anywhere in the source.
- CONFLICTING: Multiple different values found for this field.

OUTPUT FORMAT: Return a valid JSON object matching the TradingRequest schema exactly. Every field in partiallyExtractedFields must include: name, value, confidence, source, status, requiresConfirmation, and evidence (with rawText when available).

Do NOT include any text outside the JSON object.`;

  const productContext =
    companyProducts.length > 0
      ? `\n\nKNOWN COMPANY PRODUCTS (use for matching product names and categories):\n${companyProducts.map((p) => `- ${p}`).join('\n')}`
      : '';

  const templateContext = requirementTemplate
    ? `\n\nPRODUCT REQUIREMENT TEMPLATE "${requirementTemplate.name}":
Required fields: ${requirementTemplate.requiredFields.join(', ')}
Optional fields: ${requirementTemplate.optionalFields.join(', ')}
Default specifications: ${JSON.stringify(requirementTemplate.defaultSpecifications ?? {})}
Pricing model: ${requirementTemplate.pricingModel ?? 'negotiable'}
MOQ: ${requirementTemplate.minimumOrderQuantity ?? 'not specified'}
Lead time: ${requirementTemplate.leadTimeDays ?? 'not specified'} days`
    : '';

  const attachmentsBlock =
    attachmentTexts.length > 0
      ? `\n\nATTACHMENT CONTENTS:\n${attachmentTexts.map((t, i) => `--- Attachment ${i + 1} ---\n${t}`).join('\n\n')}`
      : '';

  const userPrompt = `Extract a structured TradingRequest from the following customer inquiry.

${subject ? `EMAIL SUBJECT: ${subject}` : ''}
SOURCE CHANNEL: ${sourceChannel}

EMAIL BODY:
${emailText}
${attachmentsBlock}
${productContext}
${templateContext}

Return the extracted TradingRequest as a JSON object.`;

  const rawResponse = await callNim({
    systemPrompt,
    userPrompt,
    maxTokens: 4096,
    temperature: 0.05,
  });

  const parsed = parseJsonResponse<TradingRequest>(rawResponse);

  // Post-processing: enforce rules that the model might violate
  return sanitizeExtractedRequest(parsed, sourceChannel);
}

/**
 * Post-process the AI output to enforce invariants:
 * - INFERRED/CONFLICTING fields must have requiresConfirmation = true
 * - MISSING fields must have confidence = 0
 * - Source channel is set from input (not AI guess)
 */
function sanitizeExtractedRequest(
  raw: TradingRequest,
  sourceChannel: SourceChannel,
): TradingRequest {
  const fields = raw.partiallyExtractedFields ?? {};

  for (const key of Object.keys(fields)) {
    const field = fields[key];
    if (!field) continue;

    // Enforce confirmation requirement
    if (field.status === 'INFERRED' || field.status === 'CONFLICTING') {
      field.requiresConfirmation = true;
    }

    // MISSING must have zero confidence
    if (field.status === 'MISSING') {
      field.confidence = 0;
      field.requiresConfirmation = false;
    }

    // Populate evidence if absent
    if (!field.evidence) {
      field.evidence = {
        value: field.value,
        confidence: field.confidence,
        source: field.source,
        status: field.status,
        requiresConfirmation: field.requiresConfirmation,
        rawText: null,
      };
    }
  }

  // Force source channel from input
  raw.sourceChannel = sourceChannel;

  // Compute extractionConfidence as average of all non-missing fields
  const nonMissing = Object.values(fields).filter(
    (f): f is ExtractedField => f !== null && f !== undefined && f.status !== 'MISSING',
  );
  if (nonMissing.length > 0) {
    raw.extractionConfidence =
      nonMissing.reduce((sum, f) => sum + f.confidence, 0) /
      nonMissing.length;
  } else {
    raw.extractionConfidence = 0;
  }

  // Collect fields requiring confirmation
  raw.fieldsRequiringConfirmation = Object.keys(fields).filter(
    (k) => fields[k]?.requiresConfirmation,
  );

  return raw;
}

// ---------------------------------------------------------------------------
// 2. identifyMissingFields
// ---------------------------------------------------------------------------

/**
 * Compare extracted fields against the product requirement template and
 * return a list of missing required fields with human-friendly suggestions
 * for how to ask the customer.
 */
export function identifyMissingFields(
  extracted: TradingRequest,
  template: ProductRequirementTemplate,
): MissingField[] {
  const missing: MissingField[] = [];

  // Map template field names to TradingRequest accessor functions
  const fieldCheckers: Record<
    string,
    () => { present: boolean; label: string; description: string; currentValue?: string | null }
  > = {
    productName: () => ({
      present: !!extracted.productName,
      label: 'Product Name',
      description: 'The specific product the customer wants to buy',
      currentValue: extracted.productName || null,
    }),
    quantity: () => ({
      present: extracted.quantity > 0,
      label: 'Quantity',
      description: 'How many units the customer needs',
      currentValue: extracted.quantity > 0 ? String(extracted.quantity) : null,
    }),
    unit: () => ({
      present: !!extracted.unit,
      label: 'Unit of Measure',
      description: 'Unit for the quantity (pcs, sets, kg, etc.)',
      currentValue: extracted.unit || null,
    }),
    specifications: () => ({
      present: !!extracted.specifications && Object.keys(extracted.specifications).length > 0,
      label: 'Technical Specifications',
      description: 'Size, material, color, grade, or other technical details',
      currentValue: extracted.specificationsRaw
        ?? (extracted.specifications ? JSON.stringify(extracted.specifications) : null),
    }),
    targetPrice: () => ({
      present: extracted.targetPrice != null,
      label: 'Target Price',
      description: 'Budget or target price the customer has in mind',
      currentValue: extracted.targetPrice != null
        ? `${extracted.targetPriceCurrency ?? ''} ${extracted.targetPrice}`
        : null,
    }),
    incoterms: () => ({
      present: !!extracted.incoterms,
      label: 'Incoterms',
      description: 'Shipping terms (FOB, CIF, DDP, EXW, etc.)',
      currentValue: extracted.incoterms || null,
    }),
    paymentTerms: () => ({
      present: !!extracted.paymentTerms,
      label: 'Payment Terms',
      description: 'How the customer wants to pay (T/T, L/C, D/P, etc.)',
      currentValue: extracted.paymentTerms || null,
    }),
    deliveryDate: () => ({
      present: !!extracted.requiredDeliveryDate,
      label: 'Required Delivery Date',
      description: 'When the customer needs the goods delivered',
      currentValue: extracted.requiredDeliveryDate || null,
    }),
    deliveryCountry: () => ({
      present: !!extracted.deliveryCountry,
      label: 'Delivery Destination',
      description: 'Where the goods should be shipped to',
      currentValue: extracted.deliveryCountry || null,
    }),
    currency: () => ({
      present: !!extracted.preferredCurrency,
      label: 'Currency',
      description: 'Preferred currency for the transaction',
      currentValue: extracted.preferredCurrency || null,
    }),
    certifications: () => ({
      present: !!extracted.certificationRequirements && extracted.certificationRequirements.length > 0,
      label: 'Certification Requirements',
      description: 'Any required certifications (CE, FDA, ISO, etc.)',
      currentValue: extracted.certificationRequirements?.join(', ') || null,
    }),
    sampleRequested: () => ({
      present: true, // boolean, always present
      label: 'Sample Request',
      description: 'Whether the customer wants a sample first',
      currentValue: extracted.sampleRequested ? 'Yes' : 'No',
    }),
    contactPerson: () => ({
      present: !!extracted.contactPerson,
      label: 'Contact Person',
      description: 'Name of the person to follow up with',
      currentValue: extracted.contactPerson || null,
    }),
    customerEmail: () => ({
      present: !!extracted.customerEmail,
      label: 'Email Address',
      description: 'Customer email for follow-up',
      currentValue: extracted.customerEmail || null,
    }),
    customerPhone: () => ({
      present: !!extracted.customerPhone,
      label: 'Phone Number',
      description: 'Customer phone or WhatsApp number',
      currentValue: extracted.customerPhone || null,
    }),
    customerCompany: () => ({
      present: !!extracted.customerCompany,
      label: 'Company Name',
      description: "Customer's company or organization name",
      currentValue: extracted.customerCompany || null,
    }),
  };

  // Determine which fields to check based on template
  const allRequiredFields = [
    ...template.requiredFields,
    // Always require core product fields even if template doesn't list them
    'productName',
    'quantity',
  ];
  const uniqueRequired = [...new Set(allRequiredFields)];

  for (const fieldName of uniqueRequired) {
    const checker = fieldCheckers[fieldName];
    if (!checker) continue;

    const result = checker();
    if (!result.present) {
      // Generate a natural-language suggestion for how to ask the customer
      const suggestion = generateAskingSuggestion(fieldName, result.label);
      missing.push({
        fieldName,
        label: result.label,
        description: result.description,
        priority: 'required',
        suggestion,
        currentValue: result.currentValue ?? null,
      });
    }
  }

  // Check optional fields from template — mark as recommended
  for (const fieldName of template.optionalFields) {
    const checker = fieldCheckers[fieldName];
    if (!checker) continue;

    const result = checker();
    if (!result.present) {
      const suggestion = generateAskingSuggestion(fieldName, result.label);
      missing.push({
        fieldName,
        label: result.label,
        description: result.description,
        priority: 'recommended',
        suggestion,
        currentValue: result.currentValue ?? null,
      });
    }
  }

  return missing;
}

/**
 * Generate a natural-language suggestion for how to ask the customer
 * about a missing field.
 */
function generateAskingSuggestion(fieldName: string, label: string): string {
  const suggestions: Record<string, string> = {
    productName: 'Could you please confirm the exact product name or model number you are looking for?',
    quantity: 'How many units do you need? Please also confirm the unit (pieces, sets, kg, etc.).',
    unit: 'What unit of measure should we use for this order? (pcs, sets, kg, tons, etc.)',
    specifications: 'Could you share the detailed specifications? (size, material, color, grade, etc.)',
    targetPrice: 'Do you have a target price or budget range in mind for this order?',
    incoterms: 'Which shipping terms do you prefer? (FOB, CIF, DDP, EXW, etc.)',
    paymentTerms: 'What payment terms work best for you? (T/T, L/C, D/P, etc.)',
    deliveryDate: 'When do you need the goods delivered?',
    deliveryCountry: 'Which country/city should we ship to?',
    currency: 'Which currency would you like to use for this transaction?',
    certifications: 'Do you require any specific certifications for this product? (CE, FDA, ISO, etc.)',
    sampleRequested: 'Would you like to order a sample first before placing a bulk order?',
    contactPerson: 'Who should we follow up with regarding this inquiry?',
    customerEmail: 'Could you provide your email address for correspondence?',
    customerPhone: 'May I have your phone or WhatsApp number for quick communication?',
    customerCompany: 'Which company are you placing this order on behalf of?',
  };

  return (
    suggestions[fieldName] ??
    `Could you provide the ${label.toLowerCase()} for this inquiry?`
  );
}

// ---------------------------------------------------------------------------
// 3. draftClarificationEmail
// ---------------------------------------------------------------------------

/**
 * Draft a professional email asking the customer for missing information.
 * The draft is editable by the user before sending.
 * Should be in the same language as the original inquiry.
 */
export async function draftClarificationEmail(
  inquiry: Inquiry,
  missingFields: MissingField[],
): Promise<string> {
  if (missingFields.length === 0) {
    return '';
  }

  const detectedLanguage = inquiry.detectedLanguage ?? 'en';
  const languageName =
    detectedLanguage === 'zh' ? 'Chinese (Mandarin)' : detectedLanguage === 'en' ? 'English' : detectedLanguage;

  const missingFieldsList = missingFields
    .map((f, i) => `${i + 1}. [${f.label}] — ${f.description}\n   Suggested ask: "${f.suggestion}"`)
    .join('\n');

  const systemPrompt = `You are a professional trade operations email drafter for a trading company. You draft clear, polite, and concise follow-up emails to customers.

RULES:
1. The email MUST be written in the same language as the original inquiry.
2. The language has been detected as: ${languageName}
3. Be professional but warm. Not too formal, not too casual.
4. Reference the original inquiry naturally — don't just list what's missing.
5. Organize questions logically. Group related questions together.
6. If there are many missing fields, use numbered bullet points for clarity.
7. End with a clear call to action and an offer to help with anything else.
8. Do NOT fabricate any information about products or prices.
9. Keep the email under 300 words.
10. Use a professional greeting and sign-off appropriate for the detected language.
11. The email should feel like a natural follow-up, not a form.

The email is a DRAFT — it will be reviewed and edited before sending.`;

  const userPrompt = `Draft a clarification email for the following customer inquiry.

ORIGINAL INQUIRY SUBJECT: ${inquiry.subject ?? '(no subject)'}
ORIGINAL INQUIRY TEXT:
${inquiry.rawContent.slice(0, 2000)}

MISSING INFORMATION TO REQUEST:
${missingFieldsList}

Draft the email now. Write ONLY the email body, no subject line.`;

  const response = await callNim({
    systemPrompt,
    userPrompt,
    maxTokens: 1024,
    temperature: 0.4,
  });

  return response.trim();
}

// ---------------------------------------------------------------------------
// 4. classifyInquiryType
// ---------------------------------------------------------------------------

/**
 * Classify the inquiry type into one of:
 *   RFQ, PO, inquiry, complaint, technical_question, general
 */
export async function classifyInquiryType(text: string): Promise<string> {
  const validTypes = [
    'RFQ',
    'PO',
    'inquiry',
    'complaint',
    'technical_question',
    'general',
  ];

  const systemPrompt = `You are a trade operations classifier. Classify the following customer message into exactly one category.

CATEGORIES:
- RFQ: Request for Quotation — customer wants a price quote for products (keywords: quote, price, quotation, 报价, 价格, best price, how much)
- PO: Purchase Order — customer is placing an order or confirming a purchase (keywords: order, confirm order, purchase order, 下单, 订购, PO#)
- inquiry: General product inquiry — customer is asking about products, availability, or capabilities but not requesting a quote yet (keywords: do you have, can you supply, information about, 你们有吗, 能不能做)
- complaint: Complaint or issue — customer is unhappy about a previous order, delivery, or quality (keywords: problem, issue, complaint, damaged, wrong, 投诉, 问题, 质量问题)
- technical_question: Technical question — customer is asking about specifications, compatibility, testing, or technical details (keywords: specification, compatible, test report, 技术, 规格, 参数)
- general: General conversation — none of the above

RULES:
1. Return ONLY the category label, nothing else.
2. If ambiguous, choose the most likely category based on the overall intent.
3. For mixed messages, classify based on the PRIMARY intent.
4. If the message is clearly just a greeting or pleasantry, classify as "general".

Message to classify:
${text.slice(0, 3000)}`;

  const response = await callNim({
    systemPrompt,
    userPrompt: 'Classify this message. Reply with ONLY the category label.',
    maxTokens: 32,
    temperature: 0.0,
  });

  const normalized = response.trim().toLowerCase();

  // Map common variations to canonical labels
  const typeMap: Record<string, string> = {
    rfq: 'RFQ',
    'request for quotation': 'RFQ',
    'request for quote': 'RFQ',
    报价: 'RFQ',
    po: 'PO',
    'purchase order': 'PO',
    下单: 'PO',
    inquiry: 'inquiry',
    'product inquiry': 'inquiry',
    complaint: 'complaint',
    投诉: 'complaint',
    'technical question': 'technical_question',
    technical: 'technical_question',
    技术: 'technical_question',
    general: 'general',
  };

  return typeMap[normalized] ?? (validTypes.includes(response.trim()) ? response.trim() : 'general');
}
