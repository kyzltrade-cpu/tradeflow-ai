-- ============================================
-- 019: Inbox workspace + per-customer external search + pricing config
-- Safe to run multiple times (uses IF NOT EXISTS)
-- ============================================

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS contact_email TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS handoff_summary TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS external_search_enabled BOOLEAN DEFAULT false;

ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS pricing JSONB DEFAULT '{}'::jsonb;