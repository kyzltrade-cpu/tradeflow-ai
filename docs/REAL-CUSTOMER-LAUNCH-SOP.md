# Sailwise — Real Customer Launch SOP

Objective: make Sailwise **function like the demo for real, self-serve customers**. A new signup
goes signup → email-confirm → onboarding → seeded starter account → dashboard, and the product
works end-to-end per their own company with real mailbox connect, AI drafts+quotes, sends, and
billing. Self-serve trials now (launch posture). New accounts start with **demo-style starter
data** they can delete.

## Launch readiness gates (env — must be present at integration)
| Gate | Env var | Status today (repo .env.local) |
|---|---|---|
| Live product billing | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | PLACEHOLDERS → broken |
| Real outbound email | `RESEND_API_KEY` | missing |
| Per-customer mailbox connect | `COMPOSIO_API_KEY` (+ hosted OAuth) | missing locally |
| Google/MS signup providers | Supabase provider config | unverified |
| AI inference | `NIM_*` | present |

Integration must verify which gates are usable, wire what's possible, and leave an explicit
env-requirements checklist. Never print or commit secrets.

## Repo / deploy facts
- HEAD `be127b0`, origin/main up to date. Deployed alias `tradeflow-ai-rho.vercel.app` is BEHIND HEAD → integration redeploys.
- Do NOT touch the demo/lead company `99b52405-c9f2-4ac0-bf7e-69b10c3cfea5` or its rows.
- AI backend: NIM (`meta/llama-3.2-11b-vision-instruct`). DB service-role writes available.
- DB migrations: applied through `021`; repo files `000`–`021` (020/021 not yet committed — leave as-is).

## Streams, owners, and file boundaries
Agents must read this file FIRST, implement ONLY their owned files, and never edit files owned
by another stream. When in doubt, don't touch it — report instead.

### Stream A — Multi-tenant & security hardening
- Writes ONLY: `supabase/migrations/022_tenant_rls.sql` (new) and `docs/SECURITY-AUDIT.md` (report).
- READ-ONLY everywhere else: audit every `/api/admin/*` route for `requireAuth` + `auth.companyId`
  scoping (conversations, messages, products, suppliers, quotes, knowledge, goals, opportunities,
  customers, contacts, documents, inquiries, settings). Flag concrete leaks (any company-scoped
  read/write that can cross tenants). Also audit admin-only actions (pending-companies, company
  admin flags). Do NOT edit routes. File concrete findings in the report with `file:line`.
- RLS migration: enable RLS on tenant tables with `company_id` policies = authenticated user whose
  `users.company_id` matches. Table list in report. Do not break service-role admin writes
  (service role bypasses RLS).

### Stream B — Onboarding + starter data (self-serve account lives)
- Owns: `src/app/onboarding/page.tsx`, `src/app/api/admin/company/route.ts`, new `src/lib/starter-kit.ts`, and any new client routing in `src/lib/company.tsx` to send a company-less user to `/onboarding`.
- Deliverable: extract the seeding out of the company POST into `src/lib/starter-kit.ts`; on new
  company creation seed a deletable starter kit: ~8 products (mixed categories, real price ranges),
  ~5 suppliers (name, location, category, lead_time, moq, min_order, notes), existing FAQ seed,
  one starter GM-style goal prompt, and 2 sample conversations + 1 sample quote explicitly labeled
  "Sample" in UI copy so it's clear they're placeholders. Products/suppliers must look as real as
  the demo's. Onboarding page: smooth transitions, works for a brand-new real customer, no demo
  references. Keep `status: 'approved'` for self-serve. Do not touch billing/checkout or settings
  billing section.

### Stream C — Real mailbox connect + AI send loop for real customers
- Owns: `src/lib/email.ts`, `src/lib/composio.ts`, `src/lib/composio-apps.ts`,
  `src/app/api/admin/composio/*`, `src/components/ComposioConnections.tsx`,
  `src/app/api/admin/email/test/route.ts`, and the inquiry ingestion path
  (`src/app/api/admin/inquiries/webhook/route.ts`). May read `quotes/[id]/send/route.ts` (owned by
  D) and add a FROM-address capability only inside email.ts.
- Deliverable: per-company mailbox connect (Gmail/Outlook) via Composio hosted OAuth so real
  customers' inquiries land per-company; Resend-based send with a coherent no-key fallback and a
  `from=` override so when a mailbox is connected, replies send from the customer's own address;
  per-company inbox connect state surfaced in Settings. Keep the human-approval send gate intact.
  Produce `scripts/.tmp/email-env-audit.ts` (reads env var NAMES only, prints which of
  RESEND/COMPOSIO/OAuth are set) so integration knows what's wired.

### Stream D — Billing gating + free trial
- Owns: `src/app/api/billing/*`, `src/app/api/webhooks/stripe/route.ts`,
  `src/app/admin/settings/page.tsx` BILLING section, and a NEW `src/lib/billing/limits.ts`.
  May make exactly one minimal edit to `src/app/api/admin/quotes/[id]/send/route.ts`: import from
  `billing/limits` and enforce the sender's plan limit (trial = live users capped; the switch/gate
  must be env-guarded so the sandbox/demo company keeps working). Same pattern in the suggest route.
- Deliverable: trial defaults a new company to `trial` plan; checkout/portal/webhook work given
  real keys (they're placeholders today — code must detect and surface that clearly); usage limits
  enforced via the helper. Detect Stripe key mode (test/live/placeholder) in a report and list the
  exact keys needed.

## Verification gates (every agent runs before reporting)
1. `npx tsc --noEmit` clean for your changes.
2. Eyeball diff for tenant-isolation regressions, no secrets, no demo-company mutation.
3. Self-check your deliverables list; note anything left undone + why.

## Integration sequence (main agent — after all streams report)
1. Review all diffs; resolve boundary conflicts; run `npx tsc --noEmit` and repo lint if present.
2. Apply migration `022_tenant_rls.sql` via the migration tool (A) — first validate no table RLS breaks service-role flows.
3. Commit once, push, `vercel --prod`, point `rho` alias, verify.
4. End-to-end browser test with a throwaway real account: signup → confirm → onboarding (seeded
   data appears) → dashboard → connect mailbox (or verify gate states it needs COMPOSIO key) →
   quote draft + send-gate behavior → billing shows trial + checkout path.
5. Write env checklist of whatever remained unconfigured (Stripe keys, Resend, Composio, OAuth).

## Hard rules
- No secrets in code, commits, or reports. Never mutate company `99b52405-…` or demo-account rows.
- No commit/push/deploy/deploy-alias changes from agents — integration owns that.
- If two streams need the same file, the one listed as owner wins; the other reports.
- No speculative scope creep outside this SOP.