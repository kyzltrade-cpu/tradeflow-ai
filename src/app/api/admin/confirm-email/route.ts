import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { supabaseAdmin } from '@/lib/supabase';

// Operator-only escape hatch for confirming an account while SMTP is not yet
// configured. Gated behind CONFIRM_EMAIL_SECRET and FAILS CLOSED: when the
// secret is unset this route is indistinguishable from a missing one.
//
// This previously accepted an arbitrary `email` from anyone on the internet and
// confirmed it with the service-role key — i.e. anyone could verify any account.

function notFound() {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export async function POST(req: Request) {
  const expected = process.env.CONFIRM_EMAIL_SECRET;
  if (!expected || expected.length < 16) return notFound();

  const provided = req.headers.get('x-confirm-email-secret') ?? '';
  if (!safeEqual(provided, expected)) return notFound();

  try {
    const { email } = await req.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) throw listError;

    const user = users.users.find(
      (u: { email?: string }) => u.email?.toLowerCase() === email.toLowerCase()
    );
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      email_confirm: true,
    });
    if (updateError) throw updateError;

    console.warn(`[confirm-email] confirmed ${email} via operator secret`);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[confirm-email] Error:', err);
    return NextResponse.json({ error: 'Failed to confirm email' }, { status: 500 });
  }
}
