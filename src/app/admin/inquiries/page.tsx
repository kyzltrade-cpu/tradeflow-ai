'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useLang } from '@/lib/lang';
import { useCompany } from '@/lib/company';
import { useToast } from '@/components/Toast';
import { authFetch } from '@/lib/auth-fetch';

interface Inquiry {
  id: string;
  source_channel: string;
  received_at: string;
  sender_name: string | null;
  sender_email: string | null;
  sender_phone: string | null;
  subject: string | null;
  original_message: string;
  processing_status: string;
  priority: string;
  detected_language: string | null;
  assigned_owner: string | null;
  created_at: string;
  updated_at: string;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

const STATUS_OPTIONS = [
  { value: '', en: 'All statuses', zh: '所有狀態' },
  { value: 'RECEIVED', en: 'Received', zh: '已收到' },
  { value: 'EXTRACTING', en: 'Extracting', zh: '提取中' },
  { value: 'EXTRACTED', en: 'Extracted', zh: '已提取' },
  { value: 'QUOTING', en: 'Quoting', zh: '報價中' },
  { value: 'QUOTED', en: 'Quoted', zh: '已報價' },
  { value: 'CONVERTED', en: 'Converted', zh: '已轉換' },
  { value: 'FAILED', en: 'Failed', zh: '失敗' },
  { value: 'CLOSED', en: 'Closed', zh: '已關閉' },
];

const CHANNEL_OPTIONS = [
  { value: '', en: 'All channels', zh: '所有渠道' },
  { value: 'email', en: 'Email', zh: '電郵' },
  { value: 'whatsapp', en: 'WhatsApp', zh: 'WhatsApp' },
  { value: 'wechat', en: 'WeChat', zh: '微信' },
  { value: 'web', en: 'Web', zh: '網站' },
  { value: 'manual', en: 'Manual', zh: '手動' },
  { value: 'api', en: 'API', zh: 'API' },
];

const PRIORITY_OPTIONS = [
  { value: '', en: 'All priorities', zh: '所有優先級' },
  { value: 'low', en: 'Low', zh: '低' },
  { value: 'normal', en: 'Normal', zh: '一般' },
  { value: 'high', en: 'High', zh: '高' },
  { value: 'urgent', en: 'Urgent', zh: '緊急' },
];

function statusColor(status: string) {
  switch (status) {
    case 'RECEIVED': return { bg: '#EFF6FF', color: '#2563EB' };
    case 'EXTRACTING': return { bg: '#FEF3C7', color: '#D97706' };
    case 'EXTRACTED': return { bg: '#E0F2FE', color: '#0284C7' };
    case 'QUOTING': return { bg: '#FEF3C7', color: '#D97706' };
    case 'QUOTED': return { bg: '#D1FAE5', color: '#059669' };
    case 'CONVERTED': return { bg: '#D1FAE5', color: '#059669' };
    case 'FAILED': return { bg: '#FEE2E2', color: '#DC2626' };
    case 'CLOSED': return { bg: '#F3F4F6', color: '#6B7280' };
    default: return { bg: '#F3F4F6', color: '#6B7280' };
  }
}

function priorityColor(priority: string) {
  switch (priority) {
    case 'low': return { bg: '#F3F4F6', color: '#6B7280' };
    case 'normal': return { bg: '#EFF6FF', color: '#2563EB' };
    case 'high': return { bg: '#FEF3C7', color: '#D97706' };
    case 'urgent': return { bg: '#FEE2E2', color: '#DC2626' };
    default: return { bg: '#F3F4F6', color: '#6B7280' };
  }
}

function channelIcon(channel: string) {
  switch (channel) {
    case 'email': return 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z';
    case 'whatsapp': return 'M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z';
    case 'wechat': return 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z';
    case 'web': return 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9';
    case 'manual': return 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z';
    case 'api': return 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4';
    default: return 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z';
  }
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-5 py-4 border-b last:border-b-0 animate-pulse" style={{ borderColor: 'var(--border)' }}>
      <div className="flex-1 space-y-2">
        <div className="h-3 w-40 rounded" style={{ background: 'var(--border)' }} />
        <div className="h-3 w-28 rounded" style={{ background: 'var(--border)' }} />
      </div>
      <div className="h-3 w-16 rounded" style={{ background: 'var(--border)' }} />
      <div className="h-3 w-16 rounded" style={{ background: 'var(--border)' }} />
      <div className="h-3 w-20 rounded" style={{ background: 'var(--border)' }} />
    </div>
  );
}

