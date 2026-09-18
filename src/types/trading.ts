// =============================================================================
// TradeFlow v2 — Trading Operations Type System
// =============================================================================
// Comprehensive types for inquiry processing, opportunity management,
// supplier RFQs, quote building, and follow-up automation.
// =============================================================================

// ---------------------------------------------------------------------------
// Enums / Union Types
// ---------------------------------------------------------------------------

/** Pipeline processing status for an incoming inquiry */
export type ProcessingStatus =
  | "RECEIVED"
  | "PARSING"
  | "EXTRACTING"
  | "NEEDS_REVIEW"
  | "READY_FOR_RFQ"
  | "QUOTE_DRAFTED"
  | "FAILED";

/** How urgently the customer needs a response */
export type InquiryPriority = "low" | "normal" | "high" | "urgent";

/** Channel through which the inquiry arrived */
export type SourceChannel =
  | "email"
  | "whatsapp"
  | "wechat"
  | "manual"
  | "web_form"
  | "phone"
  | "file_upload";

/** Opportunity lifecycle stage */
export type OpportunityStage =
  | "NEW"
  | "NEEDS_INFORMATION"
  | "QUALIFIED"
  | "SOURCING"
  | "QUOTE_DRAFT"
  | "PENDING_APPROVAL"
  | "SENT"
  | "NEGOTIATING"
  | "WON"
  | "LOST"
  | "EXPIRED";

/** How the company participates in the transaction */
export type TradingModel = "principal" | "sourcing_agent" | "hybrid";

/** Quote lifecycle status */
export type QuoteStatus =
  | "DRAFT"
  | "IN_REVIEW"
  | "APPROVED"
  | "SENT"
  | "OPENED"
  | "CUSTOMER_REPLIED"
  | "ACCEPTED"
  | "REJECTED"
  | "EXPIRED"
  | "SUPERSEDED";

/** Supplier RFQ lifecycle status */
export type SupplierRfqStatus =
  | "DRAFT"
  | "READY"
  | "SENT"
  | "PARTIALLY_RESPONDED"
  | "COMPLETE"
  | "EXPIRED"
  | "CANCELLED";

/** Follow-up action status */
export type FollowUpStatus =
  | "scheduled"
  | "sent"
  | "cancelled"
  | "completed";

/** Confidence / verification status of an extracted field */
export type FieldStatus =
  | "CONFIRMED"
  | "EXTRACTED"
  | "INFERRED"
  | "MISSING"
  | "CONFLICTING";

/** Whether a cost component amount is confirmed or still estimated */
export type CostComponentStatus = "confirmed" | "estimated";

/** Background job status */
export type JobStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "retrying";

// ---------------------------------------------------------------------------
// Core Domain Interfaces
// ---------------------------------------------------------------------------

// -- Company & Contacts ------------------------------------------------------

