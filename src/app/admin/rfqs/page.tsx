'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useLang } from '@/lib/lang';
import { useCompany } from '@/lib/company';
import { useToast } from '@/components/Toast';
import { authFetch } from '@/lib/auth-fetch';

interface RfqSupplier {
  id: string;
  legal_name: string | null;
  trading_name: string | null;
  location: string | null;
}

interface RfqOpportunity {
  id: string;
  title: string | null;
  stage: string | null;
  product_name: string | null;
}

interface Rfq {
  id: string;
  rfq_number: string;
  opportunity_id: string | null;
  supplier_id: string | null;
  status: string;
  subject: string | null;
  sent_at: string | null;
  response_deadline: string | null;
  created_at: string;
  suppliers: RfqSupplier | null;
  opportunities: RfqOpportunity | null;
}

interface RfqListResponse {
  rfqs: Rfq[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  READY: 'bg-blue-100 text-blue-700',
  SENT: 'bg-indigo-100 text-indigo-700',
  PARTIALLY_RESPONDED: 'bg-amber-100 text-amber-700',
  COMPLETE: 'bg-green-100 text-green-700',
  EXPIRED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

const STATUS_OPTIONS = [
  { value: '', en: 'All', zh: '全部' },
  { value: 'DRAFT', en: 'Draft', zh: '草稿' },
  { value: 'SENT', en: 'Sent', zh: '已發送' },
  { value: 'PARTIALLY_RESPONDED', en: 'Partial Response', zh: '部分回覆' },
  { value: 'COMPLETE', en: 'Complete', zh: '已完成' },
  { value: 'EXPIRED', en: 'Expired', zh: '已過期' },
  { value: 'CANCELLED', en: 'Cancelled', zh: '已取消' },
];

const ITEMS_PER_PAGE = 20;

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function RfqsPage() {
  const { t } = useLang();
  const { companyId, loading: companyLoading } = useCompany();
  const { showToast } = useToast();
  const router = useRouter();

  const [rfqs, setRfqs] = useState<Rfq[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const fetchRfqs = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(ITEMS_PER_PAGE),
      });
      if (statusFilter) params.set('status', statusFilter);
      if (search) params.set('search', search);

      const res = await authFetch(`/api/admin/rfqs?${params}`);
      if (!res.ok) throw new Error('Failed to load RFQs');
      const data: RfqListResponse = await res.json();
      setRfqs(data.rfqs);
      setTotal(data.pagination.total);
      setTotalPages(data.pagination.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [companyId, page, statusFilter, search]);

  useEffect(() => { fetchRfqs(); }, [fetchRfqs]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-semibold">{t('Supplier RFQs', '供應商詢價')}</h1>
          <p className="text-[13px] mt-1" style={{ color: 'var(--text-muted)' }}>
            {t('Request for quotations sent to suppliers', '發送給供應商的詢價單')}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          placeholder={t('Search RFQs...', '搜尋詢價單...')}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="flex-1 px-3 py-2 text-[13px] border rounded-[4px] focus:outline-none focus:ring-1"
          style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
        />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 text-[13px] border rounded-[4px] focus:outline-none"
          style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{t(opt.en, opt.zh)}</option>
          ))}
        </select>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-12 text-[13px]" style={{ color: 'var(--text-muted)' }}>
          {t('Loading...', '載入中...')}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="text-center py-12 text-[13px] text-red-600">{error}</div>
      )}

      {/* Empty */}
      {!loading && !error && rfqs.length === 0 && (
        <div className="text-center py-16 border rounded-[4px]" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <p className="text-[14px] font-medium mb-1">{t('No RFQs found', '沒有找到詢價單')}</p>
          <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
            {t('Create supplier RFQs from opportunity detail pages', '從商機詳情頁面建立供應商詢價單')}
          </p>
        </div>
      )}

      {/* Table */}
      {!loading && !error && rfqs.length > 0 && (
        <>
          {/* Desktop */}
          <div className="hidden md:block border rounded-[4px] overflow-hidden" style={{ borderColor: 'var(--border)' }}>
            <table className="w-full text-[13px]">
              <thead>
                <tr style={{ background: 'var(--bg)' }}>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text-muted)' }}>{t('RFQ Number', '詢價單號')}</th>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text-muted)' }}>{t('Subject', '主題')}</th>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text-muted)' }}>{t('Supplier', '供應商')}</th>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text-muted)' }}>{t('Opportunity', '商機')}</th>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text-muted)' }}>{t('Status', '狀態')}</th>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text-muted)' }}>{t('Created', '建立日期')}</th>
                </tr>
              </thead>
              <tbody>
                {rfqs.map((rfq) => (
                  <tr
                    key={rfq.id}
                    className="border-t cursor-pointer hover:bg-black/[0.02] transition-colors"
                    style={{ borderColor: 'var(--border)' }}
                    onClick={() => router.push(`/admin/rfqs/${rfq.id}`)}
                  >
                    <td className="px-4 py-3 font-medium">{rfq.rfq_number}</td>
                    <td className="px-4 py-3 max-w-[200px] truncate" style={{ color: 'var(--text)' }}>
                      {rfq.subject || '—'}
                    </td>
                    <td className="px-4 py-3">
                      {rfq.suppliers?.trading_name || rfq.suppliers?.legal_name || '—'}
                    </td>
                    <td className="px-4 py-3 max-w-[160px] truncate">
                      {rfq.opportunities?.title || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_COLORS[rfq.status] || 'bg-gray-100 text-gray-600'}`}>
                        {rfq.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>
                      {formatDate(rfq.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="md:hidden space-y-3">
            {rfqs.map((rfq) => (
              <div
                key={rfq.id}
                className="border rounded-[4px] p-4 cursor-pointer hover:bg-black/[0.02]"
                style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                onClick={() => router.push(`/admin/rfqs/${rfq.id}`)}
              >
                <div className="flex items-start justify-between mb-2">
                  <p className="text-[13px] font-medium">{rfq.rfq_number}</p>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_COLORS[rfq.status] || 'bg-gray-100 text-gray-600'}`}>
                    {rfq.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-[12px] mb-1 truncate">{rfq.subject || '—'}</p>
                <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                  {rfq.suppliers?.trading_name || rfq.suppliers?.legal_name || '—'}
                  {rfq.opportunities?.title ? ` · ${rfq.opportunities.title}` : ''}
                </p>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-[12px]" style={{ color: 'var(--text-muted)' }}>
              <span>{t(`Showing ${((page - 1) * ITEMS_PER_PAGE) + 1}–${Math.min(page * ITEMS_PER_PAGE, total)} of ${total}`, `顯示 ${((page - 1) * ITEMS_PER_PAGE) + 1}–${Math.min(page * ITEMS_PER_PAGE, total)} / ${total}`)}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 border rounded-[4px] disabled:opacity-40"
                  style={{ borderColor: 'var(--border)' }}
                >
                  {t('Previous', '上一頁')}
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 border rounded-[4px] disabled:opacity-40"
                  style={{ borderColor: 'var(--border)' }}
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
