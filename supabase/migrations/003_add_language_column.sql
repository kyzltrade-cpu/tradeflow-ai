-- Add detected_language column to conversations

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS detected_language TEXT DEFAULT 'en';
