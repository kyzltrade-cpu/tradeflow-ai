# TradeFlow AI — Cold Email Outreach Scripts

## Setup

```bash
# Install dependencies
npm install tsx --save-dev

# Set Resend API key (for sending)
export RESEND_API_KEY=re_xxxxx
```

## Workflow

### Step 1: Scrape contacts

```bash
# Run the scraper (creates data/outreach/contacts.json)
npx tsx scripts/scrape-contacts.ts

# Or import from a CSV file
npx tsx scripts/scrape-contacts.ts --import-hktdc
npx tsx scripts/scrape-contacts.ts --import-icris
```

### Step 2: Review contacts

Open `data/outreach/contacts.json` and verify the data. Fill in missing emails.

### Step 3: Send emails

```bash
# Dry run (preview what would be sent)
npx tsx scripts/send-emails.ts --dry-run

# Send to first 10 contacts
npx tsx scripts/send-emails.ts --send --limit 10

# Send specific template
npx tsx scripts/send-emails.ts --send --template=pain-point --limit 5

# Send to specific company
npx tsx scripts/send-emails.ts --send --company="Ace Trading"
```

## Templates

| Template | Subject | Use Case |
|----------|---------|----------|
| `intro` | TradeFlow — 24/7 WhatsApp AI | First touch, general outreach |
| `pain-point` | Lost a deal because of slow reply? | Emotional trigger, high open rates |
| `demo` | See TradeFlow answer a real WhatsApp inquiry | Product-focused, builds curiosity |
| `followup` | Re: TradeFlow — quick follow-up | Follow-up after no response |

## Tracking

Send logs are saved to `data/outreach/send-log.json`. Each entry includes:
- Company name
- Email
- Template used
- Timestamp
- Status (sent/failed/skipped)
- Error message (if failed)

## Tips

1. **Start with pain-point template** — it has the highest open rates
2. **Send 50-100 emails/day max** — avoid spam filters
3. **Follow up after 3 days** — use the followup template
4. **Personalize** — edit the templates to add company-specific details
5. **Track replies** — mark replied contacts in the send log