export default function InquiriesPage() {
  const { t } = useLang();
  const { companyId } = useCompany();
  const { showToast } = useToast();
  const router = useRouter();

  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 20, total: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false });

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [channelFilter, setChannelFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  const [showNewForm, setShowNewForm] = useState(false);
  const [newInquiry, setNewInquiry] = useState({ sender_name: '', sender_email: '', sender_phone: '', subject: '', original_message: '', priority: 'normal' });
  const [creating, setCreating] = useState(false);

  const fetchInquiries = useCallback(async (page = 1) => {
    if (!companyId) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ company_id: companyId, page: String(page), pageSize: '20' });
      if (statusFilter) params.set('status', statusFilter);
      if (channelFilter) params.set('channel', channelFilter);
      if (priorityFilter) params.set('priority', priorityFilter);
      if (search.trim()) params.set('search', search.trim());

      const res = await authFetch(`/api/admin/inquiries?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load inquiries');
      const data = await res.json();
      setInquiries(data.inquiries || []);
      setPagination(data.pagination || { page: 1, pageSize: 20, total: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false });
    } catch (err) {
      console.error('[inquiries] fetch error:', err);
      setError(t('Failed to load inquiries. Please try again.', '載入詢價失敗，請重試。'));
      setInquiries([]);
    } finally {
      setLoading(false);
    }
  }, [companyId, statusFilter, channelFilter, priorityFilter, search, t]);

  useEffect(() => {
    fetchInquiries(1);
  }, [fetchInquiries]);

  const handleCreateManual = async () => {
    if (!newInquiry.original_message.trim()) {
      showToast(t('Message is required', '訊息為必填'), 'error');
      return;
    }
    if (!companyId) return;
    setCreating(true);
    try {
      const res = await authFetch('/api/admin/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_name: newInquiry.sender_name || undefined,
          sender_email: newInquiry.sender_email || undefined,
          sender_phone: newInquiry.sender_phone || undefined,
          subject: newInquiry.subject || undefined,
          original_message: newInquiry.original_message,
          priority: newInquiry.priority,
        }),
      });
      if (!res.ok) throw new Error('Failed to create inquiry');
      const body = await res.json();
      if (body.inquiry) {
        setInquiries([body.inquiry, ...inquiries]);
        setPagination(prev => ({ ...prev, total: prev.total + 1 }));
      }
      showToast(t('Inquiry created', '詢價已建立'), 'success');
      setShowNewForm(false);
      setNewInquiry({ sender_name: '', sender_email: '', sender_phone: '', subject: '', original_message: '', priority: 'normal' });
    } catch (err) {
      console.error('[inquiries] create error:', err);
      showToast(t('Failed to create inquiry', '建立詢價失敗'), 'error');
    } finally {
      setCreating(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    fetchInquiries(newPage);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchInquiries(1);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-[20px] md:text-[24px] font-semibold tracking-[-0.5px]">{t('Inquiries', '詢價')}</h1>
          <p className="text-[13px] md:text-[14px] mt-1" style={{ color: 'var(--text-muted)' }}>
            {t('All incoming inquiries from email, WhatsApp, web, and other channels', '來自電郵、WhatsApp、網站和其他渠道的所有詢價')}
          </p>
        </div>
        <button
          onClick={() => setShowNewForm(true)}
          className="text-[13px] md:text-[14px] font-medium px-4 py-2.5 rounded-[4px] text-white w-full sm:w-auto flex items-center justify-center gap-2"
          style={{ background: 'var(--accent)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          {t('New Manual Inquiry', '新增手動詢價')}
        </button>
      </div>

      {showNewForm && (
        <div className="border rounded-[4px] p-4 md:p-5 mb-6" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <h2 className="text-[14px] md:text-[15px] font-semibold mb-4">{t('New manual inquiry', '新增手動詢價')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <input
              placeholder={t('Sender name', '寄件人姓名')}
              value={newInquiry.sender_name}
              onChange={(e) => setNewInquiry({ ...newInquiry, sender_name: e.target.value })}
              className="border rounded-[4px] px-3 py-2 text-[13px] md:text-[14px] focus:outline-none"
              style={{ borderColor: 'var(--border)' }}
            />
            <input
              placeholder={t('Sender email', '寄件人電郵')}
              type="email"
              value={newInquiry.sender_email}
              onChange={(e) => setNewInquiry({ ...newInquiry, sender_email: e.target.value })}
              className="border rounded-[4px] px-3 py-2 text-[13px] md:text-[14px] focus:outline-none"
              style={{ borderColor: 'var(--border)' }}
            />
            <input
              placeholder={t('Sender phone', '寄件人電話')}
              value={newInquiry.sender_phone}
              onChange={(e) => setNewInquiry({ ...newInquiry, sender_phone: e.target.value })}
              className="border rounded-[4px] px-3 py-2 text-[13px] md:text-[14px] focus:outline-none"
              style={{ borderColor: 'var(--border)' }}
            />
            <input
              placeholder={t('Subject', '主旨')}
              value={newInquiry.subject}
              onChange={(e) => setNewInquiry({ ...newInquiry, subject: e.target.value })}
              className="border rounded-[4px] px-3 py-2 text-[13px] md:text-[14px] focus:outline-none"
              style={{ borderColor: 'var(--border)' }}
            />
            <select
              value={newInquiry.priority}
              onChange={(e) => setNewInquiry({ ...newInquiry, priority: e.target.value })}
              className="border rounded-[4px] px-3 py-2 text-[13px] md:text-[14px] focus:outline-none"
              style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
            >
              {PRIORITY_OPTIONS.filter(o => o.value).map(o => (
                <option key={o.value} value={o.value}>{t(o.en, o.zh)}</option>
              ))}
            </select>
          </div>
          <textarea
            placeholder={t('Paste or type the inquiry message here...', '在此貼上或輸入詢價訊息...')}
            value={newInquiry.original_message}
            onChange={(e) => setNewInquiry({ ...newInquiry, original_message: e.target.value })}
            rows={5}
            className="border rounded-[4px] px-3 py-2 text-[13px] md:text-[14px] w-full mb-4 focus:outline-none resize-none"
            style={{ borderColor: 'var(--border)' }}
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setShowNewForm(false); setNewInquiry({ sender_name: '', sender_email: '', sender_phone: '', subject: '', original_message: '', priority: 'normal' }); }}
              className="text-[12px] md:text-[13px] px-4 py-2 rounded-[4px] border"
              style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
            >
              {t('Cancel', '取消')}
            </button>
            <button
              onClick={handleCreateManual}
              disabled={creating || !newInquiry.original_message.trim()}
              className="text-[12px] md:text-[13px] font-medium px-4 py-2 rounded-[4px] text-white disabled:opacity-50"
              style={{ background: 'var(--accent)' }}
            >
              {creating ? t('Creating...', '建立中...') : t('Create inquiry', '建立詢價')}
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder={t('Search by name, email, subject...', '按姓名、電郵、主旨搜尋...')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border rounded-[4px] pl-9 pr-3 py-2 text-[13px] md:text-[14px] focus:outline-none"
            style={{ borderColor: 'var(--border)' }}
          />
        </form>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded-[4px] px-3 py-2 text-[13px] md:text-[14px] focus:outline-none"
          style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
        >
          {STATUS_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{t(o.en, o.zh)}</option>
          ))}
        </select>
        <select
          value={channelFilter}
          onChange={(e) => setChannelFilter(e.target.value)}
          className="border rounded-[4px] px-3 py-2 text-[13px] md:text-[14px] focus:outline-none"
          style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
        >
          {CHANNEL_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{t(o.en, o.zh)}</option>
          ))}
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="border rounded-[4px] px-3 py-2 text-[13px] md:text-[14px] focus:outline-none"
          style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
        >
          {PRIORITY_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{t(o.en, o.zh)}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="border rounded-[4px] overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      ) : error ? (
        <div className="border rounded-[4px] p-8 text-center" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <svg className="mx-auto mb-3" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--error)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p className="text-[14px] font-medium mb-2" style={{ color: 'var(--error)' }}>{error}</p>
          <button
            onClick={() => fetchInquiries(pagination.page)}
            className="text-[13px] font-medium px-4 py-2 rounded-[4px] text-white"
            style={{ background: 'var(--accent)' }}
          >
            {t('Retry', '重試')}
          </button>
        </div>
      ) : inquiries.length === 0 ? (
        <div className="border rounded-[4px] p-8 md:p-10 text-center" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <svg className="mx-auto mb-3" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <p className="text-[14px] font-medium mb-1" style={{ color: 'var(--text)' }}>
            {t('No inquiries found', '未找到詢價')}
          </p>
          <p className="text-[13px] mb-4" style={{ color: 'var(--text-muted)' }}>
            {search || statusFilter || channelFilter || priorityFilter
              ? t('Try adjusting your filters', '嘗試調整篩選條件')
              : t('Inquiries will appear here when customers contact you', '客戶聯繫您時詢價會顯示在這裡')}
          </p>
          {search || statusFilter || channelFilter || priorityFilter ? (
            <button
              onClick={() => { setSearch(''); setStatusFilter(''); setChannelFilter(''); setPriorityFilter(''); }}
              className="text-[13px] font-medium px-4 py-2 rounded-[4px] border"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
            >
              {t('Clear filters', '清除篩選')}
            </button>
          ) : (
            <button
              onClick={() => setShowNewForm(true)}
              className="text-[13px] font-medium px-4 py-2 rounded-[4px] text-white"
              style={{ background: 'var(--accent)' }}
            >
              {t('Create your first inquiry', '建立您的第一個詢價')}
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
                  <th className="px-5 py-3 font-medium">{t('Subject / Sender', '主旨 / 寄件人')}</th>
                  <th className="px-5 py-3 font-medium">{t('Channel', '渠道')}</th>
                  <th className="px-5 py-3 font-medium">{t('Status', '狀態')}</th>
                  <th className="px-5 py-3 font-medium">{t('Priority', '優先級')}</th>
                  <th className="px-5 py-3 font-medium">{t('Received', '收到時間')}</th>
                  <th className="px-5 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {inquiries.map((inq) => {
                  const sc = statusColor(inq.processing_status);
                  const pc = priorityColor(inq.priority);
                  return (
                    <tr
                      key={inq.id}
                      className="border-b last:border-b-0 cursor-pointer hover:bg-[var(--bg)] transition-colors"
                      style={{ borderColor: 'var(--border)' }}
                      onClick={() => router.push(`/admin/inquiries/${inq.id}`)}
                    >
                      <td className="px-5 py-3">
                        <div className="min-w-0">
                          <p className="font-medium truncate max-w-[300px]">{inq.subject || t('(No subject)', '（無主旨）')}</p>
                          <p className="text-[12px] truncate max-w-[300px]" style={{ color: 'var(--text-muted)' }}>
                            {inq.sender_name || inq.sender_email || '—'}
                          </p>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1.5">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d={channelIcon(inq.source_channel)} />
                          </svg>
                          <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>{inq.source_channel}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className="text-[11px] px-2 py-0.5 rounded font-medium"
                          style={{ background: sc.bg, color: sc.color }}
                        >
                          {inq.processing_status}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className="text-[11px] px-2 py-0.5 rounded font-medium"
                          style={{ background: pc.bg, color: pc.color }}
                        >
                          {t(
                            PRIORITY_OPTIONS.find(o => o.value === inq.priority)?.en || inq.priority,
                            PRIORITY_OPTIONS.find(o => o.value === inq.priority)?.zh || inq.priority
                          )}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div>
                          <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>{formatDate(inq.received_at || inq.created_at)}</p>
                          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{formatTimeAgo(inq.received_at || inq.created_at)}</p>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {inquiries.map((inq) => {
              const sc = statusColor(inq.processing_status);
              const pc = priorityColor(inq.priority);
              return (
                <div
                  key={inq.id}
                  className="border rounded-[4px] p-4 cursor-pointer active:bg-[var(--bg)] transition-colors"
                  style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                  onClick={() => router.push(`/admin/inquiries/${inq.id}`)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-medium truncate">{inq.subject || t('(No subject)', '（無主旨）')}</p>
                      <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {inq.sender_name || inq.sender_email || '—'}
                      </p>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 ml-2">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[12px]">
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded" style={{ background: 'var(--bg)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d={channelIcon(inq.source_channel)} />
                      </svg>
                      {inq.source_channel}
                    </span>
                    <span className="px-2 py-0.5 rounded font-medium" style={{ background: sc.bg, color: sc.color }}>
                      {inq.processing_status}
                    </span>
                    <span className="px-2 py-0.5 rounded font-medium" style={{ background: pc.bg, color: pc.color }}>
                      {t(
                        PRIORITY_OPTIONS.find(o => o.value === inq.priority)?.en || inq.priority,
                        PRIORITY_OPTIONS.find(o => o.value === inq.priority)?.zh || inq.priority
                      )}
                    </span>
                    <span className="px-2 py-0.5 rounded" style={{ color: 'var(--text-muted)' }}>
                      {formatTimeAgo(inq.received_at || inq.created_at)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 px-1">
              <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
                {t('Page', '第')} {pagination.page} {t('of', '/')} {pagination.totalPages} · {pagination.total} {t('inquiries', '筆詢價')}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={!pagination.hasPreviousPage}
                  className="text-[13px] px-3 py-1.5 rounded-[4px] border disabled:opacity-40"
                  style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                >
                  {t('Previous', '上一頁')}
                </button>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={!pagination.hasNextPage}
                  className="text-[13px] px-3 py-1.5 rounded-[4px] border disabled:opacity-40"
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
