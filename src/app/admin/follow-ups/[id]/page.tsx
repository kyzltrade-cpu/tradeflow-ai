'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useLang } from '@/lib/lang';
import { useCompany } from '@/lib/company';
import { useToast } from '@/components/Toast';
import { authFetch } from '@/lib/auth-fetch';

interface FollowUpItem {
  id: string;
  sequence_id: string;
  step_number: number;
  delay_days: number;
  message_type: string;
  message_content: string;
  status: string;
  scheduled_at: string | null;
  sent_at: string | null;
  cancelled_reason: string | null;
  created_at: string;
}

interface FollowUpSequence {
  id: string;
  company_id: string;
  opportunity_id: string | null;
  quote_id: string | null;
  name: string;
  status: string;
  trigger_event: string | null;
  next_step_number: number;
  paused_by: string | null;
  paused_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  follow_up_items: FollowUpItem[];
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  paused: 'bg-amber-100 text-amber-700',
  cancelled: 'bg-red-100 text-red-700',
  completed: 'bg-gray-100 text-gray-600',
};

const ITEM_STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  sent: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-500',
  failed: 'bg-red-100 text-red-700',
  paused: 'bg-amber-100 text-amber-700',
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function FollowUpDetailPage() {
  const { t } = useLang();
  const { companyId } = useCompany();
  const { showToast } = useToast();
  const router = useRouter();
  const params = useParams();
  const sequenceId = params.id as string;

  const [sequence, setSequence] = useState<FollowUpSequence | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  const fetchSequence = useCallback(async () => {
    if (!companyId || !sequenceId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(`/api/admin/follow-ups/${sequenceId}`);
      if (!res.ok) {
        if (res.status === 404) { setError('Follow-up sequence not found'); return; }
        throw new Error('Failed to load');
      }
      const data = await res.json();
      setSequence(data.sequence);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [companyId, sequenceId]);

  useEffect(() => { fetchSequence(); }, [fetchSequence]);

  const updateStatus = async (newStatus: string) => {
    if (!sequence) return;
    setUpdating(true);
    try {
      const res = await authFetch(`/api/admin/follow-ups/${sequenceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update');
      }
      showToast(t('Status updated', '狀態已更新'), 'success');
      fetchSequence();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update', 'error');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-[13px]" style={{ color: 'var(--text-muted)' }}>{t('Loading...', '載入中...')}</div>;
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-[14px] font-medium mb-2">{error}</p>
        <Link href="/admin/follow-ups" className="text-[13px] underline" style={{ color: 'var(--accent)' }}>{t('Back to Follow-ups', '返回跟進')}</Link>
      </div>
    );
  }

  if (!sequence) return null;

  const items = sequence.follow_up_items || [];
  const activeItems = items.filter((i: FollowUpItem) => i.status === 'scheduled');
  const sentItems = items.filter((i: FollowUpItem) => i.status === 'sent');
  const nextItem = activeItems[0];

  return (
    <div>
      <div className="flex items-center gap-2 text-[12px] mb-4" style={{ color: 'var(--text-muted)' }}>
        <Link href="/admin/follow-ups" className="hover:underline">{t('Follow-ups', '跟進')}</Link>
        <span>/</span>
        <span className="font-medium" style={{ color: 'var(--text)' }}>{sequence.name}</span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-[20px] font-semibold">{sequence.name}</h1>
            <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_COLORS[sequence.status] || 'bg-gray-100 text-gray-600'}`}>
              {sequence.status}
            </span>
          </div>
          <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
            {t('Trigger', '觸發')}: {sequence.trigger_event || '—'}
          </p>
        </div>
        <div className="flex gap-2">
          {sequence.status === 'active' && (
            <button onClick={() => updateStatus('paused')} disabled={updating}
              className="px-3 py-1.5 text-[12px] font-medium rounded-[4px] border"
              style={{ borderColor: 'var(--border)' }}>
              {t('Pause', '暫停')}
            </button>
          )}
          {sequence.status === 'paused' && (
            <button onClick={() => updateStatus('active')} disabled={updating}
              className="px-3 py-1.5 text-[12px] font-medium rounded-[4px] text-white"
              style={{ background: 'var(--accent)' }}>
              {t('Resume', '恢復')}
            </button>
          )}
          {['active', 'paused'].includes(sequence.status) && (
            <button onClick={() => { if (confirm(t('Cancel this sequence?', '確定取消？'))) updateStatus('cancelled'); }}
              disabled={updating}
              className="px-3 py-1.5 text-[12px] font-medium rounded-[4px] border"
              style={{ borderColor: 'var(--border)', color: 'var(--error, #ef4444)' }}>
              {t('Cancel', '取消')}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="border rounded-[4px] p-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>{t('Total Steps', '總步驟')}</p>
          <p className="text-[20px] font-semibold mt-1">{items.length}</p>
        </div>
        <div className="border rounded-[4px] p-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>{t('Sent', '已發送')}</p>
          <p className="text-[20px] font-semibold mt-1">{sentItems.length}</p>
        </div>
        <div className="border rounded-[4px] p-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>{t('Pending', '待處理')}</p>
          <p className="text-[20px] font-semibold mt-1">{activeItems.length}</p>
        </div>
        <div className="border rounded-[4px] p-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>{t('Next Step', '下一步')}</p>
          <p className="text-[20px] font-semibold mt-1">{nextItem ? `#${nextItem.step_number}` : '—'}</p>
        </div>
      </div>

      <div className="border rounded-[4px] p-5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <h3 className="text-[14px] font-semibold mb-4">{t('Follow-up Timeline', '跟進時間線')}</h3>
        {items.length === 0 ? (
          <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>{t('No follow-up steps configured', '未設定跟進步驟')}</p>
        ) : (
          <div className="space-y-4">
            {items.map((item: FollowUpItem) => (
              <div key={item.id} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-medium shrink-0 ${
                    item.status === 'sent' ? 'bg-green-100 text-green-700' :
                    item.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {item.step_number}
                  </div>
                  {item.step_number < items.length && (
                    <div className="w-px flex-1 my-1" style={{ background: 'var(--border)' }} />
                  )}
                </div>
                <div className="flex-1 pb-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-medium">{t('Step', '步驟')} {item.step_number}</span>
                      <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                        {item.delay_days > 0 ? `Day ${item.delay_days}` : t('Immediate', '立即')}
                      </span>
                    </div>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${ITEM_STATUS_COLORS[item.status] || 'bg-gray-100 text-gray-600'}`}>
                      {item.status}
                    </span>
                  </div>
                  <p className="text-[12px] mb-2" style={{ color: 'var(--text-muted)' }}>
                    {t('Type', '類型')}: {item.message_type}
                  </p>
                  <div className="text-[13px] p-3 rounded-[4px] border" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
                    {item.message_content || t('(No content)', '（無內容）')}
                  </div>
                  {item.sent_at && (
                    <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
                      {t('Sent', '已發送')}: {formatDate(item.sent_at)}
                    </p>
                  )}
                  {item.scheduled_at && item.status === 'scheduled' && (
                    <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
                      {t('Scheduled', '已排程')}: {formatDate(item.scheduled_at)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
