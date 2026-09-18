-- Add Meta Cloud API fields to companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS whatsapp_phone_number_id TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS whatsapp_access_token TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS whatsapp_verify_token TEXT;
