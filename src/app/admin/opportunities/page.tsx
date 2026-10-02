'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useLang } from '@/lib/lang';
import { useToast } from '@/components/Toast';
import { authFetch } from '@/lib/auth-fetch';

interface Opportunity {
  id: string;
  title: string;
  product_name: string | null;
  product_category: string | null;
  stage: string;
  estimated_order_value: number | null;
  currency: string;
  priority: string;
  next_action: string | null;
  next_action_due: string | null;
  created_at: string;
  updated_at: string;
}

interface StageStyle {
  en: string;
  zh: string;
  color: string;
  bg: string;
}

const NEUTRAL: StageStyle = { en: '—', zh: '—', color: '#4B5563', bg: '#EEF2F7' };

const STAGE_STYLES: Record<string, StageStyle> = {
  new: { en: 'New', zh: '新', color: '#6B7280', bg: '#F3F4F6' },
  lead: { en: 'Lead', zh: '線索', color: '#6B7280', bg: '#F3F4F6' },
  qualified: { en: 'Qualified', zh: '已確認', color: '#2563EB', bg: '#EFF6FF' },
  rfq_sent: { en: 'RFQ sent', zh: '已發出詢價', color: '#0891B2', bg: '#ECFEFF' },
  sent: { en: 'Sent', zh: '已發送', color: '#0891B2', bg: '#ECFEFF' },
  quoted: { en: 'Quoted', zh: '已報價', color: '#D97706', bg: '#FEF3C7' },
  proposal: { en: 'Proposal', zh: '提案中', color: '#D97706', bg: '#FEF3C7' },
  pending_approval: { en: 'Pending approval', zh: '待審批', color: '#B45309', bg: '#FEF3C7' },
  negotiating: { en: 'Negotiating', zh: '談判中', color: '#7C3AED', bg: '#F5F3FF' },
  negotiation: { en: 'Negotiation', zh: '談判中', color: '#7C3AED', bg: '#F5F3FF' },
  won: { en: 'Won', zh: '已成交', color: '#059669', bg: '#ECFDF5' },
  closed_won: { en: 'Closed Won', zh: '已成交', color: '#059669', bg: '#ECFDF5' },
  lost: { en: 'Lost', zh: '已流失', color: '#DC2626', bg: '#FEF2F2' },
  closed_lost: { en: 'Closed Lost', zh: '已流失', color: '#DC2626', bg: '#FEF2F2' },
};

const PRIORITIES: Record<string, StageStyle> = {
  low: { en: 'Low', zh: '低', color: '#6B7280', bg: '#F3F4F6' },
  medium: { en: 'Medium', zh: '中', color: '#D97706', bg: '#FFFBEB' },
  normal: { en: 'Normal', zh: '一般', color: '#4B5563', bg: '#F3F4F6' },
  high: { en: 'High', zh: '高', color: '#DC2626', bg: '#FEF2F2' },
  urgent: { en: 'Urgent', zh: '緊急', color: '#B91C1C', bg: '#FEF2F2' },
};

const ITEMS_PER_PAGE = 25;

function stageStyle(stage: string | null): StageStyle {
  if (!stage) return NEUTRAL;
  return STAGE_STYLES[stage.toLowerCase()] || { ...NEUTRAL, en: stage, zh: stage };
}

function priorityStyle(priority: string | null): StageStyle {
  if (!priority) return PRIORITIES.normal;
  return PRIORITIES[priority.toLowerCase()] || { ...NEUTRAL, en: priority, zh: priority };
}

