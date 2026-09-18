-- Add WeChat Work integration fields to companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS wechat_work_secret TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS wechat_work_token TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS wechat_work_encoding_aes_key TEXT;
