# TradeFlow AI — Full Pricing Strategy

**Date:** September 15, 2026
**Status:** Active strategy document

---

## Executive Summary

TradeFlow AI pricing follows a **4-phase trust ladder**: start with a low-risk WhatsApp-only entry point, expand channels and AI capabilities, then capture transaction value as customers deepen platform usage. This maximizes land-and-expand revenue while maintaining healthy margins at every tier.

**Key pricing decisions based on data:**
- Entry price: HKD $500/mo (WhatsApp-only) — not $800, to maximize first-customer acquisition in a niche with no direct competitors
- WeChat Work: included in Professional ($1,500) — not Starter — to preserve margin and drive upgrades
- Transaction fees (1-3%): Phase 4 revenue multiplier, not a replacement for subscription
- Annual plans: 20% discount to improve cash flow and reduce churn

---

## 1. Cost Per Customer Analysis

### Variable Costs (per customer/month, HK market)

| Cost Component | Light Usage | Medium Usage | Heavy Usage | Notes |
|---------------|-------------|-------------|-------------|-------|
| WhatsApp API (Meta fees) | $12 | $45 | $120 | HK rate: $0.084 marketing, $0.03 utility/msg |
| WeChat Work API | $0 | $10 | $20 | Only on Professional+ |
| AI inference (LLM) | $3 | $12 | $35 | OpenAI/Anthropic, ~$0.02-0.05/conversation |
| Supabase (DB + Auth) | $1 | $3 | $5 | Shared infra across customers |
| Vercel (hosting) | $1 | $2 | $3 | Edge functions + static |
| **Total variable cost** | **$17** | **$72** | **$183** | |

### Fixed Costs (monthly, across all customers)

| Cost | Amount | Notes |
|------|--------|-------|
| WhatsApp BSP fees | $39-99 | Per business number |
| OpenAI/Anthropic API | $50-200 | Shared across customers |
| Supabase Pro | $25 | Database + auth |
| Vercel Pro | $20 | Hosting |
| Domain + DNS | $2 | Cloudflare |
| **Total fixed** | **$136-346** | |

### Break-Even Analysis

| Scenario | Variable cost/customer | Fixed costs | Break-even customers |
|----------|----------------------|-------------|---------------------|
| At $500/mo | $72 (medium) | $240 | ~1 customer |
| At $1,500/mo | $120 (medium + WeChat) | $240 | ~1 customer |
| At $3,500/mo | $280 (heavy + all features) | $346 | ~1 customer |

**Verdict:** Even at 1 customer per tier, you're profitable. The model works.

---

## 2. Competitor Pricing Landscape

### Direct Competitors (WhatsApp AI / Omnichannel)

| Platform | Entry | Mid | Premium | AI Included? | WeChat? |
|----------|-------|-----|---------|-------------|---------|
| Respond.io | $79/mo | $159/mo | $279/mo | No (Growth+) | No |
| SleekFlow | Free | $149/mo | $349/mo | Yes (AI plans) | Yes |
| Wati | $49/mo | $119/mo | $279/mo | No (add-on) | No |
| Hyperleap | $40/mo | $100/mo | $200/mo | Yes (RAG) | No |

### What They Charge For (that TradeFlow includes free)

| Feature | Respond.io | SleekFlow | Wati | TradeFlow Starter |
|---------|-----------|-----------|------|-------------------|
| WhatsApp AI agent | $159+ | $149+ | $119+ | **Included** |
| WeChat Work | Not offered | $349+ | Not offered | **$1,500** |
| Knowledge base | $159+ | $149+ | $119+ | **Included** |
| Custom AI personality | $279+ | $349+ | $279+ | **Included** |
| Multi-language | $79+ | $149+ | $49+ | **Included** |
| Human takeover | $79+ | $149+ | $49+ | **Included** |

### Key Insight

No competitor offers **AI-powered WhatsApp + WeChat Work + Knowledge Base + Custom AI** in a single package under $300/mo. TradeFlow's $500 Starter (WhatsApp-only) and $1,500 Professional (WhatsApp + WeChat) are both **50-80% cheaper** than comparable competitor bundles.

---

## 3. Pricing Tiers — All Phases

### Phase 1: Current (WhatsApp AI Only)

