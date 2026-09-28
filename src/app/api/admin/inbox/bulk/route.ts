import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';

const ACTIONS = [
  'archive',
  'unarchive',
  'trash',
  'restore',
  'flag',
  'unflag',
  'read',
  'unread',
  'delete',
] as const;

// POST /api/admin/inbox/bulk — batch operations over selected conversations
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.companyId) {
      return NextResponse.json({ error: 'No company associated with this account' }, { status: 400 });
    }
    const body = await req.json();
    const { ids, action } = body || {};
    if (!Array.isArray(ids) || ids.length === 0 || !ACTIONS.includes(action)) {
      return NextResponse.json({ error: 'ids (non-empty array) and a valid action are required' }, { status: 400 });
    }

    // Ownership guard: only rows belonging to this company can be touched.
    const { data: owned } = await supabaseAdmin
      .from('conversations')
      .select('id')
      .eq('company_id', auth.companyId)
      .in('id', ids);
    const ownedIds = (owned || []).map((r: { id: string }) => r.id);
    if (ownedIds.length === 0) {
      return NextResponse.json({ error: 'No matching conversations' }, { status: 404 });
    }

    const now = new Date().toISOString();
    const updates: Record<string, unknown> = { updated_at: now };

    switch (action) {
      case 'archive':
        updates.folder = 'archive';
        break;
      case 'unarchive':
        updates.folder = 'inbox';
        break;
      case 'trash':
        updates.folder = 'trash';
        break;
      case 'restore':
        updates.folder = 'inbox';
        break;
      case 'flag':
        updates.flagged = true;
        break;
      case 'unflag':
        updates.flagged = false;
        break;
      case 'read':
        updates.read_at = now;
        break;
      case 'unread':
        updates.read_at = null;
        break;
      case 'delete':
        if (action === 'delete') {
          const { error: deleteError } = await supabaseAdmin
            .from('conversations')
            .delete()
            .in('id', ownedIds);
          if (deleteError) {
            console.error('[inbox:bulk] delete error:', deleteError.message);
            return NextResponse.json({ error: deleteError.message }, { status: 500 });
          }
          return NextResponse.json({ ok: true, affected: ownedIds.length });
        }
        break;
    }

    const { data, error } = await supabaseAdmin
      .from('conversations')
      .update(updates)
      .in('id', ownedIds)
      .select('id');

    if (error) {
      console.error('[inbox:bulk] Supabase error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, affected: data?.length || ownedIds.length });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[inbox:bulk] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}