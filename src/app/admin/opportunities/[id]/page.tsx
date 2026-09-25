'use client';

import { useState, useEffect, useCallback, use, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useLang } from '@/lib/lang';
import { useCompany } from '@/lib/company';
import { useToast } from '@/components/Toast';
import { authFetch } from '@/lib/auth-fetch';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Opportunity {
  id: string;
  title: string;
  stage: string;
  trading_model: string;
  product_category: string | null;
  product_name: string | null;
  estimated_order_value: number | null;
  currency: string;
  expected_margin_pct: number | null;
  country: string | null;
  destination: string | null;
  required_delivery_date: string | null;
  owner_id: string | null;
  priority: string;
  next_action: string | null;
  next_action_due: string | null;
  lost_reason: string | null;
  notes: string | null;
  quote_status: string | null;
  inquiry_id: string | null;
  customer_id: string | null;
  contact_id: string | null;
  last_activity_at: string | null;
  created_at: string;
  updated_at: string;
}

interface Inquiry {
  id: string;
  subject: string | null;
  body: string | null;
  sender_email: string | null;
  sender_name: string | null;
  received_at: string | null;
  language: string | null;
  status: string | null;
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
  created_at: string;
}

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  country: string | null;
  created_at: string;
}

interface Quote {
  id: string;
  quote_number: string;
  status: string;
  currency: string;
  total_amount: number | null;
  total_cost: number | null;
  total_margin: number | null;
  margin_pct: number | null;
  valid_until: string | null;
  version: number;
  created_at: string;
  quote_line_items?: QuoteLineItem[];
  quote_cost_components?: QuoteCostComponent[];
}

interface QuoteLineItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface QuoteCostComponent {
  id: string;
  component_type: string;
  description: string;
  amount: number;
  source: string | null;
  status: string;
}

interface CostBuildUp {
  quote_id: string;
  quote_number: string;
  total_amount: number | null;
  total_cost: number | null;
  total_margin: number | null;
  margin_pct: number | null;
  line_items: QuoteLineItem[];
  cost_components: QuoteCostComponent[];
}

interface FollowUpSequence {
  id: string;
  opportunity_id: string;
  status: string;
  channel: string | null;
  created_at: string;
  follow_up_items?: FollowUpItem[];
}

interface FollowUpItem {
  id: string;
  sequence_id: string;
  step_number: number;
  subject: string | null;
  body: string | null;
  status: string;
  scheduled_at: string | null;
  sent_at: string | null;
  completed_at: string | null;
  created_at: string;
}

