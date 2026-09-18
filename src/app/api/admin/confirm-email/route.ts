import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Temporary endpoint to confirm a user's email
// TODO: Remove after SMTP is configured
export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Find the user
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) throw listError;

    const user = users.users.find((u: { email?: string }) => u.email === email);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Confirm the user's email
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      email_confirm: true,
    });

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, message: `Email confirmed for ${email}` });
  } catch (err) {
    console.error('[confirm-email] Error:', err);
    return NextResponse.json({ error: 'Failed to confirm email' }, { status: 500 });
  }
}
