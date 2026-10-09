-- ============================================
-- 031: Opportunity delivery locations
--
-- A buyer can order in one country but ask us to ship to one or more
-- different places (their own 3PL, a distributor, several end customers).
-- The single `destination TEXT` column could only ever hold one line, so
-- those orders were being forced into a note.
--
-- Stored as a JSONB array on opportunities so a tenant can add or remove
-- destinations without a schema change:
--   [
--     { "label": "Apex 3PL, Singapore", "address": "...", "quantity": "3,000 pcs", "contact": "..." }
--   ]
--
-- An empty array means "not specified yet" and is the safe default for
-- existing opportunities. `destination` stays the single-line summary used
-- in lists and quotes.
-- Safe to run multiple times (uses IF NOT EXISTS).
-- ============================================

ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS delivery_locations JSONB DEFAULT '[]'::jsonb;