interface AuditEvent {
  id: string;
  event_type: string;
  entity_type: string;
  entity_id: string;
  actor_id: string | null;
  actor_email: string | null;
  changes: Record<string, { from: unknown; to: unknown }> | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface OpportunityData {
  opportunity: Opportunity;
  inquiry: Inquiry | null;
  extracted_fields: ExtractedField[];
  customer: Customer | null;
  quotes: Quote[];
  cost_build_up: CostBuildUp | null;
  follow_ups: FollowUpSequence[];
  audit_history: AuditEvent[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STAGES = [
  { key: 'NEW', en: 'New', zh: '新建', color: '#6B7280', bg: '#F3F4F6' },
  { key: 'NEEDS_INFORMATION', en: 'Needs Info', zh: '待補資訊', color: '#D97706', bg: '#FEF3C7' },
  { key: 'QUALIFIED', en: 'Qualified', zh: '已確認', color: '#2563EB', bg: '#EFF6FF' },
  { key: 'SOURCING', en: 'Sourcing', zh: '採購中', color: '#7C3AED', bg: '#F5F3FF' },
  { key: 'QUOTE_DRAFT', en: 'Quote Draft', zh: '報價草稿', color: '#D97706', bg: '#FEF3C7' },
  { key: 'PENDING_APPROVAL', en: 'Pending Approval', zh: '待審批', color: '#D97706', bg: '#FEF3C7' },
  { key: 'SENT', en: 'Sent', zh: '已發送', color: '#2563EB', bg: '#DBEAFE' },
  { key: 'NEGOTIATING', en: 'Negotiating', zh: '談判中', color: '#7C3AED', bg: '#F5F3FF' },
  { key: 'WON', en: 'Won', zh: '已成交', color: '#059669', bg: '#ECFDF5' },
  { key: 'LOST', en: 'Lost', zh: '已流失', color: '#DC2626', bg: '#FEF2F2' },
  { key: 'EXPIRED', en: 'Expired', zh: '已過期', color: '#6B7280', bg: '#F3F4F6' },
];

const VALID_TRANSITIONS: Record<string, string[]> = {
  NEW: ['NEEDS_INFORMATION', 'QUALIFIED'],
  NEEDS_INFORMATION: ['QUALIFIED'],
  QUALIFIED: ['SOURCING'],
  SOURCING: ['QUOTE_DRAFT'],
  QUOTE_DRAFT: ['PENDING_APPROVAL'],
  PENDING_APPROVAL: ['SENT'],
  SENT: ['NEGOTIATING'],
  NEGOTIATING: ['WON', 'LOST', 'EXPIRED'],
};

const PRIORITIES = [
  { key: 'low', en: 'Low', zh: '低', color: '#6B7280' },
  { key: 'normal', en: 'Normal', zh: '一般', color: '#2563EB' },
  { key: 'medium', en: 'Medium', zh: '中', color: '#D97706' },
  { key: 'high', en: 'High', zh: '高', color: '#DC2626' },
  { key: 'urgent', en: 'Urgent', zh: '緊急', color: '#B91C1C' },
];

const QUOTE_STATUSES: Record<string, { en: string; zh: string; bg: string; color: string }> = {
  DRAFT:            { en: 'Draft',            zh: '草稿',     bg: '#F3F4F6', color: '#6B7280' },
  IN_REVIEW:        { en: 'In Review',        zh: '審核中',   bg: '#FEF3C7', color: '#D97706' },
  APPROVED:         { en: 'Approved',         zh: '已批准',   bg: '#D1FAE5', color: '#059669' },
  SENT:             { en: 'Sent',             zh: '已發送',   bg: '#DBEAFE', color: '#2563EB' },
  ACCEPTED:         { en: 'Accepted',         zh: '已接受',   bg: '#D1FAE5', color: '#059669' },
  REJECTED:         { en: 'Rejected',         zh: '已拒絕',   bg: '#FEE2E2', color: '#DC2626' },
  EXPIRED:          { en: 'Expired',          zh: '已過期',   bg: '#F3F4F6', color: '#6B7280' },
};

const FOLLOWUP_STATUSES: Record<string, { en: string; zh: string; bg: string; color: string }> = {
  scheduled:  { en: 'Scheduled',  zh: '已排程', bg: '#DBEAFE', color: '#2563EB' },
  sent:       { en: 'Sent',       zh: '已發送', bg: '#D1FAE5', color: '#059669' },
  completed:  { en: 'Completed',  zh: '已完成', bg: '#D1FAE5', color: '#059669' },
  cancelled:  { en: 'Cancelled',  zh: '已取消', bg: '#F3F4F6', color: '#6B7280' },
  pending:    { en: 'Pending',    zh: '待處理', bg: '#FEF3C7', color: '#D97706' },
};

const FIELD_STATUSES: Record<string, { en: string; zh: string; bg: string; color: string }> = {
  CONFIRMED:   { en: 'Confirmed',   zh: '已確認', bg: '#D1FAE5', color: '#059669' },
  EXTRACTED:   { en: 'Extracted',   zh: '已提取', bg: '#DBEAFE', color: '#2563EB' },
  INFERRED:    { en: 'Inferred',    zh: '推斷',   bg: '#FEF3C7', color: '#D97706' },
  MISSING:     { en: 'Missing',     zh: '缺失',   bg: '#FEE2E2', color: '#DC2626' },
  CONFLICTING: { en: 'Conflicting', zh: '衝突',   bg: '#FEE2E2', color: '#DC2626' },
};

const TABS = [
  { key: 'overview',   en: 'Overview',      zh: '總覽' },
  { key: 'inquiry',    en: 'Inquiry',       zh: '詢問' },
  { key: 'cost',       en: 'Cost & Margin',  zh: '成本與利潤' },
  { key: 'quote',      en: 'Customer Quote', zh: '客戶報價' },
  { key: 'followups',  en: 'Follow-ups',     zh: '跟進' },
  { key: 'activity',   en: 'Activity',       zh: '活動記錄' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getStage(stageKey: string) {
  return STAGES.find((s) => s.key === stageKey) || STAGES[0];
}

function getPriority(priorityKey: string) {
  return PRIORITIES.find((p) => p.key === priorityKey) || PRIORITIES[1];
}

function formatCurrency(value: number | null | undefined, currency: string): string {
  if (value == null) return '—';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency || '$'}${value.toLocaleString()}`;
  }
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function isOverdue(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

function getValidTransitions(currentStage: string): string[] {
  return VALID_TRANSITIONS[currentStage] || [];
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded ${className}`} style={{ background: 'var(--border)' }} />;
}

function EmptyState({ icon, title, subtitle }: { icon?: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="py-12 text-center">
      {icon && <div className="mb-3 flex justify-center">{icon}</div>}
      <p className="text-[14px] font-medium" style={{ color: 'var(--text)' }}>{title}</p>
      {subtitle && <p className="text-[13px] mt-1" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>}
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

function FieldRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <span className="text-[12px] md:text-[13px] font-medium w-36 flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className="text-[13px] md:text-[14px] flex-1" style={{ color: 'var(--text)' }}>{value || '—'}</span>
    </div>
  );
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

function TimelineItem({ event, isLast }: { event: AuditEvent; isLast: boolean }) {
  const eventTypeLabels: Record<string, { en: string; zh: string }> = {
    created:          { en: 'Created',           zh: '已建立' },
    updated:          { en: 'Updated',           zh: '已更新' },
    stage_changed:    { en: 'Stage Changed',     zh: '階段變更' },
    deleted:          { en: 'Deleted',           zh: '已刪除' },
    conversation_linked: { en: 'Conversation Linked', zh: '已連結對話' },
  };
  const label = eventTypeLabels[event.event_type] || { en: event.event_type, zh: event.event_type };

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: 'var(--accent)' }} />
        {!isLast && <div className="w-px flex-1 my-1" style={{ background: 'var(--border)' }} />}
      </div>
      <div className="pb-6 flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[13px] font-medium" style={{ color: 'var(--text)' }}>{label.en}</p>
            {event.actor_email && (
              <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{event.actor_email}</p>
            )}
            {event.changes && Object.keys(event.changes).length > 0 && (
              <div className="mt-2 space-y-1">
                {Object.entries(event.changes).map(([key, change]) => (
                  <p key={key} className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                    <span className="font-medium">{key}:</span>{' '}
                    <span className="line-through opacity-60">{String(change.from)}</span>
                    {' → '}
                    <span>{String(change.to)}</span>
                  </p>
                ))}
              </div>
            )}
            {event.metadata && !event.changes && (
              <p className="text-[12px] mt-1" style={{ color: 'var(--text-muted)' }}>
                {JSON.stringify(event.metadata)}
              </p>
            )}
          </div>
          <span className="text-[11px] whitespace-nowrap flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
            {formatDateTime(event.created_at)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Overview
// ---------------------------------------------------------------------------

function TabOverview({
  opp,
  customer,
  t,
  onFieldChange,
}: {
  opp: Opportunity;
  customer: Customer | null;
  t: (en: string, zh: string) => string;
  onFieldChange: (field: string, value: unknown) => void;
}) {
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState(opp.notes || '');
  const [savingNotes, setSavingNotes] = useState(false);
  const { showToast } = useToast();
  const { companyId } = useCompany();
  const router = useRouter();

  const stageInfo = getStage(opp.stage);
  const priorityInfo = getPriority(opp.priority);
  const transitions = getValidTransitions(opp.stage);

  const handleStageChange = async (newStage: string) => {
    try {
      const res = await authFetch(`/api/admin/opportunities/${opp.id}/stage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: newStage, company_id: companyId }),
      });
      if (!res.ok) throw new Error('Failed to update stage');
      onFieldChange('stage', newStage);
      showToast(t('Stage updated', '階段已更新'), 'success');
    } catch {
      showToast(t('Failed to update stage', '更新階段失敗'), 'error');
    }
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      const res = await authFetch(`/api/admin/opportunities/${opp.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: notesValue, company_id: companyId }),
      });
      if (!res.ok) throw new Error('Failed to save notes');
      onFieldChange('notes', notesValue);
      setEditingNotes(false);
      showToast(t('Notes saved', '備註已儲存'), 'success');
    } catch {
      showToast(t('Failed to save notes', '儲存備註失敗'), 'error');
    } finally {
      setSavingNotes(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Stage Pipeline */}
      <SectionCard
        title={t('Stage', '階段')}
        actions={
          <div className="flex gap-1.5 flex-wrap">
            {transitions.map((s) => {
              const info = getStage(s);
              return (
                <button
                  key={s}
                  onClick={() => handleStageChange(s)}
                  className="text-[11px] font-medium px-2.5 py-1 rounded-[4px] border hover:opacity-80 transition-opacity"
                  style={{ borderColor: info.color, color: info.color }}
                >
                  → {t(info.en, info.zh)}
                </button>
              );
            })}
          </div>
        }
      >
        <div className="flex items-center gap-2 flex-wrap">
          {STAGES.filter((s) => !['WON', 'LOST', 'EXPIRED'].includes(s.key)).map((s) => (
            <div
              key={s.key}
              className="flex items-center gap-1.5"
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold border-2 transition-all"
                style={{
                  borderColor: opp.stage === s.key ? s.color : 'var(--border)',
                  background: opp.stage === s.key ? s.bg : 'transparent',
                  color: opp.stage === s.key ? s.color : 'var(--text-muted)',
                }}
              >
                {STAGES.filter((x) => !['WON', 'LOST', 'EXPIRED'].includes(x.key)).indexOf(s) + 1}
              </div>
              <span
                className="text-[11px] font-medium hidden sm:inline"
                style={{ color: opp.stage === s.key ? s.color : 'var(--text-muted)' }}
              >
                {t(s.en, s.zh)}
              </span>
              {STAGES.filter((x) => !['WON', 'LOST', 'EXPIRED'].includes(x.key)).indexOf(s) <
                STAGES.filter((x) => !['WON', 'LOST', 'EXPIRED'].includes(x.key)).length - 1 && (
                <div className="w-4 h-px mx-0.5" style={{ background: 'var(--border)' }} />
              )}
            </div>
          ))}
        </div>
        {(opp.stage === 'WON' || opp.stage === 'LOST' || opp.stage === 'EXPIRED') && (
          <div className="mt-3">
            <Badge bg={stageInfo.bg} color={stageInfo.color}>
              {t(stageInfo.en, stageInfo.zh)}
            </Badge>
          </div>
        )}
      </SectionCard>

      {/* Title + Priority */}
      <SectionCard title={t('Opportunity Details', '商機詳情')}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
          <FieldRow label={t('Title', '標題')} value={<span className="font-medium">{opp.title}</span>} />
          <FieldRow
            label={t('Priority', '優先級')}
            value={
              <Badge bg={`${priorityInfo.color}15`} color={priorityInfo.color}>
                {t(priorityInfo.en, priorityInfo.zh)}
              </Badge>
            }
          />
          <FieldRow label={t('Owner', '負責人')} value={opp.owner_id || '—'} />
          <FieldRow label={t('Trading Model', '交易模式')} value={opp.trading_model} />
          <FieldRow label={t('Product Category', '產品類別')} value={opp.product_category} />
          <FieldRow label={t('Product Name', '產品名稱')} value={opp.product_name} />
          <FieldRow
            label={t('Est. Order Value', '預估訂單金額')}
            value={<span className="font-semibold">{formatCurrency(opp.estimated_order_value, opp.currency)}</span>}
          />
          <FieldRow label={t('Currency', '幣別')} value={opp.currency} />
          <FieldRow label={t('Expected Margin', '預期利潤率')} value={opp.expected_margin_pct != null ? `${opp.expected_margin_pct}%` : '—'} />
          <FieldRow label={t('Country', '國家')} value={opp.country} />
          <FieldRow label={t('Destination', '目的地')} value={opp.destination} />
          <FieldRow
            label={t('Delivery Date', '交貨日期')}
            value={
              <span style={{ color: isOverdue(opp.required_delivery_date) && opp.stage !== 'WON' ? 'var(--error)' : undefined }}>
                {formatDate(opp.required_delivery_date)}
                {isOverdue(opp.required_delivery_date) && opp.stage !== 'WON' && (
                  <span className="ml-1.5 text-[11px] font-medium" style={{ color: 'var(--error)' }}>
                    {t('(overdue)', '（已逾期）')}
                  </span>
                )}
              </span>
            }
          />
          <FieldRow
            label={t('Next Action', '下一步行動')}
            value={
              <span style={{ color: isOverdue(opp.next_action_due) ? 'var(--error)' : undefined }}>
                {opp.next_action || '—'}
              </span>
            }
          />
          <FieldRow
            label={t('Next Action Due', '行動截止日')}
            value={
              <span style={{ color: isOverdue(opp.next_action_due) ? 'var(--error)' : undefined }}>
                {formatDate(opp.next_action_due)}
                {isOverdue(opp.next_action_due) && (
                  <span className="ml-1.5 text-[11px] font-medium" style={{ color: 'var(--error)' }}>
                    {t('(overdue)', '（已逾期）')}
                  </span>
                )}
              </span>
            }
          />
        </div>
      </SectionCard>

      {/* Customer Info */}
      <SectionCard title={t('Customer Information', '客戶資訊')}>
        {customer ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
            <FieldRow label={t('Name', '名稱')} value={customer.name} />
            <FieldRow label={t('Email', '電子郵件')} value={customer.email} />
            <FieldRow label={t('Phone', '電話')} value={customer.phone} />
            <FieldRow label={t('Company', '公司')} value={customer.company} />
            <FieldRow label={t('Country', '國家')} value={customer.country} />
          </div>
        ) : (
          <EmptyState
            title={t('No customer linked', '尚未連結客戶')}
            subtitle={t('Link a customer to this opportunity', '將客戶連結至此商機')}
          />
        )}
      </SectionCard>

      {/* Notes */}
      <SectionCard
        title={t('Notes', '備註')}
        actions={
          !editingNotes ? (
            <button
              onClick={() => { setEditingNotes(true); setNotesValue(opp.notes || ''); }}
              className="text-[11px] font-medium px-2.5 py-1 rounded-[4px] border"
              style={{ borderColor: 'var(--border)', color: 'var(--accent)' }}
            >
              {t('Edit', '編輯')}
            </button>
          ) : (
            <div className="flex gap-1.5">
              <button
                onClick={() => setEditingNotes(false)}
                className="text-[11px] px-2.5 py-1 rounded-[4px] border"
                style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
              >
                {t('Cancel', '取消')}
              </button>
              <button
                onClick={handleSaveNotes}
                disabled={savingNotes}
                className="text-[11px] font-medium px-2.5 py-1 rounded-[4px] text-white disabled:opacity-50"
                style={{ background: 'var(--accent)' }}
              >
                {savingNotes ? '...' : t('Save', '儲存')}
              </button>
            </div>
          )
        }
      >
        {editingNotes ? (
          <textarea
            value={notesValue}
            onChange={(e) => setNotesValue(e.target.value)}
            rows={5}
            className="w-full border rounded-[4px] px-3 py-2 text-[13px] focus:outline-none resize-none"
            style={{ borderColor: 'var(--border)' }}
            placeholder={t('Add notes...', '新增備註...')}
          />
        ) : (
          <p className="text-[13px] md:text-[14px] whitespace-pre-wrap" style={{ color: opp.notes ? 'var(--text)' : 'var(--text-muted)' }}>
            {opp.notes || t('No notes', '暫無備註')}
          </p>
        )}
      </SectionCard>

      {/* Timestamps */}
      <SectionCard title={t('Timestamps', '時間戳記')}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
          <FieldRow label={t('Created', '建立時間')} value={formatDateTime(opp.created_at)} />
          <FieldRow label={t('Last Updated', '最後更新')} value={formatDateTime(opp.updated_at)} />
          <FieldRow label={t('Last Activity', '最後活動')} value={formatDateTime(opp.last_activity_at)} />
          {opp.lost_reason && (
            <FieldRow label={t('Lost Reason', '流失原因')} value={<span style={{ color: 'var(--error)' }}>{opp.lost_reason}</span>} />
          )}
        </div>
      </SectionCard>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Inquiry & Requirements
// ---------------------------------------------------------------------------

function TabInquiry({
  inquiry,
  extractedFields,
  t,
}: {
  inquiry: Inquiry | null;
  extractedFields: ExtractedField[];
  t: (en: string, zh: string) => string;
}) {
  const [confirmingField, setConfirmingField] = useState<string | null>(null);

  const handleConfirmField = async (fieldId: string) => {
    setConfirmingField(fieldId);
    try {
      // Placeholder — would need an API endpoint to confirm fields
      await new Promise((r) => setTimeout(r, 500));
    } finally {
      setConfirmingField(null);
    }
  };

  if (!inquiry) {
    return (
      <EmptyState
        title={t('No inquiry linked', '尚未連結詢問')}
        subtitle={t('This opportunity has no associated inquiry', '此商機沒有關聯的詢問')}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Original Message */}
      <SectionCard title={t('Original Inquiry', '原始詢問')}>
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
            <FieldRow label={t('Subject', '主旨')} value={inquiry.subject} />
            <FieldRow label={t('From', '寄件者')} value={inquiry.sender_name || inquiry.sender_email} />
            <FieldRow label={t('Received', '收到時間')} value={formatDateTime(inquiry.received_at || inquiry.created_at)} />
            <FieldRow label={t('Language', '語言')} value={inquiry.language} />
          </div>
          {inquiry.body && (
            <div className="mt-3">
              <p className="text-[12px] font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
                {t('Message Body', '訊息內容')}
              </p>
              <div
                className="border rounded-[4px] p-4 text-[13px] leading-relaxed max-h-80 overflow-y-auto whitespace-pre-wrap"
                style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
              >
                {inquiry.body}
              </div>
            </div>
          )}
        </div>
      </SectionCard>

      {/* Extracted Fields */}
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
        {extractedFields.length === 0 ? (
          <EmptyState
            title={t('No fields extracted', '尚未提取欄位')}
            subtitle={t('Fields will appear after AI processes the inquiry', 'AI 處理詢問後將顯示欄位')}
          />
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
                  <th className="text-right py-2 px-3 font-medium" style={{ color: 'var(--text-muted)' }}>{t('Action', '操作')}</th>
                </tr>
              </thead>
              <tbody>
                {extractedFields.map((field) => {
                  const fieldStatus = FIELD_STATUSES[field.status] || FIELD_STATUSES.EXTRACTED;
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
                        {field.source_type && (
                          <span>
                            {field.source_type}
                            {field.source_ref && ` (${field.source_ref})`}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {(field.status === 'EXTRACTED' || field.status === 'INFERRED') && (
                          <button
                            onClick={() => handleConfirmField(field.id)}
                            disabled={confirmingField === field.id}
                            className="text-[11px] font-medium px-2 py-0.5 rounded border disabled:opacity-50"
                            style={{ borderColor: '#059669', color: '#059669' }}
                          >
                            {confirmingField === field.id ? '...' : t('Confirm', '確認')}
                          </button>
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
        <MissingFieldsChecklist fields={extractedFields} t={t} />
      </SectionCard>
    </div>
  );
}

function MissingFieldsChecklist({ fields, t }: { fields: ExtractedField[]; t: (en: string, zh: string) => string }) {
  const requiredFields = [
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

  const extractedNames = new Set(fields.map((f) => f.field_name.toLowerCase()));

  return (
    <div className="space-y-1.5">
      {requiredFields.map((req) => {
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
  );
}

// ---------------------------------------------------------------------------
// Tab: Cost & Margin
// ---------------------------------------------------------------------------

function TabCostMargin({ costBuildUp, currency, t }: { costBuildUp: CostBuildUp | null; currency: string; t: (en: string, zh: string) => string }) {
  if (!costBuildUp) {
    return (
      <SectionCard title={t('Cost & Margin', '成本與利潤')}>
        <EmptyState
          title={t('No cost data available', '暫無成本資料')}
          subtitle={t('Cost breakdown will appear once a quote is created', '建立報價後將顯示成本明細')}
        />
      </SectionCard>
    );
  }

  const marginPct = costBuildUp.margin_pct;
  const hasWarnings = marginPct != null && marginPct < 10;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="border rounded-[4px] p-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <p className="text-[12px] font-medium mb-1" style={{ color: 'var(--text-muted)' }}>{t('Total Cost', '總成本')}</p>
          <p className="text-[18px] font-bold" style={{ color: 'var(--text)' }}>
            {formatCurrency(costBuildUp.total_cost, currency)}
          </p>
        </div>
        <div className="border rounded-[4px] p-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <p className="text-[12px] font-medium mb-1" style={{ color: 'var(--text-muted)' }}>{t('Margin', '利潤')}</p>
          <p className="text-[18px] font-bold" style={{ color: marginPct != null && marginPct < 10 ? 'var(--error)' : '#059669' }}>
            {formatCurrency(costBuildUp.total_margin, currency)}
          </p>
        </div>
        <div className="border rounded-[4px] p-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <p className="text-[12px] font-medium mb-1" style={{ color: 'var(--text-muted)' }}>{t('Margin %', '利潤率')}</p>
          <p className="text-[18px] font-bold" style={{ color: marginPct != null && marginPct < 10 ? 'var(--error)' : '#059669' }}>
            {marginPct != null ? `${marginPct.toFixed(1)}%` : '—'}
          </p>
        </div>
      </div>

      {/* Warnings */}
      {hasWarnings && (
        <div className="border rounded-[4px] p-3 flex items-center gap-2" style={{ borderColor: '#F59E0B', background: '#FFFBEB' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span className="text-[13px] font-medium" style={{ color: '#92400E' }}>
            {t('Margin is below 10%. Review cost components.', '利潤率低於 10%，請檢查成本組件。')}
          </span>
        </div>
      )}

      {/* Cost Components */}
      <SectionCard title={t('Cost Breakdown', '成本明細')}>
        {costBuildUp.cost_components.length === 0 ? (
          <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>{t('No cost components defined', '尚未定義成本組件')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                  <th className="text-left py-2 px-3 font-medium" style={{ color: 'var(--text-muted)' }}>{t('Type', '類型')}</th>
                  <th className="text-left py-2 px-3 font-medium" style={{ color: 'var(--text-muted)' }}>{t('Description', '描述')}</th>
                  <th className="text-right py-2 px-3 font-medium" style={{ color: 'var(--text-muted)' }}>{t('Amount', '金額')}</th>
                  <th className="text-left py-2 px-3 font-medium" style={{ color: 'var(--text-muted)' }}>{t('Source', '來源')}</th>
                  <th className="text-left py-2 px-3 font-medium" style={{ color: 'var(--text-muted)' }}>{t('Status', '狀態')}</th>
                </tr>
              </thead>
              <tbody>
                {costBuildUp.cost_components.map((comp) => (
                  <tr key={comp.id} className="border-b last:border-b-0" style={{ borderColor: 'var(--border)' }}>
                    <td className="py-2.5 px-3 font-medium" style={{ color: 'var(--text)' }}>{comp.component_type}</td>
                    <td className="py-2.5 px-3" style={{ color: 'var(--text)' }}>{comp.description}</td>
                    <td className="py-2.5 px-3 text-right font-medium" style={{ color: 'var(--text)' }}>
                      {formatCurrency(comp.amount, currency)}
                    </td>
                    <td className="py-2.5 px-3" style={{ color: 'var(--text-muted)' }}>{comp.source || '—'}</td>
                    <td className="py-2.5 px-3">
                      <Badge
                        bg={comp.status === 'confirmed' ? '#D1FAE5' : comp.status === 'estimated' ? '#FEF3C7' : '#F3F4F6'}
                        color={comp.status === 'confirmed' ? '#059669' : comp.status === 'estimated' ? '#D97706' : '#6B7280'}
                      >
                        {comp.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 font-bold" style={{ borderColor: 'var(--border)' }}>
                  <td colSpan={2} className="py-3 px-3" style={{ color: 'var(--text)' }}>{t('Total', '合計')}</td>
                  <td className="py-3 px-3 text-right" style={{ color: 'var(--text)' }}>
                    {formatCurrency(costBuildUp.total_cost, currency)}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Line Items */}
      {costBuildUp.line_items.length > 0 && (
        <SectionCard title={t('Quote Line Items', '報價明細')}>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                  <th className="text-left py-2 px-3 font-medium" style={{ color: 'var(--text-muted)' }}>{t('Description', '描述')}</th>
                  <th className="text-right py-2 px-3 font-medium" style={{ color: 'var(--text-muted)' }}>{t('Qty', '數量')}</th>
                  <th className="text-right py-2 px-3 font-medium" style={{ color: 'var(--text-muted)' }}>{t('Unit Price', '單價')}</th>
                  <th className="text-right py-2 px-3 font-medium" style={{ color: 'var(--text-muted)' }}>{t('Total', '小計')}</th>
                </tr>
              </thead>
              <tbody>
                {costBuildUp.line_items.map((item) => (
                  <tr key={item.id} className="border-b last:border-b-0" style={{ borderColor: 'var(--border)' }}>
                    <td className="py-2.5 px-3" style={{ color: 'var(--text)' }}>{item.description}</td>
                    <td className="py-2.5 px-3 text-right" style={{ color: 'var(--text)' }}>{item.quantity}</td>
                    <td className="py-2.5 px-3 text-right" style={{ color: 'var(--text)' }}>{formatCurrency(item.unit_price, currency)}</td>
                    <td className="py-2.5 px-3 text-right font-medium" style={{ color: 'var(--text)' }}>{formatCurrency(item.total, currency)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 font-bold" style={{ borderColor: 'var(--border)' }}>
                  <td className="py-3 px-3" style={{ color: 'var(--text)' }}>{t('Total', '合計')}</td>
                  <td colSpan={2} />
                  <td className="py-3 px-3 text-right" style={{ color: 'var(--text)' }}>
                    {formatCurrency(costBuildUp.total_amount, currency)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </SectionCard>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Customer Quote
// ---------------------------------------------------------------------------

function TabCustomerQuote({ quotes, t }: { quotes: Quote[]; t: (en: string, zh: string) => string }) {
  const latestQuote = quotes.length > 0 ? quotes[0] : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[13px] md:text-[14px] font-semibold" style={{ color: 'var(--text)' }}>
          {t('Customer Quotes', '客戶報價')} <span className="font-normal" style={{ color: 'var(--text-muted)' }}>({quotes.length})</span>
        </h3>
        <div className="flex gap-2">
          <button
            className="text-[11px] font-medium px-3 py-1.5 rounded-[4px] border"
            style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}
          >
            {t('Create Quote', '建立報價')}
          </button>
          {latestQuote && (
            <>
              <button
                className="text-[11px] font-medium px-3 py-1.5 rounded-[4px] border"
                style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
              >
                {t('Edit Quote', '編輯報價')}
              </button>
              <button
                className="text-[11px] font-medium px-3 py-1.5 rounded-[4px] text-white"
                style={{ background: 'var(--accent)' }}
              >
                {t('Send Quote', '發送報價')}
              </button>
            </>
          )}
        </div>
      </div>

      {quotes.length === 0 ? (
        <SectionCard title={t('No quotes yet', '暫無報價')}>
          <EmptyState
            title={t('No customer quotes', '暫無客戶報價')}
            subtitle={t('Create a quote to send to the customer', '建立報價以發送給客戶')}
          />
        </SectionCard>
      ) : (
        <>
          {/* Quote Summary Card */}
          {latestQuote && (
            <SectionCard title={t('Current Quote', '目前報價')}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
                <FieldRow label={t('Quote #', '報價編號')} value={<span className="font-mono font-medium">{latestQuote.quote_number}</span>} />
                <FieldRow
                  label={t('Status', '狀態')}
                  value={
                    <Badge
                      bg={QUOTE_STATUSES[latestQuote.status]?.bg || '#F3F4F6'}
                      color={QUOTE_STATUSES[latestQuote.status]?.color || '#6B7280'}
                    >
                      {QUOTE_STATUSES[latestQuote.status]?.en || latestQuote.status}
                    </Badge>
                  }
                />
                <FieldRow label={t('Version', '版本')} value={`v${latestQuote.version || 1}`} />
                <FieldRow label={t('Valid Until', '有效期至')} value={formatDate(latestQuote.valid_until)} />
                <FieldRow label={t('Total Amount', '總金額')} value={<span className="font-semibold">{formatCurrency(latestQuote.total_amount, latestQuote.currency)}</span>} />
                <FieldRow label={t('Margin', '利潤率')} value={latestQuote.margin_pct != null ? `${latestQuote.margin_pct.toFixed(1)}%` : '—'} />
              </div>
            </SectionCard>
          )}

          {/* Version History */}
          {quotes.length > 1 && (
            <SectionCard title={t('Version History', '版本歷史')}>
              <div className="space-y-2">
                {quotes.map((q) => (
                  <div
                    key={q.id}
                    className="flex items-center justify-between py-2 px-3 rounded-[4px] border"
                    style={{ borderColor: q.id === latestQuote?.id ? 'var(--accent)' : 'var(--border)' }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-[13px] font-mono font-medium" style={{ color: 'var(--text)' }}>{q.quote_number}</span>
                      <Badge
                        bg={QUOTE_STATUSES[q.status]?.bg || '#F3F4F6'}
                        color={QUOTE_STATUSES[q.status]?.color || '#6B7280'}
                      >
                        {QUOTE_STATUSES[q.status]?.en || q.status}
                      </Badge>
                      <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                        {t('v', 'v')}{q.version || 1}
                      </span>
                    </div>
                    <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>{formatDateTime(q.created_at)}</span>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Follow-ups
// ---------------------------------------------------------------------------

function TabFollowups({ sequences, t }: { sequences: FollowUpSequence[]; t: (en: string, zh: string) => string }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[13px] md:text-[14px] font-semibold" style={{ color: 'var(--text)' }}>
          {t('Follow-up Sequences', '跟進序列')} <span className="font-normal" style={{ color: 'var(--text-muted)' }}>({sequences.length})</span>
        </h3>
        <button
          className="text-[11px] font-medium px-3 py-1.5 rounded-[4px] text-white"
          style={{ background: 'var(--accent)' }}
        >
          {t('Create Follow-up Sequence', '建立跟進序列')}
        </button>
      </div>

      {sequences.length === 0 ? (
        <SectionCard title={t('No follow-up sequences', '暫無跟進序列')}>
          <EmptyState
            title={t('No follow-ups scheduled', '暫無排程跟進')}
            subtitle={t('Create a sequence to automate follow-up emails', '建立序列以自動化跟進郵件')}
          />
        </SectionCard>
      ) : (
        sequences.map((seq) => {
          const items = seq.follow_up_items || [];
          return (
            <SectionCard
              key={seq.id}
              title={`${t('Sequence', '序列')} — ${seq.channel || t('Email', '郵件')}`}
              actions={
                <div className="flex gap-1.5">
                  {seq.status === 'active' && (
                    <>
                      <button className="text-[11px] px-2 py-0.5 rounded border" style={{ borderColor: '#D97706', color: '#D97706' }}>
                        {t('Pause', '暫停')}
                      </button>
                      <button className="text-[11px] px-2 py-0.5 rounded border" style={{ borderColor: 'var(--error)', color: 'var(--error)' }}>
                        {t('Cancel', '取消')}
                      </button>
                    </>
                  )}
                  {seq.status === 'paused' && (
                    <button className="text-[11px] px-2 py-0.5 rounded border" style={{ borderColor: '#059669', color: '#059669' }}>
                      {t('Resume', '恢復')}
                    </button>
                  )}
                </div>
              }
            >
              {items.length === 0 ? (
                <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>{t('No steps in this sequence', '此序列無步驟')}</p>
              ) : (
                <div className="space-y-2">
                  {items
                    .sort((a, b) => a.step_number - b.step_number)
                    .map((item) => {
                      const statusInfo = FOLLOWUP_STATUSES[item.status] || FOLLOWUP_STATUSES.pending;
                      return (
                        <div
                          key={item.id}
                          className="flex items-start gap-3 py-2.5 px-3 rounded-[4px] border"
                          style={{ borderColor: 'var(--border)' }}
                        >
                          <div className="flex-shrink-0 mt-0.5">
                            <div
                              className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold"
                              style={{ background: statusInfo.bg, color: statusInfo.color }}
                            >
                              {item.step_number}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <Badge bg={statusInfo.bg} color={statusInfo.color}>
                                {t(statusInfo.en, statusInfo.zh)}
                              </Badge>
                            </div>
                            {item.subject && (
                              <p className="text-[13px] font-medium" style={{ color: 'var(--text)' }}>{item.subject}</p>
                            )}
                            {item.body && (
                              <p className="text-[12px] mt-0.5 line-clamp-2" style={{ color: 'var(--text-muted)' }}>{item.body}</p>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0">
                            {item.scheduled_at && (
                              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                                {t('Scheduled:', '排程:')} {formatDateTime(item.scheduled_at)}
                              </p>
                            )}
                            {item.sent_at && (
                              <p className="text-[11px]" style={{ color: '#059669' }}>
                                {t('Sent:', '已發送:')} {formatDateTime(item.sent_at)}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </SectionCard>
          );
        })
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Activity
// ---------------------------------------------------------------------------

function TabActivity({ events, t }: { events: AuditEvent[]; t: (en: string, zh: string) => string }) {
  return (
    <div className="space-y-4">
      <h3 className="text-[13px] md:text-[14px] font-semibold" style={{ color: 'var(--text)' }}>
        {t('Activity Log', '活動記錄')} <span className="font-normal" style={{ color: 'var(--text-muted)' }}>({events.length})</span>
      </h3>

      {events.length === 0 ? (
        <SectionCard title={t('Activity', '活動')}>
          <EmptyState
            title={t('No activity recorded', '暫無活動記錄')}
            subtitle={t('Actions on this opportunity will appear here', '此商機的操作將顯示於此')}
          />
        </SectionCard>
      ) : (
        <div className="border rounded-[4px] p-5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          {events.map((event, i) => (
            <TimelineItem key={event.id} event={event} isLast={i === events.length - 1} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

type Params = { id: string };

export default function OpportunityDetailPage({ params }: { params: Promise<Params> }) {
  const { id } = use(params);
  const { t } = useLang();
  const { companyId, loading: companyLoading } = useCompany();
  const { showToast } = useToast();
  const router = useRouter();

  const [data, setData] = useState<OpportunityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchData = useCallback(async () => {
    if (companyLoading || !companyId || !id) return;
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ company_id: companyId });
      const res = await authFetch(`/api/admin/opportunities/${id}?${params}`);
      if (!res.ok) throw new Error('Failed to load opportunity');
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('[opp-detail] fetch error:', err);
      setError(t('Failed to load opportunity details. Please try again.', '載入商機詳情失敗，請重試。'));
    } finally {
      setLoading(false);
    }
  }, [id, companyId, companyLoading, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFieldChange = useCallback((field: string, value: unknown) => {
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        opportunity: { ...prev.opportunity, [field]: value } as Opportunity,
      };
    });
  }, []);

  // Loading skeleton
  if (loading || companyLoading) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <SkeletonBlock className="h-7 w-64 mb-2" />
          <SkeletonBlock className="h-4 w-80" />
        </div>
        <div className="flex gap-2 mb-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-8 w-20" />
          ))}
        </div>
        <div className="space-y-4">
          <SkeletonBlock className="h-48 w-full" />
          <SkeletonBlock className="h-64 w-full" />
          <SkeletonBlock className="h-40 w-full" />
        </div>
      </div>
    );
  }

  // Error state
  if (error || !data) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="border rounded-[4px] p-8 text-center" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <svg className="mx-auto mb-3" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--error)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          <p className="text-[14px] font-medium mb-3" style={{ color: 'var(--error)' }}>
            {error || t('Opportunity not found', '找不到商機')}
          </p>
          <button
            onClick={() => router.push('/admin/opportunities')}
            className="text-[13px] font-medium px-4 py-2 rounded-[4px] border"
            style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
          >
            {t('Back to Opportunities', '返回商機列表')}
          </button>
        </div>
      </div>
    );
  }

  const { opportunity: opp, inquiry, extracted_fields, customer, quotes, cost_build_up, follow_ups, audit_history } = data;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <button
                onClick={() => router.push('/admin/opportunities')}
                className="text-[12px] font-medium px-2 py-0.5 rounded border hover:opacity-80"
                style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
              >
                ← {t('Back', '返回')}
              </button>
              <Badge bg={getStage(opp.stage).bg} color={getStage(opp.stage).color}>
                {t(getStage(opp.stage).en, getStage(opp.stage).zh)}
              </Badge>
              <Badge bg={`${getPriority(opp.priority).color}15`} color={getPriority(opp.priority).color}>
                {t(getPriority(opp.priority).en, getPriority(opp.priority).zh)}
              </Badge>
            </div>
            <h1 className="text-[20px] md:text-[24px] font-semibold tracking-[-0.5px] truncate" style={{ color: 'var(--text)' }}>
              {opp.title}
            </h1>
            <p className="text-[13px] md:text-[14px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {opp.customer_id && customer ? customer.name : opp.country || '—'}
              {opp.product_name && <span> · {opp.product_name}</span>}
              {opp.estimated_order_value != null && <span> · {formatCurrency(opp.estimated_order_value, opp.currency)}</span>}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 mb-6 overflow-x-auto pb-1" style={{ borderBottom: '1px solid var(--border)' }}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="text-[12px] md:text-[13px] font-medium px-3 py-2.5 whitespace-nowrap transition-colors relative"
            style={{
              color: activeTab === tab.key ? 'var(--accent)' : 'var(--text-muted)',
            }}
          >
            {t(tab.en, tab.zh)}
            {activeTab === tab.key && (
              <div
                className="absolute bottom-0 left-0 right-0 h-0.5"
                style={{ background: 'var(--accent)' }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="pb-12">
        {activeTab === 'overview' && (
          <TabOverview opp={opp} customer={customer} t={t} onFieldChange={handleFieldChange} />
        )}
        {activeTab === 'inquiry' && (
          <TabInquiry inquiry={inquiry} extractedFields={extracted_fields} t={t} />
        )}
        {activeTab === 'cost' && (
          <TabCostMargin costBuildUp={cost_build_up} currency={opp.currency} t={t} />
        )}
        {activeTab === 'quote' && (
          <TabCustomerQuote quotes={quotes} t={t} />
        )}
        {activeTab === 'followups' && (
          <TabFollowups sequences={follow_ups} t={t} />
        )}
        {activeTab === 'activity' && (
          <TabActivity events={audit_history} t={t} />
        )}
      </div>
    </div>
  );
}
