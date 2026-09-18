-- TradeFlow v2: Inquiry-to-Quote Trading Operations Schema
-- Extends existing tables and adds new ones for the full RFQ workflow

-- ============================================================
-- 1. EXTEND EXISTING TABLES
-- ============================================================

ALTER TABLE companies ADD COLUMN IF NOT EXISTS default_currency TEXT DEFAULT 'USD';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS default_language TEXT DEFAULT 'en';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS default_incoterm TEXT DEFAULT 'FOB';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS default_payment_terms TEXT DEFAULT 'T/T 30% deposit, 70% before shipment';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS minimum_margin_pct NUMERIC DEFAULT 15;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS quote_validity_days INTEGER DEFAULT 30;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS approval_threshold NUMERIC DEFAULT 10000;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS company_address TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS company_logo_url TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS email_domain TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS email_sender_name TEXT DEFAULT 'TradeFlow';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS inbound_email_enabled BOOLEAN DEFAULT FALSE;

ALTER TABLE products ADD COLUMN IF NOT EXISTS materials JSONB DEFAULT '[]'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS dimensions JSONB;
ALTER TABLE products ADD COLUMN IF NOT EXISTS tolerances JSONB;
ALTER TABLE products ADD COLUMN IF NOT EXISTS packaging_req TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS certifications JSONB DEFAULT '[]'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS sample_policy TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS default_lead_time_days INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS approved_suppliers JSONB DEFAULT '[]'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS price_currency TEXT DEFAULT 'USD';
ALTER TABLE products ADD COLUMN IF NOT EXISTS price_effective_date DATE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS price_expiry_date DATE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS last_supplier_confirmation DATE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS quote_assumptions TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS product_docs JSONB DEFAULT '[]'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS requirement_template JSONB;

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS opportunity_id UUID;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS estimated_value NUMERIC;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS product_summary TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS missing_info TEXT[];
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS owner_id UUID;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS next_action TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS next_action_due TIMESTAMPTZ;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS source_channel TEXT DEFAULT 'whatsapp';

-- ============================================================
-- 2. CUSTOMERS & CONTACTS
-- ============================================================

CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  legal_name TEXT NOT NULL,
  trading_name TEXT,
  email_domain TEXT,
  country TEXT,
  industry TEXT,
  currency TEXT DEFAULT 'USD',
  preferred_language TEXT DEFAULT 'en',
  notes TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  whatsapp TEXT,
  wechat_id TEXT,
  title TEXT,
  is_primary BOOLEAN DEFAULT FALSE,
  preferred_language TEXT DEFAULT 'en',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- ============================================================
-- 3. SUPPLIERS
-- ============================================================

CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  legal_name TEXT NOT NULL,
  trading_name TEXT,
  location TEXT,
  product_capabilities JSONB DEFAULT '[]'::jsonb,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  contact_wechat TEXT,
  contact_whatsapp TEXT,
  moq_notes TEXT,
  typical_lead_time_days INTEGER,
  payment_terms TEXT,
  certifications JSONB DEFAULT '[]'::jsonb,
  is_approved BOOLEAN DEFAULT FALSE,
  last_verification_date DATE,
  quality_notes TEXT,
  delivery_notes TEXT,
  performance_score NUMERIC,
  total_orders INTEGER DEFAULT 0,
  on_time_rate NUMERIC,
  quality_reject_rate NUMERIC,
  notes TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS supplier_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  doc_type TEXT NOT NULL,
  file_url TEXT,
  content TEXT,
  file_type TEXT,
  file_size INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. INQUIRIES (unified intake)
-- ============================================================

CREATE TABLE IF NOT EXISTS inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  source_channel TEXT NOT NULL,
  provider_event_id TEXT UNIQUE,
  message_thread_id TEXT,
  received_at TIMESTAMPTZ DEFAULT NOW(),
  sender_name TEXT,
  sender_email TEXT,
  sender_phone TEXT,
  subject TEXT,
  original_message TEXT NOT NULL,
  raw_html TEXT,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  opportunity_id UUID,
  processing_status TEXT DEFAULT 'RECEIVED',
  error_message TEXT,
  assigned_owner UUID,
  detected_language TEXT,
  priority TEXT DEFAULT 'normal',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. INQUIRY ATTACHMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS inquiry_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  storage_path TEXT,
  content_hash TEXT,
  extracted_text TEXT,
  extracted_tables JSONB,
  extraction_status TEXT DEFAULT 'pending',
  extraction_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 6. EXTRACTION RUNS & EXTRACTED FIELDS
-- ============================================================

