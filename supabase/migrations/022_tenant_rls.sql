-- ============================================================
-- 22. Tenant isolation rails
-- One uniform, auth.uid()-derived policy per tenant table.
-- Supersedes the current_setting('app.current_company_id')
-- policies from 016/017, which error for client sessions.
-- ============================================================

alter table public.audit_events enable row level security;
alter table public.company_goals enable row level security;
alter table public.company_settings enable row level security;
alter table public.contacts enable row level security;
alter table public.conversations enable row level security;
alter table public.customers enable row level security;
alter table public.documents enable row level security;
alter table public.extracted_fields enable row level security;
alter table public.extraction_runs enable row level security;
alter table public.faq_rules enable row level security;
alter table public.follow_up_items enable row level security;
alter table public.follow_up_sequences enable row level security;
alter table public.inquiries enable row level security;
alter table public.inquiry_attachments enable row level security;
alter table public.knowledge_base enable row level security;
alter table public.oauth_accounts enable row level security;
alter table public.opportunities enable row level security;
alter table public.product_requirement_templates enable row level security;
alter table public.products enable row level security;
alter table public.quote_approvals enable row level security;
alter table public.quote_cost_components enable row level security;
alter table public.quote_line_items enable row level security;
alter table public.quote_sequences enable row level security;
alter table public.quote_versions enable row level security;
alter table public.quotes enable row level security;
alter table public.supplier_documents enable row level security;
alter table public.supplier_quotes enable row level security;
alter table public.supplier_rfqs enable row level security;
alter table public.suppliers enable row level security;
alter table public.users enable row level security;
alter table public.whatsapp_pings enable row level security;
alter table public.workflow_jobs enable row level security;

drop policy if exists "tenant_isolated" on public.customers;
drop policy if exists "tenant_isolated" on public.contacts;
drop policy if exists "tenant_isolated" on public.suppliers;
drop policy if exists "tenant_isolated" on public.supplier_documents;
drop policy if exists "tenant_isolated" on public.inquiries;
drop policy if exists "tenant_isolated" on public.inquiry_attachments;
drop policy if exists "tenant_isolated" on public.extraction_runs;
drop policy if exists "tenant_isolated" on public.extracted_fields;
drop policy if exists "tenant_isolated" on public.opportunities;
drop policy if exists "tenant_isolated" on public.supplier_rfqs;
drop policy if exists "tenant_isolated" on public.supplier_quotes;
drop policy if exists "tenant_isolated" on public.quotes;
drop policy if exists "tenant_isolated" on public.quote_line_items;
drop policy if exists "tenant_isolated" on public.quote_cost_components;
drop policy if exists "tenant_isolated" on public.quote_versions;
drop policy if exists "tenant_isolated" on public.quote_approvals;
drop policy if exists "tenant_isolated" on public.follow_up_sequences;
drop policy if exists "tenant_isolated" on public.follow_up_items;
drop policy if exists "tenant_isolated" on public.product_requirement_templates;
drop policy if exists "tenant_isolated" on public.workflow_jobs;
drop policy if exists "tenant_isolated" on public.audit_events;
drop policy if exists "tenant_isolated" on public.documents;
drop policy if exists "quote_sequences_tenant_isolated" on public.quote_sequences;

drop policy if exists "Owner selects own oauth accounts" on public.oauth_accounts;
drop policy if exists "Owner inserts own oauth accounts" on public.oauth_accounts;
drop policy if exists "Owner updates own oauth accounts" on public.oauth_accounts;
drop policy if exists "Owner deletes own oauth accounts" on public.oauth_accounts;

drop policy if exists "Owner selects own whatsapp pings" on public.whatsapp_pings;
drop policy if exists "Owner inserts own whatsapp pings" on public.whatsapp_pings;
drop policy if exists "Owner updates own whatsapp pings" on public.whatsapp_pings;

drop policy if exists tenant_isolation on public.audit_events;
create policy tenant_isolation on public.audit_events
  for all to authenticated
  using (company_id = (select company_id from public.users where id = (select auth.uid())))
  with check (company_id = (select company_id from public.users where id = (select auth.uid())));

