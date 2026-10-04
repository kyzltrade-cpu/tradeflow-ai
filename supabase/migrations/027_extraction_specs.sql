-- ============================================
-- 027: Tenant-defined AI extraction fields
--
-- Lets each company declare which specs it wants the AI to pull out of
-- every inbound buyer email, beyond the built-in rows (quantity, product,
-- material/size, logo/printing, incoterm, target price, timeline).
--
-- Stored as a JSONB array on company_settings so no schema change is
-- needed when a tenant adds or renames a field:
--   [{ "key": "packaging", "label": "Packaging", "hint": "inner box, gift box" }]
--
-- `key` is the machine name the model echoes back; `label` is what the
-- buyer sees in the Specs pod; `hint` is optional guidance for the model
-- (synonyms, acceptable formats). An empty array means "built-ins only",
-- which is the safe default for existing tenants.
-- Safe to run multiple times (uses IF NOT EXISTS).
-- ============================================

ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS extraction_specs JSONB DEFAULT '[]'::jsonb;