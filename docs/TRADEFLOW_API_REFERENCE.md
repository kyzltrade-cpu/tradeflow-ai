# TradeFlow v2 — Complete API & Function Reference

**Version:** 2.0.0  
**Last Updated:** September 2026  
**Stack:** Next.js 16, React 19, Supabase, NVIDIA NIM, Resend, Stripe, WhatsApp Cloud API

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication & Authorization](#authentication)
3. [Library Modules](#library-modules)
4. [API Routes — Admin](#admin-routes)
5. [API Routes — Billing](#billing-routes)
6. [API Routes — Chat & AI](#chat-routes)
7. [API Routes — Cron Jobs](#cron-routes)
8. [API Routes — Webhooks](#webhook-routes)
9. [API Routes — Public](#public-routes)
10. [Type System](#type-system)
11. [Environment Variables](#environment-variables)

---

## 1. Overview

TradeFlow v2 is an AI-powered inquiry-to-quote trading operations platform for HK trading/sourcing companies. The system processes incoming customer inquiries (via email, WhatsApp, or web form), extracts structured requirements using AI, generates supplier RFQs, compares supplier quotes, builds customer-facing quotes with margin controls, and automates follow-up sequences.

### Architecture

```
Customer Inquiry (email/WhatsApp/web)
        │
        ▼
  ┌─────────────┐
  │  Webhook /   │
  │  Inbound     │
  └──────┬──────┘
         │
         ▼
  ┌─────────────┐     ┌──────────────┐
  │  AI Extract  │────▶│  NIM API     │
  │  (rfq-       │     │  (llama-3.1) │
  │   extraction)│     └──────────────┘
  └──────┬──────┘
         │
         ▼
  ┌─────────────┐
  │  Opportunity │
  │  Created     │
  └──────┬──────┘
         │
         ▼
  ┌─────────────┐     ┌──────────────┐
  │  Supplier    │────▶│  RFQ Email   │
  │  RFQ Sent    │     │  (Resend)    │
  └──────┬──────┘     └──────────────┘
         │
         ▼
  ┌─────────────┐
  │  Supplier    │
  │  Quotes In   │
  └──────┬──────┘
         │
         ▼
  ┌─────────────┐     ┌──────────────┐
  │  Cost Engine │────▶│  Margin      │
  │  + Pricing   │     │  Controls    │
  └──────┬──────┘     └──────────────┘
         │
         ▼
  ┌─────────────┐     ┌──────────────┐
  │  Quote       │────▶│  PDF + HTML  │
  │  Generated   │     │  Generation  │
  └──────┬──────┘     └──────────────┘
         │
         ▼
  ┌─────────────┐     ┌──────────────┐
  │  Quote Sent  │────▶│  Email to    │
  │  to Customer │     │  Customer    │
  └──────┬──────┘     └──────────────┘
         │
         ▼
  ┌─────────────┐
  │  Follow-up   │
  │  Sequence    │
  │  (automated) │
  └─────────────┘
```

---

## 2. Authentication & Authorization

### `src/lib/api-auth.ts` — Server-Side Auth

**`requireAuth(req, options?): Promise<AuthResult>`**

Extracts and verifies the Supabase JWT from the `Authorization` header or cookies. Returns user + company info. Throws a `Response` (401/403) on failure.

- **Input:** `NextRequest`, optional `{ requireCompany?: boolean }`
- **Output:** `{ user: { id, email }, companyId: string | null }`
- **Auth flow:** Extracts Bearer token → `supabaseAdmin.auth.getUser()` → queries `users` table for `company_id`
- **Error cases:** Missing token (401), invalid token (401), user not found (401), no company (403)

### `src/lib/auth-fetch.ts` — Client-Side Auth

**`authFetch(url, options?): Promise<Response>`**

Client-side fetch wrapper that automatically attaches the Supabase auth token from the browser session. Uses `'use client'` directive.

- **Input:** URL string, optional `RequestInit`
- **Output:** Standard `Response`
- **Dependency:** `supabaseBrowser` from `@/lib/auth`

### `src/lib/rate-limit.ts` — Rate Limiting

**`checkRateLimit(key, config?): { allowed, remaining, resetTime }`**

In-memory sliding window rate limiter. Per-process only (not distributed across instances).

- **Default:** 100 requests per 60-second window
- **Output:** `{ allowed: boolean, remaining: number, resetTime: number }`

**`getClientIp(req): string`**

Extracts client IP from `x-forwarded-for` header or falls back to `'unknown'`.

**`createRateLimitResponse(resetTime): Response`**

Returns a 429 JSON response with `Retry-After` header.

---

## 3. Library Modules

### `src/lib/supabase.ts` — Database Clients

Exports two Supabase clients:

- **`supabase`** — Browser client with anon key (auto-refresh, session persistence)
- **`supabaseAdmin`** — Server client with service role key (no auto-refresh, no RLS bypass via client, but full admin access via service role)

**Env vars:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

---

### `src/lib/ai.ts` — Core AI Chat Handler

Handles incoming customer conversations via WhatsApp/WeChat. Builds system prompts from company data, calls NVIDIA NIM API, and manages conversation state.

**`handleChat(ctx: ChatContext): Promise<ChatResponse>`**

Main chat handler. Loads company products, FAQ rules, and knowledge base. Detects language, matches FAQ patterns, falls back to NIM AI, and saves messages to the database.

- **Input:** `{ companyId, channel, conversationId, userMessage, contactPhone, contactName }`
- **Output:** `{ reply: string, tokensUsed: number }`
- **Flow:** Load company context → detect language → match FAQ → build system prompt → call NIM → save messages
- **NIM config:** `meta/llama-3.1-8b-instruct` via `https://integrate.api.nvidia.com/v1`

**`checkKeywordOverride(message): boolean`**

Detects human handoff keywords: "human", "真人", "speak to person", "manager", etc.

**`generateHandoffSummary(conversationId, companyName): Promise<string>`**

Generates a 2-line summary of a conversation for human takeover context.

**`getOrCreateConversation(companyId, channel, contactIdentifier, contactName?): Promise<string>`**

Finds or creates an active conversation for a contact on a given channel.

---

### `src/lib/rfq-extraction.ts` — AI Requirement Extraction

Extracts structured trading request data from email text + attachments using NIM API. Provides field-level confidence tracking.

**`extractTradingRequest(params: ExtractionInput): Promise<TradingRequest>`**

Main extraction function. Converts free-form email text into a structured `TradingRequest` with CONFIRMED/EXTRACTED/INFERRED/MISSING/CONFLICTING status per field.

- **Input:** `{ emailText, attachmentTexts[], companyProducts[], requirementTemplate?, subject?, sourceChannel? }`
- **Output:** `TradingRequest` with customer info, product requirements, delivery terms, commercial terms, and confidence metadata
- **Fields extracted:** Customer name/email/company, product name/description/specs, quantity/unit, target price, delivery date, destination, incoterms, payment terms

**`identifyMissingFields(extracted, template): MissingField[]`**

Compares extracted data against a product requirement template. Returns missing required/recommended fields with human-friendly suggestions.

**`draftClarificationEmail(inquiry, missingFields): Promise<string>`**

AI-drafted email asking the customer for missing information.

**`classifyInquiryType(text): Promise<string>`**

Classifies inquiry as: RFQ, PO, inquiry, complaint, technical_question, or general.

---

### `src/lib/cost-engine.ts` — Cost & Margin Calculator

Deterministic, stateless cost and margin calculation engine. Pure arithmetic — no LLM calls.

**`calculateCostBuildUp(params: CostBuildUpInput): CostBuildUpResult`**

Aggregates 9 cost components (product cost, tooling, packaging, inspection, transport, freight, insurance, financing, contingency) into a total estimated cost with line items.

**`calculateCustomerPrice(costBuildUp, marginRule): CustomerPriceResult`**

Derives customer-facing price from cost + margin rule (fixed amount, percentage, or tiered).

**`validateCostBuildUp(costBuildUp, companySettings): CostValidationResult`**

Validates against company policy: missing components, expired quotes, currency mismatches, negative margins.

**`convertCurrency(amount, from, to, rates): number`**

Currency conversion using flat rate table.

**`roundQuoteAmount(amount, currency): number`**

Smart rounding (0 decimals for JPY/KRW/VND, 2 for others).

---

### `src/lib/quote-generator.ts` — Quote Generation Engine

Full quote lifecycle: builds quotes from opportunities, generates PDF/HTML, handles versioning and pre-send validation.

**`generateQuoteNumber(companyId): Promise<string>`**

Sequential quote number in `QT-YYYY-NNNN` format. Uses database-level lock to prevent race conditions. Falls back to timestamp-based number.

**`buildQuoteFromOpportunity(params: QuoteBuildInput): Promise<QuoteBuildResult>`**

Constructs a draft Quote from opportunity data, selected supplier quotes, and cost build-up. Returns hydrated draft with line items and cost components.

**`generateQuotePDF(quote, company, lineItems, options?): Promise<Buffer>`**

Generates a branded PDF quotation document. Pure PDF object construction (no external dependencies). Includes company header, pricing table, terms, and footer.

- **Options:** `includeLogo`, `includeCostBreakdown`, `includeTerms`, `customNotes`
- **Output:** PDF document as Node.js Buffer

**`generateQuoteHTML(quote, company, lineItems): string`**

Generates a responsive HTML email body for sending the quote. Works across email clients. Includes summary table and call-to-action button.

**`createQuoteVersion(quoteId, companyId, changeSummary): Promise<void>`**

Snapshots current quote state as a new version record. Never overwrites or modifies sent quotes.

**`validateQuoteForSending(quote, costBuildUp, companySettings): ValidationResult`**

Validates: required fields, margin thresholds, cost completeness, validity dates, and terms inclusion. Returns issues with severity (error/warning).

---

### `src/lib/follow-up-engine.ts` — Follow-up Automation

Manages scheduled follow-up sequences. Uses NIM API for contextual message generation — never sends generic "just following up" messages.

**`createDefaultSequence(params: SequenceInput): Promise<FollowUpSequence>`**

Creates a 4-step follow-up sequence:
- Day 3: Check-in (references specific product/quote details)
- Day 7: Needs update (asks if requirements changed)
- Day 14: Value add (offers revised options/samples)
- Day 21: Close (polite close, leaves door open)

**`pauseSequence(sequenceId, companyId, userId): Promise<void>`**

Pauses all scheduled items in a sequence.

**`resumeSequence(sequenceId, companyId): Promise<void>`**

Resumes a paused sequence, recalculating dates from pause duration.

**`cancelSequence(sequenceId, companyId, reason): Promise<void>`**

Cancels sequence and all scheduled items.

**`skipStep(itemId, companyId): Promise<void>`**

Skips a single follow-up step.

**`rescheduleStep(itemId, newDate, companyId): Promise<void>`**

Reschedules a single step to a new date.

**`stopOnReply(sequenceId, companyId): Promise<void>`**

Auto-stops sequence when customer replies.

**`stopOnOutcome(sequenceId, outcome, companyId): Promise<void>`**

Stops sequence on opportunity outcome (accepted/rejected/expired/won/lost).

**`getDueFollowUps(companyId): Promise<DueFollowUp[]>`**

Returns all overdue follow-up items across active sequences.

**`generateFollowUpMessage(item, context): Promise<string>`**

AI-generated contextual message via NIM. References specific product, quantity, quote value, and original inquiry. Falls back to template-based messages if NIM is unavailable.

---

### `src/lib/email.ts` — Email Sending

Centralised email utility using Resend. Consistent sender config, error handling, and audit logging.

**`sendEmail(params: SendEmailParams): Promise<SendEmailResult>`**

Sends an email via Resend API.

- **Input:** `{ to, subject, html, text?, from?, replyTo?, cc?, bcc?, attachments[] }`
- **Output:** `{ success: boolean, id?: string, error?: string }`
- **Default sender:** `TradeFlow AI <onboarding@resend.dev>`
- **Auto-generates** plain-text fallback from HTML

**`isEmailConfigured(): boolean`**

Returns `true` if `RESEND_API_KEY` is set.

---

### `src/lib/attachment-processor.ts` — File Processing

Extracts text content from email attachments for the AI extraction pipeline.

**`validateAttachment(mimeType, fileSize): ValidationResult`**

Validates MIME type and file size (max 25 MB).

**`processAttachment(attachment: AttachmentInput): Promise<ExtractionResult>`**

Main entry: routes to type-specific processor based on MIME type.

**Supported formats:**
- `processPDF(buffer, filename)` — PDF text extraction via pdfjs-dist
- `processExcel(buffer, filename)` — Excel parsing via xlsx
- `processCSV(buffer, filename)` — CSV parsing with quoted-field support
- `processDOCX(buffer, filename)` — DOCX extraction via mammoth
- `processImage(buffer, filename)` — Placeholder (status: "needs_ocr")

**Output:** `{ text: string, tables: TableData[], status: "completed"|"failed"|"needs_ocr" }`

---

### `src/lib/language-detect.ts` — Language Detection

Character range heuristics for chatbot language detection.

**`detectLanguage(text): SupportedLanguage`**

Detects primary language: English (`en`), Chinese/Mandarin (`zh`), Cantonese (`yue`), or Spanish (`es`). Uses CJK/Latin ratio + marker words.

**`buildLanguageInstruction(detectedLang): string`**

Builds XML instruction block for AI system prompt to respond in the detected language.

**`isMixedLanguage(text): boolean`**

Detects code-switching (>20% both Latin and CJK characters).

---

### `src/lib/tradeflow-knowledge.ts` — Static Knowledge Base

Static knowledge base for the website chatbot. Contains product info, pricing, features, competitive positioning, and dashboard usage guide as XML-structured data.

**`TRADEFLOW_KNOWLEDGE`** — Large string with role, language rules, product knowledge, dashboard guide, response format, and guardrails.

**`PRICING_INFO`** — Starter/Growth/Enterprise tiers with monthly/annual prices in HKD and feature lists.

---

### `src/lib/wechat.ts` — WeChat Work Integration

Token management, message sending, signature verification, AES encryption/decryption, XML parsing.

**`getAccessToken(corpId, secret): Promise<string>`**

Cached WeChat Work access token (refreshes 5 minutes before expiry).

**`sendWeChatMessage(corpId, agentId, secret, toUser, message): Promise<void>`**

Sends a text message via WeChat Work API.

**`verifySignature(token, msgSignature, timestamp, nonce, encrypt): boolean`**

SHA1 signature verification for incoming webhooks.

**`decryptMessage(encodingAESKey, encrypted): string`**

AES-256-CBC decryption of incoming WeChat messages.

**`encryptMessage(encodingAESKey, msg, corpId): string`**

AES-256-CBC encryption for outgoing WeChat messages.

**`parseWeChatXml(xml): Record<string, string>`**

Zero-dependency XML parser for WeChat message payloads.

---

### `src/lib/web-search.ts` — Web Search

Web search utility via Exa API with auto-detection of search-worthy queries.

**`webSearch(query, numResults?): Promise<string>`**

Searches via Exa, returns formatted results with titles, URLs, and snippets.

**`needsWebSearch(message): boolean`**

Pattern-matches messages that would benefit from web search (price lookups, product comparisons, market research).

---

### `src/lib/utils.ts` — General Utilities

**`cn(...inputs): string`** — Tailwind CSS class merger (clsx + twMerge)

**`formatDate(date): string`** — Formats date for en-HK locale

**`formatRelativeTime(date): string`** — Returns "just now", "5m ago", "2h ago", "3d ago"

---

## 4. API Routes — Admin

### Inquiries

| Route | Method | Description |
|-------|--------|-------------|
| `/api/admin/inquiries` | GET | List all inquiries with filtering, sorting, and pagination |
| `/api/admin/inquiries/[id]` | GET, PUT, DELETE | Get, update, or delete a specific inquiry |
| `/api/admin/inquiries/[id]/extract` | POST | Run AI extraction on inquiry email text + attachments |
| `/api/admin/inquiries/[id]/attachments` | GET, POST | List or upload attachments for an inquiry |
| `/api/admin/inquiries/webhook` | POST | Resend inbound email webhook — creates inquiry from received email |

### Opportunities

| Route | Method | Description |
|-------|--------|-------------|
| `/api/admin/opportunities` | GET, POST | List or create opportunities |
| `/api/admin/opportunities/[id]` | GET, PUT, DELETE | Get, update, or delete an opportunity |
| `/api/admin/opportunities/[id]/stage` | PUT | Move opportunity to a new pipeline stage |
| `/api/admin/opportunities/[id]/convert` | POST | Convert opportunity to quote |

### Quotes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/admin/quotes` | GET, POST | List or create quotes |
| `/api/admin/quotes/[id]` | GET, PUT, DELETE | Get, update, or delete a quote |
| `/api/admin/quotes/[id]/send` | POST | **Send quote to customer** — generates HTML+PDF, sends via Resend, creates follow-up sequence |
| `/api/admin/quotes/[id]/approve` | POST | Approve a quote (status gate before sending) |
| `/api/admin/quotes/[id]/line-items` | GET, POST, PUT, DELETE | Manage quote line items |
| `/api/admin/quotes/[id]/version` | POST | Create a version snapshot of the quote |

### Supplier RFQs

| Route | Method | Description |
|-------|--------|-------------|
| `/api/admin/rfqs` | GET, POST | List or create supplier RFQs |
| `/api/admin/rfqs/[id]` | GET, PUT, DELETE | Get, update, or delete an RFQ |
| `/api/admin/rfqs/[id]/send` | POST | **Send RFQ to supplier** — generates branded email, sends via Resend |

### Supplier Quotes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/admin/supplier-quotes` | GET, POST | List or create supplier quotes |
| `/api/admin/supplier-quotes/[id]` | GET, PUT, DELETE | Get, update, or delete a supplier quote |
| `/api/admin/supplier-quotes/compare` | GET | Side-by-side comparison of supplier quotes |

### Suppliers

| Route | Method | Description |
|-------|--------|-------------|
| `/api/admin/suppliers` | GET, POST | List or create suppliers |
| `/api/admin/suppliers/[id]` | GET, PUT, DELETE | Get, update, or delete a supplier |
| `/api/admin/suppliers/[id]/quotes` | GET | List all quotes from a specific supplier |
| `/api/admin/suppliers/[id]/rfqs` | GET | List all RFQs sent to a specific supplier |

### Customers & Contacts

| Route | Method | Description |
|-------|--------|-------------|
| `/api/admin/customers` | GET, POST | List or create customers |
| `/api/admin/customers/[id]` | GET, PUT, DELETE | Get, update, or delete a customer |
| `/api/admin/contacts` | GET, POST | List or create contacts |
| `/api/admin/contacts/[id]` | GET, PUT, DELETE | Get, update, or delete a contact |

### Follow-ups

| Route | Method | Description |
|-------|--------|-------------|
| `/api/admin/follow-ups` | GET, POST | List or create follow-up sequences |
| `/api/admin/follow-ups/[id]` | GET, PUT, DELETE | Get, update, or delete a sequence |
| `/api/admin/follow-ups/[id]/items/[itemId]` | PUT, DELETE | Update or delete a specific follow-up step |

### Products

| Route | Method | Description |
|-------|--------|-------------|
| `/api/admin/products` | GET, POST | List or create products |

### Knowledge Base & FAQ

| Route | Method | Description |
|-------|--------|-------------|
| `/api/admin/knowledge` | GET, POST | List or create knowledge base articles |
| `/api/admin/knowledge/scrape` | POST | Scrape a URL and add content to knowledge base (uses Exa) |
| `/api/admin/faq` | GET, POST | List or create FAQ rules |

### Documents

| Route | Method | Description |
|-------|--------|-------------|
| `/api/admin/documents` | GET, POST | List or upload documents (Supabase Storage) |
| `/api/admin/documents/[id]` | GET, DELETE | Get or delete a document |

### Conversations

| Route | Method | Description |
|-------|--------|-------------|
| `/api/admin/conversations` | GET | List all conversations with contact info |
| `/api/admin/conversations/[id]/messages` | GET | List messages in a conversation |

### Settings & Config

| Route | Method | Description |
|-------|--------|-------------|
| `/api/admin/settings` | GET, PUT | Get or update company settings (system prompt, integrations, email config) |
| `/api/admin/company` | GET, PUT | Get or update company profile |
| `/api/admin/goals` | GET, PUT | Get or update sales goals |
| `/api/admin/email/test` | POST | Send a test email via Resend |
| `/api/admin/confirm-email` | POST | Confirm email address |
| `/api/admin/pending-companies` | GET | List companies pending approval |

### WhatsApp

| Route | Method | Description |
|-------|--------|-------------|
| `/api/admin/whatsapp/embedded-signup` | POST | WhatsApp Business embedded signup flow |

---

## 5. API Routes — Billing

| Route | Method | Description |
|-------|--------|-------------|
| `/api/billing/checkout` | POST | Creates Stripe Checkout session for subscription (Starter HK$880 / Growth HK$2,480 / Enterprise HK$4,880) |
| `/api/billing/portal` | POST | Creates Stripe Billing Portal session for managing existing subscription |

### Checkout Flow

1. User clicks "Subscribe" on `/admin/billing`
2. Route creates/reuses Stripe customer
3. Creates Checkout Session with correct tier + interval
4. Returns Stripe URL → user redirected to Stripe
5. On success, Stripe webhook fires `checkout.session.completed`
6. Webhook updates `companies.subscription_status` to `active`

---

## 6. API Routes — Chat & AI

| Route | Method | Description |
|-------|--------|-------------|
| `/api/chat` | POST | AI chat endpoint — processes messages through NIM LLM with knowledge base, FAQ matching, language detection, and web search fallback |

### Chat Flow

1. Receive user message + conversation ID
2. Load company context (products, FAQ rules, knowledge base)
3. Detect language
4. Match FAQ patterns (exact match first)
5. Build system prompt with company data
6. Call NVIDIA NIM API (`meta/llama-3.1-8b-instruct`)
7. Save user message + AI response to database
8. Return reply + metadata

---

## 7. API Routes — Cron Jobs

| Route | Method | Auth | Schedule | Description |
|-------|--------|------|----------|-------------|
| `/api/cron/follow-ups` | GET | `CRON_SECRET` | Every 15 min | Processes due follow-up items — generates AI messages and sends via email |
| `/api/cron/workflow` | GET | `CRON_SECRET` | Every 10 min | Processes pending workflow jobs (RFQ emails, etc.) |

### Follow-up Cron Flow

1. Query `follow_up_items` where `status=scheduled` AND `scheduled_for <= now`
2. Filter to active sequences only
3. For each item: build context → generate message via NIM → send via Resend
4. Mark items as `sent` or `failed`
5. Log audit events

### Workflow Cron Flow

1. Query `workflow_jobs` where `status=pending`
2. Mark as `processing`
3. Execute job (currently: `send_rfq_email`)
4. Mark as `completed` or `failed`

### Vercel Cron Config (`vercel.json`)

```json
{
  "crons": [
    { "path": "/api/cron/follow-ups", "schedule": "0,15,30,45 * * * *" },
    { "path": "/api/cron/workflow", "schedule": "0,10,20,30,40,50 * * * *" }
  ]
}
```

---

## 8. API Routes — Webhooks

| Route | Method | Description |
|-------|--------|-------------|
| `/api/webhooks/whatsapp` | GET, POST | WhatsApp Cloud API webhook — GET handles Meta verification, POST processes inbound messages with dedup, rate limiting, and subscription checks |
| `/api/webhooks/wechat` | GET, POST | WeChat Work webhook — GET handles server verification, POST processes incoming messages |
| `/api/webhooks/stripe` | POST | Stripe webhook — processes subscription lifecycle events |

### WhatsApp Webhook

- **GET:** Meta verification (`hub.mode`, `hub.verify_token`, `hub.challenge`)
- **POST:** Inbound message processing
  - 15-minute dedup window
  - Rate limits to 30 messages/minute
  - Checks subscription status (active vs expired)
  - Supports keyword overrides: "stop" (opt-out), "human" (handoff), "start" (opt-in)
  - Routes to `handleChat()` for AI response

### Stripe Webhook

Handles these events:
- `checkout.session.completed` — Creates subscription, updates company
- `customer.subscription.updated` — Syncs subscription status
- `customer.subscription.deleted` — Downgrades to free
- `invoice.payment_failed` — Marks as past_due

---

## 9. API Routes — Public

| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/api/demo-request` | POST | No | Submits demo request form — stores in DB + sends admin notification email via Resend |
| `/api/health` | GET | No | Health check — pings Supabase database to verify connectivity |
| `/api/research` | POST | No | Research endpoint — scrapes prospect website via Exa, analyzes with NIM to generate business development responses |

### Research Output

Returns: company size, revenue range, headquarters, tech stack, competitors, AI analysis, key insights, personalized approach, email template, and follow-up sequence.

---

## 10. Type System

### Core Enums

| Type | Values |
|------|--------|
| `ProcessingStatus` | RECEIVED → PARSING → EXTRACTING → NEEDS_REVIEW → READY_FOR_RFQ → QUOTE_DRAFTED → FAILED |
| `InquiryPriority` | low, normal, high, urgent |
| `SourceChannel` | email, whatsapp, wechat, manual, web_form, phone, file_upload |
| `OpportunityStage` | NEW → NEEDS_INFORMATION → QUALIFIED → SOURCING → QUOTE_DRAFT → PENDING_APPROVAL → SENT → NEGOTIATING → WON / LOST / EXPIRED |
| `QuoteStatus` | DRAFT → IN_REVIEW → APPROVED → SENT → OPENED → CUSTOMER_REPLIED → ACCEPTED / REJECTED / EXPIRED / SUPERSEDED |
| `SupplierRfqStatus` | DRAFT → READY → SENT → PARTIALLY_RESPONDED → COMPLETE / EXPIRED / CANCELLED |
| `FollowUpStatus` | scheduled, sent, cancelled, completed |
| `FieldStatus` | CONFIRMED, EXTRACTED, INFERRED, MISSING, CONFLICTING |

### Domain Models

- **Customer** — id, name, email, company, phone, tags, notes, metadata
- **Contact** — id, customer_id, name, email, phone, role, is_primary
- **Supplier** — id, legal_name, trading_name, contact_email, contact_name, is_approved, rating, specializations
- **Inquiry** — id, company_id, subject, body, source_channel, status, priority, detected_language
- **Opportunity** — id, company_id, title, customer_id, stage, estimated_value, currency, product_name
- **SupplierRfq** — id, company_id, opportunity_id, supplier_id, status, subject, message_body, response_deadline
- **SupplierQuote** — id, rfq_id, supplier_id, total_price, currency, payment_terms, lead_time_days
- **Quote** — id, opportunity_id, status, version, currency, valid_until, payment_terms, total_amount, margin, margin_percent
- **QuoteLineItem** — id, quote_id, product_name, quantity, unit, unit_price, total_price, margin, margin_percent
- **FollowUpSequence** — id, opportunity_id, quote_id, status, channel
- **FollowUpItem** — id, sequence_id, step_number, delay_days, scheduled_for, status, message_type, subject, message_body
- **WorkflowJob** — id, company_id, job_type, entity_type, entity_id, status, payload

---

## 11. Environment Variables

### Required

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side) |
| `NIM_API_KEY` | NVIDIA NIM API key for AI chat/extraction |
| `RESEND_API_KEY` | Resend API key for email sending |
| `NEXT_PUBLIC_APP_URL` | App base URL (e.g., `https://tradeflow-ai-rho.vercel.app`) |

### Optional

| Variable | Purpose |
|----------|---------|
| `STRIPE_SECRET_KEY` | Stripe secret key for billing |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `WHATSAPP_ACCESS_TOKEN` | WhatsApp Cloud API access token |
| `WHATSAPP_VERIFY_TOKEN` | WhatsApp webhook verification token |
| `WECHAT_WORK_CORP_ID` | WeChat Work corporation ID |
| `WECHAT_WORK_SECRET` | WeChat Work application secret |
| `WECHAT_WORK_TOKEN` | WeChat Work callback token |
| `WECHAT_WORK_ENCODING_AES_KEY` | WeChat Work AES encryption key |
| `EXA_API_KEY` | Exa API key for web search/scraping |
| `SENTRY_DSN` | Sentry error tracking DSN |
| `CRON_SECRET` | Bearer token for cron job authentication |

---

*Generated by TradeFlow AI Documentation System — September 2026*
