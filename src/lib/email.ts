/**
 * Email sending utility using Resend.
 *
 * Centralises all outbound email so every route uses the same
 * sender config, error handling, and audit logging.
 */

import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY;

let resendClient: Resend | null = null;

function getClient(): Resend | null {
  if (!RESEND_API_KEY) return null;
  if (!resendClient) {
    resendClient = new Resend(RESEND_API_KEY);
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
  from?: string;
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
}

// ---------------------------------------------------------------------------
// Send email
// ---------------------------------------------------------------------------

/**
 * Sends an email via Resend. Returns the Resend message ID on success.
 *
 * @param params - Email parameters (to, subject, html required).
 * @returns SendEmailResult with success flag and optional id/error.
 */
export async function sendEmail(
  params: SendEmailParams
): Promise<SendEmailResult> {
  const client = getClient();

  if (!client) {
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  const {
    to,
    subject,
    html,
    text,
    from,
    replyTo,
    cc,
    bcc,
    attachments,
  } = params;

  if (!to || (Array.isArray(to) && to.length === 0)) {
    return { success: false, error: "No recipient provided" };
  }

  if (!subject || !html) {
    return { success: false, error: "Subject and HTML body are required" };
  }

  try {
    const result = await client.emails.send({
      from: from || "Sailwise <onboarding@resend.dev>",
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text: text || stripHtml(html),
      replyTo: replyTo || undefined,
      cc: cc ? (Array.isArray(cc) ? cc : [cc]) : undefined,
      bcc: bcc ? (Array.isArray(bcc) ? bcc : [bcc]) : undefined,
      attachments: attachments?.map((a) => ({
        filename: a.filename,
        content: typeof a.content === "string"
          ? Buffer.from(a.content)
          : a.content,
        contentType: a.contentType,
      })),
    });

    if (result.error) {
      console.error("[email] Resend API error:", result.error);
      return { success: false, error: result.error.message || "Send failed" };
    }

    return { success: true, id: result.data?.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[email] Send failed:", message);
    return { success: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Strips HTML tags to produce a plain-text fallback.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Returns true if Resend is configured and ready to send.
 */
export function isEmailConfigured(): boolean {
  return !!RESEND_API_KEY;
}
