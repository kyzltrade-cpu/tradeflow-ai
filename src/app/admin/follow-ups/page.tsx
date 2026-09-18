'use client';

import { useState, useEffect, useCallback, Fragment } from 'react';
import { useLang } from '@/lib/lang';
import { useCompany } from '@/lib/company';
import { useToast } from '@/components/Toast';
import { authFetch } from '@/lib/auth-fetch';

interface FollowUpItem {
  id: string;
  sequence_id: string;
  step_number: number;
  delay_days: number;
  scheduled_for: string;
  status: string;
  message_type: string;
  subject: string | null;
  body: string | null;
  sent_at: string | null;
  error_message: string | null;
}

interface FollowUpSequence {
  id: string;
  company_id: string;
  opportunity_id: string;
  quote_id: string | null;
  status: string;
  channel: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  follow_up_items: FollowUpItem[];
  opportunities?: { title: string } | null;
}

interface FollowUpListResponse {
  sequences: FollowUpSequence[];
  total: number;
  page: number;
  page_size: number;
  has_next_page: boolean;
}

const STATUS_OPTIONS = [
  { key: 'active', en: 'Active', zh: '進行中', color: '#059669', bg: '#ECFDF5' },
  { key: 'paused', en: 'Paused', zh: '已暫停', color: '#D97706', bg: '#FEF3C7' },
  { key: 'completed', en: 'Completed', zh: '已完成', color: '#2563EB', bg: '#EFF6FF' },
  { key: 'cancelled', en: 'Cancelled', zh: '已取消', color: '#DC2626', bg: '#FEF2F2' },
];

const ITEM_STATUSES = [
  { key: 'scheduled', en: 'Scheduled', zh: '已排程', color: '#6B7280', bg: '#F3F4F6' },
  { key: 'sent', en: 'Sent', zh: '已送出', color: '#059669', bg: '#ECFDF5' },
  { key: 'completed', en: 'Completed', zh: '已完成', color: '#2563EB', bg: '#EFF6FF' },
  { key: 'failed', en: 'Failed', zh: '失敗', color: '#DC2626', bg: '#FEF2F2' },
  { key: 'cancelled', en: 'Cancelled', zh: '已取消', color: '#D97706', bg: '#FEF3C7' },
];

const CHANNEL_LABELS: Record<string, { en: string; zh: string }> = {
  email: { en: 'Email', zh: '電子郵件' },
  whatsapp: { en: 'WhatsApp', zh: 'WhatsApp' },
  wechat: { en: 'WeChat', zh: '微信' },
  sms: { en: 'SMS', zh: '簡訊' },
};

const ITEMS_PER_PAGE = 10;

function getStatusInfo(status: string) {
  return STATUS_OPTIONS.find((s) => s.key === status) || STATUS_OPTIONS[0];
}

function getItemStatusInfo(status: string) {
  return ITEM_STATUSES.find((s) => s.key === status) || ITEM_STATUSES[0];
}

