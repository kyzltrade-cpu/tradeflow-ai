# Ship Checklist — Real-Customer Launch

Status: CODE SHIPPED to `tradeflow-ai-rho.vercel.app` (commit `83a3ed8`). The pages below are the remaining launch gates.

## 1. Environment variables to provide (Vercel)

| Var | Status | Required for |
|---|---|---|
| `STRIPE_SECRET_KEY` | placeholder (`your_stripe_key`) | checkout, portal, billing webhook |
| `STRIPE_WEBHOOK_SECRET` | placeholder (`your_webhook_secret`) | verifying Stripe events |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | missing | checkout page |
| `RESEND_API_KEY` | missing | transactional email (verification, quote sends) + optional inbound webhook |
| `COMPOSIO_API_KEY` | missing | connecting a real customer mailbox (Gmail/Outlook) |
| `CRON_SECRET` | check | follow-up cron — cron now **fails closed** if unset |
| `EMAIL_FROM_ADDRESS` / `EMAIL_FROM_NAME` | check | default sender for quote emails |

Already set and verified: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NIM_API_KEY`, `NIM_BASE_URL`, `NIM_MODEL`, `EXA_API_KEY`, `NEXT_PUBLIC_APP_URL`.

Behavior while missing: Every send refuses with a clean message (`Quote was NOT sent … configure a sending address`) and the quote stays DRAFT. Billing stays in trial mode with caps (50 AI drafts / 25 sends per month) and enforcement disabled. Demo account unaffected.

## 2. Database migrations to apply (Supabase dashboard → SQL editor, once DB connection is available)

1. Run `supabase/migrations/023_billing_plan.sql` — adds `companies.plan` (backfills `trial`, indexes). App already self-heals without it (`plan_source: default_trial` confirmed live); applying it unlocks webhook-driven plan switching.
2. Run `supabase/migrations/022_tenant_rls.sql` — enables RLS + a single `tenant_isolation` policy on 32 company-scoped tables and drops 30 legacy `tenant_isolated`/`current_setting` policies. Defense-in-depth: enforcement today is route-level `requireAuth`.

Note: `020_source_urls.sql` / `021_whatsapp_pings.sql` are applied to the DB but not yet committed; decide whether to commit before the next migration.

## 3. Security hardening — done in code (deployed), verified live
- `settings` + `company` GET now require auth; cross-tenant / anonymous reads return 401/403 (was leaking WhatsApp/WeChat/Stripe secrets to anyone with a `company_id` / `user_id`).
- Cron guard fails closed.
- Longer-lead items (documented in `docs/SECURITY-AUDIT.md`, not blockers): sign the inbound inquiries webhook for production (optional `INQUIRY_WEBHOOK_SECRET` added; require it publicly once Resend inbound is live), `demo_requests` read policy, public `/api/chat` widget scope.

## 4. Verified on production (E2E, commit `83a3ed8`)
- Health + homepage: 200.
- Demo login → company settings → billing status (trial).
- Fresh signup: onboarding created company + seeded starter kit (8 products, 5 suppliers, 2 conversations, 1 priced sample quote); billing resolved to trial (50/25 caps); quote send refused without a sender (502, status unchanged DRAFT); quote send without recipient (400).
- Anonymous access to settings/company endpoints blocked (401).
- Test tenants and users cleaned up; demo company untouched.

## 5. Remaining product gaps for a true self-serve launch (recommend, not blocking)
- Google/Microsoft OAuth for mailbox connect (currently a per-company API-key/connect flow).
- Outbound email depends on Resend + a verified sending domain/inbound mailbox.
- Payment webhook → plan switching path is coded but untestable until real Stripe keys exist.