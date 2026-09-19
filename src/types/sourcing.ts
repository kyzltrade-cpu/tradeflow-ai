/**
 * Sourcing Module Types
 *
 * Full sourcing lifecycle: discovery -> scoring -> verification -> RFQ -> ranking -> shortlist -> approval
 *
 * CRITICAL: Online discovery is NOT supplier verification.
 * Every claim must have evidence. Verification is a multi-tier progression.
 */

// ── Verification Tiers ──────────────────────────────────────────────────────

export type VerificationTier =
  | "public_lead"
  | "document_reviewed"
  | "supplier_responded"
  | "reference_checked"
  | "third_party_audit"
  | "site_visit"
  | "approved_for_order";

export const VERIFICATION_TIER_ORDER: VerificationTier[] = [
  "public_lead",
  "document_reviewed",
  "supplier_responded",
  "reference_checked",
  "third_party_audit",
  "site_visit",
  "approved_for_order",
];

export const VERIFICATION_TIER_LABELS: Record<VerificationTier, string> = {
  public_lead: "Public Lead",
  document_reviewed: "Document Reviewed",
  supplier_responded: "Supplier Responded",
  reference_checked: "Reference Checked",
  third_party_audit: "Third-Party Audit",
  site_visit: "Site Visit",
  approved_for_order: "Approved for Order",
};

// ── Discovery Sources ───────────────────────────────────────────────────────

export type DiscoverySource =
  | "alibaba"
  | "global_sources"
  | "hktdc_sourcing"
  | "made_in_china"
  | "indiamart"
  | "thomas_net"
  | "company_website"
  | "trade_directory"
  | "referral"
  | "manual"
  | "other";

// ── Scoring ─────────────────────────────────────────────────────────────────

export type ScoreDimension =
  | "product_fit"
  | "moq_alignment"
  | "price_competitive"
  | "lead_time"
  | "certifications"
  | "location"
  | "capacity"
  | "communication"
  | "track_record";

export interface SupplierScore {
  dimension: ScoreDimension;
  score: number;
  weight: number;
  evidence: string;
  sourceUrl?: string;
  sourceDate: string;
}

export interface SupplierScorecard {
  supplierId: string;
  overallScore: number;
  scores: SupplierScore[];
  recommendation: "recommend" | "conditional" | "not_recommended";
  reasoning: string;
  generatedAt: string;
}

// ── Evidence ────────────────────────────────────────────────────────────────

export type EvidenceType =
  | "webpage_screenshot"
  | "webpage_text"
  | "document"
  | "email"
  | "certificate"
  | "audit_report"
  | "photo"
  | "video"
  | "reference_call"
  | "site_visit_notes";

export interface SupplierEvidence {
  id: string;
  supplierId: string;
  type: EvidenceType;
  title: string;
  content: string;
  sourceUrl?: string;
  sourceDate: string;
  collectedBy: string;
  fileUrl?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

// ── Discovered Supplier ─────────────────────────────────────────────────────

export interface DiscoveredSupplier {
  id: string;
  companyId: string;
  opportunityId?: string | null;
  name: string;
  tradeName?: string | null;
  country: string;
  city?: string | null;
  website?: string | null;
  description?: string | null;
  discoverySource: DiscoverySource;
  discoveryUrl: string;
  discoveryQuery: string;
  discoveryDate: string;
  productMatch: string;
  moq?: number | null;
  moqUnit?: string | null;
  priceRange?: string | null;
  priceCurrency?: string | null;
  leadTimeDays?: number | null;
  capacity?: string | null;
  certifications: string[];
  yearsInBusiness?: number | null;
  employees?: string | null;
  factorySize?: string | null;
  exportExperience?: string | null;
  verificationTier: VerificationTier;
  verificationNotes?: string | null;
  scorecard?: SupplierScorecard | null;
  status: "discovered" | "shortlisted" | "rfq_sent" | "responded" | "selected" | "rejected" | "on_hold";
  rank?: number | null;
  rankReasoning?: string | null;
  tags: string[];
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Sourcing Search ─────────────────────────────────────────────────────────

export interface SourcingSearchQuery {
  productName: string;
  specifications?: string;
  quantity?: number;
  unit?: string;
  targetPrice?: number;
  targetPriceCurrency?: string;
  requiredCerts?: string[];
  preferredCountries?: string[];
  maxLeadTimeDays?: number;
  minMoq?: number;
  maxMoq?: number;
}

export interface SourcingSearchResult {
  query: SourcingSearchQuery;
  suppliers: DiscoveredSupplier[];
  searchSources: Array<{ source: DiscoverySource; url: string; resultCount: number }>;
  totalResults: number;
  searchedAt: string;
}

// ── Shortlist ───────────────────────────────────────────────────────────────

export interface SourcingShortlist {
  id: string;
  companyId: string;
  opportunityId: string;
  name: string;
  suppliers: DiscoveredSupplier[];
  rankings: SourcingRanking[];
  status: "draft" | "submitted" | "approved" | "rejected";
  approvedBy?: string | null;
  approvedAt?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SourcingRanking {
  supplierId: string;
  rank: number;
  scorecard: SupplierScorecard;
  tradeoffs: string;
  recommendation: string;
  rankedAt: string;
  rankedBy: string;
}

// ── RFQ to Discovered Supplier ──────────────────────────────────────────────

export interface SourcingRfq {
  id: string;
  companyId: string;
  discoveredSupplierId: string;
  opportunityId?: string | null;
  status: "draft" | "sent" | "responded" | "expired" | "cancelled";
  subject: string;
  messageBody: string;
  requirements: string;
  quantity?: number | null;
  unit?: string | null;
  targetPrice?: number | null;
  targetPriceCurrency?: string | null;
  deadline?: string | null;
  sentAt?: string | null;
  respondedAt?: string | null;
  responseNotes?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Sample / Inspection ─────────────────────────────────────────────────────

export type VerificationAction =
  | "sample_requested"
  | "sample_received"
  | "sample_approved"
  | "sample_rejected"
  | "inspection_scheduled"
  | "inspection_completed"
  | "factory_visit_scheduled"
  | "factory_visit_completed"
  | "reference_contacted"
  | "reference_verified";

export interface SupplierVerificationAction {
  id: string;
  supplierId: string;
  action: VerificationAction;
  description: string;
  outcome?: string | null;
  evidence?: SupplierEvidence | null;
  scheduledDate?: string | null;
  completedDate?: string | null;
  performedBy: string;
  createdAt: string;
}
