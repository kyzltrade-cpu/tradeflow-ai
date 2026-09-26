-- Add plan column to companies for self-serve trial gating.
-- 'trial' is the default for new self-serve signups; billing webhooks
-- flip it to the purchased tier once a subscription is active.
ALTER TABLE companies ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'trial';
UPDATE companies SET plan = 'trial' WHERE plan IS NULL OR plan = '';
CREATE INDEX IF NOT EXISTS idx_companies_plan ON companies(plan);