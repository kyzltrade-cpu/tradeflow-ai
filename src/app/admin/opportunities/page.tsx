'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useLang } from '@/lib/lang';
import { useCompany } from '@/lib/company';
import { useToast } from '@/components/Toast';
import { authFetch } from '@/lib/auth-fetch';

interface Opportunity {
  id: string;
  title: string;
  customer_name: string;
  customer_email?: string;
  stage: string;
  estimated_value: number | null;
  currency: string;
  priority: string;
  next_action: string;
  next_action_due: string | null;
  owner: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

const STAGES = [
  { key: 'lead', en: 'Lead', zh: '線索', color: '#6B7280', bg: '#F3F4F6' },
  { key: 'qualified', en: 'Qualified', zh: '已確認', color: '#2563EB', bg: '#EFF6FF' },
  { key: 'proposal', en: 'Proposal', zh: '提案中', color: '#D97706', bg: '#FEF3C7' },
  { key: 'negotiation', en: 'Negotiation', zh: '談判中', color: '#7C3AED', bg: '#F5F3FF' },
  { key: 'closed_won', en: 'Closed Won', zh: '已成交', color: '#059669', bg: '#ECFDF5' },
  { key: 'closed_lost', en: 'Closed Lost', zh: '已流失', color: '#DC2626', bg: '#FEF2F2' },
];

const PRIORITIES = [
  { key: 'low', en: 'Low', zh: '低', color: '#6B7280' },
  { key: 'medium', en: 'Medium', zh: '中', color: '#D97706' },
  { key: 'high', en: 'High', zh: '高', color: '#DC2626' },
  { key: 'urgent', en: 'Urgent', zh: '緊急', color: '#B91C1C' },
];

const ITEMS_PER_PAGE = 10;

function getStageBadge(stage: string) {
  return STAGES.find((s) => s.key === stage) || STAGES[0];
}

function getPriorityBadge(priority: string) {
  return PRIORITIES.find((p) => p.key === priority) || PRIORITIES[0];
}

function getStageIndex(stage: string): number {
  return STAGES.findIndex((s) => s.key === stage);
}

function getNextStage(currentStage: string): string | null {
  const idx = getStageIndex(currentStage);
  if (idx < 0 || idx >= STAGES.length - 1) return null;
  const next = STAGES[idx + 1];
  if (next.key === 'closed_lost') return null;
  return next.key;
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
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isOverdue(dateStr: string | null): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

export default function OpportunitiesPage() {
  const { t } = useLang();
  const { companyId, loading: companyLoading } = useCompany();
  const { showToast } = useToast();
  const router = useRouter();

  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [filterStage, setFilterStage] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterOwner, setFilterOwner] = useState('all');
  const [page, setPage] = useState(1);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newOpp, setNewOpp] = useState({
    title: '',
    customer_name: '',
    estimated_value: '',
    priority: 'medium',
    next_action: '',
    next_action_due: '',
    notes: '',
  });

