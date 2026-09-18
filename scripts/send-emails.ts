#!/usr/bin/env tsx

/**
 * Cold Email Sender for TradeFlow AI
 * 
 * Sends personalized cold emails to HK trading companies.
 * Uses Resend for delivery.
 * 
 * Usage:
 *   npx tsx scripts/send-emails.ts --dry-run
 *   npx tsx scripts/send-emails.ts --send --limit 10
 *   npx tsx scripts/send-emails.ts --send --company "Ace Trading"
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const DATA_DIR = join(import.meta.dirname || __dirname, '..', 'data', 'outreach');
const CONTACTS_FILE = join(DATA_DIR, 'contacts.json');
const LOG_FILE = join(DATA_DIR, 'send-log.json');

interface Contact {
  company_name: string;
  company_name_zh?: string;
  email?: string;
  phone?: string;
  website?: string;
  industry?: string;
  location?: string;
  source: string;
}

interface SendLog {
  company_name: string;
  email: string;
  template: string;
  sent_at: string;
  status: 'sent' | 'failed' | 'skipped';
  error?: string;
}

// ═══════════════════════════════════════════════════════════════
// Email Templates
// ═══════════════════════════════════════════════════════════════

type TemplateName = 'intro' | 'followup' | 'demo' | 'pain-point';

const templates: Record<TemplateName, {
  subject: (contact: Contact) => string;
  body: (contact: Contact) => string;
}> = {
  // ─── Template 1: Introduction ─────────────────────────────
  intro: {
    subject: (c) => `${c.company_name_zh || c.company_name} — 24/7 WhatsApp AI for your trading business`,
    body: (c) => `Hi ${c.company_name.split(' ')[0]},

I noticed ${c.company_name} handles ${c.industry || 'trading'} and probably gets WhatsApp inquiries from buyers around the world.

Quick question: when a buyer messages you at 2am London time, how fast do you reply?

If the answer is "not fast enough" — you're losing deals. Studies show 7x higher close rates when you reply within 1 hour.

TradeFlow is an AI assistant built specifically for HK trading companies. It answers WhatsApp inquiries instantly — product specs, MOQ, pricing, certifications — in any language, any timezone.

We're onboarding 5 pilot customers at HKD $500/mo (normally $1,500).

Interested in a 15-minute demo?

Best,
Kyle
TradeFlow AI
https://tradeflow-ai-rho.vercel.app`,
  },

  // ─── Template 2: Pain Point ──────────────────────────────
  'pain-point': {
    subject: (c) => `Lost a deal because of slow WhatsApp reply?`,
    body: (c) => `Hi ${c.company_name.split(' ')[0]},

Here's a scenario I see every week:

A US buyer messages an HK trading company at 2am HKT asking about stainless steel water bottles. Nobody replies until 9am. By then, the buyer already found a supplier in Shenzhen who replied at 3am.

That's $50,000 in revenue lost — because of a 7-hour response gap.

TradeFlow fixes this. Our AI responds to WhatsApp inquiries instantly with your product catalog, pricing, and certifications. Your team sleeps, your AI closes deals.

HKD $500/mo. No contracts. Setup in 5 minutes.

Want to see it in action?

Best,
Kyle
TradeFlow AI
https://tradeflow-ai-rho.vercel.app`,
  },

  // ─── Template 3: Follow-up ────────────────────────────────
  followup: {
    subject: (c) => `Re: ${c.company_name} — quick follow-up`,
    body: (c) => `Hi ${c.company_name.split(' ')[0]},

Just following up on my last email about TradeFlow — an AI WhatsApp assistant for trading companies.

I know you're busy, so here's the short version:

→ AI answers WhatsApp inquiries 24/7 in any language
→ Trained on YOUR product catalog and pricing
→ HKD $500/mo (pilot pricing — normally $1,500)
→ Setup takes 5 minutes

We already help trading companies respond to buyers 10x faster, even while their team sleeps.

Would a 10-minute call this week work?

Best,
Kyle
TradeFlow AI
https://tradeflow-ai-rho.vercel.app`,
  },

  // ─── Template 4: Demo Offer ────────────────────────────────
  demo: {
    subject: (c) => `See TradeFlow answer a real WhatsApp inquiry`,
    body: (c) => `Hi ${c.company_name.split(' ')[0]},

I recorded a 2-minute video showing TradeFlow answering a real WhatsApp inquiry:

→ Buyer asks: "Price for 1000 stainless steel water bottles?"
→ TradeFlow responds in 3 seconds with MOQ, pricing, and certifications
→ Buyer asks about custom logo
→ TradeFlow quotes $2.70/pc with free silk screen

This is what your customers could experience — 24/7, any language.

Want me to send you the demo video? Or better yet, let me set up a live demo with YOUR product catalog.

HKD $500/mo. No contracts.

Best,
Kyle
TradeFlow AI
https://tradeflow-ai-rho.vercel.app`,
  },
};

// ═══════════════════════════════════════════════════════════════
// Email Sender (Resend)
// ═══════════════════════════════════════════════════════════════

async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  
  if (!apiKey) {
    return { success: false, error: 'RESEND_API_KEY not set' };
  }
  
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Kyle at TradeFlow <kyle@tradeflow-ai.com>',
        to: [to],
        subject,
        html: html.replace(/\n/g, '<br>'),
        text: html,
      }),
    });
    
    if (!response.ok) {
      const data = await response.json();
      return { success: false, error: data.message || response.statusText };
    }
    
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// ═══════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const limit = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] || '10');
  const template = (args.find(a => a.startsWith('--template='))?.split('=')[1] || 'intro') as TemplateName;
  const specificCompany = args.find(a => a.startsWith('--company='))?.split('=')[1];
  
  console.log('📧 TradeFlow Cold Email Sender');
  console.log(`   Template: ${template}`);
  console.log(`   Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`   Limit: ${limit}`);
  console.log('');
  
  // Load contacts
  if (!existsSync(CONTACTS_FILE)) {
    console.log('❌ No contacts found. Run scrape-contacts.ts first.');
    process.exit(1);
  }
  
  const contacts: Contact[] = JSON.parse(readFileSync(CONTACTS_FILE, 'utf-8'));
  const contactsWithEmail = contacts.filter(c => c.email);
  
  console.log(`📊 Found ${contacts.length} contacts, ${contactsWithEmail.length} with email\n`);
  
  // Filter to specific company if provided
  let targets = specificCompany 
    ? contactsWithEmail.filter(c => c.company_name.toLowerCase().includes(specificCompany.toLowerCase()))
    : contactsWithEmail;
  
  // Apply limit
  targets = targets.slice(0, limit);
  
  if (targets.length === 0) {
    console.log('❌ No contacts match your criteria.');
    process.exit(1);
  }
  
  // Load send log
  let sendLog: SendLog[] = [];
  if (existsSync(LOG_FILE)) {
    sendLog = JSON.parse(readFileSync(LOG_FILE, 'utf-8'));
  }
  
  // Filter out already sent
  const alreadySent = new Set(sendLog.filter(s => s.status === 'sent').map(s => s.email));
  targets = targets.filter(c => !alreadySent.has(c.email!));
  
  console.log(`📤 Will send to ${targets.length} contacts:\n`);
  
  const newSendLog: SendLog[] = [];
  
  for (const contact of targets) {
    const tpl = templates[template];
    const subject = tpl.subject(contact);
    const body = tpl.body(contact);
    
    console.log(`   To: ${contact.email}`);
    console.log(`   Company: ${contact.company_name}`);
    console.log(`   Subject: ${subject}`);
    console.log('');
    
    if (dryRun) {
      console.log('   [DRY RUN] Would send email\n');
      newSendLog.push({
        company_name: contact.company_name,
        email: contact.email!,
        template,
        sent_at: new Date().toISOString(),
        status: 'skipped',
      });
      continue;
    }
    
    // Send email
    const result = await sendEmail(contact.email!, subject, body);
    
    newSendLog.push({
      company_name: contact.company_name,
      email: contact.email!,
      template,
      sent_at: new Date().toISOString(),
      status: result.success ? 'sent' : 'failed',
      error: result.error,
    });
    
    if (result.success) {
      console.log(`   ✅ Sent to ${contact.email}`);
    } else {
      console.log(`   ❌ Failed: ${result.error}`);
    }
    
    // Rate limit: 1 email per 2 seconds
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Save send log
  const allSendLog = [...sendLog, ...newSendLog];
  writeFileSync(LOG_FILE, JSON.stringify(allSendLog, null, 2));
  
  console.log(`\n📊 Summary:`);
  console.log(`   Sent: ${newSendLog.filter(s => s.status === 'sent').length}`);
  console.log(`   Failed: ${newSendLog.filter(s => s.status === 'failed').length}`);
  console.log(`   Skipped: ${newSendLog.filter(s => s.status === 'skipped').length}`);
  console.log(`   Total sent ever: ${allSendLog.filter(s => s.status === 'sent').length}`);
}

main().catch(console.error);
