# Roadmap

## Phase 01 — WhatsApp agent MVP
Status: PLANNED

- [ ] 01-01 Data model + migration (`whatsapp_pings`)
- [ ] 01-02 Importance detection + ping generation (cron worker)
- [ ] 01-03 Mock WhatsApp API layer (in/out, simulated sender id)
- [ ] 01-04 Reply command parser (approve / edit / send) + send-on-behalf
- [ ] 01-05 Admin UI: WhatsApp panel (thread view, ping bubble, reply box)
- [ ] 01-06 Demo seed + verification

## Later (not committed)
- Real WhatsApp Business API (twilio/meta) inbound webhooks + outbound templates
- Two-way conversation sync (label, seen, continuity)
- Per-company routing + multiple firm numbers
- Auto-approve trust rules