'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useLang } from '@/lib/lang';
import { useCompany } from '@/lib/company';
import { useToast } from '@/components/Toast';
import { authFetch } from '@/lib/auth-fetch';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RfqSupplier {
  id: string;
  legal_name: string | null;
  trading_name: string | null;
  location: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_whatsapp: string | null;
}

interface RfqOpportunity {
  id: string;
  title: string | null;
  stage: string | null;
  product_name: string | null;
  product_category: string | null;
  estimated_order_value: number | null;
  currency: string | null;
  required_delivery_date: string | null;
  destination: string | null;
  country: string | null;
}

interface SupplierQuote {
  id: string;
  status: string;
  unit_price: number | null;
  currency: string | null;
  moq: number | null;
  production_lead_time_days: number | null;
  incoterm: string | null;
  is_selected: boolean;
  created_at: string;
}

interface Rfq {
  id: string;
  rfq_number: string;
  opportunity_id: string | null;
  supplier_id: string | null;
  status: string;
  language: string | null;
  subject: string | null;
  message_body: string | null;
  shared_fields: string[];
  redacted_fields: string[];
  response_deadline: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
  suppliers: RfqSupplier | null;
  opportunities: RfqOpportunity | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  READY: 'bg-blue-100 text-blue-700',
  SENT: 'bg-indigo-100 text-indigo-700',
  PARTIALLY_RESPONDED: 'bg-amber-100 text-amber-700',
  COMPLETE: 'bg-green-100 text-green-700',
  EXPIRED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

const TABS = [
  { key: 'overview', en: 'Overview', zh: '總覽' },
  { key: 'message', en: 'RFQ Message', zh: '詢價訊息' },
  { key: 'responses', en: 'Supplier Responses', zh: '供應商回覆' },
  { key: 'settings', en: 'Settings', zh: '設定' },
];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function RfqDetailPage() {
  const { t } = useLang();
  const { companyId } = useCompany();
  const { showToast } = useToast();
  const router = useRouter();
  const params = useParams();
  const rfqId = params.id as string;

  const [rfq, setRfq] = useState<Rfq | null>(null);
  const [quotes, setQuotes] = useState<SupplierQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [updating, setUpdating] = useState(false);

  // Fetch RFQ
  const fetchRfq = useCallback(async () => {
    if (!companyId || !rfqId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(`/api/admin/rfqs/${rfqId}`);
      if (!res.ok) {
        if (res.status === 404) { setError('RFQ not found'); return; }
        throw new Error('Failed to load RFQ');
      }
      const data = await res.json();
      setRfq(data.rfq);
      setQuotes(data.quotes || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [companyId, rfqId]);

  useEffect(() => { fetchRfq(); }, [fetchRfq]);

  // Status action
  const updateStatus = async (newStatus: string) => {
    if (!rfq) return;
    setUpdating(true);
    try {
      const res = await authFetch(`/api/admin/rfqs/${rfqId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update');
      }
      showToast(t('Status updated', '狀態已更新'), 'success');
      fetchRfq();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update', 'error');
    } finally {
      setUpdating(false);
    }
  };

  // Cancel RFQ
  const cancelRfq = async () => {
    if (!rfq || !confirm(t('Cancel this RFQ?', '確定取消此詢價單？'))) return;
    setUpdating(true);
    try {
      const res = await authFetch(`/api/admin/rfqs/${rfqId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to cancel');
      }
      showToast(t('RFQ cancelled', '詢價單已取消'), 'success');
      fetchRfq();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to cancel', 'error');
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
        <Link href="/admin/rfqs" className="text-[13px] underline" style={{ color: 'var(--accent)' }}>{t('Back to RFQs', '返回詢價單')}</Link>
      </div>
    );
  }

  if (!rfq) return null;

  const supplier = rfq.suppliers;
  const opportunity = rfq.opportunities;

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[12px] mb-4" style={{ color: 'var(--text-muted)' }}>
        <Link href="/admin/rfqs" className="hover:underline">{t('RFQs', '詢價單')}</Link>
        <span>/</span>
        <span className="font-medium" style={{ color: 'var(--text)' }}>{rfq.rfq_number}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-[20px] font-semibold">{rfq.rfq_number}</h1>
            <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_COLORS[rfq.status] || 'bg-gray-100 text-gray-600'}`}>
              {rfq.status.replace(/_/g, ' ')}
            </span>
          </div>
          <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>{rfq.subject || '—'}</p>
        </div>
        <div className="flex gap-2">
          {rfq.status === 'DRAFT' && (
            <>
              <button
                onClick={() => updateStatus('READY')}
                disabled={updating}
                className="px-3 py-1.5 text-[12px] font-medium rounded-[4px] text-white"
                style={{ background: 'var(--accent)' }}
              >
                {t('Mark Ready', '標為就緒')}
              </button>
              <button
                onClick={() => updateStatus('SENT')}
                disabled={updating}
                className="px-3 py-1.5 text-[12px] font-medium rounded-[4px] text-white"
                style={{ background: '#2563EB' }}
              >
                {t('Send RFQ', '發送詢價')}
              </button>
            </>
          )}
          {rfq.status === 'SENT' && (
            <button
              onClick={() => updateStatus('COMPLETE')}
              disabled={updating}
              className="px-3 py-1.5 text-[12px] font-medium rounded-[4px] text-white"
              style={{ background: '#059669' }}
            >
              {t('Mark Complete', '標為完成')}
            </button>
          )}
          {['DRAFT', 'READY'].includes(rfq.status) && (
            <button
              onClick={cancelRfq}
              disabled={updating}
              className="px-3 py-1.5 text-[12px] font-medium rounded-[4px] border"
              style={{ borderColor: 'var(--border)', color: 'var(--error, #ef4444)' }}
            >
              {t('Cancel', '取消')}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b mb-6" style={{ borderColor: 'var(--border)' }}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-[13px] font-medium border-b-2 transition-colors ${
              activeTab === tab.key ? 'border-current' : 'border-transparent'
            }`}
            style={{
              color: activeTab === tab.key ? 'var(--accent)' : 'var(--text-muted)',
              borderColor: activeTab === tab.key ? 'var(--accent)' : 'transparent',
            }}
          >
            {t(tab.en, tab.zh)}
          </button>
        ))}
      </div>

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Supplier Info */}
          <div className="border rounded-[4px] p-5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <h3 className="text-[14px] font-semibold mb-4">{t('Supplier', '供應商')}</h3>
            {supplier ? (
              <div className="space-y-3 text-[13px]">
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-muted)' }}>{t('Name', '名稱')}</span>
                  <Link href={`/admin/suppliers/${supplier.id}`} className="font-medium underline" style={{ color: 'var(--accent)' }}>
                    {supplier.trading_name || supplier.legal_name}
                  </Link>
                </div>
                {supplier.location && (
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--text-muted)' }}>{t('Location', '位置')}</span>
                    <span>{supplier.location}</span>
                  </div>
                )}
                {supplier.contact_name && (
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--text-muted)' }}>{t('Contact', '聯絡人')}</span>
                    <span>{supplier.contact_name}</span>
                  </div>
                )}
                {supplier.contact_email && (
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--text-muted)' }}>{t('Email', '電郵')}</span>
                    <span>{supplier.contact_email}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>{t('No supplier assigned', '未分配供應商')}</p>
            )}
          </div>

          {/* Opportunity Info */}
          <div className="border rounded-[4px] p-5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <h3 className="text-[14px] font-semibold mb-4">{t('Opportunity', '商機')}</h3>
            {opportunity ? (
              <div className="space-y-3 text-[13px]">
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-muted)' }}>{t('Title', '標題')}</span>
                  <Link href={`/admin/opportunities/${opportunity.id}`} className="font-medium underline text-right" style={{ color: 'var(--accent)' }}>
                    {opportunity.title}
                  </Link>
                </div>
                {opportunity.product_name && (
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--text-muted)' }}>{t('Product', '產品')}</span>
                    <span>{opportunity.product_name}</span>
                  </div>
                )}
                {opportunity.estimated_order_value != null && (
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--text-muted)' }}>{t('Est. Value', '預估價值')}</span>
                    <span className="font-medium">{opportunity.currency || 'USD'} {opportunity.estimated_order_value.toLocaleString()}</span>
                  </div>
                )}
                {opportunity.destination && (
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--text-muted)' }}>{t('Destination', '目的地')}</span>
                    <span>{opportunity.destination}{opportunity.country ? `, ${opportunity.country}` : ''}</span>
                  </div>
                )}
                {opportunity.required_delivery_date && (
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--text-muted)' }}>{t('Delivery', '交貨日期')}</span>
                    <span>{formatShortDate(opportunity.required_delivery_date)}</span>
                  </div>
                )}
                {opportunity.stage && (
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--text-muted)' }}>{t('Stage', '階段')}</span>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-100 text-blue-700">{opportunity.stage}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>{t('No opportunity linked', '未連結商機')}</p>
            )}
          </div>

          {/* RFQ Details */}
          <div className="border rounded-[4px] p-5 lg:col-span-2" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <h3 className="text-[14px] font-semibold mb-4">{t('RFQ Details', '詢價詳情')}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-[13px]">
              <div>
                <p style={{ color: 'var(--text-muted)' }}>{t('Status', '狀態')}</p>
                <p className="font-medium mt-0.5">{rfq.status.replace(/_/g, ' ')}</p>
              </div>
              <div>
                <p style={{ color: 'var(--text-muted)' }}>{t('Language', '語言')}</p>
                <p className="font-medium mt-0.5">{rfq.language?.toUpperCase() || 'EN'}</p>
              </div>
              <div>
                <p style={{ color: 'var(--text-muted)' }}>{t('Response Deadline', '回覆期限')}</p>
                <p className="font-medium mt-0.5">{rfq.response_deadline ? formatShortDate(rfq.response_deadline) : '—'}</p>
              </div>
              <div>
                <p style={{ color: 'var(--text-muted)' }}>{t('Sent', '發送時間')}</p>
                <p className="font-medium mt-0.5">{rfq.sent_at ? formatDate(rfq.sent_at) : '—'}</p>
              </div>
              <div>
                <p style={{ color: 'var(--text-muted)' }}>{t('Shared Fields', '共享欄位')}</p>
                <p className="mt-0.5">{rfq.shared_fields?.length ? rfq.shared_fields.join(', ') : '—'}</p>
              </div>
              <div>
                <p style={{ color: 'var(--text-muted)' }}>{t('Redacted Fields', '隱藏欄位')}</p>
                <p className="mt-0.5">{rfq.redacted_fields?.length ? rfq.redacted_fields.join(', ') : '—'}</p>
              </div>
              <div>
                <p style={{ color: 'var(--text-muted)' }}>{t('Created', '建立日期')}</p>
                <p className="mt-0.5">{formatDate(rfq.created_at)}</p>
              </div>
              <div>
                <p style={{ color: 'var(--text-muted)' }}>{t('Updated', '更新日期')}</p>
                <p className="mt-0.5">{formatDate(rfq.updated_at)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Message */}
      {activeTab === 'message' && (
        <div className="border rounded-[4px] p-5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <h3 className="text-[14px] font-semibold mb-4">{t('RFQ Message', '詢價訊息')}</h3>
          {rfq.message_body ? (
            <div className="text-[13px] leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text)' }}>
              {rfq.message_body}
            </div>
          ) : (
            <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
              {t('No message body. Edit this RFQ to add a message.', '沒有訊息內容。編輯此詢價單以添加訊息。')}
            </p>
          )}
        </div>
      )}

      {/* Tab: Responses */}
      {activeTab === 'responses' && (
        <div>
          {quotes.length === 0 ? (
            <div className="text-center py-12 border rounded-[4px]" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
              <p className="text-[14px] font-medium mb-1">{t('No supplier responses yet', '尚無供應商回覆')}</p>
              <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                {rfq.status === 'DRAFT' || rfq.status === 'READY'
                  ? t('Send the RFQ to receive supplier responses', '發送詢價單以接收供應商回覆')
                  : t('Waiting for supplier responses', '等待供應商回覆')}
              </p>
            </div>
          ) : (
            <div className="border rounded-[4px] overflow-hidden" style={{ borderColor: 'var(--border)' }}>
              <table className="w-full text-[13px]">
                <thead>
                  <tr style={{ background: 'var(--bg)' }}>
                    <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text-muted)' }}>{t('Status', '狀態')}</th>
                    <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text-muted)' }}>{t('Unit Price', '單價')}</th>
                    <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text-muted)' }}>{t('MOQ', '最低訂量')}</th>
                    <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text-muted)' }}>{t('Lead Time', '交期')}</th>
                    <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text-muted)' }}>{t('Incoterm', '貿易條件')}</th>
                    <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text-muted)' }}>{t('Selected', '已選')}</th>
                    <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text-muted)' }}>{t('Received', '收到日期')}</th>
                  </tr>
                </thead>
                <tbody>
                  {quotes.map((q) => (
                    <tr key={q.id} className="border-t" style={{ borderColor: 'var(--border)' }}>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${
                          q.status === 'accepted' ? 'bg-green-100 text-green-700' :
                          q.status === 'rejected' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {q.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {q.unit_price != null ? `${q.currency || 'USD'} ${q.unit_price.toFixed(2)}` : '—'}
                      </td>
                      <td className="px-4 py-3">{q.moq?.toLocaleString() || '—'}</td>
                      <td className="px-4 py-3">{q.production_lead_time_days ? `${q.production_lead_time_days}d` : '—'}</td>
                      <td className="px-4 py-3">{q.incoterm || '—'}</td>
                      <td className="px-4 py-3">{q.is_selected ? '✓' : '—'}</td>
                      <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>{formatShortDate(q.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: Settings */}
      {activeTab === 'settings' && (
        <div className="border rounded-[4px] p-5 max-w-[600px]" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <h3 className="text-[14px] font-semibold mb-4">{t('RFQ Settings', '詢價設定')}</h3>
          <div className="space-y-4 text-[13px]">
            <div className="flex justify-between items-center py-2 border-b" style={{ borderColor: 'var(--border)' }}>
              <span style={{ color: 'var(--text-muted)' }}>{t('Status', '狀態')}</span>
              <span className="font-medium">{rfq.status.replace(/_/g, ' ')}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b" style={{ borderColor: 'var(--border)' }}>
              <span style={{ color: 'var(--text-muted)' }}>{t('Language', '語言')}</span>
              <span>{rfq.language?.toUpperCase() || 'EN'}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b" style={{ borderColor: 'var(--border)' }}>
              <span style={{ color: 'var(--text-muted)' }}>{t('Response Deadline', '回覆期限')}</span>
              <span>{rfq.response_deadline ? formatShortDate(rfq.response_deadline) : '—'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
