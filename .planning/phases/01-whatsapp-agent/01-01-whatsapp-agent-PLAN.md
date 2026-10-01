# Phase 01 — WhatsApp Agent MVP

> Goal: when an important inbound email arrives, a WhatsApp agent pings the firm
> with a summary + proposed reply. The firm replies in WhatsApp with
> `approve` / `edit <text>` / literal message; the agent sends it on their
> behalf via the existing email path.

## Locked decisions (2026-09-26)
- MVP: detect → notify → reply-on-behalf. Real WA API later.
- Mock/simulated WhatsApp channel for demo (no real phone required).
- Text commands: `approve` (send draft as-is), `edit <text>` (replace draft),
  literal message = send as final text.

## Data model (new table `whatsapp_pings`)
- `id uuid pk`
- `company_id uuid fk -> companies`
- `conversation_id uuid fk -> conversations` (the email thread being alerted)
- `inquiry_id uuid` (nullable, for context)
- `from_number text` (mock: `+1 555 DEMO`) / `to_number text` (firm's WhatsApp)
- `status text` = `notified | approved | sent | failed | dismissed` (dismissed = false-positive)
- `importance_reason text` (why it's important, LLM output)
- `summary text` (1–2 line whatsapp summary)
- `proposed_reply text` (LLM draft the firm can approve)
- `reply_text text` (what the firm told us to send)
- `sent_message_id text` (resend id on success)
- `error_message text`
- timestamps: `created_at`, `notified_at`, `acted_at`, `sent_at`, `updated_at`
- uniques: none (one ping per conversation-event; dedupe handled in worker)

RLS: service-role only (same pattern as existing tables; admin reads via API).

## Worker + API surfaces
1. **`/api/cron/whatsapp-agent`** (CRON_SECRET, GET)
   - Scan conversations: recent customer message, channel=email, status=active,
     no *existing open ping* (status in notified/approved/sent) for that conv.
   - Importance gate via NIM LLM → `{important, reason, summary, proposed_reply}`.
   - If important → insert ping + audit event. Else → skip.
2. **`/api/whatsapp/reply`** (POST, admin auth)
   - Body: `{ conversation_id, text }` — simulates the firm replying from WhatsApp
     to the latest open ping for that conversation.
   - Parse command: `approve` → use proposed_reply; `edit <...>` → use text after
     `edit`; anything else → literal text.
   - Overwrite `reply_text`, set status, call `sendEmail` (reply-to original email,
     subject `Re: <original>`), record an `assistant` message + audit event,
     set `sent_message_id`/`sent_at`, status serially: status='approved' while
     drafting, then 'sent'/'failed'.
3. **Admin UI**: WhatsApp panel in admin nav ("WhatsApp Agent")
   - Thread list of pings (newest first) with summary bubble + proposed reply.
   - Reply box: `approve` button + free-text reply → POST `/api/whatsapp/reply`.
   - Shows sent/failed status and actual reply text.

## Library
- `src/lib/whatsapp-agent.ts`: importance gate (NIM call), command parser,
  find-open-ping, send-on-behalf (email). Keeps route files thin.
- Reuses `src/lib/email.ts` (sendEmail) and `src/lib/api-auth.ts`.

## Tasks (in dependency order)
1. **01-01** Migration `021_whatsapp_pings.sql` (+ DB types).
2. **01-02** `src/lib/whatsapp-agent.ts` (gate, parser, send).
3. **01-03** Cron route `/api/cron/whatsapp-agent`.
4. **01-04** Reply route `/api/whatsapp/reply`.
5. **01-05** Admin UI: nav item + WhatsApp page + reply flow.
6. **01-06** Demo seed pings (so the panel is populated on login) + verification.

## Verification
- `npx tsc --noEmit`, `npm run lint`, local dev curl for both API routes,
  gstack browse on /admin/whatsapp to confirm panel renders + reply posts,
  seed shows ≥1 ping with a proposed reply.

## Demo-only notes
- Mock numbers (`+1`/firm) stored literally; provider swap = replace lib send fn.
- Cron won't fire in dev; add a "Check now" button on the panel that calls the
  same worker logic (admin auth) so demo can trigger a ping live.