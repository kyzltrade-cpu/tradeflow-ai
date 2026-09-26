'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLang } from '@/lib/lang';
import { useToast } from '@/components/Toast';
import { authFetch } from '@/lib/auth-fetch';
import { COMPOSIO_APPS, type CompanyMailboxState, type ComposioAppCategory, type ComposioAppModule } from '@/lib/composio-apps';

type EmailStatus = {
  configured: boolean;
  senderConfigured: boolean;
  defaultFrom: string | null;
  gate: string | null;
};

type StatusPayload = {
  configured: boolean;
  apps: ComposioAppModule[];
  mailbox?: CompanyMailboxState | null;
  email?: EmailStatus;
  error?: string;
};

const CATEGORY_LABEL: Record<ComposioAppCategory, [string, string]> = {
  Email: ['Email', '電郵'],
  Google: ['Google', 'Google'],
  Microsoft: ['Microsoft', 'Microsoft'],
  Productivity: ['Productivity', '生產力工具'],
  Communication: ['Communication', '通訊'],
};

const PENDING_STATUSES = new Set(['INITIALIZING', 'INITIATED']);

const PROVIDER_LABEL: Record<string, string> = { google: 'Gmail', microsoft: 'Outlook' };

/**
 * Answers the only two questions a customer has here: is my real inbox
 * connected, and will my replies actually go out.
 */
function MailboxSummary({ mailbox, email }: { mailbox?: CompanyMailboxState | null; email?: EmailStatus }) {
  const { t } = useLang();

  return (
    <div className="rounded-[4px] border p-3 space-y-2" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-medium">{t('Your inbox', '你的收件匣')}</p>
          <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>
            {mailbox?.connected && mailbox.address
              ? `${mailbox.address}${mailbox.provider ? ` · ${PROVIDER_LABEL[mailbox.provider] ?? mailbox.provider}` : ''}`
              : mailbox?.pending
                ? t('Finishing connection…', '正在完成連接…')
                : t('Not connected — real email will not appear in your inbox.', '尚未連接 — 真實電郵不會出現在收件匣。')}
          </p>
        </div>
        {mailbox?.connected ? (
          <span className="text-[11px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap" style={{ background: 'rgba(34,197,94,0.1)', color: '#16a34a' }}>
            {t('Connected', '已連接')}
          </span>
        ) : mailbox?.pending ? (
          <span className="text-[11px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap" style={{ background: 'rgba(245,158,11,0.1)', color: '#b45309' }}>
            {t('Pending', '等待中')}
          </span>
        ) : (
          <span className="text-[11px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap" style={{ background: '#F3F4F6', color: '#6B7280' }}>
            {t('Not connected', '未連接')}
          </span>
        )}
      </div>

      {email && !email.configured && (
        <p className="text-[11px]" style={{ color: '#b45309' }}>
          {t(
            'Outbound email is not configured on this deployment — quotes and follow-ups cannot be sent yet.',
            '此部署尚未設定外發電郵 — 報價與跟進電郵暫時無法寄出。'
          )}
        </p>
      )}
      {email?.configured && email.gate && !mailbox?.connected && (
        <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
          {email.gate}
        </p>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: ComposioAppModule['connection'] }) {
  const { t } = useLang();
  if (!status) return null;
  const s = status.status;
  if (PENDING_STATUSES.has(s)) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(245,158,11,0.1)', color: '#b45309' }}>
        <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#f59e0b' }} />
        {t('Connecting…', '連接中…')}
      </span>
    );
  }
  if (s === 'ACTIVE') {
    return (
      <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(34,197,94,0.1)', color: '#16a34a' }}>
        {t('Connected', '已連接')}
      </span>
    );
  }
  if (s === 'FAILED') {
    return (
      <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(239,68,68,0.08)', color: '#dc2626' }}>
        {t('Failed', '連接失敗')}
      </span>
    );
  }
  return (
    <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: '#F3F4F6', color: '#6B7280' }}>
      {t('Expired', '已過期')}
    </span>
  );
}

function AppTile({
  app,
  busy,
  onConnect,
  onDisconnect,
}: {
  app: ComposioAppModule;
  busy: boolean;
  onConnect: (slug: string) => void;
  onDisconnect: (id: string) => void;
}) {
  const { t } = useLang();
  const [logoError, setLogoError] = useState(false);
  const connection = app.connection;
  const connected = connection?.status === 'ACTIVE';

  return (
    <div className="border rounded-[4px] p-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
      <div className="flex items-center justify-between gap-3 mb-1">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden shrink-0 bg-black/[0.04]">
            {app.logo && !logoError ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={app.logo} alt={app.name} width={20} height={20} onError={() => setLogoError(true)} className="object-contain" />
            ) : (
              <span className="text-[13px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                {app.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-medium truncate">{app.name}</p>
            <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>
              {connection?.address ?? connection?.alias ?? connection?.id ?? app.slug}
            </p>
          </div>
        </div>
        {connection ? (
          <button
            type="button"
            onClick={() => onDisconnect(connection.id)}
            disabled={busy}
            className="text-[12px] font-medium px-3 py-1.5 rounded-[4px] border whitespace-nowrap transition-colors hover:bg-black/[0.04]"
            style={{ borderColor: 'var(--border)', opacity: busy ? 0.6 : 1 }}
          >
            {busy ? '…' : t('Disconnect', '中斷連接')}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onConnect(app.slug)}
            disabled={busy}
            className="text-[12px] font-semibold px-3 py-1.5 rounded-[4px] text-white whitespace-nowrap transition-opacity hover:opacity-90"
            style={{ background: 'var(--accent)', opacity: busy ? 0.6 : 1 }}
          >
            {busy ? '…' : t('Connect', '連接')}
          </button>
        )}
      </div>
      {app.description && connected && (
        <p className="text-[11px] mt-1 line-clamp-1" style={{ color: 'var(--text-muted)' }}>
          {app.description}
        </p>
      )}
      <div className="mt-2">
        <StatusBadge status={connection} />
      </div>
    </div>
  );
}

