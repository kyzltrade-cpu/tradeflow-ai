import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';
import { Resend } from 'resend';

const ADMIN_EMAIL = 'tradeflow.hk@gmail.com';
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// GET — fetch pending companies and demo requests (admin only)
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof Response) return auth;

    // Check if user is admin
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('email')
      .eq('id', auth.user.id)
      .single();

    if (user?.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch pending companies
    const { data: companies } = await supabaseAdmin
      .from('companies')
      .select('id, name, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    // Fetch demo requests
    const { data: demoRequests } = await supabaseAdmin
      .from('demo_requests')
      .select('*')
      .order('created_at', { ascending: false });

    return NextResponse.json({
      companies: companies || [],
      demoRequests: demoRequests || [],
    });
  } catch (err) {
    console.error('[pending-companies:GET] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST — approve or reject a company (admin only)
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof Response) return auth;

    // Check if user is admin
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('email')
      .eq('id', auth.user.id)
      .single();

    if (user?.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { company_id, action } = await req.json();

    if (!company_id || !action) {
      return NextResponse.json({ error: 'Missing company_id or action' }, { status: 400 });
    }

    if (action === 'approve') {
      const { error } = await supabaseAdmin
        .from('companies')
        .update({ status: 'approved' })
        .eq('id', company_id);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      // Send approval email to user
      if (resend) {
        try {
          // Get company owner's email
          const { data: owner } = await supabaseAdmin
            .from('users')
            .select('email')
            .eq('company_id', company_id)
            .single();

          if (owner?.email) {
            await resend.emails.send({
              from: 'Sailwise <onboarding@resend.dev>',
              to: owner.email,
              replyTo: 'tradeflow.hk@gmail.com',
              subject: 'Your Sailwise account has been approved!',
              html: `
                <h2>Welcome to Sailwise!</h2>
                <p>Your account has been approved. You can now access your dashboard and start setting up your AI assistant.</p>
                <p><a href="https://tradeflow-ai-rho.vercel.app/admin" style="background:#000;color:white;padding:12px 24px;text-decoration:none;border-radius:4px;">Go to Dashboard</a></p>
                <p>Need help? Reply to this email or contact tradeflow.hk@gmail.com</p>
              `,
            });
          }
        } catch (emailErr) {
          console.error('[pending-companies] Failed to send approval email:', emailErr);
        }
      }
    } else if (action === 'reject') {
      const { error } = await supabaseAdmin
        .from('companies')
        .update({ status: 'suspended' })
        .eq('id', company_id);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[pending-companies:POST] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
