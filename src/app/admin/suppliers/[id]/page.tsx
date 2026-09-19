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

interface SupplierDocument {
  id: string;
  document_type: string;
  original_name: string;
  file_size: number;
  verified: boolean;
  created_at: string;
}

interface SupplierQuote {
  id: string;
  status: string;
  quoted_price: number | null;
  currency: string | null;
  lead_time_days: number | null;
  created_at: string;
}

interface SupplierRfq {
  id: string;
  status: string;
  subject: string | null;
  sent_at: string | null;
  created_at: string;
}

interface Supplier {
  id: string;
  company_id: string;
  legal_name: string;
  trading_name: string | null;
  location: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_whatsapp: string | null;
  contact_wechat: string | null;
  product_capabilities: string[] | null;
  certifications: string[] | null;
  payment_terms: string | null;
  moq_notes: string | null;
  typical_lead_time_days: number | null;
  notes: string | null;
  is_approved: boolean;
  rating: number | null;
  created_at: string;
  updated_at: string;
}

interface SupplierPerformance {
  total_quotes: number;
  accepted_quotes: number;
  total_rfqs: number;
  response_rate: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TABS = [
  { key: 'overview', en: 'Overview', zh: '總覽' },
  { key: 'documents', en: 'Documents', zh: '文件' },
  { key: 'quotes', en: 'Quotes', zh: '報價' },
  { key: 'rfqs', en: 'RFQs', zh: '詢價單' },
];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SupplierDetailPage() {
  const { t } = useLang();
  const { companyId } = useCompany();
  const { showToast } = useToast();
  const router = useRouter();
  const params = useParams();
  const supplierId = params.id as string;

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [documents, setDocuments] = useState<SupplierDocument[]>([]);
  const [quotes, setQuotes] = useState<SupplierQuote[]>([]);
  const [rfqs, setRfqs] = useState<SupplierRfq[]>([]);
  const [performance, setPerformance] = useState<SupplierPerformance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [editing, setEditing] = useState(false);
  const [editNotes, setEditNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchSupplier = useCallback(async () => {
    if (!companyId || !supplierId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(`/api/admin/suppliers/${supplierId}`);
      if (!res.ok) {
        if (res.status === 404) { setError('Supplier not found'); return; }
        throw new Error('Failed to load supplier');
      }
      const data = await res.json();
      setSupplier(data.supplier);
      setDocuments(data.documents || []);
      setQuotes(data.quotes || []);
      setRfqs(data.rfqs || []);
      setPerformance(data.performance || null);
      setEditNotes(data.supplier.notes || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [companyId, supplierId]);

  useEffect(() => { fetchSupplier(); }, [fetchSupplier]);

  const saveNotes = async () => {
    if (!supplier) return;
    setSaving(true);
    try {
      const res = await authFetch(`/api/admin/suppliers/${supplierId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: editNotes }),
      });
      if (!res.ok) throw new Error('Failed to save');
      showToast(t('Notes saved', '備註已儲存'), 'success');
      setEditing(false);
      fetchSupplier();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-[13px]" style={{ color: 'var(--text-muted)' }}>{t('Loading...', '載入中...')}</div>;
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-[14px] font-medium mb-2">{error}</p>
        <Link href="/admin/suppliers" className="text-[13px] underline" style={{ color: 'var(--accent)' }}>{t('Back to Suppliers', '返回供應商')}</Link>
      </div>
    );
  }

  if (!supplier) return null;

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[12px] mb-4" style={{ color: 'var(--text-muted)' }}>
        <Link href="/admin/suppliers" className="hover:underline">{t('Suppliers', '供應商')}</Link>
        <span>/</span>
        <span className="font-medium" style={{ color: 'var(--text)' }}>{supplier.trading_name || supplier.legal_name}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-[20px] font-semibold">{supplier.trading_name || supplier.legal_name}</h1>
            {supplier.is_approved && (
              <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-green-100 text-green-700">
                {t('Approved', '已批准')}
              </span>
            )}
          </div>
          <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
            {supplier.location || '—'}
            {supplier.legal_name !== (supplier.trading_name || supplier.legal_name) ? ` · ${supplier.legal_name}` : ''}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b mb-6" style={{ borderColor: 'var(--border)' }}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-[13px] font-medium border-b-2 transition-colors`}
            style={{
              color: activeTab === tab.key ? 'var(--accent)' : 'var(--text-muted)',
              borderColor: activeTab === tab.key ? 'var(--accent)' : 'transparent',
            }}
          >
            {t(tab.en, tab.zh)}
            {tab.key === 'documents' && documents.length > 0 && (
              <span className="ml-1.5 text-[11px] opacity-60">({documents.length})</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Contact */}
          <div className="border rounded-[4px] p-5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <h3 className="text-[14px] font-semibold mb-4">{t('Contact Information', '聯絡資訊')}</h3>
            <div className="space-y-3 text-[13px]">
              {supplier.contact_name && (
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-muted)' }}>{t('Name', '名稱')}</span>
                  <span>{supplier.contact_name}</span>
                </div>
              )}
              {supplier.contact_email && (
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-muted)' }}>{t('Email', '電郵')}</span>
                  <a href={`mailto:${supplier.contact_email}`} className="underline" style={{ color: 'var(--accent)' }}>{supplier.contact_email}</a>
                </div>
              )}
              {supplier.contact_phone && (
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-muted)' }}>{t('Phone', '電話')}</span>
                  <span>{supplier.contact_phone}</span>
                </div>
              )}
              {supplier.contact_whatsapp && (
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-muted)' }}>WhatsApp</span>
                  <span>{supplier.contact_whatsapp}</span>
                </div>
              )}
              {supplier.contact_wechat && (
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-muted)' }}>WeChat</span>
                  <span>{supplier.contact_wechat}</span>
                </div>
              )}
              {!supplier.contact_name && !supplier.contact_email && !supplier.contact_phone && (
                <p style={{ color: 'var(--text-muted)' }}>{t('No contact information', '無聯絡資訊')}</p>
              )}
            </div>
          </div>

          {/* Capabilities */}
          <div className="border rounded-[4px] p-5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <h3 className="text-[14px] font-semibold mb-4">{t('Capabilities', '能力')}</h3>
            <div className="space-y-3 text-[13px]">
              {supplier.typical_lead_time_days && (
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-muted)' }}>{t('Typical Lead Time', ' typical lead time')}</span>
                  <span>{supplier.typical_lead_time_days} {t('days', '天')}</span>
                </div>
              )}
              {supplier.moq_notes && (
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-muted)' }}>{t('MOQ', '最低訂量')}</span>
                  <span>{supplier.moq_notes}</span>
                </div>
              )}
              {supplier.payment_terms && (
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-muted)' }}>{t('Payment Terms', '付款條件')}</span>
                  <span>{supplier.payment_terms}</span>
                </div>
              )}
              {supplier.product_capabilities && supplier.product_capabilities.length > 0 && (
                <div>
                  <p className="mb-2" style={{ color: 'var(--text-muted)' }}>{t('Product Capabilities', '產品能力')}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {supplier.product_capabilities.map((cap, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-full text-[11px] bg-gray-100 text-gray-600">{cap}</span>
                    ))}
                  </div>
                </div>
              )}
              {supplier.certifications && supplier.certifications.length > 0 && (
                <div>
                  <p className="mb-2" style={{ color: 'var(--text-muted)' }}>{t('Certifications', '認證')}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {supplier.certifications.map((cert, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-full text-[11px] bg-blue-100 text-blue-700">{cert}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Performance */}
          {performance && (
            <div className="border rounded-[4px] p-5 lg:col-span-2" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
              <h3 className="text-[14px] font-semibold mb-4">{t('Performance', '績效')}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-[13px]">
                <div>
                  <p style={{ color: 'var(--text-muted)' }}>{t('Total RFQs', '詢價單總數')}</p>
                  <p className="text-[20px] font-semibold mt-1">{performance.total_rfqs}</p>
                </div>
                <div>
                  <p style={{ color: 'var(--text-muted)' }}>{t('Total Quotes', '報價總數')}</p>
                  <p className="text-[20px] font-semibold mt-1">{performance.total_quotes}</p>
                </div>
                <div>
                  <p style={{ color: 'var(--text-muted)' }}>{t('Accepted Quotes', '已接受報價')}</p>
                  <p className="text-[20px] font-semibold mt-1">{performance.accepted_quotes}</p>
                </div>
                <div>
                  <p style={{ color: 'var(--text-muted)' }}>{t('Response Rate', '回覆率')}</p>
                  <p className="text-[20px] font-semibold mt-1">{performance.response_rate}%</p>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="border rounded-[4px] p-5 lg:col-span-2" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14px] font-semibold">{t('Notes', '備註')}</h3>
              {!editing && (
                <button
                  onClick={() => { setEditing(true); setEditNotes(supplier.notes || ''); }}
                  className="text-[12px] underline"
                  style={{ color: 'var(--accent)' }}
                >
                  {t('Edit', '編輯')}
                </button>
              )}
            </div>
            {editing ? (
              <div>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 text-[13px] border rounded-[4px] focus:outline-none focus:ring-1"
                  style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={saveNotes}
                    disabled={saving}
                    className="px-3 py-1.5 text-[12px] font-medium rounded-[4px] text-white"
                    style={{ background: 'var(--accent)' }}
                  >
                    {t('Save', '儲存')}
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="px-3 py-1.5 text-[12px] font-medium rounded-[4px] border"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    {t('Cancel', '取消')}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-[13px] whitespace-pre-wrap" style={{ color: supplier.notes ? 'var(--text)' : 'var(--text-muted)' }}>
                {supplier.notes || t('No notes', '無備註')}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Tab: Documents */}
      {activeTab === 'documents' && (
        <div>
          {documents.length === 0 ? (
            <div className="text-center py-12 border rounded-[4px]" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
              <p className="text-[14px] font-medium mb-1">{t('No documents', '沒有文件')}</p>
              <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>{t('Upload supplier documents from the supplier detail page', '從供應商詳情頁面上傳文件')}</p>
            </div>
          ) : (
            <div className="border rounded-[4px] overflow-hidden" style={{ borderColor: 'var(--border)' }}>
              <table className="w-full text-[13px]">
                <thead>
                  <tr style={{ background: 'var(--bg)' }}>
                    <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text-muted)' }}>{t('Name', '名稱')}</th>
                    <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text-muted)' }}>{t('Type', '類型')}</th>
                    <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text-muted)' }}>{t('Size', '大小')}</th>
                    <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text-muted)' }}>{t('Verified', '已驗證')}</th>
                    <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text-muted)' }}>{t('Uploaded', '上傳日期')}</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr key={doc.id} className="border-t" style={{ borderColor: 'var(--border)' }}>
                      <td className="px-4 py-3 font-medium">{doc.original_name}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-[11px] bg-gray-100 text-gray-600">{doc.document_type}</span>
                      </td>
                      <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>{formatFileSize(doc.file_size)}</td>
                      <td className="px-4 py-3">{doc.verified ? '✓' : '—'}</td>
                      <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>{formatDate(doc.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: Quotes */}
      {activeTab === 'quotes' && (
        <div>
          {quotes.length === 0 ? (
            <div className="text-center py-12 border rounded-[4px]" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
              <p className="text-[14px] font-medium mb-1">{t('No quotes from this supplier', '此供應商無報價')}</p>
            </div>
          ) : (
            <div className="border rounded-[4px] overflow-hidden" style={{ borderColor: 'var(--border)' }}>
              <table className="w-full text-[13px]">
                <thead>
                  <tr style={{ background: 'var(--bg)' }}>
                    <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text-muted)' }}>{t('Status', '狀態')}</th>
                    <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text-muted)' }}>{t('Price', '價格')}</th>
                    <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text-muted)' }}>{t('Lead Time', '交期')}</th>
                    <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text-muted)' }}>{t('Date', '日期')}</th>
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
                        {q.quoted_price != null ? `${q.currency || 'USD'} ${q.quoted_price.toFixed(2)}` : '—'}
                      </td>
                      <td className="px-4 py-3">{q.lead_time_days ? `${q.lead_time_days}d` : '—'}</td>
                      <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>{formatDate(q.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: RFQs */}
      {activeTab === 'rfqs' && (
        <div>
          {rfqs.length === 0 ? (
            <div className="text-center py-12 border rounded-[4px]" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
              <p className="text-[14px] font-medium mb-1">{t('No RFQs sent to this supplier', '未向此供應商發送詢價單')}</p>
            </div>
          ) : (
            <div className="border rounded-[4px] overflow-hidden" style={{ borderColor: 'var(--border)' }}>
              <table className="w-full text-[13px]">
                <thead>
                  <tr style={{ background: 'var(--bg)' }}>
                    <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text-muted)' }}>{t('Status', '狀態')}</th>
                    <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text-muted)' }}>{t('Subject', '主題')}</th>
                    <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text-muted)' }}>{t('Sent', '發送日期')}</th>
                    <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text-muted)' }}>{t('Created', '建立日期')}</th>
                  </tr>
                </thead>
                <tbody>
                  {rfqs.map((rfq) => (
                    <tr
                      key={rfq.id}
                      className="border-t cursor-pointer hover:bg-black/[0.02]"
                      style={{ borderColor: 'var(--border)' }}
                      onClick={() => router.push(`/admin/rfqs/${rfq.id}`)}
                    >
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${
                          rfq.status === 'COMPLETE' ? 'bg-green-100 text-green-700' :
                          rfq.status === 'SENT' ? 'bg-indigo-100 text-indigo-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {rfq.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">{rfq.subject || '—'}</td>
                      <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>{rfq.sent_at ? formatDate(rfq.sent_at) : '—'}</td>
                      <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>{formatDate(rfq.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