function formatCurrency(value: number | null, currency: string): string {
  if (value == null) return '—';
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD', maximumFractionDigits: 0 }).format(value);
  } catch {
    return `${currency || '$'}${value.toLocaleString()}`;
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function OpportunitiesPage() {
  const { t } = useLang();
  const { showToast } = useToast();
  const router = useRouter();

  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newOpp, setNewOpp] = useState({
    title: '',
    product_name: '',
    estimated_order_value: '',
    priority: 'normal',
    next_action: '',
    next_action_due: '',
    notes: '',
  });

  const fetchOpportunities = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await authFetch('/api/admin/opportunities?ready=1&page_size=100');
      if (!res.ok) throw new Error('Failed to load opportunities');
      const data = await res.json();
      setOpportunities(data.opportunities || []);
    } catch (err) {
      console.error('[opportunities] fetch error:', err);
      setError(t('Failed to load opportunities. Please try again.', '載入商機失敗，請重試。'));
      setOpportunities([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchOpportunities();
  }, [fetchOpportunities]);

  const filtered = opportunities.filter((o) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      o.title?.toLowerCase().includes(q) ||
      (o.product_name || '').toLowerCase().includes(q) ||
      (o.product_category || '').toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleCreate = async () => {
    if (!newOpp.title.trim()) {
      showToast(t('Title is required', '標題為必填'), 'error');
      return;
    }
    setCreating(true);
    try {
      const res = await authFetch('/api/admin/opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newOpp.title.trim(),
          product_name: newOpp.product_name.trim() || null,
          estimated_order_value: newOpp.estimated_order_value ? parseFloat(newOpp.estimated_order_value) : null,
          priority: newOpp.priority,
          next_action: newOpp.next_action.trim() || null,
          next_action_due: newOpp.next_action_due || null,
          notes: newOpp.notes.trim() || null,
        }),
      });
      if (!res.ok) throw new Error('Failed to create opportunity');
      const body = await res.json();
      const created = body.opportunity || body;
      setOpportunities((prev) => [created, ...prev]);
      showToast(t('Opportunity created', '商機已建立'), 'success');
      setShowCreate(false);
      setNewOpp({ title: '', product_name: '', estimated_order_value: '', priority: 'normal', next_action: '', next_action_due: '', notes: '' });
    } catch (err) {
      console.error('[opportunities] create error:', err);
      showToast(t('Failed to create opportunity', '建立商機失敗'), 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await authFetch(`/api/admin/opportunities?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete opportunity');
      setOpportunities((prev) => prev.filter((o) => o.id !== id));
      showToast(t('Opportunity deleted', '商機已刪除'), 'success');
    } catch (err) {
      console.error('[opportunities] delete error:', err);
      showToast(t('Failed to delete opportunity', '刪除商機失敗'), 'error');
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-[20px] md:text-[24px] font-semibold tracking-[-0.5px]">{t('Opportunities', '商機')}</h1>
          <p className="text-[13px] md:text-[14px] mt-1" style={{ color: 'var(--text-muted)' }}>
            {t('Threads with every spec collected — ready to quote.', '規格齊全、可即時報價的商機。')}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="text-[13px] md:text-[14px] font-medium px-4 py-2.5 rounded-[4px] text-white w-full sm:w-auto"
          style={{ background: 'var(--accent)' }}
        >
          {t('Create Opportunity', '建立商機')}
        </button>
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          type="text"
          placeholder={t('Search by title or product...', '搜尋標題或產品...')}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="border rounded-[4px] px-3 py-2 text-[13px] md:text-[14px] flex-1 focus:outline-none"
          style={{ borderColor: 'var(--border)' }}
        />
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="border rounded-[4px] p-4 md:p-5 mb-6" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <h2 className="text-[14px] md:text-[15px] font-semibold mb-4">{t('New opportunity', '新商機')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <input
              placeholder={t('Opportunity title', '商機標題')}
              value={newOpp.title}
              onChange={(e) => setNewOpp({ ...newOpp, title: e.target.value })}
              className="border rounded-[4px] px-3 py-2 text-[13px] md:text-[14px] focus:outline-none"
              style={{ borderColor: 'var(--border)' }}
            />
            <input
              placeholder={t('Product', '產品')}
              value={newOpp.product_name}
              onChange={(e) => setNewOpp({ ...newOpp, product_name: e.target.value })}
              className="border rounded-[4px] px-3 py-2 text-[13px] md:text-[14px] focus:outline-none"
              style={{ borderColor: 'var(--border)' }}
            />
            <input
              placeholder={t('Estimated value (USD)', '預估價值 (USD)')}
              type="number"
              value={newOpp.estimated_order_value}
              onChange={(e) => setNewOpp({ ...newOpp, estimated_order_value: e.target.value })}
              className="border rounded-[4px] px-3 py-2 text-[13px] md:text-[14px] focus:outline-none"
              style={{ borderColor: 'var(--border)' }}
            />
            <select
              value={newOpp.priority}
              onChange={(e) => setNewOpp({ ...newOpp, priority: e.target.value })}
              className="border rounded-[4px] px-3 py-2 text-[13px] md:text-[14px] focus:outline-none"
              style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
            >
              {Object.entries(PRIORITIES).map(([key, p]) => (
                <option key={key} value={key}>{t(p.en, p.zh)}</option>
              ))}
            </select>
            <input
              placeholder={t('Next action', '下一步行動')}
              value={newOpp.next_action}
              onChange={(e) => setNewOpp({ ...newOpp, next_action: e.target.value })}
              className="border rounded-[4px] px-3 py-2 text-[13px] md:text-[14px] focus:outline-none"
              style={{ borderColor: 'var(--border)' }}
            />
            <input
              type="date"
              value={newOpp.next_action_due}
              onChange={(e) => setNewOpp({ ...newOpp, next_action_due: e.target.value })}
              className="border rounded-[4px] px-3 py-2 text-[13px] md:text-[14px] focus:outline-none"
              style={{ borderColor: 'var(--border)' }}
            />
          </div>
          <textarea
            placeholder={t('Notes', '備註')}
            value={newOpp.notes}
            onChange={(e) => setNewOpp({ ...newOpp, notes: e.target.value })}
            rows={3}
            className="border rounded-[4px] px-3 py-2 text-[13px] md:text-[14px] w-full mb-4 focus:outline-none resize-none"
            style={{ borderColor: 'var(--border)' }}
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setShowCreate(false)}
              className="text-[12px] md:text-[13px] px-4 py-2 rounded-[4px] border"
              style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
            >
              {t('Cancel', '取消')}
            </button>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="text-[12px] md:text-[13px] font-medium px-4 py-2 rounded-[4px] text-white disabled:opacity-50"
              style={{ background: 'var(--accent)' }}
            >
              {creating ? t('Creating...', '建立中...') : t('Create', '建立')}
            </button>
          </div>
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
      ) : filtered.length === 0 ? (
        <div className="border rounded-[4px] p-8 md:p-10 text-center" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <svg className="mx-auto mb-3" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
            <path d="M16 12l-4-4-4 4M12 16V8" />
          </svg>
          <p className="text-[14px] font-medium mb-1" style={{ color: 'var(--text)' }}>
            {search ? t('No matching opportunities', '沒有符合的商機') : t('No opportunities yet', '暫無商機')}
          </p>
          <p className="text-[13px] mb-4" style={{ color: 'var(--text-muted)' }}>
            {search
              ? t('Try adjusting your search', '嘗試調整搜尋條件')
              : t('Threads land here automatically once every spec is collected.', '當規格齊全時，對話會自動出現在這裡。')}
          </p>
          {!search && (
            <button
              onClick={() => setShowCreate(true)}
              className="text-[13px] font-medium px-4 py-2 rounded-[4px] text-white"
              style={{ background: 'var(--accent)' }}
            >
              {t('Create an opportunity', '建立商機')}
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block border rounded-[4px] overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <table className="w-full text-[14px]">
              <thead>
                <tr className="border-b text-left" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                  <th className="px-5 py-3 font-medium">{t('Title', '標題')}</th>
                  <th className="px-5 py-3 font-medium">{t('Product', '產品')}</th>
                  <th className="px-5 py-3 font-medium">{t('Stage', '階段')}</th>
                  <th className="px-5 py-3 font-medium">{t('Value', '價值')}</th>
                  <th className="px-5 py-3 font-medium">{t('Priority', '優先級')}</th>
                  <th className="px-5 py-3 font-medium">{t('Updated', '更新')}</th>
                  <th className="px-5 py-3 font-medium text-right">{t('Actions', '操作')}</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((opp) => {
                  const stage = stageStyle(opp.stage);
                  const priority = priorityStyle(opp.priority);
                  return (
                    <tr
                      key={opp.id}
                      className="border-b last:border-b-0 hover:bg-black/[0.02] cursor-pointer"
                      style={{ borderColor: 'var(--border)' }}
                      onClick={() => router.push(`/admin/opportunities/${opp.id}`)}
                    >
                      <td className="px-5 py-3">
                        <span className="font-medium" style={{ color: 'var(--text)' }}>{opp.title}</span>
                      </td>
                      <td className="px-5 py-3" style={{ color: 'var(--text-muted)' }}>
                        {opp.product_name || opp.product_category || '—'}
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded" style={{ color: stage.color, background: stage.bg }}>
                          {t(stage.en, stage.zh)}
                        </span>
                      </td>
                      <td className="px-5 py-3" style={{ color: 'var(--text)' }}>
                        {formatCurrency(opp.estimated_order_value, opp.currency)}
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded" style={{ color: priority.color, background: priority.bg }}>
                          {t(priority.en, priority.zh)}
                        </span>
                      </td>
                      <td className="px-5 py-3" style={{ color: 'var(--text-muted)' }}>
                        {formatDate(opp.updated_at)}
                      </td>
                      <td className="px-5 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleDelete(opp.id)}
                          className="text-[11px] px-2 py-1 rounded hover:opacity-80"
                          style={{ color: 'var(--error)' }}
                        >
                          {t('Delete', '刪除')}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {paginated.map((opp) => {
              const stage = stageStyle(opp.stage);
              const priority = priorityStyle(opp.priority);
              return (
                <div
                  key={opp.id}
                  className="border rounded-[4px] p-4"
                  style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                  onClick={() => router.push(`/admin/opportunities/${opp.id}`)}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="text-[14px] font-medium truncate">{opp.title}</p>
                      <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {opp.product_name || opp.product_category || '—'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ color: stage.color, background: stage.bg }}>
                        {t(stage.en, stage.zh)}
                      </span>
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ color: priority.color, background: priority.bg }}>
                        {t(priority.en, priority.zh)}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[12px] mb-3">
                    <span className="font-medium" style={{ color: 'var(--text)' }}>
                      {formatCurrency(opp.estimated_order_value, opp.currency)}
                    </span>
                    <span style={{ color: 'var(--text-muted)' }}>{formatDate(opp.updated_at)}</span>
                  </div>
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleDelete(opp.id)}
                      className="text-[11px] font-medium px-2.5 py-1 rounded-[4px]"
                      style={{ color: 'var(--error)' }}
                    >
                      {t('Delete', '刪除')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 px-1">
              <p className="text-[12px] md:text-[13px]" style={{ color: 'var(--text-muted)' }}>
                {t('Showing', '顯示')} {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} {t('of', '/')} {filtered.length}
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="text-[12px] px-3 py-1.5 rounded-[4px] border disabled:opacity-40"
                  style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                >
                  {t('Prev', '上一頁')}
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
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
