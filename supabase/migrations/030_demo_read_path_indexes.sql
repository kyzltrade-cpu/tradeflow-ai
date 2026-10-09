-- 030: indexes for the dashboard / demo read path.
--
-- Every route here reads through the service-role key, so RLS never narrows a
-- scan. These columns were being seq-scanned on each inbox load and each
-- thread open. Additive only -- safe to run against a live database.

CREATE INDEX IF NOT EXISTS idx_inquiries_conversation
  ON inquiries (conversation_id);

CREATE INDEX IF NOT EXISTS idx_opportunities_inquiry
  ON opportunities (inquiry_id);

CREATE INDEX IF NOT EXISTS idx_opportunities_company_customer
  ON opportunities (company_id, customer_id);

CREATE INDEX IF NOT EXISTS idx_opportunities_company_contact
  ON opportunities (company_id, contact_id);

CREATE INDEX IF NOT EXISTS idx_conversations_contact_email
  ON conversations (contact_email);

CREATE INDEX IF NOT EXISTS idx_conversations_opportunity
  ON conversations (opportunity_id);

CREATE INDEX IF NOT EXISTS idx_follow_up_sequences_company
  ON follow_up_sequences (company_id);

CREATE INDEX IF NOT EXISTS idx_quote_versions_quote
  ON quote_versions (quote_id);

-- resolveCompanyId() reads this on every authenticated request.
CREATE INDEX IF NOT EXISTS idx_users_company
  ON users (company_id);

-- outbound_messages is read on every inbox load but no migration creates it
-- yet, so only index it when the table is actually present.
DO $$
BEGIN
  IF to_regclass('public.outbound_messages') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_outbound_messages_company_conversation
      ON outbound_messages (company_id, conversation_id);
  END IF;
END $$;
