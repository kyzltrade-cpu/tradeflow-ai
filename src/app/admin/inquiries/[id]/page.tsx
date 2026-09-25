'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { useLang } from '@/lib/lang';
import { useCompany } from '@/lib/company';
import { useToast } from '@/components/Toast';
import { authFetch } from '@/lib/auth-fetch';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface InquiryAttachment {
  id: string;
  inquiry_id: string;
  original_name: string;
  mime_type: string | null;
  file_size: number;
  storage_path: string | null;
  extracted_text: string | null;
  extraction_status: string | null;
  created_at: string;
}

interface ExtractedField {
  id: string;
  inquiry_id: string;
  field_name: string;
  field_value: string;
  confidence: number;
  status: string;
  source_type: string | null;
  source_ref: string | null;
  human_confirmation_required: boolean;
  created_at: string;
}

interface Inquiry {
  id: string;
  company_id: string;
  source_channel: string;
  received_at: string | null;
  sender_name: string | null;
  sender_email: string | null;
  sender_phone: string | null;
  subject: string | null;
  original_message: string;
  processing_status: string;
  priority: string;
  detected_language: string | null;
  error_message: string | null;
  extraction_run_id: string | null;
  opportunity_id: string | null;
  assigned_owner: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  attachments: InquiryAttachment[];
  extracted_fields: ExtractedField[];
  opportunity: { id: string; title: string; stage: string } | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TABS = [
  { key: 'message', en: 'Original Message', zh: '原始訊息' },
  { key: 'attachments', en: 'Attachments', zh: '附件' },
  { key: 'requirements', en: 'Extracted Requirements', zh: '提取需求' },
  { key: 'actions', en: 'Actions', zh: '操作' },
];

const STATUS_OPTIONS = [
  { value: 'RECEIVED', en: 'Received', zh: '已收到' },
  { value: 'EXTRACTING', en: 'Extracting', zh: '提取中' },
  { value: 'EXTRACTED', en: 'Extracted', zh: '已提取' },
  { value: 'READY_FOR_RFQ', en: 'Ready for RFQ', zh: '準備詢價' },
  { value: 'NEEDS_REVIEW', en: 'Needs Review', zh: '待審核' },
  { value: 'QUOTE_DRAFTED', en: 'Quote Drafted', zh: '報價草稿' },
  { value: 'CONVERTED', en: 'Converted', zh: '已轉換' },
  { value: 'FAILED', en: 'Failed', zh: '失敗' },
  { value: 'CLOSED', en: 'Closed', zh: '已關閉' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', en: 'Low', zh: '低' },
  { value: 'normal', en: 'Normal', zh: '一般' },
  { value: 'high', en: 'High', zh: '高' },
  { value: 'urgent', en: 'Urgent', zh: '緊急' },
];

const FIELD_STATUSES: Record<string, { en: string; zh: string; bg: string; color: string }> = {
  CONFIRMED:   { en: 'Confirmed',   zh: '已確認', bg: '#D1FAE5', color: '#059669' },
  EXTRACTED:   { en: 'Extracted',   zh: '已提取', bg: '#DBEAFE', color: '#2563EB' },
  INFERRED:    { en: 'Inferred',    zh: '推斷',   bg: '#FEF3C7', color: '#D97706' },
  MISSING:     { en: 'Missing',     zh: '缺失',   bg: '#FEE2E2', color: '#DC2626' },
  CONFLICTING: { en: 'Conflicting', zh: '衝突',   bg: '#FEE2E2', color: '#DC2626' },
};

const REQUIRED_FIELDS = [
  { key: 'product_name', en: 'Product Name', zh: '產品名稱' },
  { key: 'quantity', en: 'Quantity', zh: '數量' },
  { key: 'unit_price', en: 'Unit Price', zh: '單價' },
  { key: 'delivery_date', en: 'Delivery Date', zh: '交貨日期' },
  { key: 'destination', en: 'Destination', zh: '目的地' },
  { key: 'payment_terms', en: 'Payment Terms', zh: '付款條件' },
  { key: 'incoterms', en: 'Incoterms', zh: '貿易條件' },
  { key: 'packaging', en: 'Packaging Requirements', zh: '包裝要求' },
  { key: 'certifications', en: 'Certifications', zh: '認證要求' },
  { key: 'sample_required', en: 'Sample Required', zh: '需要樣品' },
];

const PROCESSING_TIMELINE = [
  { status: 'RECEIVED', en: 'Inquiry Received', zh: '已收到詢價' },
  { status: 'EXTRACTING', en: 'Extracting Data', zh: '提取資料中' },
  { status: 'NEEDS_REVIEW', en: 'Needs Review', zh: '待審核' },
  { status: 'READY_FOR_RFQ', en: 'Ready for RFQ', zh: '準備詢價' },
  { status: 'QUOTE_DRAFTED', en: 'Quote Drafted', zh: '報價草稿' },
  { status: 'CONVERTED', en: 'Converted to Opportunity', zh: '已轉換為商機' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function statusColor(status: string) {
  switch (status) {
    case 'RECEIVED':       return { bg: '#EFF6FF', color: '#2563EB' };
    case 'EXTRACTING':     return { bg: '#FEF3C7', color: '#D97706' };
    case 'EXTRACTED':      return { bg: '#E0F2FE', color: '#0284C7' };
    case 'READY_FOR_RFQ':  return { bg: '#D1FAE5', color: '#059669' };
    case 'NEEDS_REVIEW':   return { bg: '#FEF3C7', color: '#D97706' };
    case 'QUOTE_DRAFTED':  return { bg: '#DBEAFE', color: '#2563EB' };
    case 'CONVERTED':      return { bg: '#D1FAE5', color: '#059669' };
    case 'FAILED':         return { bg: '#FEE2E2', color: '#DC2626' };
    case 'CLOSED':         return { bg: '#F3F4F6', color: '#6B7280' };
    default:               return { bg: '#F3F4F6', color: '#6B7280' };
  }
}

function priorityColor(priority: string) {
  switch (priority) {
    case 'low':    return { bg: '#F3F4F6', color: '#6B7280' };
    case 'normal': return { bg: '#EFF6FF', color: '#2563EB' };
    case 'high':   return { bg: '#FEF3C7', color: '#D97706' };
    case 'urgent': return { bg: '#FEE2E2', color: '#DC2626' };
    default:       return { bg: '#F3F4F6', color: '#6B7280' };
  }
}

function channelIcon(channel: string) {
  switch (channel) {
    case 'email':      return 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z';
    case 'web':        return 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9';
    case 'manual':     return 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z';
    case 'api':        return 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4';
    case 'file_upload': return 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12';
    default:           return 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z';
  }
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function extractStatusColor(status: string | null) {
  switch (status) {
    case 'completed': return { bg: '#D1FAE5', color: '#059669' };
    case 'processing': return { bg: '#FEF3C7', color: '#D97706' };
    case 'pending': return { bg: '#F3F4F6', color: '#6B7280' };
    case 'failed': return { bg: '#FEE2E2', color: '#DC2626' };
    default: return { bg: '#F3F4F6', color: '#6B7280' };
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded ${className}`} style={{ background: 'var(--border)' }} />;
}

function Badge({ bg, color, children }: { bg: string; color: string; children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-medium px-2 py-0.5 rounded inline-flex items-center" style={{ background: bg, color }}>
      {children}
    </span>
  );
}

function ConfidenceBar({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  let barColor = '#059669';
  if (pct < 50) barColor = '#DC2626';
  else if (pct < 75) barColor = '#D97706';

  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: barColor }} />
      </div>
      <span className="text-[11px] font-medium" style={{ color: barColor }}>{pct}%</span>
    </div>
  );
}

function FieldRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <span className="text-[12px] md:text-[13px] font-medium w-36 flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className="text-[13px] md:text-[14px] flex-1" style={{ color: 'var(--text)' }}>{value || '—'}</span>
    </div>
  );
}

function SectionCard({ title, children, actions }: { title: string; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="border rounded-[4px]" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
      <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <h3 className="text-[13px] md:text-[14px] font-semibold" style={{ color: 'var(--text)' }}>{title}</h3>
        {actions}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Original Message
// ---------------------------------------------------------------------------

function TabMessage({ inquiry, t }: { inquiry: Inquiry; t: (en: string, zh: string) => string }) {
  const { companyId } = useCompany();
  const { showToast } = useToast();
  const [editingPriority, setEditingPriority] = useState(false);
  const [priorityValue, setPriorityValue] = useState(inquiry.priority);
  const [savingPriority, setSavingPriority] = useState(false);

  const handleSavePriority = async () => {
    setSavingPriority(true);
    try {
      const res = await authFetch(`/api/admin/inquiries/${inquiry.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: priorityValue, company_id: companyId }),
      });
      if (!res.ok) throw new Error('Failed to update priority');
      setEditingPriority(false);
      showToast(t('Priority updated', '優先級已更新'), 'success');
    } catch {
      showToast(t('Failed to update priority', '更新優先級失敗'), 'error');
    } finally {
      setSavingPriority(false);
    }
  };

  const pc = priorityColor(inquiry.priority);

  return (
    <div className="space-y-4">
      {/* Sender Info */}
      <SectionCard title={t('Sender Information', '寄件人資訊')}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
          <FieldRow label={t('Name', '姓名')} value={inquiry.sender_name} />
          <FieldRow
            label={t('Email', '電郵')}
            value={
              inquiry.sender_email ? (
                <a href={`mailto:${inquiry.sender_email}`} className="underline" style={{ color: 'var(--accent)' }}>
                  {inquiry.sender_email}
                </a>
              ) : '—'
            }
          />
          <FieldRow
            label={t('Phone', '電話')}
            value={
              inquiry.sender_phone ? (
                <a href={`tel:${inquiry.sender_phone}`} className="underline" style={{ color: 'var(--accent)' }}>
                  {inquiry.sender_phone}
                </a>
              ) : '—'
            }
          />
          <FieldRow label={t('Subject', '主旨')} value={<span className="font-medium">{inquiry.subject || t('(No subject)', '（無主旨）')}</span>} />
          <FieldRow label={t('Received', '收到時間')} value={formatDateTime(inquiry.received_at || inquiry.created_at)} />
          <FieldRow
            label={t('Source Channel', '來源渠道')}
            value={
              <span className="flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d={channelIcon(inquiry.source_channel)} />
                </svg>
                {inquiry.source_channel}
              </span>
            }
          />
          <FieldRow label={t('Language Detected', '偵測語言')} value={inquiry.detected_language || '—'} />
          <FieldRow
            label={t('Priority', '優先級')}
            value={
              editingPriority ? (
                <div className="flex items-center gap-2">
                  <select
                    value={priorityValue}
                    onChange={(e) => setPriorityValue(e.target.value)}
                    className="border rounded-[4px] px-2 py-1 text-[13px] focus:outline-none"
                    style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                  >
                    {PRIORITY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{t(o.en, o.zh)}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleSavePriority}
                    disabled={savingPriority}
                    className="text-[11px] font-medium px-2 py-0.5 rounded text-white disabled:opacity-50"
                    style={{ background: 'var(--accent)' }}
                  >
                    {savingPriority ? '...' : t('Save', '儲存')}
                  </button>
                  <button
                    onClick={() => { setEditingPriority(false); setPriorityValue(inquiry.priority); }}
                    className="text-[11px] px-2 py-0.5 rounded border"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
                  >
                    {t('Cancel', '取消')}
                  </button>
                </div>
              ) : (
                <span
                  className="cursor-pointer hover:opacity-70 transition-opacity"
                  onClick={() => setEditingPriority(true)}
                  title={t('Click to edit', '點擊編輯')}
                >
                  <Badge bg={`${pc.color}15`} color={pc.color}>
                    {t(PRIORITY_OPTIONS.find(o => o.value === inquiry.priority)?.en || inquiry.priority, PRIORITY_OPTIONS.find(o => o.value === inquiry.priority)?.zh || inquiry.priority)}
                  </Badge>
                </span>
              )
            }
          />
          <FieldRow label={t('Assigned To', '負責人')} value={inquiry.assigned_owner || '—'} />
        </div>
      </SectionCard>

      {/* Full Message */}
      <SectionCard title={t('Full Message', '完整訊息')}>
        {inquiry.original_message ? (
          <div
            className="border rounded-[4px] p-4 text-[13px] leading-relaxed max-h-[500px] overflow-y-auto whitespace-pre-wrap"
            style={{ borderColor: 'var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
          >
            {inquiry.original_message}
          </div>
        ) : (
          <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>{t('No message content', '無訊息內容')}</p>
        )}
      </SectionCard>

      {/* Notes */}
      {inquiry.notes && (
        <SectionCard title={t('Internal Notes', '內部備註')}>
          <p className="text-[13px] leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text)' }}>
            {inquiry.notes}
          </p>
        </SectionCard>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Attachments
// ---------------------------------------------------------------------------

function TabAttachments({ inquiry, t }: { inquiry: Inquiry; t: (en: string, zh: string) => string }) {
  const { companyId } = useCompany();
  const { showToast } = useToast();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reextractingId, setReextractingId] = useState<string | null>(null);

  const handleReextract = async (attachmentId: string) => {
    setReextractingId(attachmentId);
    try {
      const res = await authFetch(`/api/admin/inquiries/${inquiry.id}/attachments/${attachmentId}/reextract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: companyId }),
      });
      if (!res.ok) throw new Error('Failed to re-extract');
      showToast(t('Re-extraction started', '重新提取已開始'), 'success');
    } catch {
      showToast(t('Failed to re-extract', '重新提取失敗'), 'error');
    } finally {
      setReextractingId(null);
    }
  };

  if (inquiry.attachments.length === 0) {
    return (
      <SectionCard title={t('Attachments', '附件')}>
        <div className="py-12 text-center">
          <svg className="mx-auto mb-3" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
          </svg>
          <p className="text-[14px] font-medium" style={{ color: 'var(--text)' }}>
            {t('No attachments', '暫無附件')}
          </p>
          <p className="text-[13px] mt-1" style={{ color: 'var(--text-muted)' }}>
            {t('Attachments will appear here when included with the inquiry', '附件包含在詢價中時會顯示於此')}
          </p>
        </div>
      </SectionCard>
    );
  }

  return (
    <div className="space-y-4">
      <SectionCard
        title={t('Attachments', '附件')}
        actions={
          <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
            {inquiry.attachments.length} {t('file(s)', '個檔案')}
          </span>
        }
      >
        <div className="space-y-3">
          {inquiry.attachments.map((att) => {
            const esc = extractStatusColor(att.extraction_status);
            const isExpanded = expandedId === att.id;
            const hasFailed = att.extraction_status === 'failed';
            const hasText = !!att.extracted_text;

            return (
              <div
                key={att.id}
                className="border rounded-[4px] overflow-hidden"
                style={{ borderColor: 'var(--border)' }}
              >
                {/* File header row */}
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[var(--bg)] transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : att.id)}
                >
                  {/* File icon */}
                  <div className="w-9 h-9 rounded flex items-center justify-center flex-shrink-0" style={{ background: 'var(--bg)' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  </div>

                  {/* File info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium truncate" style={{ color: 'var(--text)' }}>
                      {att.original_name}
                    </p>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {att.mime_type || 'unknown'} · {formatFileSize(att.file_size)}
                    </p>
                  </div>

                  {/* Extraction status */}
                  <Badge bg={esc.bg} color={esc.color}>
                    {att.extraction_status || 'pending'}
                  </Badge>

                  {/* Expand arrow */}
                  <svg
                    width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                    style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="border-t px-4 py-3" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
                    {hasText ? (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[12px] font-medium" style={{ color: 'var(--text-muted)' }}>
                            {t('Extracted Text', '提取文字')}
                          </p>
                          {hasFailed && (
                            <button
                              onClick={() => handleReextract(att.id)}
                              disabled={reextractingId === att.id}
                              className="text-[11px] font-medium px-2.5 py-1 rounded border disabled:opacity-50"
                              style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}
                            >
                              {reextractingId === att.id ? '...' : t('Re-extract', '重新提取')}
                            </button>
                          )}
                        </div>
                        <div
                          className="border rounded-[4px] p-3 text-[12px] leading-relaxed max-h-60 overflow-y-auto whitespace-pre-wrap"
                          style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
                        >
                          {att.extracted_text}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                          {hasFailed
                            ? t('Extraction failed. Click to re-extract.', '提取失敗，點擊重新提取。')
                            : t('No extracted text yet', '尚未提取文字')}
                        </p>
                        {hasFailed && (
                          <button
                            onClick={() => handleReextract(att.id)}
                            disabled={reextractingId === att.id}
                            className="text-[11px] font-medium px-2.5 py-1 rounded border disabled:opacity-50"
                            style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}
                          >
                            {reextractingId === att.id ? '...' : t('Re-extract', '重新提取')}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Extracted Requirements
// ---------------------------------------------------------------------------

function TabRequirements({ inquiry, t }: { inquiry: Inquiry; t: (en: string, zh: string) => string }) {
  const [confirmingField, setConfirmingField] = useState<string | null>(null);
  const [overrideValues, setOverrideValues] = useState<Record<string, string>>({});

  const fields = inquiry.extracted_fields;

  const handleConfirmField = async (fieldId: string) => {
    setConfirmingField(fieldId);
    try {
      await new Promise((r) => setTimeout(r, 500));
    } finally {
      setConfirmingField(null);
    }
  };

  const handleOverrideField = async (fieldId: string) => {
    setConfirmingField(fieldId);
    try {
      await new Promise((r) => setTimeout(r, 500));
    } finally {
      setConfirmingField(null);
    }
  };

  const extractedNames = new Set(fields.map((f) => f.field_name.toLowerCase()));

  return (
    <div className="space-y-4">
      {/* Extracted Fields Table */}
      <SectionCard
        title={t('Extracted Fields', '提取欄位')}
        actions={
          <button
            className="text-[11px] font-medium px-2.5 py-1 rounded-[4px] border"
            style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}
          >
            {t('Draft Clarification Email', '起草澄清郵件')}
          </button>
        }
      >
        {fields.length === 0 ? (
          <div className="py-12 text-center">
            <svg className="mx-auto mb-3" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            <p className="text-[14px] font-medium" style={{ color: 'var(--text)' }}>
              {t('No fields extracted yet', '尚未提取欄位')}
            </p>
            <p className="text-[13px] mt-1" style={{ color: 'var(--text-muted)' }}>
              {t('Run extraction to process this inquiry', '執行提取以處理此詢價')}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                  <th className="text-left py-2 px-3 font-medium" style={{ color: 'var(--text-muted)' }}>{t('Field', '欄位')}</th>
                  <th className="text-left py-2 px-3 font-medium" style={{ color: 'var(--text-muted)' }}>{t('Value', '數值')}</th>
                  <th className="text-left py-2 px-3 font-medium" style={{ color: 'var(--text-muted)' }}>{t('Confidence', '信心度')}</th>
                  <th className="text-left py-2 px-3 font-medium" style={{ color: 'var(--text-muted)' }}>{t('Status', '狀態')}</th>
                  <th className="text-left py-2 px-3 font-medium" style={{ color: 'var(--text-muted)' }}>{t('Source', '來源')}</th>
                  <th className="text-right py-2 px-3 font-medium" style={{ color: 'var(--text-muted)' }}>{t('Actions', '操作')}</th>
                </tr>
              </thead>
              <tbody>
                {fields.map((field) => {
                  const fieldStatus = FIELD_STATUSES[field.status] || FIELD_STATUSES.EXTRACTED;
                  const canAct = field.status === 'EXTRACTED' || field.status === 'INFERRED';

                  return (
                    <tr key={field.id} className="border-b last:border-b-0" style={{ borderColor: 'var(--border)' }}>
                      <td className="py-2.5 px-3 font-medium" style={{ color: 'var(--text)' }}>
                        {field.field_name}
                      </td>
                      <td className="py-2.5 px-3" style={{ color: 'var(--text)' }}>
                        {field.field_value || '—'}
                      </td>
                      <td className="py-2.5 px-3">
                        <ConfidenceBar confidence={field.confidence} />
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge bg={fieldStatus.bg} color={fieldStatus.color}>
                          {t(fieldStatus.en, fieldStatus.zh)}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                        {field.source_type || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {canAct && (
                          <div className="flex items-center justify-end gap-1.5">
                            <input
                              type="text"
                              placeholder={t('Override...', '覆寫...')}
                              value={overrideValues[field.id] || ''}
                              onChange={(e) => setOverrideValues({ ...overrideValues, [field.id]: e.target.value })}
                              className="w-24 border rounded px-2 py-0.5 text-[11px] focus:outline-none"
                              style={{ borderColor: 'var(--border)' }}
                            />
                            {overrideValues[field.id] ? (
                              <button
                                onClick={() => handleOverrideField(field.id)}
                                disabled={confirmingField === field.id}
                                className="text-[11px] font-medium px-2 py-0.5 rounded border disabled:opacity-50"
                                style={{ borderColor: '#D97706', color: '#D97706' }}
                              >
                                {confirmingField === field.id ? '...' : t('Override', '覆寫')}
                              </button>
                            ) : (
                              <button
                                onClick={() => handleConfirmField(field.id)}
                                disabled={confirmingField === field.id}
                                className="text-[11px] font-medium px-2 py-0.5 rounded border disabled:opacity-50"
                                style={{ borderColor: '#059669', color: '#059669' }}
                              >
                                {confirmingField === field.id ? '...' : t('Confirm', '確認')}
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Missing Fields Checklist */}
      <SectionCard title={t('Missing Fields Checklist', '缺失欄位檢查清單')}>
        <div className="space-y-1.5">
          {REQUIRED_FIELDS.map((req) => {
            const found = fields.find((f) => f.field_name.toLowerCase() === req.key.toLowerCase());
            const isPresent = found && found.field_value && found.status !== 'MISSING';
            return (
              <div key={req.key} className="flex items-center gap-3 py-1.5">
                <div
                  className="w-4 h-4 rounded border flex items-center justify-center flex-shrink-0"
                  style={{
                    borderColor: isPresent ? '#059669' : 'var(--border)',
                    background: isPresent ? '#D1FAE5' : 'transparent',
                  }}
                >
                  {isPresent && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
                <span className="text-[13px]" style={{ color: isPresent ? 'var(--text)' : 'var(--text-muted)' }}>
                  {t(req.en, req.zh)}
                </span>
                {found && (
                  <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                    {found.field_value}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Actions
// ---------------------------------------------------------------------------

function TabActions({ inquiry, t }: { inquiry: Inquiry; t: (en: string, zh: string) => string }) {
  const { companyId } = useCompany();
  const { showToast } = useToast();
  const router = useRouter();
  const [converting, setConverting] = useState(false);
  const [drafting, setDrafting] = useState(false);

  const isReady = inquiry.processing_status === 'READY_FOR_RFQ' || inquiry.processing_status === 'NEEDS_REVIEW';
  const isConverted = inquiry.processing_status === 'CONVERTED' || !!inquiry.opportunity_id;
  const isFailed = inquiry.processing_status === 'FAILED';

  const handleConvertToOpportunity = async () => {
    setConverting(true);
    try {
      const res = await authFetch('/api/admin/opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inquiry_id: inquiry.id,
          company_id: companyId,
          title: inquiry.subject || `${inquiry.sender_name || 'Unknown'} inquiry`,
          priority: inquiry.priority,
          source_channel: inquiry.source_channel,
        }),
      });
      if (!res.ok) throw new Error('Failed to create opportunity');
      const data = await res.json();
      showToast(t('Opportunity created', '商機已建立'), 'success');
      if (data.opportunity?.id) {
        router.push(`/admin/opportunities/${data.opportunity.id}`);
      }
    } catch {
      showToast(t('Failed to create opportunity', '建立商機失敗'), 'error');
    } finally {
      setConverting(false);
    }
  };

  const handleDraftQuote = async () => {
    setDrafting(true);
    try {
      const res = await authFetch('/api/admin/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inquiry_id: inquiry.id,
          company_id: companyId,
        }),
      });
      if (!res.ok) throw new Error('Failed to create quote');
      const data = await res.json();
      showToast(t('Quote drafted', '報價草稿已建立'), 'success');
      if (data.quote?.id) {
        router.push(`/admin/quotes/${data.quote.id}`);
      }
    } catch {
      showToast(t('Failed to draft quote', '建立報價草稿失敗'), 'error');
    } finally {
      setDrafting(false);
    }
  };

  const handleReextract = async () => {
    try {
      const res = await authFetch(`/api/admin/inquiries/${inquiry.id}/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: companyId }),
      });
      if (!res.ok) throw new Error('Failed to re-extract');
      showToast(t('Re-extraction started', '重新提取已開始'), 'success');
    } catch {
      showToast(t('Failed to re-extract', '重新提取失敗'), 'error');
    }
  };

  // Build timeline from status history
  const timelineSteps = PROCESSING_TIMELINE.filter((step) => {
    const order = PROCESSING_TIMELINE.findIndex((s) => s.status === step.status);
    const currentOrder = PROCESSING_TIMELINE.findIndex((s) => s.status === inquiry.processing_status);
    return order <= currentOrder;
  });

  return (
    <div className="space-y-4">
      {/* Primary Actions */}
      <SectionCard title={t('Actions', '操作')}>
        <div className="space-y-3">
          {isConverted ? (
            <div className="flex items-center gap-3 p-3 rounded-[4px]" style={{ background: '#D1FAE5' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <div>
                <p className="text-[13px] font-medium" style={{ color: '#059669' }}>
                  {t('Converted to Opportunity', '已轉換為商機')}
                </p>
                {inquiry.opportunity && (
                  <button
                    onClick={() => router.push(`/admin/opportunities/${inquiry.opportunity!.id}`)}
                    className="text-[12px] underline"
                    style={{ color: '#059669' }}
                  >
                    {inquiry.opportunity.title} →
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              <button
                onClick={handleConvertToOpportunity}
                disabled={converting || !isReady}
                className="w-full text-[14px] font-medium px-4 py-3 rounded-[4px] text-white flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'var(--accent)' }}
              >
                {converting ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2v4m0 12v4m-7.07-3.93l2.83-2.83m8.48-8.48l2.83-2.83M2 12h4m12 0h4m-3.93 7.07l-2.83-2.83M7.76 7.76L4.93 4.93" />
                    </svg>
                    {t('Creating...', '建立中...')}
                  </span>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    {t('Create Opportunity', '建立商機')}
                  </>
                )}
              </button>

              {isReady && (
                <button
                  onClick={handleDraftQuote}
                  disabled={drafting}
                  className="w-full text-[14px] font-medium px-4 py-3 rounded-[4px] border flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                >
                  {drafting ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2v4m0 12v4m-7.07-3.93l2.83-2.83m8.48-8.48l2.83-2.83M2 12h4m12 0h4m-3.93 7.07l-2.83-2.83M7.76 7.76L4.93 4.93" />
                      </svg>
                      {t('Drafting...', '草稿中...')}
                    </span>
                  ) : (
                    <>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                      </svg>
                      {t('Create Quote', '建立報價')}
                    </>
                  )}
                </button>
              )}

              {!isReady && !isFailed && inquiry.processing_status === 'EXTRACTING' && (
                <button
                  disabled
                  className="w-full text-[13px] px-4 py-3 rounded-[4px] border flex items-center justify-center gap-2 opacity-60"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
                >
                  <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2v4m0 12v4m-7.07-3.93l2.83-2.83m8.48-8.48l2.83-2.83M2 12h4m12 0h4m-3.93 7.07l-2.83-2.83M7.76 7.76L4.93 4.93" />
                  </svg>
                  {t('Processing...', '處理中...')}
                </button>
              )}
            </>
          )}

          {(isFailed || isReady) && (
            <button
              onClick={handleReextract}
              className="w-full text-[13px] font-medium px-4 py-2.5 rounded-[4px] border flex items-center justify-center gap-2"
              style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 4v6h6M23 20v-6h-6" />
                <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" />
              </svg>
              {t('Re-run Extraction', '重新執行提取')}
            </button>
          )}
        </div>
      </SectionCard>

      {/* Error Message */}
      {isFailed && inquiry.error_message && (
        <SectionCard title={t('Error Details', '錯誤詳情')}>
          <div className="p-3 rounded-[4px]" style={{ background: '#FEE2E2', border: '1px solid #FECACA' }}>
            <div className="flex items-start gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p className="text-[13px] leading-relaxed" style={{ color: '#991B1B' }}>
                {inquiry.error_message}
              </p>
            </div>
          </div>
        </SectionCard>
      )}

      {/* Processing Timeline */}
      <SectionCard title={t('Processing Status', '處理狀態')}>
        <div className="space-y-0">
          {PROCESSING_TIMELINE.map((step, idx) => {
            const isActive = inquiry.processing_status === step.status;
            const isPast = PROCESSING_TIMELINE.findIndex((s) => s.status === inquiry.processing_status) > idx;
            const isFuture = PROCESSING_TIMELINE.findIndex((s) => s.status === inquiry.processing_status) < idx;

            return (
              <div key={step.status} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0 mt-1 border-2"
                    style={{
                      borderColor: isPast || isActive ? 'var(--accent)' : isFailed && idx === 1 ? '#DC2626' : 'var(--border)',
                      background: isPast || isActive ? 'var(--accent)' : 'transparent',
                    }}
                  />
                  {idx < PROCESSING_TIMELINE.length - 1 && (
                    <div className="w-px flex-1 my-1" style={{ background: isPast ? 'var(--accent)' : 'var(--border)' }} />
                  )}
                </div>
                <div className="pb-4">
                  <p
                    className="text-[13px] font-medium"
                    style={{ color: isActive ? 'var(--text)' : isPast ? 'var(--accent)' : isFuture ? 'var(--text-muted)' : 'var(--text-muted)' }}
                  >
                    {t(step.en, step.zh)}
                  </p>
                  {isActive && (
                    <Badge bg={statusColor(inquiry.processing_status).bg} color={statusColor(inquiry.processing_status).color}>
                      {inquiry.processing_status}
                    </Badge>
                  )}
                  {isFailed && idx === 1 && (
                    <Badge bg="#FEE2E2" color="#DC2626">{t('Failed', '失敗')}</Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function InquiryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t } = useLang();
  const { companyId } = useCompany();
  const { showToast } = useToast();
  const router = useRouter();

  const [inquiry, setInquiry] = useState<Inquiry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('message');

  const fetchInquiry = useCallback(async () => {
    if (!companyId || !id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(`/api/admin/inquiries/${id}?company_id=${companyId}`);
      if (!res.ok) throw new Error('Failed to load inquiry');
      const data = await res.json();
      setInquiry(data.inquiry);
    } catch (err) {
      console.error('[inquiry-detail] fetch error:', err);
      setError(t('Failed to load inquiry. Please try again.', '載入詢價失敗，請重試。'));
    } finally {
      setLoading(false);
    }
  }, [companyId, id, t]);

  useEffect(() => {
    fetchInquiry();
  }, [fetchInquiry]);

  if (loading) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.push('/admin/inquiries')} className="p-1.5 rounded hover:bg-black/5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <SkeletonBlock className="h-5 w-48" />
        </div>
        <div className="space-y-4">
          <SkeletonBlock className="h-10 w-64" />
          <div className="border rounded-[4px] p-5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <div className="space-y-3">
              <SkeletonBlock className="h-4 w-full" />
              <SkeletonBlock className="h-4 w-3/4" />
              <SkeletonBlock className="h-4 w-1/2" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !inquiry) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.push('/admin/inquiries')} className="p-1.5 rounded hover:bg-black/5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <p className="text-[14px]" style={{ color: 'var(--text-muted)' }}>{t('Back to Inquiries', '返回詢價')}</p>
        </div>
        <div className="border rounded-[4px] p-8 text-center" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <svg className="mx-auto mb-3" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--error, #ef4444)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p className="text-[14px] font-medium mb-2" style={{ color: 'var(--error, #ef4444)' }}>
            {error || t('Inquiry not found', '找不到詢價')}
          </p>
          <button
            onClick={fetchInquiry}
            className="text-[13px] font-medium px-4 py-2 rounded-[4px] text-white"
            style={{ background: 'var(--accent)' }}
          >
            {t('Retry', '重試')}
          </button>
        </div>
      </div>
    );
  }

  const sc = statusColor(inquiry.processing_status);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push('/admin/inquiries')} className="p-1.5 rounded hover:bg-black/5">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-[20px] md:text-[24px] font-semibold tracking-[-0.5px] truncate">
            {inquiry.subject || t('(No subject)', '（無主旨）')}
          </h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge bg={sc.bg} color={sc.color}>{inquiry.processing_status}</Badge>
            <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
              {formatDateTime(inquiry.created_at)}
            </span>
            {inquiry.sender_name && (
              <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                · {inquiry.sender_name}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b mb-4 overflow-x-auto" style={{ borderColor: 'var(--border)' }}>
        {TABS.map((tab) => {
          const count = tab.key === 'attachments' ? inquiry.attachments.length : tab.key === 'requirements' ? inquiry.extracted_fields.length : undefined;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="px-4 py-2.5 text-[13px] font-medium whitespace-nowrap border-b-2 transition-colors"
              style={{
                borderColor: activeTab === tab.key ? 'var(--accent)' : 'transparent',
                color: activeTab === tab.key ? 'var(--accent)' : 'var(--text-muted)',
              }}
            >
              {t(tab.en, tab.zh)}
              {count !== undefined && count > 0 && (
                <span className="ml-1.5 text-[11px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--bg)', color: 'var(--text-muted)' }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'message' && <TabMessage inquiry={inquiry} t={t} />}
      {activeTab === 'attachments' && <TabAttachments inquiry={inquiry} t={t} />}
      {activeTab === 'requirements' && <TabRequirements inquiry={inquiry} t={t} />}
      {activeTab === 'actions' && <TabActions inquiry={inquiry} t={t} />}
    </div>
  );
}
