-- ============================================================
-- 20. Price source hyperlinks
-- Where a product's price lives so the inbox price suggestion
-- badges can hyperlink to the real page (Excel file or website).
-- ============================================================

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS source_url TEXT;

ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS website TEXT;