export default function ComposioConnections() {
  const { t } = useLang();
  const { showToast } = useToast();
  const [payload, setPayload] = useState<StatusPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyApp, setBusyApp] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await authFetch('/api/admin/composio/status');
      const data = (await res.json()) as StatusPayload;
      if (res.ok) setPayload(data);
      else setPayload({ configured: true, apps: [], error: data.error ?? 'Failed to load' });
    } catch {
      setPayload({ configured: true, apps: [], error: 'Failed to load' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Loaded after mount rather than during render, so the initial paint stays
    // synchronous and the state update is never part of the effect body.
    const id = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(id);
  }, [refresh]);

  const hasPending = useCallback(
    () => payload?.apps?.some((app) => app.connection && PENDING_STATUSES.has(app.connection.status)) ?? false,
    [payload]
  );

  // OAuth happens in a popup, so the connection only becomes ACTIVE after the
  // user returns. Poll while anything is pending, keep polling briefly after a
  // connect attempt, and re-check whenever this tab regains focus.
  const watchUntilRef = useRef<number>(0);

  useEffect(() => {
    const tick = () => {
      void refresh();
    };
    if (hasPending() || Date.now() < watchUntilRef.current) {
      const id = setInterval(tick, 3000);
      return () => clearInterval(id);
    }
    const onFocus = () => {
      if (hasPending() || Date.now() < watchUntilRef.current) tick();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [hasPending, refresh]);

  const connect = async (toolkit: string) => {
    setBusyApp(toolkit);
    try {
      const res = await authFetch('/api/admin/composio/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toolkit }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to connect');
      if (data.url) {
        // Give the user ~90s to finish in the popup before we stop refreshing.
        watchUntilRef.current = Date.now() + 90_000;
        window.open(data.url, '_blank', 'noopener,noreferrer');
      }
      showToast(t('Opening authorization…', '正在開啟授權…'), 'success');
      await refresh();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to connect', 'error');
    } finally {
      setBusyApp(null);
    }
  };

  const disconnect = async (id: string) => {
    if (!window.confirm(t('Disconnect this app?', '確定中斷此應用程式的連接？'))) return;
    setBusyApp(id);
    try {
      const res = await authFetch('/api/admin/composio/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectedAccountId: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to disconnect');
      showToast(t('Disconnected', '已中斷連接'), 'success');
      await refresh();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to disconnect', 'error');
    } finally {
      setBusyApp(null);
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

  if (!payload?.configured) {
    return (
      <div className="space-y-3">
        <MailboxSummary mailbox={payload?.mailbox} email={payload?.email} />
        <div className="text-[13px] rounded-[4px] px-3 py-2 border" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
          {t(
            'Live app connections are not set up for this demo yet — the inbox runs on seeded conversations. You can connect Gmail after launch to receive and reply to real email.',
            '此演示尚未設定即時應用程式連接 — 收件匣使用預載的對話記錄。正式推出後可連接 Gmail 接收及回覆真實電郵。'
          )}
        </div>
      </div>
    );
  }

  if (payload.error && !payload.apps?.length) {
    return (
      <div className="space-y-3">
        <MailboxSummary mailbox={payload.mailbox} email={payload.email} />
        <div
          className="text-[12px] rounded-[4px] px-3 py-2"
          style={{ background: 'rgba(239,68,68,0.08)', color: 'var(--error, #ef4444)' }}
        >
          {t('Connections are temporarily unavailable — please try again later.', '暫時無法載入連接 — 請稍後再試。')}
        </div>
      </div>
    );
  }

  const bySlug = new Map((payload.apps ?? []).map((app) => [app.slug, app]));
  const categories: ComposioAppCategory[] = ['Email', 'Google', 'Microsoft', 'Productivity', 'Communication'];
  const visibleCategories = categories.filter((cat) =>
    COMPOSIO_APPS.some((a) => a.category === cat && bySlug.has(a.slug))
  );

  return (
    <div className="space-y-4">
      <MailboxSummary mailbox={payload.mailbox} email={payload.email} />
      {visibleCategories.map((category) => {
        const apps = COMPOSIO_APPS
          .filter((a) => a.category === category && bySlug.has(a.slug))
          .map((a) => bySlug.get(a.slug)!);
        return (
          <div key={category}>
            <p className="text-[11px] uppercase tracking-[0.05em] font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
              {t(CATEGORY_LABEL[category][0], CATEGORY_LABEL[category][1])}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {apps.map((app) => (
                <AppTile
                  key={app.slug}
                  app={app}
                  busy={busyApp === app.slug || busyApp === app.connection?.id}
                  onConnect={connect}
                  onDisconnect={disconnect}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}