| | Starter | Professional | Enterprise |
|--|---------|-------------|-----------|
| **Price** | HKD $500/mo | HKD $1,500/mo | HKD $3,500/mo |
| **USD equiv** | ~$64 | ~$192 | ~$449 |
| **Annual price** | HKD $400/mo | HKD $1,200/mo | HKD $2,800/mo |
| **Target** | Solo traders, small teams | Growing trading companies | Large trading operations |
| **Channels** | WhatsApp only | WhatsApp + WeChat Work | WhatsApp + WeChat Work |
| **AI** | Standard | Better AI (finetuned) | Best AI + custom training |
| **Conversations** | Unlimited | Unlimited | Unlimited |
| **Products & FAQ** | Unlimited | Unlimited | Unlimited |
| **Languages** | EN, ZH-Hans, ZH-Hant | EN, ZH-Hans, ZH-Hant | EN, ZH-Hans, ZH-Hant + custom |
| **Human override** | Yes | Yes | Yes |
| **Knowledge base** | Yes | Yes | Yes |
| **Custom AI personality** | Yes | Yes | Yes |
| **Multi-user dashboard** | No | Yes (up to 5) | Unlimited |
| **Analytics** | Basic | Advanced | Advanced + custom reports |
| **Priority support** | Email | Email + chat | Dedicated account manager |
| **AI sourcing** | No | No | Yes |
| **Quote generation** | No | No | Yes (automated) |
| **Custom integrations** | No | No | Yes |

**Margin analysis (medium usage):**

| Tier | Price | Cost | Gross Margin | Margin % |
|------|-------|------|-------------|----------|
| Starter | $64 | $17 | $47 | 73% |
| Professional | $192 | $72 | $120 | 63% |
| Enterprise | $449 | $183 | $266 | 59% |

### Phase 2: WeChat + Enhanced AI (Current Professional becomes core)

*No pricing change — this is already reflected above.*

### Phase 3: AI Sourcing + Quote Automation

Adds to Enterprise tier:
- AI-powered supplier matching from HKTDC, Alibaba, Made-in-China
- Automated quote generation with margin calculation
- Order tracking integration
- **No price increase** — Enterprise stays at $3,500/mo

### Phase 4: Transaction Fees (Vertical Integration)

When TradeFlow facilitates orders between buyers and suppliers:

| Transaction Type | Fee | Basis |
|-----------------|-----|-------|
| Order facilitated via AI matching | 1.5% | Order value |
| Quote accepted + payment processed | 2.0% | Order value |
| Trade finance arranged | 2.5% | financed amount |
| Exclusive supplier match | 3.0% | First-year order value |

**Revenue model at scale (50 Enterprise customers):**

| Metric | Conservative | Moderate | Aggressive |
|--------|-------------|----------|-----------|
| Avg order value | $20,000 | $50,000 | $100,000 |
| Orders/customer/mo | 2 | 4 | 6 |
| Total GMV/mo | $2M | $10M | $30M |
| Take rate | 1.5% | 2.0% | 2.5% |
| **Transaction revenue/mo** | **$30,000** | **$200,000** | **$750,000** |

### Future Add-Ons (Phase 2+)

| Add-On | Price | Target |
|--------|-------|--------|
| Additional WhatsApp number | +HKD $200/mo | Companies with multiple sales teams |
| Additional WeChat Work seat | +HKD $100/mo/user | Large teams |
| LINE integration (Taiwan) | +HKD $300/mo | Taiwan expansion |
| SMS channel | +HKD $150/mo | Markets with low WhatsApp penetration |
| Premium AI (GPT-4o / Claude) | +HKD $200/mo | Power users wanting best AI |
| API access | +HKD $500/mo | Companies building custom integrations |
| **Composio integrations** | +HKD $300/mo | Connect Gmail, CRM, calendars, etc. |
| White-label | +HKD $1,000/mo | Resellers and agencies |
| Dedicated instance | +HKD $2,000/mo | Enterprise with compliance requirements |

### Composio Integration (Phase 2+)

