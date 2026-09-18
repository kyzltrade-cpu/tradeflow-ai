'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLang } from '@/lib/lang';
import { useCompany } from '@/lib/company';
import { useToast } from '@/components/Toast';
import { authFetch } from '@/lib/auth-fetch';

type QuoteStatus =
  | 'DRAFT'
  | 'IN_REVIEW'
  | 'APPROVED'
  | 'SENT'
  | 'OPENED'
  | 'CUSTOMER_REPLIED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'SUPERSEDED';

interface Quote {
  id: string;
  quote_number: string;
  status: QuoteStatus;
  currency: string;
  total_amount: number | null;
  margin_percent: number | null;
  valid_until: string | null;
  customer_name: string | null;
  created_at: string;
}

const STATUS_CONFIG: Record<QuoteStatus, { bg: string; color: string; en: string; zh: string }> = {
  DRAFT:              { bg: '#F3F4F6', color: '#6B7280', en: 'Draft',           zh: '草稿' },
  IN_REVIEW:          { bg: '#FEF3C7', color: '#D97706', en: 'In Review',       zh: '審核中' },
  APPROVED:           { bg: '#D1FAE5', color: '#059669', en: 'Approved',        zh: '已批准' },
  SENT:               { bg: '#DBEAFE', color: '#2563EB', en: 'Sent',            zh: '已發送' },
  OPENED:             { bg: '#DBEAFE', color: '#2563EB', en: 'Opened',          zh: '已開啟' },
  CUSTOMER_REPLIED:   { bg: '#E0E7FF', color: '#4F46E5', en: 'Customer Replied', zh: '客戶已回覆' },
  ACCEPTED:           { bg: '#D1FAE5', color: '#059669', en: 'Accepted',        zh: '已接受' },
  REJECTED:           { bg: '#FEE2E2', color: '#DC2626', en: 'Rejected',        zh: '已拒絕' },
  EXPIRED:            { bg: '#F3F4F6', color: '#6B7280', en: 'Expired',         zh: '已過期' },
  SUPERSEDED:         { bg: '#F3F4F6', color: '#6B7280', en: 'Superseded',      zh: '已取代' },
};

const ALL_STATUSES: QuoteStatus[] = [
  'DRAFT', 'IN_REVIEW', 'APPROVED', 'SENT', 'OPENED',
  'CUSTOMER_REPLIED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'SUPERSEDED',
];

const PAGE_SIZE = 20;

function StatusBadge({ status }: { status: QuoteStatus }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.DRAFT;
  return (
    <span
      className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      {cfg.en}
    </span>
  );
}

function SkeletonRow() {
  return (
    <tr className="border-b animate-pulse" style={{ borderColor: 'var(--border)' }}>
      <td className="px-5 py-3"><div className="h-3 w-20 rounded" style={{ background: 'var(--border)' }} /></td>
      <td className="px-5 py-3"><div className="h-3 w-28 rounded" style={{ background: 'var(--border)' }} /></td>
      <td className="px-5 py-3"><div className="h-3 w-16 rounded" style={{ background: 'var(--border)' }} /></td>
      <td className="px-5 py-3"><div className="h-3 w-24 rounded" style={{ background: 'var(--border)' }} /></td>
      <td className="px-5 py-3"><div className="h-3 w-12 rounded" style={{ background: 'var(--border)' }} /></td>
      <td className="px-5 py-3"><div className="h-3 w-14 rounded" style={{ background: 'var(--border)' }} /></td>
      <td className="px-5 py-3"><div className="h-3 w-20 rounded" style={{ background: 'var(--border)' }} /></td>
      <td className="px-5 py-3"><div className="h-3 w-12 rounded" style={{ background: 'var(--border)' }} /></td>
    </tr>
  );
}

