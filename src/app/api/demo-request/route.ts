import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { Resend } from 'resend';
import { checkRateLimit, createRateLimitResponse, getClientIp } from '@/lib/rate-limit';
import { escapeHtml } from '@/lib/html-escape';
import { normalizeDemoRequest } from '@/lib/demo-request';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const ADMIN_EMAIL = 'tradeflow.hk@gmail.com';

export async function POST(req: Request) {
  // Unauthenticated write + outbound notification. Without a throttle this is
  // a free lead-table-spam and mail-abuse endpoint (audit L2).
  const ip = getClientIp(req);
  const limit = checkRateLimit(`demo-request:${ip}`, { windowMs: 60_000, maxRequests: 5 });
  if (!limit.allowed) return createRateLimitResponse(limit.resetTime);

  try {
    const body = await req.json();
    const parsed = normalizeDemoRequest(body);

    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { name, email, company, phone } = parsed.value;

    // Store in demo_requests table
    const { error } = await supabaseAdmin.from('demo_requests').insert({
      name,
      email,
      company,
      phone: phone || null,
      status: 'pending',
    });

    if (error) {
      console.error('[demo-request] DB error:', error.message);
    }

    // Send email notification to admin. Every interpolated field is escaped:
    // these values are attacker-controlled and this HTML lands in an operator's
    // mail client.
    if (resend) {
      try {
        const safeName = escapeHtml(name);
        const safeEmail = escapeHtml(email);
        const safeCompany = escapeHtml(company);
        const safePhone = escapeHtml(phone || 'Not provided');

        await resend.emails.send({
          from: 'Sailwise Demo Requests <onboarding@resend.dev>',
          to: ADMIN_EMAIL,
          replyTo: email,
          subject: `[Demo Request] ${company} - ${name}`,
          html: `
            <h2>New Demo Request</h2>
            <table style="border-collapse: collapse; width: 100%; max-width: 500px;">
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Name</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${safeName}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Email</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${safeEmail}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Company</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${safeCompany}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Phone</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${safePhone}</td>
              </tr>
            </table>
            <p style="margin-top: 16px;">
              <a href="mailto:${encodeURIComponent(email)}" style="background:#000;color:white;padding:10px 20px;text-decoration:none;border-radius:4px;">Reply to ${safeName}</a>
            </p>
          `,
        });
      } catch (emailErr) {
        console.error('[demo-request] Email error:', emailErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[demo-request] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