Let customers connect their existing tools to TradeFlow AI via Composio:
- **Gmail/Outlook** — auto-reply to trade inquiries from email
- **Google Sheets/Excel** — sync product catalogs and order data
- **CRM (HubSpot, Salesforce)** — log conversations and deals
- **Calendars** — schedule follow-ups and meetings
- **Slack/Teams** — internal notifications on new orders
- **500+ other apps** via Composio's toolkit marketplace

**Positioning:** "Connect your Gmail to auto-reply to trade inquiries" = strong upsell
**Pricing:** +HKD $300/mo add-on, or included in Enterprise tier
**Tech:** Composio MCP + SDK (`@composio/core`), managed OAuth per customer

---

## 4. Pricing by Market

### Hong Kong (Primary Market)

| Tier | HKD | USD | Rationale |
|------|-----|-----|-----------|
| Starter | $500 | $64 | Below Respond.io entry ($79), includes AI |
| Professional | $1,500 | $192 | Below SleekFlow AI ($149) + Respond Growth ($159) combined |
| Enterprise | $3,500 | $449 | Premium for sourcing + quotes + dedicated support |

### Shenzhen / Guangdong (Phase 2)

| Tier | CNY | USD | Rationale |
|------|-----|-----|-----------|
| Starter | ¥400 | $55 | Adjusted for local purchasing power |
| Professional | ¥1,200 | $165 | Same logic |
| Enterprise | ¥2,800 | $385 | Same logic |

### Taiwan (Phase 3 — requires LINE integration)

| Tier | TWD | USD | Rationale |
|------|-----|-----|-----------|
| Starter | $2,000 | $62 | WhatsApp + LINE |
| Professional | $6,000 | $186 | WhatsApp + LINE + WeChat |
| Enterprise | $14,000 | $434 | Full suite |

---

## 5. Unit Economics Summary

### Per-Customer LTV by Tier

| Tier | Monthly price | Gross margin | Avg lifespan | **LTV** | CAC target (3:1) |
|------|-------------|-------------|-------------|---------|------------------|
| Starter | $64 | $47 | 12 months | $564 | $188 |
| Professional | $192 | $120 | 18 months | $2,160 | $720 |
| Enterprise | $449 | $266 | 24 months | $6,384 | $2,128 |

### Revenue Targets

| Milestone | Customers | MRR | ARR | Mix |
|-----------|-----------|-----|-----|-----|
| First 5 | 5 | $3,800 | $45,600 | 5 Starter |
| 20 customers | 15+5 | $7,400 | $88,800 | 15 Starter + 5 Pro |
| 50 customers | 30+15+5 | $26,200 | $314,400 | 30 Starter + 15 Pro + 5 Enterprise |
| 100 customers | 50+35+15 | $51,000 | $612,000 | + transaction fees |

---

## 6. Pricing Experiments to Run

| Experiment | Variable A | Variable B | Success metric |
|-----------|-----------|-----------|---------------|
| Entry price | $500/mo | $800/mo | First 5 customers in 30 days |
| Annual discount | 20% | 15% | Annual plan conversion rate |
| WeChat in Starter | Excluded | Included | Upgrade rate to Professional |
| Free trial | 14 days | 7 days | Trial-to-paid conversion |
| Usage caps | Unlimited | 1,000 convos/mo | Churn rate at month 3 |

---

## 7. Pricing Guardrails

1. **Never discount below cost.** Floor: 60% gross margin on any plan.
2. **Annual plans always 15-20% discount.** Improves cash flow and reduces churn.
3. **Transaction fees are additive, not replacement.** Subscription is the base; transactions are upside.
4. **Price increases: 5-10% annually at renewal.** Industry standard for B2B SaaS.
5. **No grandfathering beyond 12 months.** New prices apply at annual renewal.
6. **Usage-based components must have caps.** Predictability matters more than maximization.

---

## 8. Competitive Response Playbook

| If competitor... | We respond... |
|-----------------|--------------|
| Cuts prices | Emphasize AI value, not price. "They charge $149 for an inbox. We give you AI that closes deals." |
| Copies AI features | Move faster on WeChat + trade-specific features. They can't match domain expertise. |
| Offers free tier | Let them. Free users don't convert. Focus on paying customers. |
| Raises prices | Highlight our value gap. "Their $279 plan doesn't include WeChat or AI sourcing." |
| Enters HK market | Leverage first-mover advantage and local relationships. |
