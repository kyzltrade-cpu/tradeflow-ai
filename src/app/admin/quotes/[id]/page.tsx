'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { useLang } from '@/lib/lang'
import { useCompany } from '@/lib/company'
import { authFetch } from '@/lib/auth-fetch'

type LineItem = {
  id: string
  product_name: string
  quantity: number
  unit: string
  unit_price: number
  total_price: number
}

type CostComponent = {
  id: string
  name: string
  amount: number
  source: string
  status: 'confirmed' | 'estimated'
}

type Approval = {
  id: string
  status: string
  comments: string
  created_at: string
  user_name: string
}

type QuoteVersion = {
  id: string
  version: number
  summary: string
  created_at: string
}

type Quote = {
  id: string
  quote_number: string
  opportunity_title: string
  status: 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'SENT'
  currency: string
  incoterm: string
  payment_terms: string
  validity_days: number
  valid_until: string
  total_amount: number
  customer_name: string
  contact_name: string
  contact_email: string
  subtotal: number
  total_cost: number
  margin_amount: number
  margin_percent: number
  line_items: LineItem[]
  cost_components: CostComponent[]
  approvals: Approval[]
  versions: QuoteVersion[]
}

const STATUS_COLORS: Record<string, React.CSSProperties> = {
  DRAFT: { background: '#f3f4f6', color: '#374151' },
  IN_REVIEW: { background: '#FEF3C7', color: '#B45309' },
  APPROVED: { background: '#ECFDF5', color: '#047857' },
  SENT: { background: '#EFF6FF', color: '#1D4ED8' },
  REJECTED: { background: '#FEF2F2', color: '#B91C1C' },
}

