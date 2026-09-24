import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const ADMIN_EMAIL = 'tradeflow.hk@gmail.com';

export async function POST(req: Request) {
  try {
    const { name, email, company, phone } = await req.json();

    if (!name || !email || !company) {
      return NextResponse.json({ error: 'Name, email, and company are required' }, { status: 400 });
    }

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

    // Send email notification to admin
    if (resend) {
      try {
        await resend.emails.send({
          from: 'Vectra Demo Requests <onboarding@resend.dev>',
          to: ADMIN_EMAIL,
          replyTo: email,
          subject: `[Demo Request] ${company} - ${name}`,
          html: `
            <h2>New Demo Request</h2>
            <table style="border-collapse: collapse; width: 100%; max-width: 500px;">
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Name</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${name}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Email</td>
                <td style="padding: 8px; border: 1px solid #ddd;"><a href="mailto:${email}">${email}</a></td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Company</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${company}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Phone</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${phone || 'Not provided'}</td>
              </tr>
            </table>
            <p style="margin-top: 16px;">
              <a href="mailto:${email}?subject=Re: Vectra Demo Request" style="background:#000;color:white;padding:10px 20px;text-decoration:none;border-radius:4px;">Reply to ${name}</a>
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