function getChannelLabel(channel: string) {
  return CHANNEL_LABELS[channel] || { en: channel, zh: channel };
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function isOverdue(dateStr: string | null): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

export default function FollowUpsPage() {
  const { t } = useLang();
  const { companyId, loading: companyLoading } = useCompany();
  const { showToast } = useToast();

  const [sequences, setSequences] = useState<FollowUpSequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [hasNext, setHasNext] = useState(false);

  const [filterStatus, setFilterStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchSequences = useCallback(async () => {
    if (companyLoading || !companyId) return;
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ page: String(page), page_size: String(ITEMS_PER_PAGE) });
      if (filterStatus !== 'all') params.set('status', filterStatus);
      const res = await authFetch(`/api/admin/follow-ups?${params}`);
      if (!res.ok) throw new Error('Failed to load follow-ups');
      const data: FollowUpListResponse = await res.json();
      setSequences(data.sequences || []);
      setTotal(data.total || 0);
      setHasNext(data.has_next_page || false);
    } catch (err) {
      console.error('[follow-ups] fetch error:', err);
      setError(t('Failed to load follow-up sequences. Please try again.', '載入跟進序列失敗，請重試。'));
      setSequences([]);
    } finally {
      setLoading(false);
    }
  }, [companyId, companyLoading, page, filterStatus, t]);

  useEffect(() => {
    fetchSequences();
  }, [fetchSequences]);

  const handleStatusChange = async (sequence: FollowUpSequence, newStatus: string) => {
    const oldStatus = sequence.status;
    setSequences((prev) => prev.map((s) => s.id === sequence.id ? { ...s, status: newStatus } : s));

    try {
      const res = await authFetch(`/api/admin/follow-ups/${sequence.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update sequence');
      const body = await res.json();
      if (body.sequence) {
        setSequences((prev) => prev.map((s) => s.id === sequence.id ? { ...s, ...body.sequence } : s));
      }
      const statusInfo = getStatusInfo(newStatus);
      showToast(t(`Sequence ${newStatus}`, `序列${t(statusInfo.en, statusInfo.zh)}`), 'success');
    } catch (err) {
      console.error('[follow-ups] status update error:', err);
      setSequences((prev) => prev.map((s) => s.id === sequence.id ? { ...s, status: oldStatus } : s));
      showToast(t('Failed to update sequence', '更新序列失敗'), 'error');
    }
  };

  const getCompletedSteps = (items: FollowUpItem[]): number => {
    return items.filter((item) => item.status === 'sent' || item.status === 'completed').length;
  };

  const getNextScheduled = (items: FollowUpItem[]): string | null => {
    const next = items
      .filter((item) => item.status === 'scheduled')
      .sort((a, b) => new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime())[0];
    return next?.scheduled_for || null;
  };

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-[20px] md:text-[24px] font-semibold tracking-[-0.5px]">{t('Follow-ups', '跟進管理')}</h1>
          <p className="text-[13px] md:text-[14px] mt-1" style={{ color: 'var(--text-muted)' }}>
            {t('Manage automated follow-up sequences for quotes and opportunities', '管理報價和商機的自動跟進序列')}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
          className="border rounded-[4px] px-3 py-2 text-[13px] md:text-[14px] focus:outline-none"
          style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
        >
          <option value="all">{t('All Status', '所有狀態')}</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s.key} value={s.key}>{t(s.en, s.zh)}</option>
          ))}
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="border rounded-[4px] p-4 mb-4" style={{ borderColor: 'var(--error)', background: '#FEF2F2' }}>
          <p className="text-[13px] md:text-[14px]" style={{ color: 'var(--error)' }}>{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="border rounded-[4px] overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4 border-b last:border-b-0 animate-pulse" style={{ borderColor: 'var(--border)' }}>
              <div className="flex-1 space-y-2">
                <div className="h-3 w-40 rounded" style={{ background: 'var(--border)' }} />
                <div className="h-3 w-24 rounded" style={{ background: 'var(--border)' }} />
              </div>
              <div className="h-6 w-16 rounded" style={{ background: 'var(--border)' }} />
              <div className="h-6 w-20 rounded" style={{ background: 'var(--border)' }} />
            </div>
          ))}
        </div>
      ) : sequences.length === 0 ? (
        <div className="border rounded-[4px] p-8 md:p-10 text-center" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <svg className="mx-auto mb-3" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <p className="text-[14px] font-medium mb-1" style={{ color: 'var(--text)' }}>
            {filterStatus !== 'all'
              ? t('No matching sequences', '沒有符合的序列')
              : t('No follow-up sequences yet', '暫無跟進序列')}
          </p>
          <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
            {filterStatus !== 'all'
              ? t('Try adjusting your filter', '嘗試調整篩選條件')
              : t('Follow-ups are created automatically when you send a quote', '發送報價時會自動建立跟進序列')}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block border rounded-[4px] overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <table className="w-full text-[14px]">
              <thead>
                <tr className="border-b text-left" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                  <th className="px-5 py-3 font-medium">{t('Opportunity', '商機')}</th>
                  <th className="px-5 py-3 font-medium">{t('Status', '狀態')}</th>
                  <th className="px-5 py-3 font-medium">{t('Channel', '渠道')}</th>
                  <th className="px-5 py-3 font-medium">{t('Steps', '步驟')}</th>
                  <th className="px-5 py-3 font-medium">{t('Next Scheduled', '下次排程')}</th>
                  <th className="px-5 py-3 font-medium text-right">{t('Actions', '操作')}</th>
                </tr>
              </thead>
              <tbody>
                {sequences.map((seq) => {
                  const statusInfo = getStatusInfo(seq.status);
                  const completedSteps = getCompletedSteps(seq.follow_up_items || []);
                  const totalSteps = seq.follow_up_items?.length || 0;
                  const nextScheduled = getNextScheduled(seq.follow_up_items || []);
                  const overdue = isOverdue(nextScheduled);
                  const isExpanded = expandedId === seq.id;
                  const channelInfo = getChannelLabel(seq.channel);

                  return (
                    <Fragment key={seq.id}>
                      <tr
                        className="border-b hover:bg-black/[0.02] cursor-pointer"
                        style={{ borderColor: 'var(--border)' }}
                        onClick={() => toggleExpand(seq.id)}
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <svg
                              width="12" height="12" viewBox="0 0 24 24" fill="none"
                              stroke="var(--text-muted)" strokeWidth="2"
                              style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}
                            >
                              <polyline points="9 18 15 12 9 6" />
                            </svg>
                            <span className="font-medium" style={{ color: 'var(--text)' }}>
                              {seq.opportunities?.title || `#${seq.opportunity_id.slice(0, 8)}`}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className="text-[11px] font-medium px-2 py-0.5 rounded"
                            style={{ color: statusInfo.color, background: statusInfo.bg }}
                          >
                            {t(statusInfo.en, statusInfo.zh)}
                          </span>
                        </td>
                        <td className="px-5 py-3" style={{ color: 'var(--text-muted)' }}>
                          {t(channelInfo.en, channelInfo.zh)}
                        </td>
                        <td className="px-5 py-3">
                          <span style={{ color: 'var(--text)' }}>
                            {completedSteps}/{totalSteps}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          {nextScheduled ? (
                            <span style={{ color: overdue ? 'var(--error)' : 'var(--text-muted)' }} className={overdue ? 'font-medium' : ''}>
                              {formatDate(nextScheduled)}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            {seq.status === 'active' && (
                              <button
                                onClick={() => handleStatusChange(seq, 'paused')}
                                className="text-[11px] px-2 py-1 rounded hover:opacity-80"
                                style={{ color: '#D97706', border: '1px solid #D97706' }}
                              >
                                {t('Pause', '暫停')}
                              </button>
                            )}
                            {seq.status === 'paused' && (
                              <button
                                onClick={() => handleStatusChange(seq, 'active')}
                                className="text-[11px] px-2 py-1 rounded hover:opacity-80"
                                style={{ color: '#059669', border: '1px solid #059669' }}
                              >
                                {t('Resume', '恢復')}
                              </button>
                            )}
                            {(seq.status === 'active' || seq.status === 'paused') && (
                              <button
                                onClick={() => handleStatusChange(seq, 'cancelled')}
                                className="text-[11px] px-2 py-1 rounded hover:opacity-80"
                                style={{ color: 'var(--error)' }}
                              >
                                {t('Cancel', '取消')}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expanded step details */}
                      {isExpanded && (
                        <tr key={`${seq.id}-expanded`}>
                          <td colSpan={6} className="px-5 py-0">
                            <div className="py-3 border-t" style={{ borderColor: 'var(--border)' }}>
                              {(seq.follow_up_items || [])
                                .sort((a, b) => a.step_number - b.step_number)
                                .map((item) => {
                                  const itemStatus = getItemStatusInfo(item.status);
                                  const itemOverdue = item.status === 'scheduled' && isOverdue(item.scheduled_for);
                                  return (
                                    <div
                                      key={item.id}
                                      className="flex items-start gap-3 py-2 px-3 rounded-[4px] mb-1 last:mb-0"
                                      style={{ background: 'var(--bg)' }}
                                    >
                                      <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-medium" style={{ background: `${itemStatus.color}15`, color: itemStatus.color }}>
                                        {item.step_number}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                          <span className="text-[13px] font-medium" style={{ color: 'var(--text)' }}>
                                            {item.subject || item.message_type}
                                          </span>
                                          <span
                                            className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                                            style={{ color: itemStatus.color, background: itemStatus.bg }}
                                          >
                                            {t(itemStatus.en, itemStatus.zh)}
                                          </span>
                                        </div>
                                        <div className="flex gap-3 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                                          <span>
                                            {t('Scheduled', '排程')}: {formatDateTime(item.scheduled_for)}
                                            {itemOverdue && (
                                              <span className="ml-1 font-medium" style={{ color: 'var(--error)' }}>
                                                ({t('overdue', '逾期')})
                                              </span>
                                            )}
                                          </span>
                                          {item.sent_at && (
                                            <span>{t('Sent', '送出')}: {formatDateTime(item.sent_at)}</span>
                                          )}
                                        </div>
                                        {item.error_message && (
                                          <p className="text-[11px] mt-1" style={{ color: 'var(--error)' }}>{item.error_message}</p>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              {(!seq.follow_up_items || seq.follow_up_items.length === 0) && (
                                <p className="text-[13px] py-2" style={{ color: 'var(--text-muted)' }}>
                                  {t('No steps configured', '未設定步驟')}
                                </p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {sequences.map((seq) => {
              const statusInfo = getStatusInfo(seq.status);
              const completedSteps = getCompletedSteps(seq.follow_up_items || []);
              const totalSteps = seq.follow_up_items?.length || 0;
              const nextScheduled = getNextScheduled(seq.follow_up_items || []);
              const overdue = isOverdue(nextScheduled);
              const isExpanded = expandedId === seq.id;
              const channelInfo = getChannelLabel(seq.channel);

              return (
                <div
                  key={seq.id}
                  className="border rounded-[4px] overflow-hidden"
                  style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                >
                  <div
                    className="p-4 cursor-pointer"
                    onClick={() => toggleExpand(seq.id)}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-medium truncate">
                          {seq.opportunities?.title || `#${seq.opportunity_id.slice(0, 8)}`}
                        </p>
                        <div className="flex gap-2 mt-1">
                          <span
                            className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                            style={{ color: statusInfo.color, background: statusInfo.bg }}
                          >
                            {t(statusInfo.en, statusInfo.zh)}
                          </span>
                          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                            {t(channelInfo.en, channelInfo.zh)}
                          </span>
                        </div>
                      </div>
                      <svg
                        width="14" height="14" viewBox="0 0 24 24" fill="none"
                        stroke="var(--text-muted)" strokeWidth="2"
                        style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s', flexShrink: 0, marginTop: 2 }}
                      >
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </div>

                    <div className="flex flex-wrap gap-3 text-[12px] mb-3">
                      <span style={{ color: 'var(--text)' }}>
                        {completedSteps}/{totalSteps} {t('steps', '步驟')}
                      </span>
                      {nextScheduled && (
                        <span style={{ color: overdue ? 'var(--error)' : 'var(--text-muted)' }} className={overdue ? 'font-medium' : ''}>
                          {t('Next', '下次')}: {formatDate(nextScheduled)}
                        </span>
                      )}
                    </div>

                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      {seq.status === 'active' && (
                        <button
                          onClick={() => handleStatusChange(seq, 'paused')}
                          className="text-[11px] font-medium px-2.5 py-1 rounded-[4px]"
                          style={{ color: '#D97706', border: '1px solid #D97706' }}
                        >
                          {t('Pause', '暫停')}
                        </button>
                      )}
                      {seq.status === 'paused' && (
                        <button
                          onClick={() => handleStatusChange(seq, 'active')}
                          className="text-[11px] font-medium px-2.5 py-1 rounded-[4px]"
                          style={{ color: '#059669', border: '1px solid #059669' }}
                        >
                          {t('Resume', '恢復')}
                        </button>
                      )}
                      {(seq.status === 'active' || seq.status === 'paused') && (
                        <button
                          onClick={() => handleStatusChange(seq, 'cancelled')}
                          className="text-[11px] px-2.5 py-1 rounded-[4px]"
                          style={{ color: 'var(--error)' }}
                        >
                          {t('Cancel', '取消')}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded steps */}
                  {isExpanded && (
                    <div className="border-t px-4 py-3 space-y-2" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
                      {(seq.follow_up_items || [])
                        .sort((a, b) => a.step_number - b.step_number)
                        .map((item) => {
                          const itemStatus = getItemStatusInfo(item.status);
                          const itemOverdue = item.status === 'scheduled' && isOverdue(item.scheduled_for);
                          return (
                            <div key={item.id} className="flex items-start gap-2.5 py-1.5">
                              <div className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium" style={{ background: `${itemStatus.color}15`, color: itemStatus.color }}>
                                {item.step_number}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                  <span className="text-[12px] font-medium truncate" style={{ color: 'var(--text)' }}>
                                    {item.subject || item.message_type}
                                  </span>
                                  <span
                                    className="text-[9px] font-medium px-1 py-0.5 rounded flex-shrink-0"
                                    style={{ color: itemStatus.color, background: itemStatus.bg }}
                                  >
                                    {t(itemStatus.en, itemStatus.zh)}
                                  </span>
                                </div>
                                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                                  {formatDate(item.scheduled_for)}
                                  {itemOverdue && (
                                    <span className="ml-1 font-medium" style={{ color: 'var(--error)' }}>
                                      — {t('overdue', '逾期')}
                                    </span>
                                  )}
                                  {item.sent_at && (
                                    <span> → {t('sent', '已送出')} {formatDateTime(item.sent_at)}</span>
                                  )}
                                </p>
                                {item.error_message && (
                                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--error)' }}>{item.error_message}</p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      {(!seq.follow_up_items || seq.follow_up_items.length === 0) && (
                        <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                          {t('No steps configured', '未設定步驟')}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 px-1">
              <p className="text-[12px] md:text-[13px]" style={{ color: 'var(--text-muted)' }}>
                {t('Showing', '顯示')} {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, total)} {t('of', '/')} {total}
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="text-[12px] px-3 py-1.5 rounded-[4px] border disabled:opacity-40"
                  style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                >
                  {t('Prev', '上一頁')}
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .reduce<(number | string)[]>((acc, p, i, arr) => {
                    if (i > 0 && (arr[i - 1] as number) < (p as number) - 1) acc.push('...');
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) =>
                    typeof p === 'string' ? (
                      <span key={`dots-${i}`} className="text-[12px] px-1.5 py-1.5" style={{ color: 'var(--text-muted)' }}>...</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className="text-[12px] min-w-[28px] h-[28px] rounded-[4px] font-medium"
                        style={{
                          background: page === p ? 'var(--accent)' : 'transparent',
                          color: page === p ? 'white' : 'var(--text)',
                        }}
                      >
                        {p}
                      </button>
                    )
                  )}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={!hasNext}
                  className="text-[12px] px-3 py-1.5 rounded-[4px] border disabled:opacity-40"
                  style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                >
                  {t('Next', '下一頁')}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