export default function QuoteDetailPage() {
  const { t } = useLang()
  const { companyId } = useCompany()
  const router = useRouter()
  const params = useParams()
  const quoteId = params.id as string

  const [quote, setQuote] = useState<Quote | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [rejectComment, setRejectComment] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const fetchQuote = useCallback(async () => {
    if (!quoteId || !companyId) return
    setLoading(true)
    setError(null)
    try {
      const res = await authFetch(`/api/admin/quotes/${quoteId}?company_id=${companyId}`)
      if (!res.ok) throw new Error('Failed to fetch quote')
      const data = await res.json()
      setQuote(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load quote')
    } finally {
      setLoading(false)
    }
  }, [quoteId, companyId])

  useEffect(() => {
    fetchQuote()
  }, [fetchQuote])

  const handleRequestApproval = async () => {
    setActionLoading(true)
    try {
      const res = await authFetch(`/api/admin/quotes/${quoteId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request_approval', company_id: companyId }),
      })
      if (!res.ok) throw new Error('Failed to request approval')
      await fetchQuote()
    } catch (err: any) {
      alert(err.message || 'Failed to request approval')
    } finally {
      setActionLoading(false)
    }
  }

  const handleApprove = async () => {
    setActionLoading(true)
    try {
      const res = await authFetch(`/api/admin/quotes/${quoteId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', company_id: companyId }),
      })
      if (!res.ok) throw new Error('Failed to approve quote')
      await fetchQuote()
    } catch (err: any) {
      alert(err.message || 'Failed to approve quote')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    setActionLoading(true)
    try {
      const res = await authFetch(`/api/admin/quotes/${quoteId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', company_id: companyId, comments: rejectComment }),
      })
      if (!res.ok) throw new Error('Failed to reject quote')
      setRejectComment('')
      await fetchQuote()
    } catch (err: any) {
      alert(err.message || 'Failed to reject quote')
    } finally {
      setActionLoading(false)
    }
  }

  const handleSend = async () => {
    setActionLoading(true)
    try {
      const res = await authFetch(`/api/admin/quotes/${quoteId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: companyId }),
      })
      if (!res.ok) throw new Error('Failed to send quote')
      await fetchQuote()
    } catch (err: any) {
      alert(err.message || 'Failed to send quote')
    } finally {
      setActionLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return `${quote?.currency || 'USD'} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString()
  }

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleString()
  }

  if (loading) {
    return (
      <div style={{ padding: '32px', color: 'var(--text-secondary)' }}>
        {t('Loading...', '載入中...')}
      </div>
    )
  }

  if (error || !quote) {
    return (
      <div style={{ padding: '32px' }}>
        <div style={{ color: 'var(--error, #ef4444)', marginBottom: '12px' }}>{error || t('Quote not found', '找不到報價')}</div>
        <Link
          href="/admin/quotes"
          style={{ color: 'var(--accent)', fontSize: '13px', textDecoration: 'underline' }}
        >
          {t('Back to Quotes', '返回報價列表')}
        </Link>
      </div>
    )
  }

  const marginValid = quote.margin_percent != null && quote.margin_percent > 0
  const marginLow = marginValid && quote.margin_percent < 10

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <Link
          href="/admin/quotes"
          style={{
            color: 'var(--text-secondary)',
            fontSize: '13px',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            marginBottom: '12px',
          }}
        >
          ← {t('Back to Quotes', '返回報價列表')}
        </Link>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 600, margin: 0 }}>
                {quote.quote_number}
              </h1>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 500,
                  padding: '2px 10px',
                  borderRadius: '4px',
                  border: '1px solid var(--border)',
                  ...(STATUS_COLORS[quote.status] || {}) as React.CSSProperties,
                }}
              >
                {quote.status.replace('_', ' ')}
              </span>
            </div>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>
              {quote.opportunity_title}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {quote.status === 'DRAFT' && (
              <>
                <button
                  onClick={handleRequestApproval}
                  disabled={actionLoading}
                  style={{
                    fontSize: '13px',
                    padding: '6px 16px',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                    cursor: actionLoading ? 'not-allowed' : 'pointer',
                    opacity: actionLoading ? 0.6 : 1,
                  }}
                >
                  {t('Request Approval', '請求審批')}
                </button>
                <button
                  onClick={handleSend}
                  disabled={actionLoading}
                  style={{
                    fontSize: '13px',
                    padding: '6px 16px',
                    border: '1px solid var(--accent)',
                    borderRadius: '4px',
                    background: 'var(--accent)',
                    color: '#fff',
                    cursor: actionLoading ? 'not-allowed' : 'pointer',
                    opacity: actionLoading ? 0.6 : 1,
                  }}
                >
                  {t('Send', '發送')}
                </button>
              </>
            )}

            {quote.status === 'IN_REVIEW' && (
              <>
                <button
                  onClick={handleApprove}
                  disabled={actionLoading}
                  style={{
                    fontSize: '13px',
                    padding: '6px 16px',
                    border: '1px solid #16a34a',
                    borderRadius: '4px',
                    background: '#16a34a',
                    color: '#fff',
                    cursor: actionLoading ? 'not-allowed' : 'pointer',
                    opacity: actionLoading ? 0.6 : 1,
                  }}
                >
                  {t('Approve', '批准')}
                </button>
                <button
                  onClick={handleReject}
                  disabled={actionLoading || !rejectComment.trim()}
                  style={{
                    fontSize: '13px',
                    padding: '6px 16px',
                    border: '1px solid #dc2626',
                    borderRadius: '4px',
                    background: '#dc2626',
                    color: '#fff',
                    cursor: actionLoading || !rejectComment.trim() ? 'not-allowed' : 'pointer',
                    opacity: actionLoading || !rejectComment.trim() ? 0.6 : 1,
                  }}
                >
                  {t('Reject', '拒絕')}
                </button>
              </>
            )}

            {quote.status === 'APPROVED' && (
              <button
                onClick={handleSend}
                disabled={actionLoading}
                style={{
                  fontSize: '13px',
                  padding: '6px 16px',
                  border: '1px solid var(--accent)',
                  borderRadius: '4px',
                  background: 'var(--accent)',
                  color: '#fff',
                  cursor: actionLoading ? 'not-allowed' : 'pointer',
                  opacity: actionLoading ? 0.6 : 1,
                }}
              >
                {t('Send', '發送')}
              </button>
            )}
          </div>
        </div>

        {quote.status === 'IN_REVIEW' && (
          <div style={{ marginTop: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="text"
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
              placeholder={t('Rejection reason (required for reject)', '拒絕原因（拒絕時必填）')}
              style={{
                flex: 1,
                maxWidth: '400px',
                fontSize: '13px',
                padding: '6px 10px',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                background: 'var(--surface)',
                color: 'var(--text)',
              }}
            />
          </div>
        )}
      </div>

      {/* Grid Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Left Column - 2/3 */}
        <div style={{ gridColumn: '1 / 2' }}>
          {/* Line Items Table */}
          <div
            style={{
              border: '1px solid var(--border)',
              borderRadius: '4px',
              marginBottom: '24px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid var(--border)',
                background: 'var(--surface)',
                fontSize: '14px',
                fontWeight: 600,
              }}
            >
              {t('Line Items', '明細項目')}
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 500, color: 'var(--text-secondary)' }}>
                      {t('Product', '產品')}
                    </th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 500, color: 'var(--text-secondary)' }}>
                      {t('Qty', '數量')}
                    </th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 500, color: 'var(--text-secondary)' }}>
                      {t('Unit', '單位')}
                    </th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 500, color: 'var(--text-secondary)' }}>
                      {t('Unit Price', '單價')}
                    </th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 500, color: 'var(--text-secondary)' }}>
                      {t('Total', '總計')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {quote.line_items.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '8px 12px' }}>{item.product_name}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right' }}>{item.quantity}</td>
                      <td style={{ padding: '8px 12px' }}>{item.unit}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right' }}>{formatCurrency(item.unit_price)}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right' }}>{formatCurrency(item.total_price)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid var(--border)', fontWeight: 600 }}>
                    <td colSpan={4} style={{ padding: '8px 12px', textAlign: 'right' }}>
                      {t('Subtotal', '小計')}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right' }}>{formatCurrency(quote.subtotal)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Cost Build-up */}
          <div
            style={{
              border: '1px solid var(--border)',
              borderRadius: '4px',
              marginBottom: '24px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid var(--border)',
                background: 'var(--surface)',
                fontSize: '14px',
                fontWeight: 600,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>{t('Cost Build-up', '成本構成')}</span>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 400 }}>
                ({t('Internal', '內部')})
              </span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 500, color: 'var(--text-secondary)' }}>
                      {t('Component', '組件')}
                    </th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 500, color: 'var(--text-secondary)' }}>
                      {t('Amount', '金額')}
                    </th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 500, color: 'var(--text-secondary)' }}>
                      {t('Source', '來源')}
                    </th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 500, color: 'var(--text-secondary)' }}>
                      {t('Status', '狀態')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {quote.cost_components.map((comp) => (
                    <tr key={comp.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '8px 12px' }}>{comp.name}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right' }}>{formatCurrency(comp.amount)}</td>
                      <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{comp.source}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            padding: '1px 8px',
                            borderRadius: '4px',
                            border: '1px solid var(--border)',
                            ...(comp.status === 'confirmed'
                              ? { background: '#dcfce7', color: '#166534' }
                              : { background: '#fef9c3', color: '#854d0e' }),
                          }}
                        >
                          {comp.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid var(--border)' }}>
                    <td colSpan={4} style={{ padding: '16px 12px 0' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>{t('Total Cost', '總成本')}</span>
                          <span style={{ fontWeight: 500 }}>{formatCurrency(quote.total_cost)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>{t('Margin', '利潤')}</span>
                          <span style={{ fontWeight: 500 }}>{formatCurrency(quote.margin_amount)}</span>
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: '13px',
                            color: marginLow ? '#dc2626' : undefined,
                            fontWeight: marginLow ? 600 : undefined,
                          }}
                        >
                          <span>{t('Margin %', '利潤率')}</span>
                          <span>{quote.margin_percent != null && quote.margin_percent > 0 ? `${quote.margin_percent.toFixed(1)}%` : '—'}</span>
                        </div>
                      </div>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {marginLow && (
              <div
                style={{
                  margin: '12px 16px 16px',
                  padding: '8px 12px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '4px',
                  fontSize: '12px',
                  color: '#991b1b',
                }}
              >
                ⚠ {t('Margin is below 10%. Review pricing before sending.', '利潤率低於10%。發送前請審核定價。')}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - 1/3 */}
        <div style={{ gridColumn: '2 / 3' }}>
          {/* Quote Info Card */}
          <div
            style={{
              border: '1px solid var(--border)',
              borderRadius: '4px',
              marginBottom: '16px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid var(--border)',
                background: 'var(--surface)',
                fontSize: '14px',
                fontWeight: 600,
              }}
            >
              {t('Quote Info', '報價資訊')}
            </div>
            <div style={{ padding: '12px 16px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{t('Currency', '幣別')}</span>
                <span>{quote.currency}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{t('Incoterm', '貿易條件')}</span>
                <span>{quote.incoterm || '-'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{t('Payment Terms', '付款條件')}</span>
                <span>{quote.payment_terms || '-'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{t('Validity', '有效期')}</span>
                <span>{quote.validity_days} {t('days', '天')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{t('Valid Until', '有效至')}</span>
                <span>{formatDate(quote.valid_until)}</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingTop: '8px',
                  borderTop: '1px solid var(--border)',
                  marginTop: '4px',
                  fontWeight: 600,
                  fontSize: '14px',
                }}
              >
                <span>{t('Total Amount', '總金額')}</span>
                <span>{formatCurrency(quote.total_amount)}</span>
              </div>
            </div>
          </div>

          {/* Customer Info Card */}
          <div
            style={{
              border: '1px solid var(--border)',
              borderRadius: '4px',
              marginBottom: '16px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid var(--border)',
                background: 'var(--surface)',
                fontSize: '14px',
                fontWeight: 600,
              }}
            >
              {t('Customer Info', '客戶資訊')}
            </div>
            <div style={{ padding: '12px 16px', fontSize: '13px' }}>
              <div style={{ marginBottom: '8px' }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginBottom: '2px' }}>
                  {t('Customer', '客戶')}
                </div>
                <div style={{ fontWeight: 500 }}>{quote.customer_name}</div>
              </div>
              <div style={{ marginBottom: '8px' }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginBottom: '2px' }}>
                  {t('Contact', '聯絡人')}
                </div>
                <div>{quote.contact_name}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginBottom: '2px' }}>
                  {t('Email', '電子郵件')}
                </div>
                <div>{quote.contact_email}</div>
              </div>
            </div>
          </div>

          {/* Approval History */}
          <div
            style={{
              border: '1px solid var(--border)',
              borderRadius: '4px',
              marginBottom: '16px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid var(--border)',
                background: 'var(--surface)',
                fontSize: '14px',
                fontWeight: 600,
              }}
            >
              {t('Approval History', '審批歷史')}
            </div>
            <div style={{ padding: '12px 16px', fontSize: '13px' }}>
              {quote.approvals.length === 0 ? (
                <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '12px 0' }}>
                  {t('No approvals yet', '尚無審批記錄')}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {quote.approvals.map((approval) => (
                    <div
                      key={approval.id}
                      style={{
                        padding: '8px 12px',
                        border: '1px solid var(--border)',
                        borderRadius: '4px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 500 }}>{approval.user_name}</span>
                        <span
                          style={{
                            fontSize: '11px',
                            padding: '1px 8px',
                            borderRadius: '4px',
                            border: '1px solid var(--border)',
                            ...(approval.status === 'approved'
                              ? { background: '#dcfce7', color: '#166534' }
                              : approval.status === 'rejected'
                              ? { background: '#fee2e2', color: '#991b1b' }
                              : { background: '#fef9c3', color: '#854d0e' }),
                          }}
                        >
                          {approval.status}
                        </span>
                      </div>
                      {approval.comments && (
                        <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '4px' }}>
                          {approval.comments}
                        </div>
                      )}
                      <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                        {formatDateTime(approval.created_at)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Version History */}
          <div
            style={{
              border: '1px solid var(--border)',
              borderRadius: '4px',
              marginBottom: '16px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid var(--border)',
                background: 'var(--surface)',
                fontSize: '14px',
                fontWeight: 600,
              }}
            >
              {t('Version History', '版本歷史')}
            </div>
            <div style={{ padding: '12px 16px', fontSize: '13px' }}>
              {quote.versions.length === 0 ? (
                <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '12px 0' }}>
                  {t('No versions yet', '尚無版本記錄')}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {quote.versions.map((version) => (
                    <div
                      key={version.id}
                      style={{
                        padding: '8px 12px',
                        border: '1px solid var(--border)',
                        borderRadius: '4px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 500 }}>
                          {t('Version', '版本')} {version.version}
                        </span>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                          {formatDateTime(version.created_at)}
                        </span>
                      </div>
                      {version.summary && (
                        <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                          {version.summary}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