drop policy if exists tenant_isolation on public.company_goals;
create policy tenant_isolation on public.company_goals
  for all to authenticated
  using (company_id = (select company_id from public.users where id = (select auth.uid())))
  with check (company_id = (select company_id from public.users where id = (select auth.uid())));

drop policy if exists tenant_isolation on public.company_settings;
create policy tenant_isolation on public.company_settings
  for all to authenticated
  using (company_id = (select company_id from public.users where id = (select auth.uid())))
  with check (company_id = (select company_id from public.users where id = (select auth.uid())));

drop policy if exists tenant_isolation on public.contacts;
create policy tenant_isolation on public.contacts
  for all to authenticated
  using (company_id = (select company_id from public.users where id = (select auth.uid())))
  with check (company_id = (select company_id from public.users where id = (select auth.uid())));

drop policy if exists tenant_isolation on public.conversations;
create policy tenant_isolation on public.conversations
  for all to authenticated
  using (company_id = (select company_id from public.users where id = (select auth.uid())))
  with check (company_id = (select company_id from public.users where id = (select auth.uid())));

drop policy if exists tenant_isolation on public.customers;
create policy tenant_isolation on public.customers
  for all to authenticated
  using (company_id = (select company_id from public.users where id = (select auth.uid())))
  with check (company_id = (select company_id from public.users where id = (select auth.uid())));

drop policy if exists tenant_isolation on public.documents;
create policy tenant_isolation on public.documents
  for all to authenticated
  using (company_id = (select company_id from public.users where id = (select auth.uid())))
  with check (company_id = (select company_id from public.users where id = (select auth.uid())));

drop policy if exists tenant_isolation on public.extracted_fields;
create policy tenant_isolation on public.extracted_fields
  for all to authenticated
  using (company_id = (select company_id from public.users where id = (select auth.uid())))
  with check (company_id = (select company_id from public.users where id = (select auth.uid())));

drop policy if exists tenant_isolation on public.extraction_runs;
create policy tenant_isolation on public.extraction_runs
  for all to authenticated
  using (company_id = (select company_id from public.users where id = (select auth.uid())))
  with check (company_id = (select company_id from public.users where id = (select auth.uid())));

drop policy if exists tenant_isolation on public.faq_rules;
create policy tenant_isolation on public.faq_rules
  for all to authenticated
  using (company_id = (select company_id from public.users where id = (select auth.uid())))
  with check (company_id = (select company_id from public.users where id = (select auth.uid())));

drop policy if exists tenant_isolation on public.follow_up_items;
create policy tenant_isolation on public.follow_up_items
  for all to authenticated
  using (company_id = (select company_id from public.users where id = (select auth.uid())))
  with check (company_id = (select company_id from public.users where id = (select auth.uid())));

drop policy if exists tenant_isolation on public.follow_up_sequences;
create policy tenant_isolation on public.follow_up_sequences
  for all to authenticated
  using (company_id = (select company_id from public.users where id = (select auth.uid())))
  with check (company_id = (select company_id from public.users where id = (select auth.uid())));

drop policy if exists tenant_isolation on public.inquiries;
create policy tenant_isolation on public.inquiries
  for all to authenticated
  using (company_id = (select company_id from public.users where id = (select auth.uid())))
  with check (company_id = (select company_id from public.users where id = (select auth.uid())));

drop policy if exists tenant_isolation on public.inquiry_attachments;
create policy tenant_isolation on public.inquiry_attachments
  for all to authenticated
  using (company_id = (select company_id from public.users where id = (select auth.uid())))
  with check (company_id = (select company_id from public.users where id = (select auth.uid())));

drop policy if exists tenant_isolation on public.knowledge_base;
create policy tenant_isolation on public.knowledge_base
  for all to authenticated
  using (company_id = (select company_id from public.users where id = (select auth.uid())))
  with check (company_id = (select company_id from public.users where id = (select auth.uid())));

drop policy if exists tenant_isolation on public.oauth_accounts;
create policy tenant_isolation on public.oauth_accounts
  for all to authenticated
  using (company_id = (select company_id from public.users where id = (select auth.uid())))
  with check (company_id = (select company_id from public.users where id = (select auth.uid())));

drop policy if exists tenant_isolation on public.opportunities;
create policy tenant_isolation on public.opportunities
  for all to authenticated
  using (company_id = (select company_id from public.users where id = (select auth.uid())))
  with check (company_id = (select company_id from public.users where id = (select auth.uid())));

