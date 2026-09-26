/**
 * Email sending utility using Resend.
 *
 * Centralises all outbound email so every route uses the same sender
 * resolution, error handling, and audit logging.
 *
 * Sender resolution order (first hit wins):
 *   1. `params.from` — unless it is the Resend sandbox address
 *      (`*@resend.dev`), which only ever delivers back to the Resend
 *      account owner and is therefore never a valid customer sender.
 *   2. `params.companyId` — the company's own sending identity
 *      (`company_settings.email_from_email` / `companies.email_sender_name`),
 *      or the mailbox address of the customer's connected Gmail/Outlook
 *      account when one is connected.
 *   3. Platform default from `EMAIL_FROM_ADDRESS` / `EMAIL_FROM_NAME`.
 *   4. Otherwise the send is refused with `EMAIL_SENDER_NOT_CONFIGURED` —
 *      a customer must never receive a quote from a dead sandbox address.
 *
 * No Resend key configured never throws: it returns a structured failure so
 * routes can surface "email not configured" instead of crashing.
 */

import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabase";

/** Resend's shared sandbox domain. Not deliverable to third parties. */
const RESEND_SANDBOX_DOMAIN = "@resend.dev";

/** Stable error codes so routes can map failures to HTTP status + copy. */
export const EMAIL_ERROR_CODES = {
  NOT_CONFIGURED: "EMAIL_NOT_CONFIGURED",
  SENDER_NOT_CONFIGURED: "EMAIL_SENDER_NOT_CONFIGURED",
  NO_RECIPIENT: "EMAIL_NO_RECIPIENT",
  INVALID_PARAMS: "EMAIL_INVALID_PARAMS",
  SEND_FAILED: "EMAIL_SEND_FAILED",
} as const;

let resendClient: Resend | null = null;
let resendClientKey: string | null = null;

function getApiKey(): string | null {
  const key = process.env.RESEND_API_KEY;
  return key && key.trim() ? key.trim() : null;
}

/**
 * Returns a Resend client, or null when the deployment has no API key.
 * Never throws — a missing key is a configuration state, not an error.
 */
