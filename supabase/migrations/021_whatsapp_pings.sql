-- WhatsApp agent: one row per "important email" alert sent to the firm.
create table if not exists public.whatsapp_pings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete cascade,
  inquiry_id uuid,
  from_number text,
  to_number text,
  status text not null default 'notified'
    check (status in ('notified', 'approved', 'sent', 'failed', 'dismissed')),
  importance_reason text,
  summary text,
  proposed_reply text,
  reply_text text,
  sent_message_id text,
  error_message text,
  created_at timestamptz not null default now(),
  notified_at timestamptz,
  acted_at timestamptz,
  sent_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists whatsapp_pings_company_idx on public.whatsapp_pings(company_id);
create index if not exists whatsapp_pings_conv_idx on public.whatsapp_pings(conversation_id);
create index if not exists whatsapp_pings_status_idx on public.whatsapp_pings(status);

alter table public.whatsapp_pings enable row level security;

create policy "Owner selects own whatsapp pings"
  on public.whatsapp_pings for select
  using (company_id in (select u.company_id from public.users u where u.id = auth.uid()));

create policy "Owner inserts own whatsapp pings"
  on public.whatsapp_pings for insert
  with check (company_id in (select u.company_id from public.users u where u.id = auth.uid()));

create policy "Owner updates own whatsapp pings"
  on public.whatsapp_pings for update
  using (company_id in (select u.company_id from public.users u where u.id = auth.uid()));