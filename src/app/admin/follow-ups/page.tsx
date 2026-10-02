'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, RefreshCw, Play, Pause, ArrowUpRight } from 'lucide-react';
import { useLang } from '@/lib/lang';
import { useToast } from '@/components/Toast';
import { authFetch } from '@/lib/auth-fetch';

interface FollowUpRow {
  id: string;
  contact_name: string | null;
  contact_email: string | null;
  subject: string | null;
  product_summary: string | null;
  missing_info: string[];
  next_action: string | null;
  next_action_due: string | null;
  updated_at: string;
  last_message: { content: string; role: string; created_at: string } | null;
  thread: {
    state: string;
    label: string;
    missingCount: number;
    needsSpecs: boolean;
    waitingOnBuyer: boolean;
    followUpDue: boolean;
    cold: boolean;
    paused: boolean;
    chaseCount: number;
    silentDays: number;
  };
}

function timeAgo(dateStr: string | null, en: boolean): string {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return en ? 'just now' : '剛剛';
  if (mins < 60) return en ? `${mins}m ago` : `${mins} 分鐘前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return en ? `${hours}h ago` : `${hours} 小時前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return en ? `${days}d ago` : `${days} 天前`;
  return new Date(dateStr).toLocaleDateString(en ? 'en-US' : 'zh-TW', { month: 'short', day: 'numeric' });
}

