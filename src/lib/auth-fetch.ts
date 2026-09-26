'use client';

import { supabaseBrowser } from '@/lib/auth';

export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const baseHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  const withToken = async (): Promise<Record<string, string>> => {
    const { data: { session } } = await supabaseBrowser.auth.getSession();
    const headers = { ...baseHeaders };
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
    return headers;
  };

  const res = await fetch(url, { ...options, headers: await withToken() });

  if (res.status === 401) {
    const { data: { session } } = await supabaseBrowser.auth.refreshSession();
    if (session?.access_token) {
      const headers = { ...baseHeaders, Authorization: `Bearer ${session.access_token}` };
      return fetch(url, { ...options, headers });
    }
  }

  return res;
}