export interface Customer {
  id: string;
  companyId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  whatsappNumber?: string | null;
  wechatId?: string | null;
  company?: string | null;
  country?: string | null;
  language?: string | null;
  tags: string[];
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Contact {
  id: string;
  customerId: string;
  name: string;
  role?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsappNumber?: string | null;
  wechatId?: string | null;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Supplier {
  id: string;
  companyId: string;
  name: string;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsappNumber?: string | null;
  wechatId?: string | null;
  country?: string | null;
  specialties: string[];
  certifications: string[];
  rating?: number | null;
  leadTimeDays?: number | null;
  paymentTerms?: string | null;
  notes?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierDocument {
  id: string;
  supplierId: string;
  name: string;
  type: "certificate" | "specification" | "price_list" | "catalog" | "other";
  fileUrl?: string | null;
  content?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

// -- Inquiry (incoming customer request) --------------------------------------

export interface Inquiry {
  id: string;
  companyId: string;
  customerId?: string | null;
  contactId?: string | null;
  sourceChannel: SourceChannel;
  subject?: string | null;
  rawContent: string;
  rawAttachments: InquiryAttachment[];
  detectedLanguage?: string | null;
  detectedCountry?: string | null;
  processingStatus: ProcessingStatus;
  priority: InquiryPriority;
  extractedData?: TradingRequest | null;
  extractionRunId?: string | null;
  assignedTo?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InquiryAttachment {
  id: string;
  inquiryId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileUrl: string;
  mimeType?: string | null;
  ocrText?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

// -- Extraction (AI processing of raw inquiry) -------------------------------

export interface ExtractionRun {
  id: string;
  inquiryId: string;
  modelId: string;
  status: "pending" | "running" | "completed" | "failed";
  rawInput: string;
  rawOutput?: string | null;
  structuredOutput?: TradingRequest | null;
  confidence?: number | null;
  tokensUsed?: number | null;
  durationMs?: number | null;
  errorMessage?: string | null;
  createdAt: string;
  completedAt?: string | null;
}

export interface ExtractedField {
  name: string;
  value: unknown;
  confidence: number;
  source: "message" | "attachment" | "inferred" | "user_confirmed";
  status: FieldStatus;
  evidence?: FieldEvidence | null;
  requiresConfirmation: boolean;
}

// -- Opportunity -------------------------------------------------------------

export interface Opportunity {
  id: string;
  companyId: string;
  inquiryId?: string | null;
  customerId?: string | null;
  title: string;
  stage: OpportunityStage;
  tradingModel: TradingModel;
  estimatedValue?: number | null;
  currency?: string | null;
  priority: InquiryPriority;
  assignedTo?: string | null;
  lostReason?: string | null;
  wonNotes?: string | null;
  tags: string[];
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  closedAt?: string | null;
}

// -- Supplier RFQ ------------------------------------------------------------

export interface SupplierRfq {
  id: string;
  opportunityId: string;
  supplierId: string;
  status: SupplierRfqStatus;
  subject?: string | null;
  message?: string | null;
  lineItems: SupplierRfqLineItem[];
  sentAt?: string | null;
  expiresAt?: string | null;
  responseCount: number;
  totalRequested: number;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierRfqLineItem {
  id: string;
  rfqId: string;
  productName: string;
  specifications?: string | null;
  quantity: number;
  unit: string;
  targetPrice?: number | null;
  currency?: string | null;
  notes?: string | null;
}

export interface SupplierQuote {
  id: string;
  rfqId: string;
  supplierId: string;
  status: "received" | "under_review" | "accepted" | "rejected";
  quotedPrice?: number | null;
  currency?: string | null;
  leadTimeDays?: number | null;
  moq?: number | null;
  paymentTerms?: string | null;
  notes?: string | null;
  validUntil?: string | null;
  lineItems: SupplierQuoteLineItem[];
  attachments: SupplierDocument[];
  createdAt: string;
  updatedAt: string;
}

export interface SupplierQuoteLineItem {
  id: string;
  quoteId: string;
  rfqLineItemId?: string | null;
  productName: string;
  unitPrice: number;
  currency: string;
  quantity: number;
  leadTimeDays?: number | null;
  notes?: string | null;
}

// -- Quote (outgoing to customer) --------------------------------------------

export interface Quote {
  id: string;
  opportunityId: string;
  status: QuoteStatus;
  version: number;
  currency: string;
  validUntil?: string | null;
  paymentTerms?: string | null;
  deliveryTerms?: string | null;
  incoterms?: string | null;
  notes?: string | null;
  internalNotes?: string | null;
  lineItems: QuoteLineItem[];
  costComponents: QuoteCostComponent[];
  totalCost?: number | null;
  margin?: number | null;
  marginPercent?: number | null;
  sentAt?: string | null;
  openedAt?: string | null;
  acceptedAt?: string | null;
  rejectedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface QuoteLineItem {
  id: string;
  quoteId: string;
  productName: string;
  description?: string | null;
  specifications?: string | null;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  currency: string;
  sourceSupplierId?: string | null;
  sourceSupplierQuoteId?: string | null;
  costBreakdown: QuoteCostComponent[];
  margin?: number | null;
  marginPercent?: number | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface QuoteCostComponent {
  id: string;
  quoteId: string;
  lineItemId?: string | null;
  name: string;
  category:
    | "product_cost"
    | "shipping"
    | "insurance"
    | "duty"
    | "tax"
    | "handling"
    | "packaging"
    | "commission"
    | "markup"
    | "other";
  amount: number;
  currency: string;
  percentage?: number | null;
  source?: string | null;
  status: CostComponentStatus;
  notes?: string | null;
}

export interface QuoteVersion {
  id: string;
  quoteId: string;
  version: number;
  snapshot: Quote;
  changeNotes?: string | null;
  createdBy?: string | null;
  createdAt: string;
}

export interface QuoteApproval {
  id: string;
  quoteId: string;
  approverId: string;
  status: "pending" | "approved" | "rejected";
  comments?: string | null;
  requestedAt: string;
  resolvedAt?: string | null;
}

// -- Follow-up Automation ----------------------------------------------------

export interface FollowUpSequence {
  id: string;
  opportunityId: string;
  name: string;
  isActive: boolean;
  triggerCondition?:
    | "quote_sent"
    | "no_reply_days"
    | "stage_change"
    | "custom"
    | null;
  triggerValue?: string | null;
  items: FollowUpItem[];
  createdAt: string;
  updatedAt: string;
}

export interface FollowUpItem {
  id: string;
  sequenceId: string;
  stepOrder: number;
  delayDays: number;
  channel: SourceChannel;
  templateId?: string | null;
  subject?: string | null;
  bodyTemplate?: string | null;
  status: FollowUpStatus;
  scheduledFor?: string | null;
  sentAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  cancelReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

// -- Product & Templates -----------------------------------------------------

export interface ProductRequirementTemplate {
  id: string;
  companyId: string;
  name: string;
  category?: string | null;
  requiredFields: string[];
  optionalFields: string[];
  defaultSpecifications?: Record<string, unknown> | null;
  pricingModel?: "fixed" | "tiered" | "negotiable" | null;
  minimumOrderQuantity?: number | null;
  leadTimeDays?: number | null;
  notes?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// -- Background Jobs ---------------------------------------------------------

export interface WorkflowJob {
  id: string;
  companyId?: string | null;
  type: string;
  status: JobStatus;
  payload?: Record<string, unknown> | null;
  result?: Record<string, unknown> | null;
  error?: string | null;
  retryCount: number;
  maxRetries: number;
  runAfter?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

// -- Audit & Documents -------------------------------------------------------

export interface AuditEvent {
  id: string;
  entityType:
    | "inquiry"
    | "opportunity"
    | "quote"
    | "supplier_rfq"
    | "supplier_quote"
    | "follow_up"
    | "customer"
    | "supplier";
  entityId: string;
  companyId: string;
  action: string;
  actorId?: string | null;
  actorType?: "user" | "system" | "ai" | null;
  previousState?: Record<string, unknown> | null;
  newState?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface Document {
  id: string;
  companyId: string;
  entityType:
    | "inquiry"
    | "opportunity"
    | "quote"
    | "supplier_rfq"
    | "supplier_quote";
  entityId: string;
  name: string;
  type:
    | "rfq"
    | "proforma_invoice"
    | "commercial_invoice"
    | "packing_list"
    | "bill_of_lading"
    | "certificate_of_origin"
    | "specification"
    | "contract"
    | "other";
  content?: string | null;
  fileUrl?: string | null;
  mimeType?: string | null;
  version: number;
  metadata?: Record<string, unknown> | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Structured Extraction Output (TradingRequest)
// ---------------------------------------------------------------------------
// This is the canonical shape produced by the AI extraction pipeline from
// raw inquiry text. It mirrors the build prompt's output schema.

export interface TradingRequest {
  // -- Customer & contact info ------------------------------------------------
  customerName: string;
  customerCompany?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  customerCountry?: string | null;
  customerLanguage?: string | null;
  contactPerson?: string | null;

  // -- Product requirements ---------------------------------------------------
  productName: string;
  productCategory?: string | null;
  specifications?: Record<string, unknown> | null;
  specificationsRaw?: string | null;
  quantity: number;
  unit: string;
  targetPrice?: number | null;
  targetPriceCurrency?: string | null;
  budget?: number | null;
  budgetCurrency?: string | null;

  // -- Delivery & logistics ---------------------------------------------------
  incoterms?: string | null;
  deliveryAddress?: string | null;
  deliveryCountry?: string | null;
  preferredShippingMethod?: string | null;
  requiredDeliveryDate?: string | null;
  acceptableLeadTimeDays?: number | null;

  // -- Commercial terms -------------------------------------------------------
  paymentTerms?: string | null;
  preferredCurrency?: string | null;
  tradeTerms?: string | null;
  quantityFlexibility?: string | null;
  sampleRequested: boolean;
  certificationRequirements?: string[] | null;

  // -- Inquiry metadata -------------------------------------------------------
  sourceChannel: SourceChannel;
  originalLanguage?: string | null;
  subject?: string | null;
  urgency?: InquiryPriority | null;
  specialNotes?: string | null;

  // -- AI confidence & extraction metadata ------------------------------------
  extractionConfidence: number;
  fieldsRequiringConfirmation: string[];
  extractionWarnings: string[];
  partiallyExtractedFields: Partial<Record<string, ExtractedField>>;
}

// ---------------------------------------------------------------------------
// Helper / Utility Types
// ---------------------------------------------------------------------------

/** Evidence trail for an extracted value */
export interface FieldEvidence {
  value: unknown;
  confidence: number;
  source: "message" | "attachment" | "inferred" | "user_confirmed";
  status: FieldStatus;
  requiresConfirmation: boolean;
  rawText?: string | null;
  pageNumber?: number | null;
  lineReference?: string | null;
}

/** Full cost build-up for a quote or line item */
export interface CostBuildUp {
  productCost: {
    amount: number;
    currency: string;
    source: string;
    status: CostComponentStatus;
  };
  shipping: {
    amount: number;
    currency: string;
    method?: string | null;
    source: string;
    status: CostComponentStatus;
  };
  insurance: {
    amount: number;
    currency: string;
    source: string;
    status: CostComponentStatus;
  };
  duty: {
    amount: number;
    currency: string;
    hsCode?: string | null;
    dutyRate?: number | null;
    source: string;
    status: CostComponentStatus;
  };
  tax: {
    amount: number;
    currency: string;
    taxRate?: number | null;
    source: string;
    status: CostComponentStatus;
  };
  handling: {
    amount: number;
    currency: string;
    source: string;
    status: CostComponentStatus;
  };
  packaging: {
    amount: number;
    currency: string;
    source: string;
    status: CostComponentStatus;
  };
  commission: {
    amount: number;
    currency: string;
    rate?: number | null;
    source: string;
    status: CostComponentStatus;
  };
  markup: {
    amount: number;
    currency: string;
    rate?: number | null;
    source: string;
    status: CostComponentStatus;
  };
  other: {
    amount: number;
    currency: string;
    description?: string | null;
    source: string;
    status: CostComponentStatus;
  };
  totalCost: number;
  totalMargin: number;
  marginPercent: number;
  currency: string;
}

// ---------------------------------------------------------------------------
// Cost Engine Types (used by cost-engine.ts)
// ---------------------------------------------------------------------------

export interface CostLineItem {
  value: number;
  currency: string;
  source: string;
  effective_date: string;
  status: CostComponentStatus;
  assumption_note?: string;
}

export interface CostBuildUpInput {
  supplier_cost: number;
  tooling_cost: number;
  packaging_cost: number;
  inspection_cost: number;
  local_transport_cost: number;
  freight_cost: number;
  insurance_cost: number;
  financing_allowance: number;
  contingency: number;
  currency?: string;
  effective_date?: string;
  supplier_cost_status?: CostComponentStatus;
  supplier_cost_note?: string;
  tooling_cost_status?: CostComponentStatus;
  tooling_cost_note?: string;
  packaging_cost_status?: CostComponentStatus;
  packaging_cost_note?: string;
  inspection_cost_status?: CostComponentStatus;
  inspection_cost_note?: string;
  local_transport_cost_status?: CostComponentStatus;
  local_transport_cost_note?: string;
  freight_cost_status?: CostComponentStatus;
  freight_cost_note?: string;
  insurance_cost_status?: CostComponentStatus;
  insurance_cost_note?: string;
  financing_allowance_status?: CostComponentStatus;
  financing_allowance_note?: string;
  contingency_status?: CostComponentStatus;
  contingency_note?: string;
}

export interface CostBuildUpResult {
  components: CostLineItem[];
  total_estimated_cost: number;
  currency: string;
  effective_date: string;
  delivery_date_verified?: boolean;
  quote_valid_until?: string;
  discount_percentage?: number;
}

export type MarginRuleType = "percentage_markup" | "fixed_commission" | "margin";

export interface MarginRule {
  type: MarginRuleType;
  rate: number;
  amount: number;
  trading_model: TradingModel;
}

export interface CustomerPriceResult {
  customer_price: number;
  currency: string;
  margin_amount: number;
  margin_percentage: number;
  trading_model: TradingModel;
  margin_rule: MarginRule;
}

export interface CostValidationWarning {
  code: string;
  severity: "warning" | "error";
  message: string;
  component_source: string | undefined;
}

export interface CostValidationResult {
  valid: boolean;
  warnings: CostValidationWarning[];
  checked_at: string;
}

export interface CompanySettings {
  minimum_margin_percentage?: number;
  max_discount_percentage?: number;
  require_delivery_date_verification?: boolean;
  require_quote_validity?: boolean;
  require_inspection_before_shipment?: boolean;
}

/** Paginated API response wrapper */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/** Standard API error shape */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown> | null;
  timestamp: string;
}

/** User who interacts with the system */
export interface User {
  id: string;
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
  companyId?: string | null;
  role: "admin" | "manager" | "agent" | "viewer";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Dashboard summary stats */
export interface TradingDashboardStats {
  totalInquiries: number;
  openInquiries: number;
  totalOpportunities: number;
  activeOpportunities: number;
  quotesSent: number;
  quotesAccepted: number;
  quotesWinRate: number;
  totalRevenue: number;
  averageDealSize: number;
  averageCycleTimeDays: number;
  pendingFollowUps: number;
  overdueFollowUps: number;
}

/** Filter / query params for listing inquiries */
export interface InquiryListFilters {
  status?: ProcessingStatus[];
  priority?: InquiryPriority[];
  channel?: SourceChannel[];
  assignedTo?: string | null;
  customerId?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  search?: string | null;
}

/** Filter / query params for listing opportunities */
export interface OpportunityListFilters {
  stage?: OpportunityStage[];
  tradingModel?: TradingModel[];
  priority?: InquiryPriority[];
  assignedTo?: string | null;
  customerId?: string | null;
  minValue?: number | null;
  maxValue?: number | null;
  currency?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  search?: string | null;
}

/** Filter / query params for listing quotes */
export interface QuoteListFilters {
  status?: QuoteStatus[];
  opportunityId?: string | null;
  customerId?: string | null;
  currency?: string | null;
  minValue?: number | null;
  maxValue?: number | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  search?: string | null;
}

/** Transition event for status changes */
export interface StatusTransition {
  from: string;
  to: string;
  triggeredBy?: string | null;
  reason?: string | null;
  timestamp: string;
}

/** Notification payload for real-time updates */
export interface TradingNotification {
  id: string;
  type:
    | "inquiry_received"
    | "extraction_complete"
    | "extraction_needs_review"
    | "rfq_sent"
    | "rfq_response_received"
    | "quote_generated"
    | "quote_approved"
    | "quote_sent"
    | "quote_accepted"
    | "quote_rejected"
    | "follow_up_scheduled"
    | "follow_up_sent"
    | "opportunity_stage_changed"
    | "job_failed";
  entityType: string;
  entityId: string;
  companyId: string;
  recipientId?: string | null;
  title: string;
  body?: string | null;
  actionUrl?: string | null;
  metadata?: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: string;
}

/** Webhook payload for external integrations */
export interface WebhookPayload {
  id: string;
  event: string;
  entityType: string;
  entityId: string;
  companyId: string;
  data: Record<string, unknown>;
  createdAt: string;
  signature?: string | null;
}

/** Configuration for the extraction pipeline */
export interface ExtractionConfig {
  companyId: string;
  modelId: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string | null;
  enabledFields: string[];
  confidenceThreshold: number;
  autoApproveThreshold: number;
  language?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Trading company configuration */
export interface TradingConfig {
  companyId: string;
  defaultCurrency: string;
  defaultIncoterms?: string | null;
  defaultPaymentTerms?: string | null;
  defaultLeadTimeDays?: number | null;
  defaultMarginPercent?: number | null;
  markupRules?: MarkupRule[] | null;
  approvalThresholds?: ApprovalThreshold[] | null;
  autoFollowUpDays?: number | null;
  quoteValidDays?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface MarkupRule {
  id: string;
  category?: string | null;
  minAmount?: number | null;
  maxAmount?: number | null;
  markupPercent: number;
  description?: string | null;
}

export interface ApprovalThreshold {
  id: string;
  role: string;
  maxQuoteAmount: number;
  currency: string;
  description?: string | null;
}