export default function FollowUpsPage() {
  const { t, lang } = useLang();
  const { showToast } = useToast();
  const router = useRouter();
  const en = lang !== 'zh';

  const [rows, setRows] = useState<FollowUpRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchFollowUps = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await authFetch('/api/admin/inbox?filter=follow_ups&pageSize=500');
      if (!res.ok) throw new Error('Failed to load follow-ups');
      const data = await res.json();
      setRows(data.conversations || []);
    } catch (err) {
      console.error('[follow-ups] fetch error:', err);
      setError(t('Failed to load follow-ups. Please try again.', '載入跟進失敗，請重試。'));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchFollowUps();
  }, [fetchFollowUps]);

  const togglePause = async (row: FollowUpRow) => {
    const paused = !!row.thread.paused;
    setBusyId(row.id);
    try {
      const res = await authFetch(`/api/admin/inbox/${row.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: paused ? 'active' : 'ai_paused' }),
      });
      if (!res.ok) throw new Error('Failed to update');
      setRows((r) => r.map((x) => (x.id === row.id ? { ...x, thread: { ...x.thread, paused: !paused } } : x)));
      showToast(paused ? t('Chasing resumed', '已恢復追蹤') : t('Chasing paused', '已暫停追蹤'), 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const sorted = [...rows].sort((a, b) => (b.thread.silentDays || 0) - (a.thread.silentDays || 0));
  const oldestDays = sorted.length > 0 ? sorted[0].thread.silentDays : 0;
  const pausedCount = sorted.filter((r) => r.thread.paused).length;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-[20px] md:text-[24px] font-semibold tracking-[-0.5px]">{t('Follow-ups', '跟進')}</h1>
          <p className="text-[13px] md:text-[14px] mt-1" style={{ color: 'var(--text-muted)' }}>
            {t('Buyers who have gone quiet — chased, no reply for 3+ days.', '已跟進但超過 3 天沒有回覆的客戶。')}
          </p>
        </div>
        <button
          onClick={fetchFollowUps}
          className="flex items-center justify-center gap-2 text-[13px] md:text-[14px] font-medium px-4 py-2.5 rounded-[4px] border w-full sm:w-auto"
          style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          {t('Refresh', '重新整理')}
        </button>
      </div>

      {/* Summary */}
      {!loading && sorted.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-4 text-[12px] md:text-[13px]" style={{ color: 'var(--text-muted)' }}>
          <span>{t(`${sorted.length} waiting`, `${sorted.length} 個待回覆`)}</span>
          <span>·</span>
          <span>{t(`oldest ${oldestDays}d silent`, `最久 ${oldestDays} 天未回`)}</span>
          {pausedCount > 0 && (
            <>
              <span>·</span>
              <span>{t(`${pausedCount} paused`, `${pausedCount} 個已暫停`)}</span>
            </>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="border rounded-[4px] p-4 mb-4" style={{ borderColor: 'var(--error)', background: '#FEF2F2' }}>
          <p className="text-[13px] md:text-[14px]" style={{ color: 'var(--error)' }}>{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="border rounded-[4px] p-4 animate-pulse" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
              <div className="h-3 w-40 rounded mb-3" style={{ background: 'var(--border)' }} />
              <div className="h-3 w-64 rounded" style={{ background: 'var(--border)' }} />
            </div>
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="border rounded-[4px] p-8 md:p-10 text-center" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <Clock className="mx-auto mb-3" size={32} strokeWidth={1.5} style={{ color: 'var(--text-muted)' }} />
          <p className="text-[14px] font-medium mb-1">{t('No follow-ups', '暫無跟進')}</p>
          <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
            {t('Everyone has replied, or the threads are still fresh.', '客戶都有回覆，或對話仍很新。')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((row) => {
            const silent = row.thread.silentDays || 0;
            const urgent = silent >= 7;
            const snippet = (row.last_message?.content || '').replace(/\s+/g, ' ').trim().slice(0, 140);
            return (
              <div
                key={row.id}
                className="border rounded-[4px] p-4 cursor-pointer hover:bg-black/[0.02]"
                style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                onClick={() => router.push(`/admin/inbox/${row.id}`)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[14px] font-medium truncate">
                        {row.contact_name || row.contact_email || t('Unknown contact', '未知聯絡人')}
                      </span>
                      {row.thread.paused && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ color: '#6B7280', background: '#F3F4F6' }}>
                          {t('Paused', '已暫停')}
                        </span>
                      )}
                      {row.thread.missingCount > 0 && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ color: '#B45309', background: '#FEF3C7' }}>
                          {t(`${row.thread.missingCount} spec${row.thread.missingCount === 1 ? '' : 's'} missing`, `缺 ${row.thread.missingCount} 項規格`)}
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] md:text-[13px] mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                      {row.product_summary || row.subject || '—'}
                    </p>
                    {snippet && (
                      <p className="text-[12px] md:text-[13px] mt-2 line-clamp-2" style={{ color: 'var(--text-muted)' }}>
                        {row.last_message?.role === 'customer' || row.last_message?.role === 'user' ? '' : `${t('You:', '你：')} `}
                        {snippet}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span
                      className="text-[11px] font-semibold px-2 py-0.5 rounded whitespace-nowrap"
                      style={urgent ? { color: '#B91C1C', background: '#FEF2F2' } : { color: '#B45309', background: '#FEF3C7' }}
                    >
                      {t(`${silent}d silent`, `未回 ${silent} 天`)}
                    </span>
                    <span className="text-[11px] whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                      {t(`${row.thread.chaseCount} chase${row.thread.chaseCount === 1 ? '' : 's'}`, `已追 ${row.thread.chaseCount} 次`)}
                    </span>
                    <span className="text-[11px] whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                      {row.last_message?.created_at ? timeAgo(row.last_message.created_at, en) : timeAgo(row.updated_at, en)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }} onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => router.push(`/admin/inbox/${row.id}`)}
                    className="flex items-center gap-1 text-[12px] font-medium px-2.5 py-1.5 rounded-[4px]"
                    style={{ color: 'var(--accent)' }}
                  >
                    <ArrowUpRight size={13} />
                    {t('Open thread', '開啟對話')}
                  </button>
                  <button
                    onClick={() => togglePause(row)}
                    disabled={busyId === row.id}
                    className="flex items-center gap-1 text-[12px] font-medium px-2.5 py-1.5 rounded-[4px] disabled:opacity-50"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {row.thread.paused ? <Play size={13} /> : <Pause size={13} />}
                    {row.thread.paused ? t('Resume chasing', '恢復追蹤') : t('Pause chasing', '暫停追蹤')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
