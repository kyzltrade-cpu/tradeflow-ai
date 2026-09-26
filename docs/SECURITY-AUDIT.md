# Sailwise Tenant Isolation Audit (Stream A)

Scope: inventory every tenant-scoped table, audit admin/webhook API surface for
cross-tenant reachability, and install a uniform `auth.uid()`-derived RLS policy
set as defence in depth.

Artifacts:

- `supabase/migrations/022_tenant_rls.sql` (new, not applied)
- `docs/SECURITY-AUDIT.md` (this file)

Inventory source of truth: `supabase/migrations/000`–`021`. No migration was
modified. No route, component, or library was modified.

---

## 1. RLS coverage installed by 022

32 tables carry a `company_id` column in the migration set. 022 enables RLS and
installs exactly one `tenant_isolation` policy per table, using the prescribed
shape:

```sql
company_id = (select company_id from public.users where id = (select auth.uid()))
```

`audit_events`, `company_goals`, `company_settings`, `contacts`, `conversations`,
`customers`, `documents`, `extracted_fields`, `extraction_runs`, `faq_rules`,
`follow_up_items`, `follow_up_sequences`, `inquiries`, `inquiry_attachments`,
`knowledge_base`, `oauth_accounts`, `opportunities`,
`product_requirement_templates`, `products`, `quote_approvals`,
`quote_cost_components`, `quote_line_items`, `quote_sequences`, `quote_versions`,
`quotes`, `supplier_documents`, `supplier_quotes`, `supplier_rfqs`, `suppliers`,
`users`, `whatsapp_pings`, `workflow_jobs`

### Legacy policies dropped (30)

| Count | Policy | Source | Why |
| --- | --- | --- | --- |
| 22 | `tenant_isolated` | `016_trading_ops_v2.sql:595-679` | Used `company_id = current_setting('app.current_company_id')::uuid`. That GUC is never set for PostgREST/client sessions, so it resolves to `''` and the `::uuid` cast raises `invalid input syntax for type uuid`. Superseded. |
| 1 | `quote_sequences_tenant_isolated` | `017_add_quote_sequences.sql:20` | Same `current_setting(...)::uuid` defect. |
| 7 | `Owner selects/inserts/updates/deletes own …` | `018_oauth_accounts.sql:21-35`, `021_whatsapp_pings.sql:30-40` | Already correct and strictly weaker than `for all`; kept the policy set at one authoritative policy per table. |

The `svc_*` policies from `001`/`002`/`010` (`USING (true) WITH CHECK (true)`) were
already removed by `005_rls_policies.sql:11-254` and again by
`015_comprehensive_schema_fix.sql:121-129`; they are not present in the current
schema and 022 does not need to touch them.

### `users` is special-cased

The prescribed subquery reads `public.users` from inside a policy **on**
`public.users`, which PostgreSQL rejects with `infinite recursion detected in
policy`. 022 therefore grants `users` only:

```sql
for select to authenticated using (id = (select auth.uid()))
```

Deliberately **no** `for all` on `users`. A `for all` policy would have granted a
user `INSERT`/`UPDATE`/`DELETE` on their own row, and in particular would have
re-affirmed the self-relink weakness in finding 12. The pre-existing
`users_select_own_profile` / `users_update_own_profile` policies from
`005_rls_policies.sql:200-204` (recreated at `015:177-179`) are left untouched,
so there is no regression in profile-update capability.

### Tables intentionally not covered

No `company_id`, therefore out of 022's stated scope. Recommendations in §5.

- `companies` — the tenant root; addressed by row ownership from `users`.
- `messages` — reached only through `conversations.conversation_id`.
- `demo_requests` — pre-auth lead capture; currently has a broken policy (finding 4).

---

## 2. Systemic finding: RLS is not the current enforcement layer

Every admin route uses `supabaseAdmin` (`src/lib/supabase.ts`), which is a
service-role client. Service role bypasses RLS, so 022 changes nothing for
current traffic — it is forward-looking defence in depth for any future
direct anon/authenticated client access, and it removes the `current_setting`
policies that would have made such access fail with a cast error.

The enforcement layer that is actually load-bearing today is the per-route
pattern `requireAuth(req)` + `.eq('company_id', auth.companyId)`, or a
fetch-then-compare on `row.company_id !== auth.companyId`. I reviewed every
`[id]`-style admin route and this pattern is applied consistently:

`contacts`, `customers`, `conversations/[id]/messages`, `documents`,
`follow-ups`, `follow-ups/[id]/items/[itemId]`, `inbox/[id]`, `inbox/[id]/suggest`,
`inquiries`, `inquiries/[id]`, `inquiries/[id]/attachments`,
`inquiries/[id]/extract`, `opportunities`, `opportunities/[id]`,
`opportunities/[id]/stage`, `opportunities/[id]/convert`, `quotes`,
`quotes/[id]`, `quotes/[id]/approve`, `quotes/[id]/line-items`,
`quotes/[id]/pdf`, `quotes/[id]/send`, `quotes/[id]/version`, `suppliers`.