CREATE TABLE IF NOT EXISTS extraction_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  model_used TEXT,
  prompt_version TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  raw_response JSONB,
  status TEXT DEFAULT 'running',
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS extracted_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  extraction_run_id UUID NOT NULL REFERENCES extraction_runs(id) ON DELETE CASCADE,
  inquiry_id UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  field_value TEXT,
  confidence NUMERIC,
  source_location TEXT,
  status TEXT DEFAULT 'EXTRACTED',
  human_confirmation_required BOOLEAN DEFAULT TRUE,
  custom_field BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 7. OPPORTUNITIES
-- ============================================================

CREATE TABLE IF NOT EXISTS opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  inquiry_id UUID REFERENCES inquiries(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  stage TEXT DEFAULT 'NEW',
  trading_model TEXT DEFAULT 'principal',
  product_category TEXT,
  product_name TEXT,
  estimated_order_value NUMERIC,
  currency TEXT DEFAULT 'USD',
  expected_margin_pct NUMERIC,
  country TEXT,
  destination TEXT,
  required_delivery_date DATE,
  owner_id UUID,
  priority TEXT DEFAULT 'normal',
  next_action TEXT,
  next_action_due TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ,
  quote_status TEXT,
  lost_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- ============================================================
-- 8. SUPPLIER RFQs
-- ============================================================

CREATE TABLE IF NOT EXISTS supplier_rfqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  rfq_number TEXT,
  status TEXT DEFAULT 'DRAFT',
  language TEXT DEFAULT 'en',
  subject TEXT,
  message_body TEXT,
  shared_fields JSONB DEFAULT '[]'::jsonb,
  redacted_fields JSONB DEFAULT '[]'::jsonb,
  supplier_questions TEXT,
  response_deadline TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 9. SUPPLIER QUOTES
-- ============================================================

CREATE TABLE IF NOT EXISTS supplier_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  supplier_rfq_id UUID NOT NULL REFERENCES supplier_rfqs(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  opportunity_id UUID REFERENCES opportunities(id) ON DELETE SET NULL,
  unit_price NUMERIC,
  currency TEXT DEFAULT 'USD',
  moq INTEGER,
  quantity_breaks JSONB DEFAULT '[]'::jsonb,
  tooling_cost NUMERIC DEFAULT 0,
  sample_cost NUMERIC DEFAULT 0,
  packaging_cost NUMERIC DEFAULT 0,
  production_lead_time_days INTEGER,
  payment_terms TEXT,
  incoterm TEXT,
  freight_assumptions TEXT,
  quote_validity_days INTEGER,
  certifications JSONB DEFAULT '[]'::jsonb,
  warranty_terms TEXT,
  exclusions TEXT,
  notes TEXT,
  source_type TEXT DEFAULT 'email',
  source_file_url TEXT,
  extracted_raw TEXT,
  confidence NUMERIC,
  is_selected BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'received',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 10. QUOTES (customer-facing)
-- ============================================================

CREATE TABLE IF NOT EXISTS quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  quote_number TEXT,
  status TEXT DEFAULT 'DRAFT',
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  currency TEXT DEFAULT 'USD',
  incoterm TEXT,
  payment_terms TEXT,
  delivery_terms TEXT,
  validity_days INTEGER DEFAULT 30,
  valid_until DATE,
  notes TEXT,
  internal_notes TEXT,
  terms_and_conditions TEXT,
  total_amount NUMERIC DEFAULT 0,
  total_cost NUMERIC DEFAULT 0,
  total_margin NUMERIC DEFAULT 0,
  margin_pct NUMERIC DEFAULT 0,
  selected_supplier_quote_id UUID REFERENCES supplier_quotes(id) ON DELETE SET NULL,
  current_version INTEGER DEFAULT 1,
  created_by UUID,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  customer_replied_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 11. QUOTE LINE ITEMS & COST COMPONENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS quote_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  description TEXT,
  quantity NUMERIC NOT NULL,
  unit TEXT DEFAULT 'pcs',
  unit_price NUMERIC NOT NULL,
  total_price NUMERIC NOT NULL,
  specs JSONB,
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quote_cost_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  component_name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'USD',
  source TEXT DEFAULT 'manual',
  source_entity_type TEXT,
  source_entity_id UUID,
  effective_date DATE,
  status TEXT DEFAULT 'estimated',
  assumption_note TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 12. QUOTE VERSIONS & APPROVALS
-- ============================================================

CREATE TABLE IF NOT EXISTS quote_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  snapshot JSONB NOT NULL,
  change_summary TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quote_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  approver_id UUID NOT NULL,
  status TEXT DEFAULT 'pending',
  comments TEXT,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 13. FOLLOW-UP SEQUENCES
-- ============================================================

CREATE TABLE IF NOT EXISTS follow_up_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'active',
  channel TEXT DEFAULT 'email',
  created_by UUID,
  paused_by UUID,
  paused_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS follow_up_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID NOT NULL REFERENCES follow_up_sequences(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  delay_days INTEGER NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'scheduled',
  message_type TEXT DEFAULT 'check_in',
  subject TEXT,
  message_body TEXT,
  sent_at TIMESTAMPTZ,
  cancelled_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 14. PRODUCT REQUIREMENT TEMPLATES
-- ============================================================

CREATE TABLE IF NOT EXISTS product_requirement_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  template_name TEXT NOT NULL,
  required_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 15. WORKFLOW JOBS (async processing)
-- ============================================================

CREATE TABLE IF NOT EXISTS workflow_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  status TEXT DEFAULT 'pending',
  attempt_count INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  last_error TEXT,
  retry_after TIMESTAMPTZ,
  payload JSONB,
  result JSONB,
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- ============================================================
-- 16. AUDIT EVENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  actor_id UUID,
  actor_email TEXT,
  changes JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 17. DOCUMENTS (general file storage)
-- ============================================================

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  doc_type TEXT NOT NULL,
  file_url TEXT,
  storage_path TEXT,
  content TEXT,
  file_type TEXT,
  file_size INTEGER,
  extraction_status TEXT DEFAULT 'pending',
  source_references JSONB DEFAULT '[]'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 18. INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_inquiries_company ON inquiries(company_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries(processing_status);
CREATE INDEX IF NOT EXISTS idx_inquiries_received ON inquiries(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_inquiry_attachments_inquiry ON inquiry_attachments(inquiry_id);
CREATE INDEX IF NOT EXISTS idx_extracted_fields_inquiry ON extracted_fields(inquiry_id);
CREATE INDEX IF NOT EXISTS idx_extracted_fields_name ON extracted_fields(field_name);
CREATE INDEX IF NOT EXISTS idx_opportunities_company ON opportunities(company_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_stage ON opportunities(stage);
CREATE INDEX IF NOT EXISTS idx_opportunities_owner ON opportunities(owner_id);
CREATE INDEX IF NOT EXISTS idx_supplier_rfqs_opportunity ON supplier_rfqs(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_supplier_rfqs_supplier ON supplier_rfqs(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_quotes_rfq ON supplier_quotes(supplier_rfq_id);
CREATE INDEX IF NOT EXISTS idx_supplier_quotes_opportunity ON supplier_quotes(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_quotes_company ON quotes(company_id);
CREATE INDEX IF NOT EXISTS idx_quotes_opportunity ON quotes(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quote_line_items_quote ON quote_line_items(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_cost_components_quote ON quote_cost_components(quote_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_sequences_opportunity ON follow_up_sequences(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_items_sequence ON follow_up_items(sequence_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_items_scheduled ON follow_up_items(scheduled_for) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_workflow_jobs_status ON workflow_jobs(status) WHERE status IN ('pending', 'retrying');
CREATE INDEX IF NOT EXISTS idx_workflow_jobs_idempotency ON workflow_jobs(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_audit_events_entity ON audit_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_company ON audit_events(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customers_company ON customers(company_id);
CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_contacts_customer ON contacts(customer_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_company ON suppliers(company_id);
CREATE INDEX IF NOT EXISTS idx_documents_company ON documents(company_id);
CREATE INDEX IF NOT EXISTS idx_extraction_runs_inquiry ON extraction_runs(inquiry_id);

-- ============================================================
-- 19. RLS POLICIES
-- ============================================================

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiry_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE extraction_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE extracted_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_rfqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_cost_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_up_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_up_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_requirement_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any, then create fresh
DO $$ BEGIN
  -- Customers
  DROP POLICY IF EXISTS "tenant_isolated" ON customers;
  CREATE POLICY "tenant_isolated" ON customers FOR ALL USING (company_id = current_setting('app.current_company_id')::uuid);
  
  -- Contacts
  DROP POLICY IF EXISTS "tenant_isolated" ON contacts;
  CREATE POLICY "tenant_isolated" ON contacts FOR ALL USING (company_id = current_setting('app.current_company_id')::uuid);
  
  -- Suppliers
  DROP POLICY IF EXISTS "tenant_isolated" ON suppliers;
  CREATE POLICY "tenant_isolated" ON suppliers FOR ALL USING (company_id = current_setting('app.current_company_id')::uuid);
  
  -- Supplier documents
  DROP POLICY IF EXISTS "tenant_isolated" ON supplier_documents;
  CREATE POLICY "tenant_isolated" ON supplier_documents FOR ALL USING (company_id = current_setting('app.current_company_id')::uuid);
  
  -- Inquiries
  DROP POLICY IF EXISTS "tenant_isolated" ON inquiries;
  CREATE POLICY "tenant_isolated" ON inquiries FOR ALL USING (company_id = current_setting('app.current_company_id')::uuid);
  
  -- Inquiry attachments
  DROP POLICY IF EXISTS "tenant_isolated" ON inquiry_attachments;
  CREATE POLICY "tenant_isolated" ON inquiry_attachments FOR ALL USING (company_id = current_setting('app.current_company_id')::uuid);
  
  -- Extraction runs
  DROP POLICY IF EXISTS "tenant_isolated" ON extraction_runs;
  CREATE POLICY "tenant_isolated" ON extraction_runs FOR ALL USING (company_id = current_setting('app.current_company_id')::uuid);
  
  -- Extracted fields
  DROP POLICY IF EXISTS "tenant_isolated" ON extracted_fields;
  CREATE POLICY "tenant_isolated" ON extracted_fields FOR ALL USING (company_id = current_setting('app.current_company_id')::uuid);
  
  -- Opportunities
  DROP POLICY IF EXISTS "tenant_isolated" ON opportunities;
  CREATE POLICY "tenant_isolated" ON opportunities FOR ALL USING (company_id = current_setting('app.current_company_id')::uuid);
  
  -- Supplier RFQs
  DROP POLICY IF EXISTS "tenant_isolated" ON supplier_rfqs;
  CREATE POLICY "tenant_isolated" ON supplier_rfqs FOR ALL USING (company_id = current_setting('app.current_company_id')::uuid);
  
  -- Supplier quotes
  DROP POLICY IF EXISTS "tenant_isolated" ON supplier_quotes;
  CREATE POLICY "tenant_isolated" ON supplier_quotes FOR ALL USING (company_id = current_setting('app.current_company_id')::uuid);
  
  -- Quotes
  DROP POLICY IF EXISTS "tenant_isolated" ON quotes;
  CREATE POLICY "tenant_isolated" ON quotes FOR ALL USING (company_id = current_setting('app.current_company_id')::uuid);
  
  -- Quote line items
  DROP POLICY IF EXISTS "tenant_isolated" ON quote_line_items;
  CREATE POLICY "tenant_isolated" ON quote_line_items FOR ALL USING (company_id = current_setting('app.current_company_id')::uuid);
  
  -- Quote cost components
  DROP POLICY IF EXISTS "tenant_isolated" ON quote_cost_components;
  CREATE POLICY "tenant_isolated" ON quote_cost_components FOR ALL USING (company_id = current_setting('app.current_company_id')::uuid);
  
  -- Quote versions
  DROP POLICY IF EXISTS "tenant_isolated" ON quote_versions;
  CREATE POLICY "tenant_isolated" ON quote_versions FOR ALL USING (company_id = current_setting('app.current_company_id')::uuid);
  
  -- Quote approvals
  DROP POLICY IF EXISTS "tenant_isolated" ON quote_approvals;
  CREATE POLICY "tenant_isolated" ON quote_approvals FOR ALL USING (company_id = current_setting('app.current_company_id')::uuid);
  
  -- Follow-up sequences
  DROP POLICY IF EXISTS "tenant_isolated" ON follow_up_sequences;
  CREATE POLICY "tenant_isolated" ON follow_up_sequences FOR ALL USING (company_id = current_setting('app.current_company_id')::uuid);
  
  -- Follow-up items
  DROP POLICY IF EXISTS "tenant_isolated" ON follow_up_items;
  CREATE POLICY "tenant_isolated" ON follow_up_items FOR ALL USING (company_id = current_setting('app.current_company_id')::uuid);
  
  -- Product requirement templates
  DROP POLICY IF EXISTS "tenant_isolated" ON product_requirement_templates;
  CREATE POLICY "tenant_isolated" ON product_requirement_templates FOR ALL USING (company_id = current_setting('app.current_company_id')::uuid);
  
  -- Workflow jobs
  DROP POLICY IF EXISTS "tenant_isolated" ON workflow_jobs;
  CREATE POLICY "tenant_isolated" ON workflow_jobs FOR ALL USING (company_id = current_setting('app.current_company_id')::uuid);
  
  -- Audit events
  DROP POLICY IF EXISTS "tenant_isolated" ON audit_events;
  CREATE POLICY "tenant_isolated" ON audit_events FOR ALL USING (company_id = current_setting('app.current_company_id')::uuid);
  
  -- Documents
  DROP POLICY IF EXISTS "tenant_isolated" ON documents;
  CREATE POLICY "tenant_isolated" ON documents FOR ALL USING (company_id = current_setting('app.current_company_id')::uuid);
END $$;

-- ============================================================
-- 20. SEED DEFAULT REQUIREMENT TEMPLATES (run after creating a company)
-- ============================================================

-- The app clones these templates per-company on first login.
-- No seed INSERT needed here — the templates are hardcoded in the app.
