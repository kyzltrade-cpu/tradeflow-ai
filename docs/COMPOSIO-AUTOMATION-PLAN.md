# TradeFlow AI — Composio Automation Plan

**Date:** September 16, 2026
**Status:** Planning

---

## Phase 1: Outreach & Lead Gen (This Week)

### 1. Cold Email Outreach via Gmail
**What:** Auto-send cold emails to 40 contacts, track opens, auto-follow-up
**Composio tools:** Gmail (send, track), Google Sheets (contact list)
**Setup steps:**
- Connect Gmail account via Composio OAuth
- Load contacts from `data/outreach/tradeflow-contacts.xlsx` into Google Sheet
- Script: iterate contacts → send personalized email → log to sheet
- Auto-follow-up after 3 days if no reply

### 2. Contact Spreadsheet Sync
**What:** Google Sheet ↔ TradeFlow contacts, auto-update on reply
**Composio tools:** Gmail (read replies), Google Sheets (read/write)
**Setup steps:**
- Create master contact sheet in Google Sheets
- On email reply detected → update sheet status (replied/interested/not interested)
- Sync back to `data/outreach/contacts.json`

### 3. LinkedIn Lead Research
**What:** Find HK trading company decision-makers, enrich data
**Composio tools:** LinkedIn (if available), Google Search
**Setup steps:**
- Search LinkedIn for "trading company" + "Hong Kong" + "import/export"
- Extract: name, title, company, LinkedIn URL
- Add to contact sheet with source tag

---

## Phase 2: Customer Operations (When You Have Customers)

### 4. Order Notifications
**What:** Log TradeFlow conversations to Sheets + Slack alert
**Composio tools:** Google Sheets, Slack
**Setup steps:**
- Create "Orders" sheet with columns: date, customer, product, value, status
- Webhook from TradeFlow → Composio → append row to sheet
- Slack message to #sales channel on new inquiry

### 5. Invoice Generation
**What:** Auto-generate invoices from Stripe payments
**Composio tools:** Stripe, Google Docs
**Setup steps:**
- On Stripe payment intent created → pull customer + amount
- Generate invoice from template → save to Google Drive
- Email invoice to customer via Gmail

### 6. Calendar Follow-ups
**What:** Auto-schedule follow-up when deals go stale
**Composio tools:** Google Calendar, Gmail
**Setup steps:**
- Check Deals sheet daily for "no activity > 3 days"
- Create Google Calendar event: "Follow up with [company]"
- Send reminder email to yourself

---

## Phase 3: Marketing & Intelligence

### 7. Content Distribution
**What:** Write once, post to LinkedIn/X/Threads
**Composio tools:** LinkedIn, X/Twitter, Threads
**Setup steps:**
- Create content in TradeFlow blog/Notion
- Composio posts to all platforms with platform-specific formatting
- Track engagement metrics back to sheet

### 8. Competitor Monitoring
**What:** Track Respond.io/SleekFlow/Wati pricing changes
**Composio tools:** Web scraping (via Composio or Firecrawl)
**Setup steps:**
- Weekly scrape of competitor pricing pages
- Diff against previous version
- Alert if price changed

### 9. HKTDC Monitoring
**What:** Scrape new HK trading company listings monthly
**Composio tools:** Web scraping, Google Sheets
**Setup steps:**
- Monthly scrape of HKTDC supplier directory
- Filter for new companies not in contact list
- Add to outreach sheet with "HKTDC" source tag

---

## Execution Order

1. **Connect Gmail** (enables #1, #2, #6, #7)
2. **Create Google Sheet** (master contact + orders)
3. **Set up cold email sequence** (#1)
4. **Set up reply tracking** (#2)
5. **LinkedIn research** (#3)
6. **Slack + Sheets for orders** (#4)
7. **Calendar follow-ups** (#6)
8. **Content distribution** (#7)
9. **Competitor monitoring** (#8)
10. **HKTDC monitoring** (#9)

## Prerequisites
- [x] Composio API key obtained
- [ ] Gmail account connected via Composio
- [ ] Google Sheets API enabled
- [ ] Slack workspace connected
- [ ] LinkedIn account connected
- [ ] X/Twitter account connected
