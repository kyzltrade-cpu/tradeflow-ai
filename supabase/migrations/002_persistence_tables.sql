-- TradeFlow AI — Additional tables for persistence
-- Run this in Supabase SQL Editor

-- Knowledge base documents
CREATE TABLE IF NOT EXISTS knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'text',
  content TEXT NOT NULL,
  file_size TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Company settings (system prompt, etc)
CREATE TABLE IF NOT EXISTS company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE UNIQUE,
  system_prompt TEXT,
  industry TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add keywords column to faq_rules
ALTER TABLE faq_rules ADD COLUMN IF NOT EXISTS keywords TEXT[] DEFAULT '{}';

-- Add bookmarked status support to conversations
-- (status can be: active, human, bookmarked)

CREATE INDEX IF NOT EXISTS idx_knowledge_base_company ON knowledge_base(company_id);
CREATE INDEX IF NOT EXISTS idx_company_settings_company ON company_settings(company_id);

ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "svc_knowledge_base" ON knowledge_base FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "svc_company_settings" ON company_settings FOR ALL USING (true) WITH CHECK (true);
