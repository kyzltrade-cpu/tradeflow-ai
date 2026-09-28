-- ============================================
-- 024: Full inbox — folders, read state, flags, subjects, outbound mail
-- Safe to run multiple times (uses IF NOT EXISTS)
-- ============================================

-- Conversations: subject line + folder + read/unread + flag
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS folder TEXT NOT NULL DEFAULT 'inbox';
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS flagged BOOLEAN NOT NULL DEFAULT false;

-- Backfill subject from the first outbound/inbound message if the thread has one.
UPDATE conversations SET subject = ms.subject
FROM (
  SELECT DISTINCT ON (conversation_id) conversation_id, subject
  FROM messages
  WHERE subject IS NOT NULL
  ORDER BY conversation_id, created_at ASC
) AS ms
WHERE conversations.subject IS NULL AND conversations.id = ms.conversation_id;

-- Messages: outbound mail metadata + per-message subject + attachment list
ALTER TABLE messages ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'received';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'delivered';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS sender_email TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS recipient_email TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachments JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Backfill thread subject onto messages that don't have their own.
UPDATE messages SET subject = c.subject
FROM conversations c
WHERE messages.conversation_id = c.id AND messages.subject IS NULL AND c.subject IS NOT NULL;

-- Indexes to keep the mailbox fast.
CREATE INDEX IF NOT EXISTS idx_conversations_company_folder
  ON conversations(company_id, folder, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_company_flagged
  ON conversations(company_id, flagged);
CREATE INDEX IF NOT EXISTS idx_conversations_company_read
  ON conversations(company_id, read_at);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
  ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_kind
  ON messages(conversation_id, kind);