No cross-tenant IDOR was found in that CRUD surface. The critical findings below
are all **authentication** and **signature** failures on routes that sit outside
that pattern, not missing ownership checks inside it.

`requireAuth` (`src/lib/api-auth.ts:60-98`) throws 401 without a session and
throws **403** when the session has no company (line 87-92). That behaviour is
what makes several `company_id`-from-body paths safe despite looking suspicious;
see the "reviewed, no issue" list in §4.

---

## 3. Findings

### CRITICAL

**C1 — Unauthenticated, unsigned inbound email webhook**
`src/app/api/admin/inquiries/webhook/route.ts`

There is no signature verification and no bearer token anywhere in the handler
(only outbound `Authorization` headers at lines 294-295). The target tenant is
derived from the attacker-supplied recipient address (`resolveCompanyId`,
called at line 385). A forged `email.received` payload therefore:

- writes an `inquiries` row (line 426) and a `conversations` message (line 421)
  into any tenant whose inbound address the attacker can name;
- makes the server call `https://api.resend.com/emails/${emailId}/attachments/${att.id}`
  with the **operator's** Resend API key (lines 294-295) using attacker-supplied
  path segments, and persists the response body as that tenant's attachment
  content (lines 306-331);
- is limited only by the demo-company guard at lines 394-396, which is a
  single-company allow/deny, not an authorisation check.

The module docstring at lines 23-25 claims "tenant safety" via recipient
addressing; that addresses tenant confusion, not authenticity.

**C2 — Unauthenticated cross-tenant settings and secret read**
`src/app/api/admin/settings/route.ts:8-29`

`GET` reads `company_id` from the query string (line 8) and, when present,
returns before any auth call (line 32 is the first `requireAuth`). The response
includes the `companies` projection at line 24, which selects
`whatsapp_verify_token`, `wechat_work_secret`, `wechat_work_token`,
`wechat_work_encoding_aes_key`, `stripe_customer_id`, and
`stripe_subscription_id`. Any anonymous caller who knows or guesses a company
UUID reads another tenant's messaging credentials and billing identifiers.

**C3 — Unauthenticated full company record by arbitrary `user_id`**
`src/app/api/admin/company/route.ts:187-206`

`GET` branches on `?user_id=` (line 187) before `requireAuth` (line 210) and
returns `select('*')` from `companies` (lines 199-203) — every secret column on
that row. The sibling `?id=` branch (lines 212-224) *is* correctly auth-checked;
`user_id` is the hole. Combined with C6 this is a practical enumeration chain:
`confirm-email` confirms whether an email exists, and user UUIDs leak from any
client-visible payload.

**C4 — `demo_requests` readable by anyone despite an "Admins" policy name**
`supabase/migrations/015_comprehensive_schema_fix.sql:215`

```sql
CREATE POLICY "Admins can view demo requests" ON demo_requests FOR SELECT USING (true);
```

There is no admin predicate. Any role holding `SELECT` on `demo_requests` reads
all lead PII (name, email, company, phone, notes). Not fixed in 022:
`demo_requests` has no `company_id`, so it is outside 022's stated scope, and
the correct fix needs a real admin predicate — `users.role` exists but is
self-writable, so it cannot be trusted for authorisation as-is.

**C5 — Hardcoded fallback secret protects both OAuth state and mailbox tokens**
`src/lib/oauth.ts:70`

```ts
return process.env.OAUTH_STATE_SECRET || process.env.SUPABASE_SECRET_KEY || 'changeme-insecure-state-secret';
```

The same value also derives the AES-256-GCM key protecting `oauth_accounts`
tokens (line 75). If both env vars are unset:

- `verifyState` (line 84) accepts attacker-forged state, so
  `connections/callback` (line 31) will upsert mailbox credentials into an
  attacker-chosen `company_id` (`callback/route.ts:54-67`, `onConflict
  company_id,provider`) — cross-tenant mailbox takeover;
- every stored access/refresh token in `oauth_accounts` is decryptable with a
  publicly known constant.

### HIGH

**H1 — Unauthenticated service-role email confirmation**
`src/app/api/admin/confirm-email/route.ts:6-30`

No auth. Calls `supabaseAdmin.auth.admin.listUsers()` (line 15) and
`updateUserById(..., { email_confirm: true })` (lines 24-26) for any supplied
email. Provides user enumeration via the 404/200 split (line 20) and forces
confirmation of arbitrary accounts. The file is self-labelled temporary
(`// TODO: Remove after SMTP is configured`, line 5) but is live.

