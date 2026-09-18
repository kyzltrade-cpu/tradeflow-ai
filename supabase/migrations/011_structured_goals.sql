-- Add structured goal columns (run manually in Supabase SQL Editor)
ALTER TABLE company_goals ADD COLUMN IF NOT EXISTS greeting TEXT;
ALTER TABLE company_goals ADD COLUMN IF NOT EXISTS flow_steps JSONB DEFAULT '[]'::jsonb;
ALTER TABLE company_goals ADD COLUMN IF NOT EXISTS handoff_message TEXT;

-- Add product photos column
ALTER TABLE products ADD COLUMN IF NOT EXISTS photos TEXT[] DEFAULT '{}';

-- Add chat widget toggle
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS chat_widget_enabled BOOLEAN DEFAULT true;