  const fetchOpportunities = useCallback(async () => {
    if (companyLoading || !companyId) return;
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ company_id: companyId });
      if (filterStage !== 'all') params.set('stage', filterStage);
      if (filterOwner !== 'all') params.set('owner', filterOwner);
      const res = await authFetch(`/api/admin/opportunities?${params}`);
      if (!res.ok) throw new Error('Failed to load opportunities');
      const data = await res.json();
      setOpportunities(data.opportunities || data || []);
    } catch (err) {
      console.error('[opportunities] fetch error:', err);
      setError(t('Failed to load opportunities. Please try again.', '載入商機失敗，請重試。'));
      setOpportunities([]);
    } finally {
      setLoading(false);
    }
  }, [companyId, companyLoading, filterStage, filterOwner, t]);

  useEffect(() => {
    fetchOpportunities();
  }, [fetchOpportunities]);

  // Get unique owners for filter
  const owners = Array.from(new Set(opportunities.map((o) => o.owner).filter(Boolean)));

  // Client-side filtering for search and priority
  const filtered = opportunities.filter((o) => {
    if (search) {
      const q = search.toLowerCase();
      if (!o.title.toLowerCase().includes(q) && !o.customer_name.toLowerCase().includes(q)) return false;
    }
    if (filterPriority !== 'all' && o.priority !== filterPriority) return false;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const handleStageChange = async (oppId: string, newStage: string) => {
    const opp = opportunities.find((o) => o.id === oppId);
    if (!opp) return;

    // Optimistic update
    setOpportunities((prev) => prev.map((o) => o.id === oppId ? { ...o, stage: newStage } : o));

    try {
      const res = await authFetch('/api/admin/opportunities', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: oppId, company_id: companyId, stage: newStage }),
      });
      if (!res.ok) throw new Error('Failed to update stage');
      showToast(t('Stage updated', '階段已更新'), 'success');
    } catch (err) {
      console.error('[opportunities] stage update error:', err);
      setOpportunities((prev) => prev.map((o) => o.id === oppId ? { ...o, stage: opp.stage } : o));
      showToast(t('Failed to update stage', '更新階段失敗'), 'error');
    }
  };

  const handleCreate = async () => {
    if (!newOpp.title || !newOpp.customer_name) {
      showToast(t('Title and customer name are required', '標題和客戶名稱為必填'), 'error');
      return;
    }
    if (!companyId) {
      showToast(t('No company linked. Please refresh the page.', '未連結公司，請重新整理頁面。'), 'error');
      return;
    }

    setCreating(true);
    try {
      const res = await authFetch('/api/admin/opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: companyId,
          title: newOpp.title,
          customer_name: newOpp.customer_name,
          stage: 'lead',
          estimated_value: newOpp.estimated_value ? parseFloat(newOpp.estimated_value) : null,
          priority: newOpp.priority,
          next_action: newOpp.next_action,
          next_action_due: newOpp.next_action_due || null,
          notes: newOpp.notes,
        }),
      });
      if (!res.ok) throw new Error('Failed to create opportunity');
      const body = await res.json();
      const created = body.opportunity || body;
      setOpportunities((prev) => [created, ...prev]);
      showToast(t('Opportunity created', '商機已建立'), 'success');
      setShowCreate(false);
      setNewOpp({ title: '', customer_name: '', estimated_value: '', priority: 'medium', next_action: '', next_action_due: '', notes: '' });
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
            {t('Track and manage your sales pipeline', '追蹤和管理您的銷售管道')}
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

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          type="text"
          placeholder={t('Search by title or customer...', '搜尋標題或客戶...')}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="border rounded-[4px] px-3 py-2 text-[13px] md:text-[14px] flex-1 focus:outline-none"
          style={{ borderColor: 'var(--border)' }}
        />
        <select
          value={filterStage}
          onChange={(e) => { setFilterStage(e.target.value); setPage(1); }}
          className="border rounded-[4px] px-3 py-2 text-[13px] md:text-[14px] focus:outline-none"
          style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
        >
          <option value="all">{t('All Stages', '所有階段')}</option>
          {STAGES.map((s) => (
            <option key={s.key} value={s.key}>{t(s.en, s.zh)}</option>
          ))}
        </select>
        <select
          value={filterPriority}
          onChange={(e) => { setFilterPriority(e.target.value); setPage(1); }}
          className="border rounded-[4px] px-3 py-2 text-[13px] md:text-[14px] focus:outline-none"
          style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
        >
          <option value="all">{t('All Priorities', '所有優先級')}</option>
          {PRIORITIES.map((p) => (
            <option key={p.key} value={p.key}>{t(p.en, p.zh)}</option>
          ))}
        </select>
        {owners.length > 0 && (
          <select
            value={filterOwner}
            onChange={(e) => { setFilterOwner(e.target.value); setPage(1); }}
            className="border rounded-[4px] px-3 py-2 text-[13px] md:text-[14px] focus:outline-none"
            style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
          >
            <option value="all">{t('All Owners', '所有負責人')}</option>
            {owners.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        )}
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
              placeholder={t('Customer name', '客戶名稱')}
              value={newOpp.customer_name}
              onChange={(e) => setNewOpp({ ...newOpp, customer_name: e.target.value })}
              className="border rounded-[4px] px-3 py-2 text-[13px] md:text-[14px] focus:outline-none"
              style={{ borderColor: 'var(--border)' }}
            />
            <input
              placeholder={t('Estimated value (USD)', '預估價值 (USD)')}
              type="number"
              value={newOpp.estimated_value}
              onChange={(e) => setNewOpp({ ...newOpp, estimated_value: e.target.value })}
              className="border rounded-[4px] px-3 py-2 text-[13px] md:text-[14px] focus:outline-none"
              style={{ borderColor: 'var(--border)' }}
            />
            <select
              value={newOpp.priority}
              onChange={(e) => setNewOpp({ ...newOpp, priority: e.target.value })}
              className="border rounded-[4px] px-3 py-2 text-[13px] md:text-[14px] focus:outline-none"
              style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
            >
              {PRIORITIES.map((p) => (
                <option key={p.key} value={p.key}>{t(p.en, p.zh)}</option>
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
            {search || filterStage !== 'all' || filterPriority !== 'all' || filterOwner !== 'all'
              ? t('No matching opportunities', '沒有符合的商機')
              : t('No opportunities yet', '暫無商機')}
          </p>
          <p className="text-[13px] mb-4" style={{ color: 'var(--text-muted)' }}>
            {search || filterStage !== 'all' || filterPriority !== 'all' || filterOwner !== 'all'
              ? t('Try adjusting your filters', '嘗試調整您的篩選條件')
              : t('Create your first opportunity to start tracking sales', '建立您的第一個商機以開始追蹤銷售')}
          </p>
          {!search && filterStage === 'all' && filterPriority === 'all' && filterOwner === 'all' && (
            <button
              onClick={() => setShowCreate(true)}
              className="text-[13px] font-medium px-4 py-2 rounded-[4px] text-white"
              style={{ background: 'var(--accent)' }}
            >
              {t('Create your first opportunity', '建立第一個商機')}
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
                  <th className="px-5 py-3 font-medium">{t('Customer', '客戶')}</th>
                  <th className="px-5 py-3 font-medium">{t('Stage', '階段')}</th>
                  <th className="px-5 py-3 font-medium">{t('Value', '價值')}</th>
                  <th className="px-5 py-3 font-medium">{t('Priority', '優先級')}</th>
                  <th className="px-5 py-3 font-medium">{t('Next Action', '下一步行動')}</th>
                  <th className="px-5 py-3 font-medium">{t('Due', '截止日')}</th>
                  <th className="px-5 py-3 font-medium text-right">{t('Actions', '操作')}</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((opp) => {
                  const stageBadge = getStageBadge(opp.stage);
                  const priorityBadge = getPriorityBadge(opp.priority);
                  const nextStage = getNextStage(opp.stage);
                  const overdue = isOverdue(opp.next_action_due);
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
                      <td className="px-5 py-3" style={{ color: 'var(--text-muted)' }}>{opp.customer_name}</td>
                      <td className="px-5 py-3">
                        <span
                          className="text-[11px] font-medium px-2 py-0.5 rounded"
                          style={{ color: stageBadge.color, background: stageBadge.bg }}
                        >
                          {t(stageBadge.en, stageBadge.zh)}
                        </span>
                      </td>
                      <td className="px-5 py-3" style={{ color: 'var(--text)' }}>
                        {formatCurrency(opp.estimated_value, opp.currency)}
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded" style={{ color: priorityBadge.color, background: `${priorityBadge.color}15` }}>
                          {t(priorityBadge.en, priorityBadge.zh)}
                        </span>
                      </td>
                      <td className="px-5 py-3 max-w-[180px] truncate" style={{ color: 'var(--text-muted)' }}>
                        {opp.next_action || '—'}
                      </td>
                      <td className="px-5 py-3">
                        <span style={{ color: overdue ? 'var(--error)' : 'var(--text-muted)' }} className={overdue ? 'font-medium' : ''}>
                          {formatDate(opp.next_action_due)}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {nextStage && (
                            <button
                              onClick={() => handleStageChange(opp.id, nextStage)}
                              className="text-[11px] px-2 py-1 rounded hover:opacity-80"
                              style={{ color: 'var(--accent)', border: '1px solid var(--accent)' }}
                              title={`${t('Move to', '移至')} ${t(getStageBadge(nextStage).en, getStageBadge(nextStage).zh)}`}
                            >
                              → {t(getStageBadge(nextStage).en, getStageBadge(nextStage).zh)}
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(opp.id)}
                            className="text-[11px] px-2 py-1 rounded hover:opacity-80"
                            style={{ color: 'var(--error)' }}
                          >
                            {t('Delete', '刪除')}
                          </button>
                        </div>
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
              const stageBadge = getStageBadge(opp.stage);
              const priorityBadge = getPriorityBadge(opp.priority);
              const nextStage = getNextStage(opp.stage);
              const overdue = isOverdue(opp.next_action_due);
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
                      <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{opp.customer_name}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span
                        className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                        style={{ color: stageBadge.color, background: stageBadge.bg }}
                      >
                        {t(stageBadge.en, stageBadge.zh)}
                      </span>
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ color: priorityBadge.color, background: `${priorityBadge.color}15` }}>
                        {t(priorityBadge.en, priorityBadge.zh)}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[12px] mb-3">
                    <span className="font-medium" style={{ color: 'var(--text)' }}>
                      {formatCurrency(opp.estimated_value, opp.currency)}
                    </span>
                    {opp.next_action && (
                      <span style={{ color: 'var(--text-muted)' }}>
                        {t('Next:', '下一步:')} {opp.next_action}
                      </span>
                    )}
                    {opp.next_action_due && (
                      <span style={{ color: overdue ? 'var(--error)' : 'var(--text-muted)' }} className={overdue ? 'font-medium' : ''}>
                        {formatDate(opp.next_action_due)}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    {nextStage && (
                      <button
                        onClick={() => handleStageChange(opp.id, nextStage)}
                        className="text-[11px] font-medium px-2.5 py-1 rounded-[4px]"
                        style={{ color: 'var(--accent)', border: '1px solid var(--accent)' }}
                      >
                        → {t(getStageBadge(nextStage).en, getStageBadge(nextStage).zh)}
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(opp.id)}
                      className="text-[11px] px-2.5 py-1 rounded-[4px]"
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
                {t('Showing', '顯示')} {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, filtered.length)} {t('of', '/')} {filtered.length}
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
                  disabled={page === totalPages}
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
