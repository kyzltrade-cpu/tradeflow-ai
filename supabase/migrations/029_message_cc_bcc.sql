-- Cc / Bcc were accepted by the composer and handed to Resend, but never
-- written to the message row: the sent-message record showed only
-- recipient_email, so the audit trail could not say who else received a quote.
-- Nullable arrays so existing rows need no backfill.
ALTER TABLE messages ADD COLUMN IF NOT EXISTS cc TEXT[] DEFAULT '{}'::text[];
ALTER TABLE messages ADD COLUMN IF NOT EXISTS bcc TEXT[] DEFAULT '{}'::text[];
