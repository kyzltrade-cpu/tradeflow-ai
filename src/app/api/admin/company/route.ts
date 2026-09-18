import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Lightweight auth check — verifies session but does NOT require a company.
 * Used for POST (onboarding) where the user has no company yet.
 * Checks Authorization header first, then falls back to cookies.
 */
async function requireAuthOrCreate(req?: NextRequest) {
  let accessToken: string | null = null;

  // 1. Check Authorization header
  if (req) {
    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      if (token.split('.').length === 3) accessToken = token;
    }
  }

  // 2. Fallback to cookies
  if (!accessToken) {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    const authCookie = allCookies.find(
      (c) => c.name.startsWith('sb-') && c.name.endsWith('-auth-token')
    );
    if (authCookie?.value) {
      try {
        const parsed = JSON.parse(authCookie.value);
        if (parsed.access_token) accessToken = parsed.access_token;
      } catch {
        if (authCookie.value.split('.').length === 3) accessToken = authCookie.value;
      }
    }
  }

  if (!accessToken) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 }) as unknown as Response;
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return Response.json({ error: 'Invalid or expired session' }, { status: 401 }) as unknown as Response;
  }
  // Ensure users row exists
  await supabaseAdmin
    .from('users')
    .upsert({ id: user.id, email: user.email || '' }, { onConflict: 'id', ignoreDuplicates: false });
  return { user: { id: user.id, email: user.email || '' } };
}

// POST — create a new company (onboarding) or get existing
export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAuthOrCreate(req);
    if (authResult instanceof Response) return authResult;
    const body = await req.json().catch(() => ({}));
    const { company_id, name, industry, user_id } = body;

    // If company_id provided, just return it
    if (company_id) {
      const { data } = await supabaseAdmin
        .from('companies')
        .select('id')
        .eq('id', company_id)
        .single();
      if (data) return NextResponse.json({ id: data.id });
    }

    const companyName = name || 'HK Trading Co.';

    // Check if THIS user already has a company with this name
    if (user_id) {
      const { data: userRow } = await supabaseAdmin
        .from('users')
        .select('company_id')
        .eq('id', user_id)
        .maybeSingle();

      if (userRow?.company_id) {
        const { data: userCompany } = await supabaseAdmin
          .from('companies')
          .select('id')
          .eq('id', userRow.company_id)
          .eq('name', companyName)
          .maybeSingle();

        if (userCompany) {
          return NextResponse.json({ id: userCompany.id });
        }
      }
    }

    // Check if a company with this name already exists (for a different user)
    const { data: existingByName } = await supabaseAdmin
      .from('companies')
      .select('id, name')
      .eq('name', companyName)
      .maybeSingle();

    let finalName = companyName;
    if (existingByName) {
      // Another user owns a company with the same name — add a numeric suffix
      let suffix = 2;
      while (true) {
        const candidate = `${companyName} (${suffix})`;
        const { data: taken } = await supabaseAdmin
          .from('companies')
          .select('id')
          .eq('name', candidate)
          .maybeSingle();
        if (!taken) {
          finalName = candidate;
          break;
        }
        suffix++;
      }
    }

    // Create company
    const { data: company, error } = await supabaseAdmin
      .from('companies')
      .insert({
        name: finalName,
        industry: industry || 'General Trading',
        status: 'approved',
      })
      .select('id')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Seed demo FAQ rules
    const demoFaq = [
      { company_id: company.id, question_pattern: 'Payment terms', answer: 'We accept T/T (bank transfer) for orders under USD 5,000. L/C for larger orders. 30% deposit, 70% before shipping.', priority: 10, keywords: ['payment', 'pay', 'bank', 'transfer', 'deposit'] },
      { company_id: company.id, question_pattern: 'Shipping & delivery', answer: 'FOB Shenzhen standard. SE Asia 7-10 days, Europe 25-35 days, US 20-30 days by sea. Express DHL/FedEx for samples: 3-5 days.', priority: 9, keywords: ['shipping', 'delivery', 'freight', 'dhl', 'fedex'] },
      { company_id: company.id, question_pattern: 'Sample policy', answer: 'Free samples for qualified buyers — you cover shipping (USD 20-40 via DHL). Lead time 3-5 days. Deducted from first bulk order.', priority: 8, keywords: ['sample', 'trial', 'test'] },
      { company_id: company.id, question_pattern: 'Certifications', answer: 'FDA, CE, LFGB, RoHS certified. SGS testing available on request.', priority: 7, keywords: ['certification', 'fda', 'ce', 'quality'] },
      { company_id: company.id, question_pattern: 'OEM/ODM customization', answer: 'Full OEM/ODM: custom logo (silk screen, laser, UV), custom packaging, custom colors (Pantone), custom molds (5000+ pcs).', priority: 6, keywords: ['custom', 'logo', 'oem', 'odm', 'print'] },
    ];

    await supabaseAdmin.from('faq_rules').insert(demoFaq);

    // Seed default settings
    await supabaseAdmin.from('company_settings').insert({
      company_id: company.id,
      system_prompt: `You are a helpful sales assistant for ${finalName}, a Hong Kong trading company. You reply professionally, concisely, and in the same language the customer uses. You know all products, pricing, MOQ, shipping terms, and certifications. If a question is beyond your knowledge, say you will connect them with a human agent.`,
      industry: industry || 'General Trading',
    });

    // Upsert user row then link to company
    if (user_id) {
      await supabaseAdmin
        .from('users')
        .upsert({ id: user_id }, { onConflict: 'id', ignoreDuplicates: false });
      await supabaseAdmin
        .from('users')
        .update({ company_id: company.id, role: 'admin' })
        .eq('id', user_id);
    }

    return NextResponse.json({ id: company.id });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[company:POST] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET — get company by ID or user_id
export async function GET(req: NextRequest) {
  try {
    const companyId = req.nextUrl.searchParams.get('id');
    const userId = req.nextUrl.searchParams.get('user_id');

    // If user_id is provided, try to find company directly (used by company provider on login)
    if (userId) {
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('company_id')
        .eq('id', userId)
        .maybeSingle();

      if (!user?.company_id) return NextResponse.json({ error: 'No company found' }, { status: 404 });

      const { data, error } = await supabaseAdmin
        .from('companies')
        .select('*')
        .eq('id', user.company_id)
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json(data);
    }

    // For other lookups, require auth
    const auth = await requireAuth(req);

    if (companyId) {
      if (auth.companyId && companyId !== auth.companyId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const { data, error } = await supabaseAdmin
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json(data);
    }

    // Default: return the user's own company
    const { data, error } = await supabaseAdmin
      .from('companies')
      .select('*')
      .eq('id', auth.companyId)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[company:GET] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
