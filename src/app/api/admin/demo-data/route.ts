import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { seedStarterKit } from '@/lib/starter-kit';

/**
 * Re-runs the starter kit for the signed-in company so an existing account can
 * be filled with sample data. Idempotent: seeding skips rows that already
 * exist and repairs conversations that are missing a subject or thread, so
 * running it twice is safe.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.companyId) {
      return NextResponse.json(
        { error: 'No company associated with this account' },
        { status: 400 }
      );
    }

    const summary = await seedStarterKit(auth.companyId);
    return NextResponse.json(summary);
  } catch (err) {
    console.error('[demo-data:POST]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load demo data' },
      { status: 500 }
    );
  }
}
