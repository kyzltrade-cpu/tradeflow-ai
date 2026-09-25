-- 1-click mailbox OAuth connections (Google Gmail + Microsoft Outlook)
create table if not exists public.oauth_accounts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  provider text not null check (provider in ('google', 'microsoft')),
  account_email text not null,
  account_name text,
  access_token_encrypted text not null,
  refresh_token_encrypted text,
  token_expires_at timestamptz not null,
  scopes text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, provider)
);

create index if not exists oauth_accounts_company_idx on public.oauth_accounts(company_id);

alter table public.oauth_accounts enable row level security;

create policy "Owner selects own oauth accounts"
  on public.oauth_accounts for select
  using (company_id in (select u.company_id from public.users u where u.id = auth.uid()));

create policy "Owner inserts own oauth accounts"
  on public.oauth_accounts for insert
  with check (company_id in (select u.company_id from public.users u where u.id = auth.uid()));

create policy "Owner updates own oauth accounts"
  on public.oauth_accounts for update
  using (company_id in (select u.company_id from public.users u where u.id = auth.uid()));

create policy "Owner deletes own oauth accounts"
  on public.oauth_accounts for delete
  using (company_id in (select u.company_id from public.users u where u.id = auth.uid()));