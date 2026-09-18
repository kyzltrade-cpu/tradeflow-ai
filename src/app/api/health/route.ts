import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const version = process.env.npm_package_version || '0.1.0';

  try {
    const { error } = await supabaseAdmin
      .from('companies')
      .select('id', { count: 'exact', head: true });

    if (error) {
      console.error('[health] Supabase query failed:', error.message);
      return NextResponse.json(
        {
          status: 'error',
          timestamp: new Date().toISOString(),
          version,
          error: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version,
    });
  } catch (err) {
    console.error('[health] Unexpected error:', err);
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        version,
        error: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
