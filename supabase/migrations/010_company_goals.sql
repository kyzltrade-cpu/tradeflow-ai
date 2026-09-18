-- Company goals for AI behavior
CREATE TABLE IF NOT EXISTS company_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_company_goals_company ON company_goals(company_id);

ALTER TABLE company_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "svc_company_goals" ON company_goals FOR ALL USING (true) WITH CHECK (true);
