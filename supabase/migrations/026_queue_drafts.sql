-- ============================================
-- 026: Editable AI email drafts for queue approvals
--
-- One draft per queue item, per tenant. Keyed by the queue item key
-- (e.g. "quote-<uuid>", "conv-<uuid>", "fu-<uuid>") rather than a
-- foreign key, because the queue spans three tables (quotes,
-- conversations, follow_ups) and none of them share a natural parent.
--
-- The generated body is written on first open of a row's approval panel;
-- a human edit overwrites it in place so refresh never loses work.
-- Safe to run multiple times (uses IF NOT EXISTS).
-- ============================================

CREATE TABLE IF NOT EXISTS public.queue_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  queue_item_key TEXT NOT NULL,
  item_kind TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  -- 'ai' | 'template' | 'human'. A human edit is recorded as 'human' so the UI
  -- never implies the model vetted the current text.
  source TEXT NOT NULL DEFAULT 'ai',
  model TEXT,
  edited BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, queue_item_key)
);

CREATE INDEX IF NOT EXISTS idx_queue_drafts_company
  ON public.queue_drafts (company_id, updated_at DESC);

-- Tenant isolation, matching the uniform pattern in 022.
ALTER TABLE public.queue_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON public.queue_drafts;
CREATE POLICY tenant_isolation ON public.queue_drafts
  FOR ALL TO authenticated
  USING (company_id = (SELECT company_id FROM public.users WHERE id = (SELECT auth.uid())))
  WITH CHECK (company_id = (SELECT company_id FROM public.users WHERE id = (SELECT auth.uid())));
