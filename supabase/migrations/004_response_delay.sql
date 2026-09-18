-- Add response delay setting to company_settings
-- Default 3 seconds (realistic typing delay for a human)

ALTER TABLE company_settings
ADD COLUMN IF NOT EXISTS response_delay_seconds INTEGER DEFAULT 3;

COMMENT ON COLUMN company_settings.response_delay_seconds IS 'Seconds to wait before sending AI reply (simulates human typing)';