**H2 — Onboarding trusts body `user_id`, allowing cross-account relink**
`src/app/api/admin/company/route.ts:68, 84-88, 182-187`

`POST` uses the session-only `requireAuthOrCreate` (lines 15-60), which
intentionally skips the company check so onboarding can run before a company
exists. It then trusts `user_id` from the body to read that user's
`company_id` (lines 84-88) and to `upsert` (lines 182-183) + `update({ company_id, role: 'admin' })`
that user's row (lines 185-187). An authenticated attacker can attach an
arbitrary victim account to a company, or enumerate a victim's company id.

**H3 — Unauthenticated tenant data oracle in public chat**
`src/app/api/chat/route.ts:49, 118`

No auth. The `x-company-id` request header selects the tenant whose `companies`
and `company_goals` are loaded (line 49) and whose full business snapshot
(`inquiries`, deals, quotes, follow-ups) is assembled by
`buildInquiryContext(companyId)` (line 118-121) and fed to the model. Attacker-
controlled header, no validation.

**H4 — Cron auth guard fails open**
`src/app/api/cron/follow-ups/route.ts:29-36`

`verifyCron` returns `true` when `CRON_SECRET` is unset (lines 30-33). The
handler then selects due follow-ups across **all** tenants (lines 74-97) and
sends outbound email. Unauthenticated trigger of tenant-wide side effects.

### MEDIUM

**M1 — Authenticated SSRF via website scrape**
`src/app/api/admin/knowledge/scrape/route.ts:22-34`

Company ownership is checked (lines 15-17), but `url` is fetched with no scheme
allowlist, no host allowlist, and no private/link-local IP block
(`http://169.254.169.254/`, `http://127.0.0.1:5432/`, internal admin endpoints).
The response body is persisted into the tenant's `knowledge_base` (lines 72-80)
and returned to the caller.

**M2 — Any tenant can use the deployment as an email relay**
`src/app/api/admin/email/test/route.ts:12-37`

Caller supplies `api_key`, `from_email`, and `to_email`; the server sends
through Resend (line 18). No rate limit, no recipient or domain allowlist.
Enables outbound mail abuse and deliverability damage to the deployment's
sending reputation, and lets a tenant probe arbitrary third-party API keys.

**M3 — OAuth state has no expiry, nonce, or session binding**
`src/lib/oauth.ts:78-97`

`state` carries `{ companyId, provider }` under an HMAC with a timing-safe
compare, but no timestamp and no nonce, and `connections/callback` never
re-binds the verified state to the requesting session (line 31). A captured
state is replayable indefinitely. Compounds C5.

**M4 — Users can repoint their own `company_id`** *(pre-existing, DB-level)*

`supabase/migrations/005_rls_policies.sql:204` and
`015_comprehensive_schema_fix.sql:179`:

```sql
CREATE POLICY users_update_own_profile ON users FOR UPDATE
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
```

The `WITH CHECK` pins only `id`, so a user may set their own `company_id` to any
company UUID. Because every tenant policy resolves the tenant through
`users.company_id where id = auth.uid()`, a successful self-relink yields full
read/write access to the victim tenant. RLS cannot restrict columns; this needs
a `BEFORE UPDATE` trigger or a column-level `GRANT` (revoke `UPDATE` on
`users.company_id`). Not addressed in 022 — see §1 for why granting `users` more
than `SELECT` would have made this worse.

### LOW

**L1 — Public health route leaks database error text**
`src/app/api/health/route.ts:8-38`

**L2 — Public demo-request form has no rate limit**
`src/app/api/demo-request/route.ts:8-48`

Public insert plus outbound notification, no captcha or throttle. Lead-table
spam and mail abuse. Pairs with C4.

**L3 — PostgREST filter-string injection** *(filter injection, not cross-tenant)*

Unescaped user input interpolated into `.or(...)`:
`admin/customers/route.ts:25-27`, `admin/contacts/route.ts:30-32`,
`admin/documents/route.ts:30`, `admin/products/import/route.ts`,
`admin/quotes/route.ts` search, `admin/follow-ups/route.ts`. A `,`/`.`/`)` in
the search term can alter the filter. In each case the `.eq('company_id', …)`
predicate is applied separately, so tenant scope is retained — this is
data-scope-widening within one tenant, not a tenant crossing.

**L4 — Dead `company_id` query-param fallbacks**
`admin/faq/route.ts:9`, `admin/goals/route.ts:9`, `admin/knowledge/route.ts:9`

`auth.companyId || req.nextUrl.searchParams.get('company_id')`. Not exploitable:
`requireAuth` throws 403 when `companyId` is null, so the fallback is
unreachable. Remove it so it cannot become exploitable if `requireAuth` is ever
loosened.

