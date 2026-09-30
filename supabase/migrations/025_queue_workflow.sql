-- ============================================================
-- 025: Queue workflow — send gate, approval versioning, RFQ loop,
--      line-evidence, follow-up auto-send toggle.
-- Additive only (IF NOT EXISTS); safe to run repeatedly.
-- ============================================================

-- ── Quotes: approval/gate tracking + owner force-send audit ────────────────
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS approval_version INTEGER,
  ADD COLUMN IF NOT EXISTS approval_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS checks_verified JSONB,
  ADD COLUMN IF NOT EXISTS force_sent BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS force_sent_by UUID,
  ADD COLUMN IF NOT EXISTS force_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS force_sent_reason TEXT;

-- ── Quote line items: per-line match + evidence + cost/margin basis ────────
ALTER TABLE public.quote_line_items
  ADD COLUMN IF NOT EXISTS match_status TEXT NOT NULL DEFAULT 'unmatched',
  ADD COLUMN IF NOT EXISTS cost_price NUMERIC,
  ADD COLUMN IF NOT EXISTS margin_pct NUMERIC,
  ADD COLUMN IF NOT EXISTS evidence_type TEXT,
  ADD COLUMN IF NOT EXISTS evidence JSONB,
  ADD COLUMN IF NOT EXISTS currency_rules JSONB;

-- ── Quote approvals: bind the approval to the exact quote version it saw ───
ALTER TABLE public.quote_approvals
  ADD COLUMN IF NOT EXISTS quote_version INTEGER,
  ADD COLUMN IF NOT EXISTS amount_at_approval NUMERIC,
  ADD COLUMN IF NOT EXISTS margin_pct_at_approval NUMERIC,
  ADD COLUMN IF NOT EXISTS recipient_at_approval TEXT,
  ADD COLUMN IF NOT EXISTS checks_at_approval JSONB,
  ADD COLUMN IF NOT EXISTS invalidated BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS invalidated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS invalidated_reason TEXT;

-- ── Supplier RFQ loop: per-supplier reply state + outbound identity ────────
ALTER TABLE public.supplier_rfqs
  ADD COLUMN IF NOT EXISTS thread_id TEXT,
  ADD COLUMN IF NOT EXISTS recipient_email TEXT,
  ADD COLUMN IF NOT EXISTS sent_by UUID,
  ADD COLUMN IF NOT EXISTS last_reply_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reply_status TEXT NOT NULL DEFAULT 'awaiting',
  ADD COLUMN IF NOT EXISTS workflow_meta JSONB;

-- ── Supplier quotes: parse quality + versioning (never silently pick) ──────
ALTER TABLE public.supplier_quotes
  ADD COLUMN IF NOT EXISTS parse_status TEXT NOT NULL DEFAULT 'parsed',
  ADD COLUMN IF NOT EXISTS parse_reason TEXT,
  ADD COLUMN IF NOT EXISTS version_number INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS superseded_by UUID,
  ADD COLUMN IF NOT EXISTS superseded_at TIMESTAMPTZ;

-- ── Companies: follow-up auto-send is a per-firm opt-in, default OFF ───────
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS follow_up_auto_send BOOLEAN NOT NULL DEFAULT false;

-- ── Indexes ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_quotes_company_status
  ON public.quotes(company_id, status);
CREATE INDEX IF NOT EXISTS idx_rfqs_company_reply
  ON public.supplier_rfqs(company_id, reply_status);
CREATE INDEX IF NOT EXISTS idx_approvals_quote_invalidated
  ON public.quote_approvals(quote_id, invalidated);
CREATE INDEX IF NOT EXISTS idx_line_items_quote_match
  ON public.quote_line_items(quote_id, match_status);