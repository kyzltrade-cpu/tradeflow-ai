# Sailwise — Inquiry-to-Quote Platform

## Vision

A trading operations copilot that turns inbound customer requests into priced,
approved, sent quotes — automatically.

## Product pillars

1. **Inbox intelligence** — auto-generates opportunities, draft quotes, and
   price-source citations from inbound email/rfq.
2. **Single workflow surface** — one admin workspace (inbox, approvals, chat,
   composer) where the firm reviews and ships.
3. **Out-of-band alerting** — the firm should be reachable even when not at the
   desk (WhatsApp agent).

## Current focus

### Phase 1: WhatsApp agent (MVP)

When an important inbound email arrives, a WhatsApp agent pings the firm via
WhatsApp with a summary + a proposed reply. The firm approves, edits, or sends
from WhatsApp using text commands; the agent sends the reply on their behalf
via the existing email send path.

Decisions (locked 2026-09-26):
- **Scope:** MVP — detect → notify → reply-on-behalf.
- **Channel:** Mock/simulated WhatsApp first (demo + local), real WhatsApp
  Business API later.
- **Reply model:** Text commands — `approve`, `edit …`, `send …`.

## Deploy & demo

- Production: `tradeflow-ai-rho.vercel.app` (Vercel).
- Demo login: `demo@broadust.io` / `DemoTrade2026!`.
- Local dev: `http://localhost:3999`.