---

## 4. Reviewed, no issue

Recorded so the next reviewer does not re-open them.

- `webhooks/stripe/route.ts` — uses `stripe.webhooks.constructEvent`; signature
  verification present.
- `billing/checkout/route.ts:114, 154, 160, 162` — `metadata.company_id`,
  `client_reference_id`, and `subscription_data.metadata.company_id` are all
  derived from `auth.companyId`, never from the request.
- `billing/portal/route.ts:47-51` — `stripe_customer_id` read scoped to
  `auth.companyId`.
- `admin/connections/start|send|disconnect|status` — company-scoped throughout;
  `send` (line 32) and `disconnect` (line 18) filter `oauth_accounts` by
  `auth.companyId`.
- `admin/composio/connect|disconnect|status` — company-scoped; `disconnect`
  re-checks ownership server-side (comment at lines 5-7 matches the code).
- `admin/settings/route.ts:91-98`, `admin/faq/route.ts:52-53`,
  `admin/goals/route.ts:50-51`, `admin/knowledge/route.ts:47-48`,
  `admin/inquiries/[id]/route.ts:76-77` — body `company_id` is rejected when it
  differs from `auth.companyId`. Safe because `requireAuth` guarantees a
  non-null `companyId`.
- `admin/knowledge/scrape/route.ts:15-17` — company check correct (the SSRF in
  M1 is a separate issue).

---

## 5. Recommendations (outside 022's scope)

1. Add C1 webhook signature verification (Resend/Svix) and fail closed when the
   signing secret is absent.
2. Delete the `?company_id=` and `?user_id=` pre-auth branches in
   `admin/settings` and `admin/company`, or gate them behind an
   authenticated session. Coordinate with the onboarding client, which currently
   depends on them (`settings/route.ts:10`, `company/route.ts:189`).
3. Remove `admin/confirm-email` once SMTP is configured; until then require an
   admin session.
4. Make `CRON_SECRET` mandatory — return 503, not `true`, when unset.
5. Require `OAUTH_STATE_SECRET`; add an expiry + nonce to `state`; bind the
   callback to the initiating session.
6. Add a scheme/host allowlist and private-IP denylist to `knowledge/scrape`.
7. Block self-relink on `users.company_id` with a trigger or column-level grant.
8. Give `demo_requests` a real admin predicate, or revoke the `SELECT` grant.
9. Escape PostgREST `.or()` filter values (L3).
10. Add `messages` (via `conversations`) and `companies` policies once their
    ownership model is agreed; neither has a `company_id`.

---

## 6. Verification

**Migration (static).** 126 statements. Parens balanced. Programmatically
asserted: the set of tables passed to `enable row level security`, to
`create policy tenant_isolation`, and to `drop policy if exists tenant_isolation`
are each exactly equal to the authoritative 32-table `company_id` set; no
`companies`, `demo_requests`, or `messages` reference appears; all 31 non-`users`
policies match the prescribed `for all to authenticated` + `using`/`with check`
expression byte-for-byte; the `users` policy is `for select to authenticated`
with `id = (select auth.uid())` and no `with check`; 30 legacy policies dropped
as tabled in §1. **Not applied** — no DDL was executed against any database.

**`npx tsc --noEmit` — 6 pre-existing errors, 0 from this task.**

| File | Errors |
| --- | --- |
| `src/app/api/admin/email/test/route.ts` | TS2551 (line 38) `EMAIL_NOT_CONFIGURED` not in the error-code map; TS2353 (line 64) `idempotencyKey` not in `SendEmailParams` |
| `src/app/api/admin/inquiries/webhook/route.ts` | TS18047 `conversation` possibly null — lines 252, 263, 269, 271 |

Neither file was modified by this task, and 022 is SQL, so it cannot influence
`tsc`. Both already had uncommitted modifications in the working tree before
this audit began.

**SOP deviations.**

- 022 was not applied. No database DDL was run.
- The live database was unreachable this session — even `select 1` failed with
  `Connection terminated due to connection timeout`. The table inventory is
  therefore derived from `supabase/migrations/000`–`021` (the SOP's stated source
  of truth) and was **not** cross-checked against `information_schema`. Re-run
  that cross-check before applying 022.
- `022_tenant_rls.sql` carries a 6-line header comment and no inline
  comments. The header matches the established convention of `020_source_urls.sql`
  (same `-- ===` banner, numbered, one-line description); the migration body is
  comment-free.
- Untracked `scripts/run-sql.ts` and `scripts/.tmp/` appear to be ad-hoc SQL
  runners. Confirm they cannot apply DDL to production.
- The working tree already contained 16 modified files and additional untracked
  files from prior work. None were touched.