function getClient(): Resend | null {
  const key = getApiKey();
  if (!key) return null;
  if (!resendClient || resendClientKey !== key) {
    resendClient = new Resend(key);
    resendClientKey = key;
  }
  return resendClient;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  /**
   * Explicit sender, e.g. `Acme Trading <sales@acme.com>`. Wins over every
   * other source unless it points at the Resend sandbox domain.
   */
  from?: string;
  /**
   * Company to resolve the sending identity from. Optional: routes that pass
   * an explicit `from` keep working unchanged.
   */
  companyId?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

export interface SendEmailResult {
  success: boolean;
  id?: string;
  error?: string;
  code?: string;
  /** Resolved sender actually used, for audit logs and support. */
  from?: string;
}

export interface ResolvedSender {
  /** RFC 5322 sender, or null when nothing usable is configured. */
  from: string | null;
  replyTo?: string;
  /** Where the sender came from — surfaced in audit metadata. */
  source:
    | "param"
    | "connected-mailbox"
    | "company-settings"
    | "company-default"
    | "platform"
    | "none";
  /** The customer's own mailbox address when a mailbox is connected. */
  mailboxAddress?: string | null;
  /** True when the request asked for the Resend sandbox address. */
  sandboxRequested?: boolean;
  error?: string;
  code?: string;
}

// ---------------------------------------------------------------------------
// Sender resolution
// ---------------------------------------------------------------------------

/** `Acme <a@b.com>` from a loose address or name+address pair. */
export function formatFromAddress(name: string | null | undefined, address: string): string {
  const clean = address.trim();
  if (!name || !name.trim()) return clean;
  // Already fully formed — don't double-wrap.
  if (clean.includes("<")) return clean;
  return `${name.trim()} <${clean}>`;
}

function isSandboxSender(from: string | undefined | null): boolean {
  if (!from) return false;
  return from.toLowerCase().includes(RESEND_SANDBOX_DOMAIN);
}

function parseAddress(value: string | null | undefined): string | null {
  if (!value) return null;
  const angle = value.match(/<([^>]+)>/);
  const raw = (angle ? angle[1] : value).trim().toLowerCase();
  return raw.includes("@") ? raw : null;
}

type CompanyIdentity = {
  from: string | null;
  mailboxAddress: string | null;
  senderName: string | null;
  domain: string | null;
};

async function loadCompanyIdentity(companyId: string): Promise<CompanyIdentity> {
  const empty: CompanyIdentity = { from: null, mailboxAddress: null, senderName: null, domain: null };
  try {
    const [{ data: settings }, { data: company }] = await Promise.all([
      supabaseAdmin
        .from("company_settings")
        .select("email_from_email, email_from_name")
        .eq("company_id", companyId)
        .maybeSingle(),
      supabaseAdmin
        .from("companies")
        .select("email_sender_name, email_domain")
        .eq("id", companyId)
        .maybeSingle(),
    ]);

    const configured = parseAddress(settings?.email_from_email);
    const senderName = (settings?.email_from_name || company?.email_sender_name || "").trim() || null;
    const domain = (company?.email_domain || "").trim().toLowerCase() || null;

    return {
      from: configured ? formatFromAddress(senderName, configured) : null,
      mailboxAddress: configured,
      senderName,
      domain,
    };
  } catch (err) {
    console.error("[email] company identity lookup failed:", err);
    return empty;
  }
}

/**
 * Resolves the sender for an outbound email.
 *
 * Never throws. Returns `{ from: null, code }` when no usable sender exists so
 * the caller can refuse the send instead of mailing a dead address.
 */
export async function resolveSender(params: {
  from?: string | null;
  companyId?: string | null;
  useConnectedMailbox?: boolean;
}): Promise<ResolvedSender> {
  const explicit = params.from?.trim() || null;
  const sandboxRequested = isSandboxSender(explicit);
  const allowSandbox = /^(1|true|yes)$/i.test(process.env.ALLOW_RESEND_SANDBOX_SENDER || "");

  if (explicit && !sandboxRequested) {
    return { from: explicit, source: "param" };
  }
  if (sandboxRequested && allowSandbox) {
    return { from: explicit, source: "param", sandboxRequested: true };
  }

  if (params.companyId) {
    // The customer's own connected mailbox takes priority: replies then go out
    // from the address the buyer already writes to.
    if (params.useConnectedMailbox !== false) {
      const mailbox = await getConnectedMailbox(params.companyId);
      if (mailbox?.address) {
        return {
          from: mailbox.address,
          mailboxAddress: mailbox.address,
          source: "connected-mailbox",
        };
      }
    }

    const identity = await loadCompanyIdentity(params.companyId);
    if (identity.from) {
      return {
        from: identity.from,
        replyTo: identity.domain ? `noreply@${identity.domain}` : undefined,
        mailboxAddress: identity.mailboxAddress,
        source: identity.mailboxAddress ? "company-settings" : "company-default",
      };
    }
  }

  const platformAddress = parseAddress(process.env.EMAIL_FROM_ADDRESS);
  if (platformAddress) {
    return {
      from: formatFromAddress(process.env.EMAIL_FROM_NAME || "Sailwise", platformAddress),
      source: "platform",
    };
  }

  return {
    from: null,
    source: "none",
    sandboxRequested: sandboxRequested || undefined,
    error: sandboxRequested
      ? "No verified sending address is configured — set EMAIL_FROM_ADDRESS (or connect a mailbox) before sending to customers."
      : "No sending address is configured for this account.",
    code: EMAIL_ERROR_CODES.SENDER_NOT_CONFIGURED,
  };
}

/**
 * The customer's connected Gmail/Outlook address, when Composio is configured
 * and a mailbox connection is ACTIVE. Imported lazily so a missing or broken
 * Composio setup can never break the send path.
 *
 * Cached briefly per company: a burst of sends (quote + follow-ups) must not
 * turn into one Composio round-trip per email, and a stale connection should
 * disappear quickly after a disconnect.
 */
const MAILBOX_CACHE_TTL_MS = 60_000;
const mailboxCache = new Map<
  string,
  { at: number; mailbox: { address: string; provider: string; connectedAccountId: string } | null }
>();

export async function getConnectedMailbox(
  companyId: string
): Promise<{ address: string; provider: string; connectedAccountId: string } | null> {
  if (!process.env.COMPOSIO_API_KEY) return null;

  const cached = mailboxCache.get(companyId);
  if (cached && Date.now() - cached.at < MAILBOX_CACHE_TTL_MS) return cached.mailbox;

  try {
    const { getCompanyMailbox } = await import("@/lib/composio");
    const mailbox = await getCompanyMailbox(companyId);
    mailboxCache.set(companyId, { at: Date.now(), mailbox });
    return mailbox;
  } catch (err) {
    console.error("[email] connected mailbox lookup failed:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Send email
// ---------------------------------------------------------------------------

/**
 * Sends an email via Resend. Returns the Resend message ID on success.
 *
 * @param params - Email parameters (to, subject, html required).
 * @returns SendEmailResult with success flag and optional id/error/code.
 */
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const {
    to,
    subject,
    html,
    text,
    from,
    companyId,
    replyTo,
    cc,
    bcc,
    attachments,
  } = params;

  if (!to || (Array.isArray(to) && to.length === 0)) {
    return { success: false, error: "No recipient provided", code: EMAIL_ERROR_CODES.NO_RECIPIENT };
  }

  if (!subject || !html) {
    return {
      success: false,
      error: "Subject and HTML body are required",
      code: EMAIL_ERROR_CODES.INVALID_PARAMS,
    };
  }

  const client = getClient();
  if (!client) {
    return {
      success: false,
      error: "Outbound email is not configured on this deployment (RESEND_API_KEY missing).",
      code: EMAIL_ERROR_CODES.NOT_CONFIGURED,
    };
  }

  const sender = await resolveSender({ from, companyId });
  if (!sender.from) {
    return {
      success: false,
      error: sender.error || "No sending address configured.",
      code: sender.code || EMAIL_ERROR_CODES.SENDER_NOT_CONFIGURED,
    };
  }
  if (sender.sandboxRequested) {
    console.warn(
      "[email] Requested sender was the Resend sandbox address — replaced with the configured sender."
    );
  }

  try {
    const result = await client.emails.send({
      from: sender.from,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text: text || stripHtml(html),
      replyTo: replyTo || sender.replyTo || undefined,
      cc: cc ? (Array.isArray(cc) ? cc : [cc]) : undefined,
      bcc: bcc ? (Array.isArray(bcc) ? bcc : [bcc]) : undefined,
      attachments: attachments?.map((a) => ({
        filename: a.filename,
        content: typeof a.content === "string" ? Buffer.from(a.content) : a.content,
        contentType: a.contentType,
      })),
    });

    if (result.error) {
      console.error("[email] Resend API error:", result.error);
      return {
        success: false,
        error: result.error.message || "Send failed",
        code: EMAIL_ERROR_CODES.SEND_FAILED,
        from: sender.from,
      };
    }

    return { success: true, id: result.data?.id, from: sender.from };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[email] Send failed:", message);
    return { success: false, error: message, code: EMAIL_ERROR_CODES.SEND_FAILED, from: sender.from };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Strips HTML tags to produce a plain-text fallback.
 */
export function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Returns true if Resend is configured and ready to send.
 */
export function isEmailConfigured(): boolean {
  return getApiKey() !== null;
}

export interface EmailStatus {
  /** Resend API key present. */
  configured: boolean;
  /** A verified platform sender is configured. */
  senderConfigured: boolean;
  /** Resolved platform sender, or null. */
  defaultFrom: string | null;
  /** Human-readable gate description for operators. */
  gate: string | null;
}

/**
 * Non-secret description of the outbound email configuration, for status
 * routes, health checks, and the env audit. Never includes key material.
 */
export function getEmailStatus(): EmailStatus {
  const configured = isEmailConfigured();
  const platformAddress = parseAddress(process.env.EMAIL_FROM_ADDRESS);
  const defaultFrom = platformAddress
    ? formatFromAddress(process.env.EMAIL_FROM_NAME || "Sailwise", platformAddress)
    : null;

  let gate: string | null = null;
  if (!configured) {
    gate = "RESEND_API_KEY is not set — outbound email is disabled.";
  } else if (!defaultFrom) {
    gate =
      "EMAIL_FROM_ADDRESS is not set — sends have no verified sender, so they are refused unless a company connects its own mailbox.";
  }

  return { configured, senderConfigured: defaultFrom !== null, defaultFrom, gate };
}
