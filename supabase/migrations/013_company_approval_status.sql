-- Add status field to companies table for approval flow
ALTER TABLE companies ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'suspended'));

-- Set existing companies to approved
UPDATE companies SET status = 'approved' WHERE status IS NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);
