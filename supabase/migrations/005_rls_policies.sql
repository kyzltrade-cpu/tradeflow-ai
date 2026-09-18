-- 005: Replace permissive RLS policies with company-scoped policies
-- The service role client bypasses RLS, so these policies only apply to
-- requests made with a user's auth token (e.g., via the anon key client).

-- Helper: get the company_id for the authenticated user
-- Used in USING and WITH CHECK clauses via subquery.

-- ============================================================
-- companies
-- ============================================================
DROP POLICY IF EXISTS "svc_companies" ON companies;

CREATE POLICY "users_read_own_company"
  ON companies FOR SELECT
  USING (
    id = (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "users_update_own_company"
  ON companies FOR UPDATE
  USING (
    id = (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    id = (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- ============================================================
-- products
-- ============================================================
DROP POLICY IF EXISTS "svc_products" ON products;

CREATE POLICY "users_select_own_products"
  ON products FOR SELECT
  USING (
    company_id = (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "users_insert_own_products"
  ON products FOR INSERT
  WITH CHECK (
    company_id = (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "users_update_own_products"
  ON products FOR UPDATE
  USING (
    company_id = (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    company_id = (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "users_delete_own_products"
  ON products FOR DELETE
  USING (
    company_id = (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- ============================================================
-- conversations
-- ============================================================
DROP POLICY IF EXISTS "svc_conversations" ON conversations;

CREATE POLICY "users_select_own_conversations"
  ON conversations FOR SELECT
  USING (
    company_id = (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "users_insert_own_conversations"
  ON conversations FOR INSERT
  WITH CHECK (
    company_id = (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "users_update_own_conversations"
  ON conversations FOR UPDATE
  USING (
    company_id = (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    company_id = (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "users_delete_own_conversations"
  ON conversations FOR DELETE
  USING (
    company_id = (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- ============================================================
-- messages (scoped via conversation → company)
-- ============================================================
DROP POLICY IF EXISTS "svc_messages" ON messages;

CREATE POLICY "users_select_own_messages"
  ON messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT c.id FROM conversations c
      JOIN users u ON u.company_id = c.company_id
      WHERE u.id = auth.uid()
    )
  );

CREATE POLICY "users_insert_own_messages"
  ON messages FOR INSERT
  WITH CHECK (
    conversation_id IN (
      SELECT c.id FROM conversations c
      JOIN users u ON u.company_id = c.company_id
      WHERE u.id = auth.uid()
    )
  );

CREATE POLICY "users_delete_own_messages"
  ON messages FOR DELETE
  USING (
    conversation_id IN (
      SELECT c.id FROM conversations c
      JOIN users u ON u.company_id = c.company_id
      WHERE u.id = auth.uid()
    )
  );

-- ============================================================
-- faq_rules
-- ============================================================
DROP POLICY IF EXISTS "svc_faq_rules" ON faq_rules;

CREATE POLICY "users_select_own_faq_rules"
  ON faq_rules FOR SELECT
  USING (
    company_id = (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "users_insert_own_faq_rules"
  ON faq_rules FOR INSERT
  WITH CHECK (
    company_id = (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "users_update_own_faq_rules"
  ON faq_rules FOR UPDATE
  USING (
    company_id = (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    company_id = (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "users_delete_own_faq_rules"
  ON faq_rules FOR DELETE
  USING (
    company_id = (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- ============================================================
-- users (each user can only see their own row)
-- ============================================================
DROP POLICY IF EXISTS "svc_users" ON users;

CREATE POLICY "users_select_own_profile"
  ON users FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "users_update_own_profile"
  ON users FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ============================================================
-- knowledge_base
-- ============================================================
DROP POLICY IF EXISTS "svc_knowledge_base" ON knowledge_base;

CREATE POLICY "users_select_own_kb"
  ON knowledge_base FOR SELECT
  USING (
    company_id = (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "users_insert_own_kb"
  ON knowledge_base FOR INSERT
  WITH CHECK (
    company_id = (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "users_update_own_kb"
  ON knowledge_base FOR UPDATE
  USING (
    company_id = (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    company_id = (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "users_delete_own_kb"
  ON knowledge_base FOR DELETE
  USING (
    company_id = (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- ============================================================
-- company_settings
-- ============================================================
DROP POLICY IF EXISTS "svc_company_settings" ON company_settings;

CREATE POLICY "users_select_own_settings"
  ON company_settings FOR SELECT
  USING (
    company_id = (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "users_insert_own_settings"
  ON company_settings FOR INSERT
  WITH CHECK (
    company_id = (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "users_update_own_settings"
  ON company_settings FOR UPDATE
  USING (
    company_id = (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    company_id = (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "users_delete_own_settings"
  ON company_settings FOR DELETE
  USING (
    company_id = (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );
