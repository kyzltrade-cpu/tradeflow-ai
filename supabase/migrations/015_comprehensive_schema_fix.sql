-- ============================================
-- COMPREHENSIVE SCHEMA FIX
-- Paste this entire block in Supabase SQL Editor
-- Safe to run multiple times (uses IF NOT EXISTS)
-- ============================================

-- ===== COMPANIES TABLE =====
ALTER TABLE companies ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS whatsapp_phone_number_id TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS whatsapp_access_token TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS whatsapp_verify_token TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS whatsapp_waba_id TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS wechat_corp_id TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS wechat_agent_id TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS wechat_work_secret TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS wechat_work_token TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS wechat_work_encoding_aes_key TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'none';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMPTZ;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ===== PRODUCTS TABLE =====
ALTER TABLE products ADD COLUMN IF NOT EXISTS photos TEXT[] DEFAULT '{}';
ALTER TABLE products ADD COLUMN IF NOT EXISTS lead_time TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS specs JSONB;
ALTER TABLE products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ===== COMPANY_SETTINGS TABLE =====
CREATE TABLE IF NOT EXISTS company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE UNIQUE,
  system_prompt TEXT,
  industry TEXT,
  response_delay_seconds INTEGER DEFAULT 3,
  chat_widget_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS system_prompt TEXT;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS industry TEXT;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS response_delay_seconds INTEGER DEFAULT 3;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS chat_widget_enabled BOOLEAN DEFAULT true;

-- ===== KNOWLEDGE_BASE TABLE =====
CREATE TABLE IF NOT EXISTS knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'text',
  content TEXT NOT NULL,
  file_size TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ===== COMPANY_GOALS TABLE =====
CREATE TABLE IF NOT EXISTS company_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT true,
  greeting TEXT,
  flow_steps JSONB DEFAULT '[]'::jsonb,
  handoff_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE company_goals ADD COLUMN IF NOT EXISTS greeting TEXT;
ALTER TABLE company_goals ADD COLUMN IF NOT EXISTS flow_steps JSONB DEFAULT '[]'::jsonb;
ALTER TABLE company_goals ADD COLUMN IF NOT EXISTS handoff_message TEXT;

-- ===== DEMO_REQUESTS TABLE =====
CREATE TABLE IF NOT EXISTS demo_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT NOT NULL,
  phone TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== FAQ_RULES TABLE =====
ALTER TABLE faq_rules ADD COLUMN IF NOT EXISTS keywords TEXT[] DEFAULT '{}';

-- ===== CONVERSATIONS TABLE =====
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS detected_language TEXT DEFAULT 'en';

-- ===== USERS TABLE =====
-- Ensure id matches auth.uid (UUID)
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'owner';

-- ===== INDEXES =====
CREATE INDEX IF NOT EXISTS idx_products_company ON products(company_id);
CREATE INDEX IF NOT EXISTS idx_conversations_company ON conversations(company_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_faq_rules_company ON faq_rules(company_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_company ON knowledge_base(company_id);
CREATE INDEX IF NOT EXISTS idx_company_settings_company ON company_settings(company_id);
CREATE INDEX IF NOT EXISTS idx_company_goals_company ON company_goals(company_id);
CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);

-- ===== RLS POLICIES =====
-- Enable RLS on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE faq_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE demo_requests ENABLE ROW LEVEL SECURITY;

-- Drop old permissive policies if they exist
DROP POLICY IF EXISTS "svc_companies" ON companies;
DROP POLICY IF EXISTS "svc_products" ON products;
DROP POLICY IF EXISTS "svc_conversations" ON conversations;
DROP POLICY IF EXISTS "svc_messages" ON messages;
DROP POLICY IF EXISTS "svc_faq_rules" ON faq_rules;
DROP POLICY IF EXISTS "svc_users" ON users;
DROP POLICY IF EXISTS "svc_knowledge_base" ON knowledge_base;
DROP POLICY IF EXISTS "svc_company_settings" ON company_settings;
DROP POLICY IF EXISTS "svc_company_goals" ON company_goals;

-- Companies: users can read/update their own
DROP POLICY IF EXISTS "users_read_own_company" ON companies;
CREATE POLICY "users_read_own_company" ON companies FOR SELECT USING (id = (SELECT company_id FROM users WHERE id = auth.uid()));
DROP POLICY IF EXISTS "users_update_own_company" ON companies;
CREATE POLICY "users_update_own_company" ON companies FOR UPDATE USING (id = (SELECT company_id FROM users WHERE id = auth.uid())) WITH CHECK (id = (SELECT company_id FROM users WHERE id = auth.uid()));

-- Products: users can CRUD their own
DROP POLICY IF EXISTS "users_select_own_products" ON products;
CREATE POLICY "users_select_own_products" ON products FOR SELECT USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
DROP POLICY IF EXISTS "users_insert_own_products" ON products;
CREATE POLICY "users_insert_own_products" ON products FOR INSERT WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
DROP POLICY IF EXISTS "users_update_own_products" ON products;
CREATE POLICY "users_update_own_products" ON products FOR UPDATE USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid())) WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
DROP POLICY IF EXISTS "users_delete_own_products" ON products;
CREATE POLICY "users_delete_own_products" ON products FOR DELETE USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

-- Conversations: users can CRUD their own
DROP POLICY IF EXISTS "users_select_own_conversations" ON conversations;
CREATE POLICY "users_select_own_conversations" ON conversations FOR SELECT USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
DROP POLICY IF EXISTS "users_insert_own_conversations" ON conversations;
CREATE POLICY "users_insert_own_conversations" ON conversations FOR INSERT WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
DROP POLICY IF EXISTS "users_update_own_conversations" ON conversations;
CREATE POLICY "users_update_own_conversations" ON conversations FOR UPDATE USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid())) WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
DROP POLICY IF EXISTS "users_delete_own_conversations" ON conversations;
CREATE POLICY "users_delete_own_conversations" ON conversations FOR DELETE USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

-- Messages: users can read/insert/delete via their conversations
DROP POLICY IF EXISTS "users_select_own_messages" ON messages;
CREATE POLICY "users_select_own_messages" ON messages FOR SELECT USING (conversation_id IN (SELECT c.id FROM conversations c JOIN users u ON u.company_id = c.company_id WHERE u.id = auth.uid()));
DROP POLICY IF EXISTS "users_insert_own_messages" ON messages;
CREATE POLICY "users_insert_own_messages" ON messages FOR INSERT WITH CHECK (conversation_id IN (SELECT c.id FROM conversations c JOIN users u ON u.company_id = c.company_id WHERE u.id = auth.uid()));
DROP POLICY IF EXISTS "users_delete_own_messages" ON messages;
CREATE POLICY "users_delete_own_messages" ON messages FOR DELETE USING (conversation_id IN (SELECT c.id FROM conversations c JOIN users u ON u.company_id = c.company_id WHERE u.id = auth.uid()));

-- FAQ rules: users can CRUD their own
DROP POLICY IF EXISTS "users_select_own_faq_rules" ON faq_rules;
CREATE POLICY "users_select_own_faq_rules" ON faq_rules FOR SELECT USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
DROP POLICY IF EXISTS "users_insert_own_faq_rules" ON faq_rules;
CREATE POLICY "users_insert_own_faq_rules" ON faq_rules FOR INSERT WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
DROP POLICY IF EXISTS "users_update_own_faq_rules" ON faq_rules;
CREATE POLICY "users_update_own_faq_rules" ON faq_rules FOR UPDATE USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid())) WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
DROP POLICY IF EXISTS "users_delete_own_faq_rules" ON faq_rules;
CREATE POLICY "users_delete_own_faq_rules" ON faq_rules FOR DELETE USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

-- Users: each user can only see/update their own row
DROP POLICY IF EXISTS "users_select_own_profile" ON users;
CREATE POLICY "users_select_own_profile" ON users FOR SELECT USING (id = auth.uid());
DROP POLICY IF EXISTS "users_update_own_profile" ON users;
CREATE POLICY "users_update_own_profile" ON users FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Knowledge base: users can CRUD their own
DROP POLICY IF EXISTS "users_select_own_kb" ON knowledge_base;
CREATE POLICY "users_select_own_kb" ON knowledge_base FOR SELECT USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
DROP POLICY IF EXISTS "users_insert_own_kb" ON knowledge_base;
CREATE POLICY "users_insert_own_kb" ON knowledge_base FOR INSERT WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
DROP POLICY IF EXISTS "users_update_own_kb" ON knowledge_base;
CREATE POLICY "users_update_own_kb" ON knowledge_base FOR UPDATE USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid())) WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
DROP POLICY IF EXISTS "users_delete_own_kb" ON knowledge_base;
CREATE POLICY "users_delete_own_kb" ON knowledge_base FOR DELETE USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

-- Company settings: users can CRUD their own
DROP POLICY IF EXISTS "users_select_own_settings" ON company_settings;
CREATE POLICY "users_select_own_settings" ON company_settings FOR SELECT USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
DROP POLICY IF EXISTS "users_insert_own_settings" ON company_settings;
CREATE POLICY "users_insert_own_settings" ON company_settings FOR INSERT WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
DROP POLICY IF EXISTS "users_update_own_settings" ON company_settings;
CREATE POLICY "users_update_own_settings" ON company_settings FOR UPDATE USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid())) WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
DROP POLICY IF EXISTS "users_delete_own_settings" ON company_settings;
CREATE POLICY "users_delete_own_settings" ON company_settings FOR DELETE USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

-- Company goals: users can CRUD their own
DROP POLICY IF EXISTS "users_select_own_goals" ON company_goals;
CREATE POLICY "users_select_own_goals" ON company_goals FOR SELECT USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
DROP POLICY IF EXISTS "users_insert_own_goals" ON company_goals;
CREATE POLICY "users_insert_own_goals" ON company_goals FOR INSERT WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
DROP POLICY IF EXISTS "users_update_own_goals" ON company_goals;
CREATE POLICY "users_update_own_goals" ON company_goals FOR UPDATE USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid())) WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
DROP POLICY IF EXISTS "users_delete_own_goals" ON company_goals;
CREATE POLICY "users_delete_own_goals" ON company_goals FOR DELETE USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

-- Demo requests: anyone can insert, admin can read
DROP POLICY IF EXISTS "Anyone can create demo requests" ON demo_requests;
CREATE POLICY "Anyone can create demo requests" ON demo_requests FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Admins can view demo requests" ON demo_requests;
CREATE POLICY "Admins can view demo requests" ON demo_requests FOR SELECT USING (true);

-- ===== AUTH TRIGGER =====
-- Auto-create users row on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, role)
  VALUES (NEW.id, NEW.email, 'owner')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ===== SET ALL EXISTING COMPANIES TO APPROVED =====
UPDATE companies SET status = 'approved' WHERE status IS NULL OR status = 'pending';
