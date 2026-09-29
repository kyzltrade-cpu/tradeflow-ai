import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { DEMO_COMPANY_ID } from '@/lib/inquiry-context';

export interface AuthResult {
  user: { id: string; email: string };
  companyId: string | null;
}

/** The demo login is always pinned to the seeded demo company so it can never
 * be stranded on an onboarding-created scratch company. */
const DEMO_EMAILS = new Set(['demo@broadust.io']);

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function extractToken(value: string): string | null {
  if (value.split('.').length === 3) return value;
  try {
    const parsed = JSON.parse(value);
    if (parsed.access_token) return parsed.access_token;
  } catch { /* not JSON */ }
  return null;
}

async function getAccessToken(req?: NextRequest): Promise<string | null> {
  // 1. Authorization header
  if (req) {
    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      if (token.split('.').length === 3) return token;
    }
  }

  // 2. Cookies — try multiple patterns
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();

  // Pattern: sb-<project-ref>-auth-token
  for (const c of allCookies) {
    if (c.name.startsWith('sb-') && c.name.endsWith('-auth-token')) {
      const token = extractToken(c.value);
      if (token) return token;
    }
  }

  // Pattern: look for any cookie containing access_token
  for (const c of allCookies) {
    if (c.value && c.value.includes('eyJ')) {
      const token = extractToken(c.value);
      if (token && token.split('.').length === 3) return token;
    }
  }

  return null;
}

/**
 * Verifies the Supabase auth session and returns the user + company.
 * Throws a Response on failure.
 */
export async function requireAuth(
  req?: NextRequest,
  options?: { requireCompany?: boolean }
): Promise<AuthResult> {
  const accessToken = await getAccessToken(req);

  if (!accessToken) {
    throw jsonError('Not authenticated', 401);
  }

  const {
    data: { user },
    error: authError,
  } = await supabaseAdmin.auth.getUser(accessToken);

  if (authError || !user) {
    throw jsonError('Invalid or expired session', 401);
  }

  const { data: userRecord } = await supabaseAdmin
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single();

  let companyId = userRecord?.company_id || null;

  // Demo login is pinned to the seeded demo company. If the users row was
  // repointed (e.g. by an onboarding test), heal it so the demo mailbox is
  // never empty and onboarding can never strand it on a scratch company.
  if (user.email && DEMO_EMAILS.has(user.email.toLowerCase()) && companyId !== DEMO_COMPANY_ID) {
    await supabaseAdmin.from('users').update({ company_id: DEMO_COMPANY_ID }).eq('id', user.id);
    companyId = DEMO_COMPANY_ID;
  }

  if (options?.requireCompany !== false && !companyId) {
    throw jsonError(
      'Your account is not linked to a company. Please complete onboarding.',
      403
    );
  }

  return {
    user: { id: user.id, email: user.email || '' },
    companyId,
  };
}
