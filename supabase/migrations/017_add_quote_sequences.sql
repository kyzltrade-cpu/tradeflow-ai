-- Fix: Add missing quote_sequences table (referenced by quote-generator.ts)
-- and align code column names with migration 016 schema

-- ============================================================
-- 1. QUOTE SEQUENCES (missing from 016)
-- ============================================================

CREATE TABLE IF NOT EXISTS quote_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  next_number INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, year)
);

ALTER TABLE quote_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quote_sequences_tenant_isolated" ON quote_sequences
  FOR ALL USING (company_id = current_setting('app.current_company_id')::uuid)
  WITH CHECK (company_id = current_setting('app.current_company_id')::uuid);

CREATE INDEX IF NOT EXISTS idx_quote_sequences_company_year
  ON quote_sequences(company_id, year);