drop policy if exists tenant_isolation on public.product_requirement_templates;
create policy tenant_isolation on public.product_requirement_templates
  for all to authenticated
  using (company_id = (select company_id from public.users where id = (select auth.uid())))
  with check (company_id = (select company_id from public.users where id = (select auth.uid())));

drop policy if exists tenant_isolation on public.products;
create policy tenant_isolation on public.products
  for all to authenticated
  using (company_id = (select company_id from public.users where id = (select auth.uid())))
  with check (company_id = (select company_id from public.users where id = (select auth.uid())));

drop policy if exists tenant_isolation on public.quote_approvals;
create policy tenant_isolation on public.quote_approvals
  for all to authenticated
  using (company_id = (select company_id from public.users where id = (select auth.uid())))
  with check (company_id = (select company_id from public.users where id = (select auth.uid())));

drop policy if exists tenant_isolation on public.quote_cost_components;
create policy tenant_isolation on public.quote_cost_components
  for all to authenticated
  using (company_id = (select company_id from public.users where id = (select auth.uid())))
  with check (company_id = (select company_id from public.users where id = (select auth.uid())));

drop policy if exists tenant_isolation on public.quote_line_items;
create policy tenant_isolation on public.quote_line_items
  for all to authenticated
  using (company_id = (select company_id from public.users where id = (select auth.uid())))
  with check (company_id = (select company_id from public.users where id = (select auth.uid())));

drop policy if exists tenant_isolation on public.quote_sequences;
create policy tenant_isolation on public.quote_sequences
  for all to authenticated
  using (company_id = (select company_id from public.users where id = (select auth.uid())))
  with check (company_id = (select company_id from public.users where id = (select auth.uid())));

drop policy if exists tenant_isolation on public.quote_versions;
create policy tenant_isolation on public.quote_versions
  for all to authenticated
  using (company_id = (select company_id from public.users where id = (select auth.uid())))
  with check (company_id = (select company_id from public.users where id = (select auth.uid())));

drop policy if exists tenant_isolation on public.quotes;
create policy tenant_isolation on public.quotes
  for all to authenticated
  using (company_id = (select company_id from public.users where id = (select auth.uid())))
  with check (company_id = (select company_id from public.users where id = (select auth.uid())));

drop policy if exists tenant_isolation on public.supplier_documents;
create policy tenant_isolation on public.supplier_documents
  for all to authenticated
  using (company_id = (select company_id from public.users where id = (select auth.uid())))
  with check (company_id = (select company_id from public.users where id = (select auth.uid())));

drop policy if exists tenant_isolation on public.supplier_quotes;
create policy tenant_isolation on public.supplier_quotes
  for all to authenticated
  using (company_id = (select company_id from public.users where id = (select auth.uid())))
  with check (company_id = (select company_id from public.users where id = (select auth.uid())));

drop policy if exists tenant_isolation on public.supplier_rfqs;
create policy tenant_isolation on public.supplier_rfqs
  for all to authenticated
  using (company_id = (select company_id from public.users where id = (select auth.uid())))
  with check (company_id = (select company_id from public.users where id = (select auth.uid())));

drop policy if exists tenant_isolation on public.suppliers;
create policy tenant_isolation on public.suppliers
  for all to authenticated
  using (company_id = (select company_id from public.users where id = (select auth.uid())))
  with check (company_id = (select company_id from public.users where id = (select auth.uid())));

drop policy if exists tenant_isolation on public.users;
create policy tenant_isolation on public.users
  for select to authenticated
  using (id = (select auth.uid()));

drop policy if exists tenant_isolation on public.whatsapp_pings;
create policy tenant_isolation on public.whatsapp_pings
  for all to authenticated
  using (company_id = (select company_id from public.users where id = (select auth.uid())))
  with check (company_id = (select company_id from public.users where id = (select auth.uid())));

drop policy if exists tenant_isolation on public.workflow_jobs;
create policy tenant_isolation on public.workflow_jobs
  for all to authenticated
  using (company_id = (select company_id from public.users where id = (select auth.uid())))
  with check (company_id = (select company_id from public.users where id = (select auth.uid())));