export default function QuotesPage() {
  const { t } = useLang();
  const { companyId, loading: companyLoading } = useCompany();
  const { showToast } = useToast();
  const router = useRouter();

  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | ''>('');
  const [currencyFilter, setCurrencyFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchQuotes = useCallback(async () => {
    if (companyLoading || !companyId) return;
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ company_id: companyId });
      if (statusFilter) params.set('status', statusFilter);
      if (currencyFilter) params.set('currency', currencyFilter);
      if (search) params.set('search', search);
      params.set('page', String(page));
      params.set('page_size', String(PAGE_SIZE));

      const res = await authFetch(`/api/admin/quotes?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load quotes');
      const data = await res.json();
      setQuotes(data.quotes || data || []);
      setTotal(data.total ?? (data.quotes || data || []).length);
    } catch (err) {
      console.error('[quotes] fetch error:', err);
      setError(t('Failed to load quotes. Please try again.', '載入報價失敗，請重試。'));
      setQuotes([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [companyId, companyLoading, statusFilter, currencyFilter, search, page, t]);

  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, currencyFilter, search]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const formatAmount = (amount: number | null, currency: string) => {
    if (amount == null) return '—';
    return `${currency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-[20px] md:text-[24px] font-semibold tracking-[-0.5px]">{t('Quotes', '報價')}</h1>
          <p className="text-[13px] md:text-[14px] mt-1" style={{ color: 'var(--text-muted)' }}>
            {t('Manage customer quotations', '管理客戶報價')}
          </p>
        </div>
        <Link
          href="/admin/quotes/new"
          className="text-[13px] md:text-[14px] font-medium px-4 py-2.5 rounded-[4px] text-white text-center w-full sm:w-auto"
          style={{ background: 'var(--accent)' }}
        >
          {t('Create Quote', '建立報價')}
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          placeholder={t('Search by quote number or customer...', '按報價編號或客戶搜尋...')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded-[4px] px-3 py-2 text-[13px] md:text-[14px] focus:outline-none flex-1"
          style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as QuoteStatus | '')}
          className="border rounded-[4px] px-3 py-2 text-[13px] md:text-[14px] focus:outline-none"
          style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
        >
          <option value="">{t('All statuses', '所有狀態')}</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_CONFIG[s].en}</option>
          ))}
        </select>
        <select
          value={currencyFilter}
          onChange={(e) => setCurrencyFilter(e.target.value)}
          className="border rounded-[4px] px-3 py-2 text-[13px] md:text-[14px] focus:outline-none"
          style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
        >
          <option value="">{t('All currencies', '所有幣別')}</option>
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
          <option value="GBP">GBP</option>
          <option value="CNY">CNY</option>
          <option value="HKD">HKD</option>
          <option value="JPY">JPY</option>
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="border rounded-[4px] p-4 mb-4 text-[13px]" style={{ borderColor: '#FECACA', background: '#FEF2F2', color: '#991B1B' }}>
          {error}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="border rounded-[4px] overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <table className="w-full text-[14px]">
            <thead>
              <tr className="border-b text-left" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                <th className="px-5 py-3 font-medium">{t('Quote #', '報價編號')}</th>
                <th className="px-5 py-3 font-medium">{t('Customer', '客戶')}</th>
                <th className="px-5 py-3 font-medium">{t('Status', '狀態')}</th>
                <th className="px-5 py-3 font-medium">{t('Total', '總額')}</th>
                <th className="px-5 py-3 font-medium">{t('Currency', '幣別')}</th>
                <th className="px-5 py-3 font-medium">{t('Margin', '利潤率')}</th>
                <th className="px-5 py-3 font-medium">{t('Valid Until', '有效至')}</th>
                <th className="px-5 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </tbody>
          </table>
        </div>
      ) : quotes.length === 0 ? (
        <div className="border rounded-[4px] p-8 md:p-10 text-center" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <svg className="mx-auto mb-3" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
          </svg>
          <p className="text-[14px] font-medium mb-1" style={{ color: 'var(--text)' }}>
            {t('No quotes found', '暫無報價')}
          </p>
          <p className="text-[13px] mb-4" style={{ color: 'var(--text-muted)' }}>
            {search || statusFilter || currencyFilter
              ? t('Try adjusting your filters', '嘗試調整篩選條件')
              : t('Create your first quote to get started', '建立您的第一個報價')}
          </p>
          {!search && !statusFilter && !currencyFilter && (
            <Link
              href="/admin/quotes/new"
              className="inline-block text-[13px] font-medium px-4 py-2 rounded-[4px] text-white"
              style={{ background: 'var(--accent)' }}
            >
              {t('Create Quote', '建立報價')}
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block border rounded-[4px] overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <table className="w-full text-[14px]">
              <thead>
                <tr className="border-b text-left" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                  <th className="px-5 py-3 font-medium">{t('Quote #', '報價編號')}</th>
                  <th className="px-5 py-3 font-medium">{t('Customer', '客戶')}</th>
                  <th className="px-5 py-3 font-medium">{t('Status', '狀態')}</th>
                  <th className="px-5 py-3 font-medium text-right">{t('Total', '總額')}</th>
                  <th className="px-5 py-3 font-medium">{t('Currency', '幣別')}</th>
                  <th className="px-5 py-3 font-medium text-right">{t('Margin', '利潤率')}</th>
                  <th className="px-5 py-3 font-medium">{t('Valid Until', '有效至')}</th>
                  <th className="px-5 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {quotes.map((quote) => (
                  <tr
                    key={quote.id}
                    className="border-b last:border-b-0 cursor-pointer hover:bg-black/[0.02] transition-colors"
                    style={{ borderColor: 'var(--border)' }}
                    onClick={() => router.push(`/admin/quotes/${quote.id}`)}
                  >
                    <td className="px-5 py-3 font-medium">{quote.quote_number}</td>
                    <td className="px-5 py-3" style={{ color: 'var(--text-muted)' }}>
                      {quote.customer_name || '—'}
                    </td>
                    <td className="px-5 py-3"><StatusBadge status={quote.status} /></td>
                    <td className="px-5 py-3 text-right font-medium">
                      {formatAmount(quote.total_amount, quote.currency)}
                    </td>
                    <td className="px-5 py-3">{quote.currency}</td>
                    <td className="px-5 py-3 text-right">
                      {quote.margin_percent != null ? `${quote.margin_percent.toFixed(1)}%` : '—'}
                    </td>
                    <td className="px-5 py-3" style={{ color: 'var(--text-muted)' }}>
                      {formatDate(quote.valid_until)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={`/admin/quotes/${quote.id}`}
                        className="text-[13px] px-3 py-1 rounded"
                        style={{ color: 'var(--accent)' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {t('View', '查看')}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {quotes.map((quote) => (
              <Link
                key={quote.id}
                href={`/admin/quotes/${quote.id}`}
                className="block border rounded-[4px] p-4"
                style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-[14px] font-medium">{quote.quote_number}</p>
                    <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {quote.customer_name || '—'}
                    </p>
                  </div>
                  <StatusBadge status={quote.status} />
                </div>
                <div className="flex flex-wrap gap-3 text-[12px]">
                  <span className="font-medium">
                    {formatAmount(quote.total_amount, quote.currency)}
                  </span>
                  {quote.margin_percent != null && (
                    <span style={{ color: 'var(--text-muted)' }}>
                      {t('Margin', '利潤率')}: {quote.margin_percent.toFixed(1)}%
                    </span>
                  )}
                  {quote.valid_until && (
                    <span style={{ color: 'var(--text-muted)' }}>
                      {t('Until', '至')}: {formatDate(quote.valid_until)}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                {t('Page', '第')} {page} {t('of', '/')} {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="text-[12px] md:text-[13px] font-medium px-3 py-1.5 rounded-[4px] border disabled:opacity-40"
                  style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                >
                  {t('Previous', '上一頁')}
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="text-[12px] md:text-[13px] font-medium px-3 py-1.5 rounded-[4px] border disabled:opacity-40"
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
