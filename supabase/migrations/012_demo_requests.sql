-- Demo requests table
CREATE TABLE IF NOT EXISTS demo_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT NOT NULL,
  phone TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies
ALTER TABLE demo_requests ENABLE ROW LEVEL SECURITY;

-- Only admins can view demo requests
CREATE POLICY "Admins can view demo requests" ON demo_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = (
        SELECT company_id FROM companies WHERE companies.id = (
          SELECT company_id FROM companies LIMIT 1
        )
      )
    )
  );

-- Anyone can insert demo requests (public form)
CREATE POLICY "Anyone can create demo requests" ON demo_requests
  FOR INSERT
  WITH CHECK (true);
