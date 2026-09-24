'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useLang } from '@/lib/lang';
import { authFetch } from '@/lib/auth-fetch';

type Provider = 'google' | 'microsoft';

type Account = { provider: Provider; email: string; name: string };

type Status = {
  configured: Record<Provider, boolean>;
  dbOk: boolean;
  accounts: Account[];
};

const PROVIDER_META: Record<Provider, { label: string; brand: string; chip: string }> = {
  google: { label: 'Google', brand: '#4285F4', chip: 'Gmail API' },
  microsoft: { label: 'Microsoft', brand: '#2F5B98', chip: 'Outlook / M365' },
};

function GoogleIcon({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

function MicrosoftIcon({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 21 21">
      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
  );
}

const PROFILE_ICON: Record<Provider, (c: string) => ReactNode> = {
  google: (c) => <GoogleIcon color={c} />,
  microsoft: (c) => <MicrosoftIcon color={c} />,
};

export default function OAuthConnections() {
  const { t } = useLang();
  const [status, setStatus] = useState<Status | null>(null);
  const [dbError, setDbError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<Provider | null>(null);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [testEmail, setTestEmail] = useState('');
  const [testBusy, setTestBusy] = useState<Provider | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await authFetch('/api/admin/connections/status');
      const data = await res.json();
      if (res.ok) {
        setStatus(data);
        setDbError(!data.dbOk);
      } else {
        setDbError(true);
      }
    } catch {
      setDbError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const params = new URLSearchParams(window.location.search);
    const okProvider = params.get('ok');
    const errProvider = params.get('error');
    if (okProvider || errProvider) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [refresh]);

  const connect = (provider: Provider) => {
    setBusy(provider);
    window.location.href = `/api/admin/connections/start?provider=${provider}`;
  };

  const disconnect = async (provider: Provider) => {
    setBusy(provider);
    setMsg(null);
    try {
      const res = await authFetch('/api/admin/connections/disconnect', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to disconnect');
      setMsg({ kind: 'ok', text: t('Disconnected', '已中斷連接') });
      await refresh();
    } catch (e) {
      setMsg({ kind: 'err', text: e instanceof Error ? e.message : 'Failed to disconnect' });
    } finally {
      setBusy(null);
    }
  };

  const sendTest = async (provider: Provider, to: string) => {
    if (!to) return;
    setTestBusy(provider);
    setMsg(null);
    try {
      const res = await authFetch('/api/admin/connections/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, to }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Send failed');
      setMsg({ kind: 'ok', text: t('Test email sent from your inbox', '測試電郵已從您的信箱發送') });
    } catch (e) {
      setMsg({ kind: 'err', text: e instanceof Error ? e.message : 'Send failed' });
    } finally {
      setTestBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[13px]" style={{ color: 'var(--text-muted)' }}>
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        {t('Loading…', '載入中…')}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {dbError && status?.configured && (status.configured.google || status.configured.microsoft) && (
        <div
          className="text-[12px] rounded-[4px] px-3 py-2"
          style={{ background: 'rgba(239,68,68,0.08)', color: 'var(--error, #ef4444)' }}
        >
          {t('Syncing connections is temporarily unavailable — please try again later.', '暫時無法同步連接 — 請稍後再試。')}
        </div>
      )}

      {(Object.keys(PROVIDER_META) as Provider[]).map((provider) => {
        const meta = PROVIDER_META[provider];
        const configured = status?.configured?.[provider];
        const account = status?.accounts?.find((a) => a.provider === provider);

        return (
          <div key={provider} className="border rounded-[4px] p-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <div className="flex items-center justify-between gap-3 mb-1">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: meta.brand }}>
                  {PROFILE_ICON[provider](meta.brand)}
                </div>
                <div>
                  <p className="text-[13px] font-medium">{meta.label}</p>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    {account ? `${account.name} <${account.email}>` : meta.chip}
                  </p>
                </div>
              </div>
              {account ? (
                <button
                  type="button"
                  onClick={() => disconnect(provider)}
                  disabled={busy === provider}
                  className="text-[12px] font-medium px-3 py-1.5 rounded-[4px] border whitespace-nowrap transition-colors hover:bg-black/[0.04]"
                  style={{ borderColor: 'var(--border)', opacity: busy === provider ? 0.6 : 1 }}
                >
                  {busy === provider ? '…' : t('Disconnect', '中斷連接')}
                </button>
              ) : !configured ? (
                <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: '#F3F4F6', color: '#6B7280' }}>
                  {t('Coming soon', '即將推出')}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => connect(provider)}
                  className="text-[12px] font-semibold px-3 py-1.5 rounded-[4px] text-white whitespace-nowrap transition-opacity hover:opacity-90"
                  style={{ background: meta.brand, opacity: busy === provider ? 0.6 : 1 }}
                >
                  {busy === provider ? '…' : t('Connect', '連接')}
                </button>
              )}
            </div>

            {account && (
              <div className="mt-3 flex gap-2">
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="test@example.com"
                  className="flex-1 border rounded-[4px] px-3 py-1.5 text-[13px] focus:outline-none"
                  style={{ borderColor: 'var(--border)' }}
                />
                <button
                  type="button"
                  onClick={() => sendTest(provider, testEmail)}
                  disabled={testBusy === provider || !testEmail.trim()}
                  className="text-[12px] font-medium px-3 py-1.5 rounded-[4px] border whitespace-nowrap"
                  style={{ borderColor: 'var(--border)', opacity: testBusy === provider || !testEmail.trim() ? 0.6 : 1 }}
                >
                  {testBusy === provider ? '…' : t('Send Test', '發送測試')}
                </button>
              </div>
            )}
          </div>
        );
      })}

      {msg && (
        <div
          className="text-[12px] rounded-[4px] px-3 py-2"
          style={{ background: msg.kind === 'ok' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.08)', color: msg.kind === 'ok' ? 'var(--success)' : 'var(--error, #ef4444)' }}
        >
          {msg.text}
        </div>
      )}
    </div>
  );
}