'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { ArrowLeft, Globe, Sparkles, FileText, Percent, RefreshCw, AlertTriangle, Clock, User, Flag, CheckCircle, Download, Archive, Trash2, Inbox, Trophy } from 'lucide-react';
import { useLang } from '@/lib/lang';
import { useCompany } from '@/lib/company';
import { useToast } from '@/components/Toast';
import { authFetch } from '@/lib/auth-fetch';
import { isBigDeal } from '@/lib/big-deals';

const supabaseRealtime = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Message {
  id?: string;
  role: 'user' | 'customer' | 'assistant' | 'human';
  content: string;
  created_at: string;
  kind?: string | null;
  status?: string | null;
  subject?: string | null;
  sender_email?: string | null;
  recipient_email?: string | null;
  attachments?: Array<Record<string, unknown>> | null;
}

interface BuyerHistory {
  past_threads: number;
  past_order_total: number | null;
  past_order_currency: string | null;
  payment_terms: string | null;
}

interface ThreadView {
  state: 'needs_specs' | 'waiting_on_buyer' | 'ready_to_quote' | 'cold' | 'closed';
  label: string;
  missing: string[];
  missingCount: number;
  owedReply: boolean;
  needsYou: boolean;
  waitingOnBuyer: boolean;
  needsSpecs: boolean;
  readyToQuote: boolean;
  followUpDue: boolean;
  cold: boolean;
  paused: boolean;
  chaseCount: number;
  lastInboundAt: string | null;
  lastOutboundAt: string | null;
  lastActivityAt: string | null;
  silentDays: number;
  nextActionDue: string | null;
}

interface PendingDraft {
  id: string;
  subject: string | null;
  body: string | null;
  to_address: string | null;
  draft_status: string | null;
  created_at: string | null;
}

interface ExtractedItem {
  product?: string;
  quantity?: number;
  unit?: string;
  specs?: string | null;
  target_price?: string | null;
}

interface ConversationWithRelations {
  id: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  channel: string;
  status: string;
  subject: string | null;
  folder: string;
  read_at: string | null;
  flagged: boolean;
  detected_language: string | null;
  handoff_summary: string | null;
  external_search_enabled: boolean;
  created_at?: string;
  updated_at: string;
  messages: Message[];
  inquiries: Array<Record<string, unknown>>;
  opportunities: OpportunityRec[];
  quotes: QuoteRec[];
  approvals: ApprovalRec[];
  contact?: { name: string | null; email: string | null; customer_name: string | null };
  buyer?: BuyerHistory | null;
  thread?: ThreadView | null;
  pending_draft?: PendingDraft | null;
}

interface OpportunityRec {
  id: string;
  title: string;
  stage: string;
  priority?: string | null;
  estimated_order_value: number | null;
  currency: string | null;
  trading_model: string | null;
}

interface QuoteRec {
  id: string;
  quote_number?: string | null;
  status: string;
  opportunity_id?: string | null;
  total_amount?: number | null;
  currency?: string | null;
  valid_until?: string | null;
  created_at?: string | null;
}

interface ApprovalRec {
  id: string;
  quote_id: string;
  status: string;
  comments?: string | null;
  created_at?: string | null;
}

interface PriceSource {
  type: 'product' | 'margin' | 'fx';
  label: string;
  ref: string;
  detail: string;
}

interface SuggestionLine {
  id: string;
  product: string;
  matched_product_id?: string;
  matched_product_name?: string;
  quantity?: number;
  unit: string;
  unit_price: number;
  currency: string;
  total: number;
  at_cost: boolean;
  requires_manual_pricing: boolean;
  needs_review: boolean;
  tiers_pending_review: boolean;
  target_price?: string | null;
  sources: PriceSource[];
}

interface Suggestion {
  request_summary: string | null;
  currency: string | null;
  lines: SuggestionLine[];
  subtotal: number;
  fx: { rate: number; pair: string; live?: boolean; source?: string; updated_at?: string } | null;
  margin_rules: Array<{ name: string; margin_pct: number }>;
  sources_summary: string[];
  extraction: { source: 'ai' | 'heuristic' | 'none'; items: Array<Record<string, unknown>> };
  [key: string]: unknown;
}

function formatMessageTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function fmtAmount(n: number, currency: string): string {
  return `${currency} ${(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function SkeletonBlock({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-3 rounded" style={{ background: 'var(--border)', width: `${100 - i * 18}%` }} />
      ))}
    </div>
  );
}

const statusBadge = (status: string) => {
  if (status === 'human') return { bg: '#E8F5F1', fg: '#038153', text: 'HUMAN' };
  if (status === 'ai_paused') return { bg: '#FEF3C7', fg: '#D97706', text: 'AI PAUSED' };
  if (status === 'bookmarked') return { bg: '#FBE9EA', fg: 'var(--error)', text: 'BOOKMARKED' };
  return { bg: 'var(--accent-light)', fg: 'var(--accent)', text: 'AI' };
};

const STAGE_TRANSITIONS: Record<string, string[]> = {
  NEW: ['NEEDS_INFORMATION', 'QUALIFIED'],
  NEEDS_INFORMATION: ['QUALIFIED'],
  QUALIFIED: ['SOURCING'],
  SOURCING: ['QUOTE_DRAFT'],
  QUOTE_DRAFT: ['PENDING_APPROVAL'],
  PENDING_APPROVAL: ['SENT'],
  SENT: ['NEGOTIATING'],
  NEGOTIATING: ['WON', 'LOST', 'EXPIRED'],
  WON: [],
  LOST: [],
  EXPIRED: [],
};

const STAGE_META: Record<string, { en: string; zh: string; color: string; bg: string }> = {
  NEW: { en: 'New', zh: '新', color: '#6B7280', bg: '#F3F4F6' },
  NEEDS_INFORMATION: { en: 'Needs info', zh: '待補資料', color: '#D97706', bg: '#FEF3C7' },
  QUALIFIED: { en: 'Qualified', zh: '已確認', color: '#2563EB', bg: '#EFF6FF' },
  SOURCING: { en: 'Sourcing', zh: '採購中', color: '#7C3AED', bg: '#F5F3FF' },
  QUOTE_DRAFT: { en: 'Quote draft', zh: '報價草擬', color: '#D97706', bg: '#FEF3C7' },
  PENDING_APPROVAL: { en: 'Pending approval', zh: '待審批', color: '#EA580C', bg: '#FFEDD5' },
  SENT: { en: 'Sent', zh: '已發送', color: '#0F766E', bg: '#F0FDFA' },
  NEGOTIATING: { en: 'Negotiating', zh: '談判中', color: '#7C3AED', bg: '#F5F3FF' },
  WON: { en: 'Won', zh: '已成交', color: '#059669', bg: '#ECFDF5' },
  LOST: { en: 'Lost', zh: '已流失', color: '#DC2626', bg: '#FEF2F2' },
  EXPIRED: { en: 'Expired', zh: '已過期', color: '#6B7280', bg: '#F3F4F6' },
};

const QUOTE_STATUS_META: Record<string, { en: string; zh: string; color: string; bg: string }> = {
  DRAFT: { en: 'Draft', zh: '草稿', color: '#6B7280', bg: '#F3F4F6' },
  IN_REVIEW: { en: 'In review', zh: '審核中', color: '#D97706', bg: '#FEF3C7' },
  APPROVED: { en: 'Approved', zh: '已核准', color: '#059669', bg: '#ECFDF5' },
  SENT: { en: 'Sent', zh: '已發送', color: '#2563EB', bg: '#EFF6FF' },
  OPENED: { en: 'Opened', zh: '已開啟', color: '#2563EB', bg: '#EFF6FF' },
  ACCEPTED: { en: 'Accepted', zh: '已接受', color: '#059669', bg: '#ECFDF5' },
  REJECTED: { en: 'Rejected', zh: '已拒絕', color: '#DC2626', bg: '#FEF2F2' },
};

export default function InboxDetailPage() {
  const { t } = useLang();
  const { companyId, loading: companyLoading } = useCompany();
  const { showToast } = useToast();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = String(params?.id || '');

  const [detail, setDetail] = useState<ConversationWithRelations | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [loadingSuggest, setLoadingSuggest] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [draft, setDraft] = useState('');
  const [replySubject, setReplySubject] = useState('');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [showCc, setShowCc] = useState(false);
  const [sending, setSending] = useState(false);
  const [togglingSearch, setTogglingSearch] = useState(false);
  const [detectLang, setDetectLang] = useState<string | null>(null);
  const [expandedCites, setExpandedCites] = useState<Set<string>>(new Set());
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [approvingChase, setApprovingChase] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const realtimeChannelRef = useRef<ReturnType<typeof supabaseRealtime.channel> | null>(null);

  const fetchDetail = useCallback(async () => {
    if (companyLoading || !companyId || !id) return;
    try {
      setLoadingDetail(true);
      setDetailError(null);
      const res = await authFetch(`/api/admin/inbox/${id}`);
      if (!res.ok) throw new Error('Failed to load conversation');
      const data = await res.json();
      setDetail(data);
      setReplySubject(data?.subject || '');
      if (data?.detected_language) setDetectLang(data.detected_language);
      authFetch(`/api/admin/inbox/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read: true }),
      }).catch(() => null);
    } catch (err) {
      console.error('[inbox-detail] fetch error:', err);
      setDetailError(t('Failed to load this conversation', '載入對話失敗'));
      showToast(t('Failed to load this conversation', '載入對話失敗'), 'error');
    } finally {
      setLoadingDetail(false);
    }
  }, [id, companyId, companyLoading, showToast, t]);

  const refreshDetail = useCallback(async () => {
    if (!companyId || !id) return;
    try {
      const res = await authFetch(`/api/admin/inbox/${id}`);
      if (res.ok) {
        const data = await res.json();
        setDetail(data);
        if (data.detected_language) setDetectLang(data.detected_language);
      }
    } catch (err) {
      console.error('[inbox-detail] refresh error:', err);
    }
  }, [id, companyId]);

  const fetchSuggestion = useCallback(async (silent = false, preview = false) => {
    if (companyLoading || !companyId || !id) return;
    try {
      if (!silent) setLoadingSuggest(true);
      const res = await authFetch(`/api/admin/inbox/${id}/suggest${preview ? '?preview=1' : ''}`);
      if (!res.ok) {
        if (res.status === 402) {
          const data = await res.json().catch(() => null);
          if (!silent) {
            showToast(
              data?.error || t('Monthly AI quote limit reached. Upgrade to keep generating quotes.', '本月的 AI 報價額度已用完，升級方案即可繼續。'),
              'error'
            );
          }
          return;
        }
        throw new Error('Failed to load suggestion');
      }
      const data = await res.json();
      setSuggestion(data);
      if (data.draft && (data.draft.created_opportunity || data.draft.created_quote)) {
        refreshDetail();
      }
    } catch (err) {
      console.error('[inbox-suggest] fetch error:', err);
      if (!silent) showToast(t('Failed to generate suggestion', '無法產生建議報價'), 'error');
    } finally {
      setLoadingSuggest(false);
    }
  }, [id, companyId, companyLoading, showToast, t, refreshDetail]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  // Load the parsed spec extraction up front (preview = no auto-draft side effect).
  useEffect(() => {
    if (companyLoading || !companyId || !id) return;
    const timer = setTimeout(() => {
      void fetchSuggestion(true, true);
    }, 0);
    return () => clearTimeout(timer);
  }, [companyLoading, companyId, id, fetchSuggestion]);

  // Realtime messages
  useEffect(() => {
    if (!id) return;
    if (realtimeChannelRef.current) {
      supabaseRealtime.removeChannel(realtimeChannelRef.current);
    }
    const channel = supabaseRealtime
      .channel(`inbox-${id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${id}` },
        (payload) => {
          const newMsg = payload.new as Message;
          setDetail((prev) => {
            if (!prev) return prev;
            const exists = prev.messages.some((m) => m.id === newMsg.id);
            if (exists) return prev;
            const next = { ...prev, messages: [...prev.messages, newMsg] };
            if (newMsg.role === 'user' || newMsg.role === 'customer') {
              fetchSuggestion(true);
            }
            return next;
          });
        }
      )
      .subscribe();
    realtimeChannelRef.current = channel;
    return () => {
      supabaseRealtime.removeChannel(channel);
    };
  }, [id, fetchSuggestion]);

  useEffect(() => {
    return () => {
      if (realtimeChannelRef.current) supabaseRealtime.removeChannel(realtimeChannelRef.current);
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [detail?.messages, draft]);

  const patchConversation = useCallback(async (patch: Record<string, unknown>) => {
    try {
      const res = await authFetch(`/api/admin/inbox/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error('Patch failed');
      const data = await res.json();
      setDetail((prev) => (prev ? { ...prev, ...data.conversation } : prev));
      return true;
    } catch {
      return false;
    }
  }, [id]);

  const toggleExternalSearch = async () => {
    if (!detail || togglingSearch) return;
    const next = !detail.external_search_enabled;
    const prev = detail.external_search_enabled;
    setDetail((d) => (d ? { ...d, external_search_enabled: next } : d));
    setTogglingSearch(true);
    const ok = await patchConversation({ external_search_enabled: next });
    if (!ok) {
      setDetail((d) => (d ? { ...d, external_search_enabled: prev } : d));
      showToast(t('Failed to update external search', '更新外部搜尋失敗'), 'error');
    }
    setTogglingSearch(false);
  };

  const setStatus = async (status: string) => {
    const prev = detail?.status;
    setDetail((d) => (d ? { ...d, status } : d));
    const ok = await patchConversation({ status });
    if (!ok) {
      setDetail((d) => (d ? { ...d, status: prev || 'active' } : d));
      showToast(t('Failed to update status', '更新狀態失敗'), 'error');
    }
  };

  const toggleFlag = async () => {
    if (!detail) return;
    const next = !detail.flagged;
    const prev = detail.flagged;
    setDetail((d) => (d ? { ...d, flagged: next } : d));
    const ok = await patchConversation({ flagged: next });
    if (!ok) {
      setDetail((d) => (d ? { ...d, flagged: prev } : d));
      showToast(t('Failed to update flag', '更新標記失敗'), 'error');
    }
  };

  const moveFolder = async (folder: 'archive' | 'trash' | 'inbox') => {
    if (!detail) return;
    const ok = await patchConversation({ folder });
    if (!ok) {
      showToast(t('Failed to move conversation', '移動對話失敗'), 'error');
      return;
    }
    router.push('/admin/inbox');
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !detail) return;
    const content = inputValue.trim();
    const subject = replySubject.trim() || detail.subject || undefined;
    const split = (s: string) => s.split(/[,;]/).map((x) => x.trim()).filter(Boolean);
    setSending(true);
    try {
      const res = await authFetch(`/api/admin/inbox/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          subject,
          cc: split(cc),
          bcc: split(bcc),
          kind: 'reply',
          status: 'human',
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Send failed');
      }
      const data = await res.json();
      setDetail((prev) => prev ? { ...prev, messages: [...prev.messages, data.message], status: 'human' } : prev);
      setInputValue('');
      setDraft('');
      if (data.email_delivered === false) {
        showToast(t('Stored locally — outbound email not configured (add RESEND_API_KEY)', '已儲存——尚未設定外寄郵件（需加入 RESEND_API_KEY）'), 'error');
      } else {
        showToast(t('Message sent', '訊息已寄出'), 'success');
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('Failed to send message', '發送訊息失敗'), 'error');
    } finally {
      setSending(false);
    }
  };

  const handleClarify = () => {
    if (!suggestion) {
      void fetchSuggestion();
      return;
    }
    const missing = suggestion.lines.find((l) => !l.quantity || l.requires_manual_pricing);
    const question = missing
      ? t(
          `Could you confirm the quantity and any target price for "${missing.product}"? That will let us finalize your quote.`,
          `可否確認「${missing.product}」的數量及目標價？我們便可以為你確定報價。`
        )
      : t(
          'Thanks for your inquiry! Could you confirm the destination and delivery timeline so we can finalize your quote?',
          '多謝查詢！可否確認目的地及交貨時間，以便我們確定報價？'
        );
    setDraft(question);
    setInputValue(question);
    if (detail && detail.status !== 'human') {
      showToast(t('Take over the conversation before sending', '接管對話後方可發送'));
    }
  };

  const handleQuote = async () => {
    if (!suggestion || !detail) return;
    const priced = suggestion.lines.filter((l) => l.unit_price > 0);
    const manual = suggestion.lines.filter((l) => l.requires_manual_pricing);
    if (priced.length === 0) {
      showToast(t('No line items are priced yet — use "Price" first', '尚未有可報價項目——請先按「Price」'), 'error');
      return;
    }
    if (manual.length > 0) {
      showToast(t('Some items need manual pricing — quoting the priced items only', '部分項目需人手定價——只報已定價項目'));
    }
    try {
      const existingQuote = detail.quotes && detail.quotes[0];
      if (existingQuote) {
        showToast(`${t('A draft quote already exists', '草稿報價已存在')} ${existingQuote.quote_number}`, 'success');
        router.push(`/admin/quotes/${existingQuote.id}`);
        return;
      }
      const inquiry = detail.inquiries && detail.inquiries[0] as Record<string, unknown> | undefined;
      const existingOpp = detail.opportunities && detail.opportunities[0];
      let opportunityId: string;
      if (existingOpp) {
        opportunityId = existingOpp.id;
      } else {
        const title = `${detail.contact?.name || detail.contact_name || detail.contact_email || 'Customer'} — ${suggestion.request_summary || 'Quotation request'}`.slice(0, 200);
        const oppRes = await authFetch('/api/admin/opportunities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            stage: 'NEW',
            trading_model: 'principal',
            product_category: priced[0].matched_product_name || priced[0].product,
            product_name: priced[0].matched_product_name || priced[0].product,
            estimated_order_value: suggestion.subtotal,
            currency: suggestion.currency || 'USD',
            inquiry_id: inquiry?.id || null,
            customer_id: inquiry?.customer_id || null,
            contact_id: inquiry?.contact_id || null,
            notes: suggestion.sources_summary.join('; ') || null,
          }),
        });
        if (!oppRes.ok) throw new Error('Opportunity create failed');
        const oppData = await oppRes.json();
        opportunityId = oppData.opportunity.id;
      }
      const quoteRes = await authFetch('/api/admin/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opportunity_id: opportunityId,
          currency: suggestion.currency || 'USD',
          customer_id: inquiry?.customer_id || null,
          contact_id: inquiry?.contact_id || null,
          line_items: priced.map((l) => ({
            product_id: l.matched_product_id || null,
            product_name: l.matched_product_name || l.product,
            description: l.product,
            quantity: l.quantity || 0,
            unit: l.unit,
            unit_price: l.unit_price,
          })),
          notes: suggestion.sources_summary.join('; ') || null,
        }),
      });
      if (!quoteRes.ok) throw new Error('Quote create failed');
      const quoteData = await quoteRes.json();
      showToast(`${t('Quote created', '報價已建立')} ${quoteData.quote.quote_number}`, 'success');
      router.push(`/admin/quotes/${quoteData.quote.id}`);
    } catch (err) {
      console.error('[inbox-quote] error:', err);
      showToast(t('Failed to create quote', '建立報價失敗'), 'error');
    }
  };

  const runApprovalAction = async (quoteId: string, action: 'request' | 'approve' | 'reject') => {
    try {
      const res = await authFetch(`/api/admin/quotes/${quoteId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showToast(data.error || t('Approval action failed', '審批操作失敗'), 'error');
        return;
      }
      const data = await res.json();
      refreshDetail();
      if (action === 'request') {
        showToast(
          data.auto_approved
            ? t('Auto-approved (below threshold)', '自動核准（低於門檻）')
            : t('Approval requested', '已送交審批'),
          'success'
        );
      } else if (action === 'approve') {
        showToast(t('Quote approved', '報價已核准'), 'success');
      } else {
        showToast(t('Quote rejected', '報價已拒絕'), 'success');
      }
    } catch (err) {
      console.error('[inbox-approval] error:', err);
      showToast(t('Approval action failed', '審批操作失敗'), 'error');
    }
  };

  const approveChase = async (draftId: string) => {
    if (!draftId || approvingChase) return;
    setApprovingChase(true);
    try {
      const res = await authFetch(`/api/admin/outbound/${draftId}/send`, { method: 'POST' });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Send failed');
      if (data?.pending) {
        showToast(
          t('Outbound email not configured — draft kept for later', '尚未設定外寄郵件——草稿已保留'),
          'error'
        );
      } else {
        showToast(t('Chase sent', '已發送追蹤訊息'), 'success');
      }
      await refreshDetail();
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('Failed to send chase', '發送追蹤訊息失敗'), 'error');
    } finally {
      setApprovingChase(false);
    }
  };

  const advanceStage = async (oppId: string) => {
    const opp = detail?.opportunities.find((o) => o.id === oppId);
    if (!opp) return;
    const nexts = STAGE_TRANSITIONS[opp.stage] || [];
    if (nexts.length === 0) return;
    try {
      const res = await authFetch(`/api/admin/opportunities/${oppId}/stage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: nexts[0] }),
      });
      if (!res.ok) throw new Error('Failed to advance stage');
      refreshDetail();
      showToast(
        t(`Moved to ${STAGE_META[nexts[0]]?.en || nexts[0]}`, `移至「${STAGE_META[nexts[0]]?.zh || nexts[0]}」`),
        'success'
      );
    } catch (err) {
      console.error('[inbox-stage] error:', err);
      showToast(t('Failed to advance stage', '推進階段失敗'), 'error');
    }
  };

  const jumpStage = async (oppId: string, stage: string) => {
    try {
      const res = await authFetch(`/api/admin/opportunities/${oppId}/stage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage }),
      });
      if (!res.ok) throw new Error('Failed to move stage');
      refreshDetail();
      showToast(t(`Moved to ${STAGE_META[stage]?.en || stage}`, `移至「${STAGE_META[stage]?.zh || stage}」`), 'success');
    } catch (err) {
      console.error('[inbox-stage] error:', err);
      showToast(t('Failed to move stage', '改變階段失敗'), 'error');
    }
  };

  const downloadQuotePdf = async (quoteId: string, filename: string) => {
    try {
      const res = await authFetch(`/api/admin/quotes/${quoteId}/pdf`);
      if (!res.ok) throw new Error('PDF download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[inbox-pdf] error:', err);
      showToast(t('Failed to download PDF', '下載 PDF 失敗'), 'error');
    }
  };

  const body = detail;
  const displayStatus = body?.status || 'ai';
  const badge = statusBadge(displayStatus);
  // Prefer the server-resolved identity (opportunity → contact → customer) over
  // the conversation's own fields, which are often empty for synced threads.
  const contactName =
    body?.contact?.name ||
    body?.contact_name ||
    body?.contact_email ||
    body?.contact_phone ||
    t('Customer', '客戶');
  const contactEmailLine =
    body?.contact?.email || body?.contact_email || body?.contact_phone || '';
  const contactLabel = contactName;

  const citeIcon = (type: PriceSource['type']) => {
    if (type === 'margin') return <Percent width="11" height="11" style={{ color: '#D97706' }} />;
    if (type === 'fx') return <Globe width="11" height="11" style={{ color: '#0EA5E9' }} />;
    return <FileText width="11" height="11" style={{ color: 'var(--accent)' }} />;
  };
  const citeColor = (type: PriceSource['type']) =>
    type === 'margin' ? '#D97706' : type === 'fx' ? '#0EA5E9' : 'var(--accent)';

  const toggleCites = (lineId: string) => {
    setExpandedCites((prev) => {
      const next = new Set(prev);
      if (next.has(lineId)) next.delete(lineId); else next.add(lineId);
      return next;
    });
  };

  // ── SPECS / BUYER / STATUS derivations (render-only) ────────────────
  const specItems = (((suggestion?.extraction?.items as ExtractedItem[] | undefined) || [])).filter(Boolean);
  const specText = specItems
    .map((i) => `${i.product || ''} ${i.specs || ''} ${i.target_price || ''}`)
    .join(' ');
  const uniqueVals = (vals: Array<string | null | undefined>) =>
    [...new Set(vals.map((v) => (v || '').trim()).filter(Boolean))];
  const incotermMatch = specText.match(/\b(FOB|CIF|CFR|EXW|FCA|CPT|CIP|DAP|DPU|DDP)\b[^.]{0,24}/i);
  const timelineMatch = specText.match(/(?:lead time|delivery|timeline|within \d+ days?|\d+[- ]?day lead|by (?:the )?(?:end of )?\w+)[^.]{0,32}/i);
  const specRows: Array<{ key: string; label: string; value: string | null }> = [
    {
      key: 'quantity',
      label: t('Quantity', '數量'),
      value:
        uniqueVals(
          specItems.map((i) =>
            typeof i.quantity === 'number' && i.quantity > 0
              ? `${i.quantity.toLocaleString()} ${i.unit || 'pcs'}`
              : null
          )
        ).join(', ') || null,
    },
    { key: 'product', label: t('Product', '產品'), value: uniqueVals(specItems.map((i) => i.product)).join(' · ') || null },
    { key: 'material', label: t('Material / size', '材質／尺寸'), value: uniqueVals(specItems.map((i) => i.specs)).join(' · ') || null },
    {
      key: 'logo',
      label: t('Logo / printing', '商標／印刷'),
      value:
        uniqueVals(
          specItems
            .filter((i) => /print|logo|laser|engrav|embroid|screen|custom|label|decor/i.test(`${i.product || ''} ${i.specs || ''}`))
            .map((i) => i.product)
        ).join(' · ') || null,
    },
    { key: 'incoterm', label: t('Incoterm', '貿易條件'), value: incotermMatch ? incotermMatch[0].trim() : null },
    { key: 'target', label: t('Target price', '目標價'), value: uniqueVals(specItems.map((i) => i.target_price)).join(', ') || null },
    { key: 'timeline', label: t('Timeline', '交期'), value: timelineMatch ? timelineMatch[0].trim() : null },
  ];
  const specsLoading = loadingSuggest && !suggestion;

  const buyer = body?.buyer || null;
  const buyerNew = !!buyer && buyer.past_threads === 0 && buyer.past_order_total == null && !buyer.payment_terms;
  const thread = body?.thread || null;
  const chaseDraft = body?.pending_draft || null;
  const threadStateStyle = (state?: string) => {
    switch (state) {
      case 'needs_specs':
        return { color: '#D97706', bg: '#FEF3C7' };
      case 'waiting_on_buyer':
        return { color: '#2563EB', bg: '#EFF6FF' };
      case 'ready_to_quote':
        return { color: '#038153', bg: '#E8F5F1' };
      case 'cold':
        return { color: 'var(--error)', bg: 'var(--error-bg, #FBE9EA)' };
      default:
        return { color: 'var(--text-muted)', bg: 'var(--bg)' };
    }
  };
  const fmtDate = (v?: string | null) => (v ? new Date(v).toLocaleDateString() : null);

  const renderSpecsCard = () => (
    <div className="border-b p-4" style={{ borderColor: 'var(--border)' }}>
      <div className="flex items-center gap-2 mb-3">
        <FileText width="14" height="14" style={{ color: 'var(--accent)' }} />
        <h3 className="text-[13px] font-semibold">{t('Specs', '規格')}</h3>
      </div>
      {specsLoading ? (
        <SkeletonBlock lines={5} />
      ) : (
        <div className="space-y-1.5">
          {specRows.map((r) => (
            <div key={r.key} className="flex items-start gap-2">
              <span className="w-[104px] shrink-0 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                {r.label}
              </span>
              <span
                className="flex-1 min-w-0 text-[11.5px] flex items-start gap-1"
                style={{ color: r.value ? 'var(--text)' : 'var(--error)' }}
              >
                {r.value ? (
                  <>
                    <CheckCircle width="11" height="11" className="mt-[2px] shrink-0" style={{ color: '#038153' }} />
                    <span className="min-w-0">{r.value}</span>
                  </>
                ) : (
                  <span style={{ opacity: 0.75 }}>{t('missing', '未提供')}</span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderBuyerCard = () => (
    <div className="border-b p-4" style={{ borderColor: 'var(--border)' }}>
      <div className="flex items-center gap-2 mb-3">
        <User width="14" height="14" style={{ color: 'var(--accent)' }} />
        <h3 className="text-[13px] font-semibold">{t('Buyer', '買家')}</h3>
        {buyerNew && (
          <span
            className="text-[10px] px-1.5 py-0.5 rounded font-medium ml-auto"
            style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
          >
            {t('New buyer', '新買家')}
          </span>
        )}
      </div>
      {body ? (
        <>
          <div className="flex items-start gap-2.5">
            <div
              className="h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-white text-[13px] font-semibold"
              style={{ background: '#6366F1' }}
            >
              {contactName.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium truncate">{contactName}</p>
              {contactEmailLine && (
                <p className="text-[12px] truncate" style={{ color: 'var(--text-muted)' }}>{contactEmailLine}</p>
              )}
              {body.contact?.customer_name && (
                <p className="text-[12px] truncate" style={{ color: 'var(--text-muted)' }}>{body.contact.customer_name}</p>
              )}
            </div>
          </div>
          {buyer && (
            <div className="grid grid-cols-2 gap-2 mt-3">
              <div>
                <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                  {t('Past threads', '過往對話')}
                </p>
                <p className="text-[12.5px] font-semibold">{buyer.past_threads}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                  {t('Past orders', '過往訂單')}
                </p>
                <p className="text-[12.5px] font-semibold">
                  {buyer.past_order_total != null
                    ? fmtAmount(buyer.past_order_total, buyer.past_order_currency || 'USD')
                    : buyer.past_threads > 0
                      ? t('—', '—')
                      : t('None yet', '暫無')}
                </p>
              </div>
            </div>
          )}
          <div className="flex items-start gap-1.5 mt-3">
            <Clock width="11" height="11" className="mt-[2px] shrink-0" style={{ color: 'var(--text-muted)' }} />
            <p className="text-[11px]" style={{ color: 'var(--text)' }}>
              {t('Payment', '付款')}: {buyer?.payment_terms || t('no terms on file', '尚無付款條件')}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-3">
            <span
              className="text-[10px] px-1.5 py-0.5 rounded font-medium"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
            >
              {body.channel || 'email'}
            </span>
            {detectLang && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
              >
                {detectLang === 'zh' ? '中文' : 'EN'}
              </span>
            )}
            {body.created_at && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
              >
                {new Date(body.created_at).toLocaleDateString()}
              </span>
            )}
          </div>
          <button
            onClick={toggleExternalSearch}
            disabled={togglingSearch}
            className="flex items-center gap-1.5 text-[11px] font-medium px-2 py-1.5 rounded-[4px] border mt-3 w-full"
            style={{
              borderColor: body.external_search_enabled ? '#038153' : 'var(--border)',
              background: body.external_search_enabled ? '#E8F5F1' : 'transparent',
              color: body.external_search_enabled ? '#038153' : 'var(--text-muted)',
            }}
          >
            <Globe width="12" height="12" />
            {t('External search', '外部搜尋')}:{' '}
            {body.external_search_enabled
              ? t('ON — AI can web-search for this customer', '開啟——AI 可為此客戶作網絡搜尋')
              : t('OFF', '關閉')}
          </button>
        </>
      ) : (
        <SkeletonBlock lines={4} />
      )}
    </div>
  );

  const renderStatusCard = () => {
    const ss = threadStateStyle(thread?.state);
    return (
      <div className="border-b p-4" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2 mb-3">
          <Clock width="14" height="14" style={{ color: 'var(--accent)' }} />
          <h3 className="text-[13px] font-semibold">{t('Status', '狀態')}</h3>
          {thread && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded font-medium ml-auto"
              style={{ background: ss.bg, color: ss.color }}
            >
              {thread.label}
            </span>
          )}
        </div>
        {!body ? (
          <SkeletonBlock lines={4} />
        ) : thread ? (
          <div className="space-y-2.5">
            <p className="text-[12px]">
              {thread.owedReply || thread.needsYou
                ? t('Waiting on us', '等待我們回覆')
                : thread.waitingOnBuyer
                  ? t('Waiting on buyer', '等待買家回覆')
                  : thread.readyToQuote
                    ? t('Ready to quote', '可報價')
                    : thread.label}
            </p>
            {thread.missing.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>
                  {t('Outstanding', '待補')}
                </p>
                <div className="flex flex-wrap gap-1">
                  {thread.missing.map((m, i) => (
                    <span
                      key={i}
                      className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                      style={{ background: '#FEF3C7', color: '#D97706' }}
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-center justify-between text-[11px]">
              <span style={{ color: 'var(--text-muted)' }}>{t('Quiet for', '靜默')}</span>
              <span className="font-medium">
                {thread.silentDays === 0 ? t('today', '今天') : t(`${thread.silentDays}d`, `${thread.silentDays} 天`)}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span style={{ color: 'var(--text-muted)' }}>{t('Chases sent', '已追蹤')}</span>
              <span className="font-medium">{thread.chaseCount}</span>
            </div>
            {thread.lastOutboundAt && (
              <div className="flex items-center justify-between text-[11px]">
                <span style={{ color: 'var(--text-muted)' }}>{t('Last chased', '上次追蹤')}</span>
                <span className="font-medium">{fmtDate(thread.lastOutboundAt)}</span>
              </div>
            )}
            {thread.nextActionDue && (
              <div className="flex items-center justify-between text-[11px]">
                <span style={{ color: 'var(--text-muted)' }}>{t('Next chase', '下次追蹤')}</span>
                <span className="font-medium">{fmtDate(thread.nextActionDue)}</span>
              </div>
            )}
            {chaseDraft && (
              <button
                onClick={() => approveChase(chaseDraft.id)}
                disabled={approvingChase}
                className="w-full text-[12px] font-semibold px-3 py-2 rounded-[4px] text-white disabled:opacity-50 mt-1"
                style={{ background: 'var(--accent)' }}
              >
                {approvingChase ? t('Sending…', '傳送中…') : t('Approve chase', '核准追蹤')}
              </button>
            )}
          </div>
        ) : (
          <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
            {t('No status available', '暫無狀態')}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Mail header */}
      <div
        className="flex items-center justify-between gap-3 px-3 md:px-5 py-2.5 md:py-3 flex-shrink-0 border-b"
        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => router.push('/admin/inbox')}
            className="flex items-center gap-1.5 text-[13px] font-medium px-2.5 py-1.5 rounded-lg transition-colors hover:bg-black/[0.05]"
            style={{ color: 'var(--text-muted)' }}
          >
            <ArrowLeft width="15" height="15" />
            {t('Inbox', '收件匣')}
          </button>
          <div className="h-5 w-[1px] shrink-0" style={{ background: 'var(--border)' }} />
          <div className="min-w-0">
            <h1 className="truncate text-[15px] md:text-[16px] font-semibold tracking-[-0.3px]">{contactLabel}</h1>
            <p className="truncate text-[11px] md:text-[12px]" style={{ color: 'var(--text-muted)' }}>
              {contactEmailLine}
            </p>
            {body?.subject && (
              <p className="truncate text-[12px] md:text-[13px] font-medium" style={{ color: 'var(--text)' }}>
                {body.subject}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {body && (
            <>
              <button
                onClick={toggleFlag}
                className="flex items-center gap-1.5 text-[11px] md:text-[12px] font-semibold px-2.5 md:px-3 py-1.5 rounded-lg border"
                style={{
                  borderColor: 'var(--border)',
                  color: body.flagged ? 'var(--error)' : 'var(--text-muted)',
                }}
                title={t('Star conversation', '為對話加星')}
              >
                <Flag width="13" height="13" />
                {body.flagged ? t('Starred', '已加星') : t('Star', '加星')}
              </button>
              {body.folder !== 'archive' && (
                <button
                  onClick={() => moveFolder('archive')}
                  className="flex items-center gap-1.5 text-[11px] md:text-[12px] font-semibold px-2.5 md:px-3 py-1.5 rounded-lg border"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
                >
                  <Archive width="13" height="13" />
                  {t('Archive', '封存')}
                </button>
              )}
              {body.folder === 'trash' ? (
                <button
                  onClick={() => moveFolder('inbox')}
                  className="flex items-center gap-1.5 text-[11px] md:text-[12px] font-semibold px-2.5 md:px-3 py-1.5 rounded-lg border"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
                >
                  <Inbox width="13" height="13" />
                  {t('Restore', '還原')}
                </button>
              ) : (
                <button
                  onClick={() => moveFolder('trash')}
                  className="flex items-center gap-1.5 text-[11px] md:text-[12px] font-semibold px-2.5 md:px-3 py-1.5 rounded-lg border"
                  style={{ borderColor: 'var(--border)', color: 'var(--error)' }}
                >
                  <Trash2 width="13" height="13" />
                  <span className="hidden md:inline">{t('Trash', '垃圾桶')}</span>
                </button>
              )}
            </>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {body && (
            <>
              {displayStatus === 'human' ? (
                <button
                  onClick={() => setStatus('active')}
                  className="text-[11px] md:text-[12px] font-semibold px-3 md:px-3.5 py-1.5 rounded-lg border"
                  style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                >
                  {t('Release to AI', '交還 AI')}
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setStatus(displayStatus === 'ai_paused' ? 'active' : 'ai_paused')}
                    className="text-[11px] md:text-[12px] font-semibold px-3 md:px-3.5 py-1.5 rounded-lg border"
                    style={{ borderColor: 'var(--border)', color: displayStatus === 'ai_paused' ? '#D97706' : 'var(--text-muted)' }}
                  >
                    {displayStatus === 'ai_paused' ? t('Resume AI', '恢復 AI') : t('Pause AI', '暫停 AI')}
                  </button>
                  <button
                    onClick={() => setStatus(displayStatus === 'bookmarked' ? 'active' : 'bookmarked')}
                    className="text-[11px] md:text-[12px] font-semibold px-3 md:px-3.5 py-1.5 rounded-lg border"
                    style={{ borderColor: 'var(--border)', color: displayStatus === 'bookmarked' ? 'var(--error)' : 'var(--text-muted)' }}
                  >
                    {displayStatus === 'bookmarked' ? t('Bookmarked', '已加書籤') : t('Bookmark', '加書籤')}
                  </button>
                  <button
                    onClick={() => setStatus('human')}
                    className="text-[11px] md:text-[12px] font-semibold px-3 md:px-3.5 py-1.5 rounded-lg text-white"
                    style={{ background: '#038153' }}
                  >
                    {t('Take over', '接管')}
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Thread */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="px-3 md:px-4 py-2 flex-shrink-0 border-b flex items-center gap-2 flex-wrap" style={{ borderColor: 'var(--border)' }}>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: badge.bg, color: badge.fg }}>
              {badge.text}
            </span>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded font-medium"
              style={{ background: 'var(--bg)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
            >
              {body?.channel || 'email'}
            </span>
            {detectLang && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                style={{ background: 'var(--bg)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
              >
                {detectLang === 'zh' ? '中文' : 'EN'}
              </span>
            )}
            <span className="text-[11px] ml-auto" style={{ color: 'var(--text-muted)' }}>
              {t('AI drafts replies & quotes — you review before anything is sent', 'AI 起草回覆和報價——發送前須由你審批')}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 md:p-5 space-y-3" style={{ background: 'var(--bg)' }}>
            {body?.handoff_summary && (
              <div className="rounded-[4px] px-4 py-3 border" style={{ background: '#FEF3C7', borderColor: '#FDE68A' }}>
                <p className="text-[11px] md:text-[12px] font-semibold mb-1" style={{ color: '#92400E' }}>
                  {t('AI Handoff Summary', 'AI 交接摘要')}
                </p>
                <p className="text-[12px] md:text-[13px] whitespace-pre-wrap" style={{ color: '#78350F' }}>{body.handoff_summary}</p>
              </div>
            )}
            {loadingDetail ? (
              <>
                <SkeletonBlock /><div className="h-2" /><SkeletonBlock />
              </>
            ) : detailError || !body?.messages ? (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <p className="text-[14px]" style={{ color: 'var(--text-muted)' }}>
                  {detailError || t('Failed to load this conversation', '載入對話失敗')}
                </p>
                <button
                  onClick={fetchDetail}
                  className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-[4px] border"
                  style={{ borderColor: 'var(--border)', color: 'var(--accent)' }}
                >
                  <RefreshCw width="13" height="13" />
                  {t('Retry', '重試')}
                </button>
              </div>
            ) : body.messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-[14px]" style={{ color: 'var(--text-muted)' }}>
                  {t('No messages yet — customer emails appear here', '暫無訊息——客戶來信會顯示在這裡')}
                </p>
              </div>
            ) : (
              body.messages.map((msg) => (
                <div key={msg.id || msg.created_at} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className="max-w-[85%] md:max-w-[65%] rounded-[4px] px-3 md:px-4 py-2.5 md:py-3 text-[13px] md:text-[14px] leading-[1.5]"
                    style={{
                      background: msg.role === 'user' ? 'var(--accent-light)' : msg.role === 'human' ? '#E8F5F1' : 'var(--surface)',
                      border: `1px solid ${
                        msg.role === 'human' ? '#038153' : msg.role === 'assistant' ? 'var(--border)' : 'transparent'
                      }`,
                    }}
                  >
                    {msg.subject && msg.role === 'human' && (
                      <p className="text-[10px] md:text-[11px] font-semibold mb-1 truncate" style={{ color: '#038153' }}>{msg.subject}</p>
                    )}
                    {msg.role === 'human' && <p className="text-[10px] md:text-[11px] font-medium mb-1" style={{ color: '#038153' }}>{t('You (human)', '您（人手）')}</p>}
                    {msg.role === 'assistant' && <p className="text-[10px] md:text-[11px] font-medium mb-1" style={{ color: 'var(--accent)' }}>{t('AI', 'AI')}</p>}
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    <p className="text-[10px] md:text-[11px] mt-2 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                      {formatMessageTime(msg.created_at)}
                      {msg.kind === 'sent' ? (
                        msg.status === 'failed'
                          ? <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: '#FBE9EA', color: 'var(--error)' }}>
                              {t('Not delivered', '未能送達')}
                            </span>
                          : <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: '#E8F5F1', color: '#038153' }}>
                              {t('Delivered', '已送達')}
                            </span>
                      ) : null}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Composer */}
          <div className="px-3 md:px-5 py-3 md:py-4 border-t flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
            {body ? (
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[11px] w-10 flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{t('Subject', '主旨')}</span>
                  <input
                    value={replySubject}
                    onChange={(e) => setReplySubject(e.target.value)}
                    placeholder={t('Subject', '主旨')}
                    className="flex-1 border rounded-[4px] px-2.5 py-1.5 text-[12px] focus:outline-none min-w-0"
                    style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
                    disabled={sending}
                  />
                </div>
                {showCc ? (
                  <>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[11px] w-10 flex-shrink-0" style={{ color: 'var(--text-muted)' }}>Cc</span>
                      <input
                        value={cc}
                        onChange={(e) => setCc(e.target.value)}
                        placeholder={t('name@company.com, second@company.com', '名稱@公司.com，第二位@公司.com')}
                        className="flex-1 border rounded-[4px] px-2.5 py-1.5 text-[12px] focus:outline-none min-w-0"
                        style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
                        disabled={sending}
                      />
                    </div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[11px] w-10 flex-shrink-0" style={{ color: 'var(--text-muted)' }}>Bcc</span>
                      <input
                        value={bcc}
                        onChange={(e) => setBcc(e.target.value)}
                        className="flex-1 border rounded-[4px] px-2.5 py-1.5 text-[12px] focus:outline-none min-w-0"
                        style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
                        disabled={sending}
                      />
                    </div>
                  </>
                ) : (
                  <button
                    onClick={() => setShowCc(true)}
                    className="text-[11px] mb-1.5 hover:underline"
                    style={{ color: 'var(--text-muted)', marginLeft: 48 }}
                  >
                    Cc / Bcc
                  </button>
                )}
                <div className="flex gap-2 mb-2">
                  <textarea
                    value={inputValue}
                    onChange={(e) => { setInputValue(e.target.value); setDraft(e.target.value); }}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                    placeholder={t('Type your reply…', '輸入回覆...')}
                    rows={2}
                    className="flex-1 border rounded-[4px] px-3 py-2.5 text-[16px] focus:outline-none resize-none"
                    style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
                    disabled={sending}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={sending || !inputValue.trim()}
                    className="text-[12px] md:text-[13px] font-medium px-4 md:px-5 py-2.5 md:py-0 min-h-[44px] md:min-h-0 rounded-[4px] text-white self-end disabled:opacity-50"
                    style={{ background: '#038153' }}
                  >
                    {sending ? t('Sending...', '發送中...') : t('Send', '傳送')}
                  </button>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] md:text-[12px]" style={{ color: 'var(--text-muted)' }}>
                    {displayStatus === 'human'
                      ? t("You're replying as a human.", '您正在以人手身份回覆。')
                      : t('Replying takes over from the AI.', '回覆會把對話從 AI 手中接管。')}
                  </p>
                  <button
                    onClick={() => setStatus(displayStatus === 'human' ? 'active' : 'human')}
                    className="text-[11px] md:text-[12px] font-medium px-3 py-1.5 rounded-[4px] border shrink-0"
                    style={{ borderColor: 'var(--border)', color: displayStatus === 'human' ? 'var(--text)' : '#038153' }}
                  >
                    {displayStatus === 'human' ? t('Release to AI', '交還 AI') : t('Take over', '接管')}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-[12px] md:text-[13px]" style={{ color: 'var(--text-muted)' }}>
                {t('Load this conversation to reply', '載入此對話即可回覆')}
              </p>
            )}
          </div>
        </div>

        {/* Right rail */}
        <div className="hidden lg:flex w-[360px] xl:w-[400px] flex-shrink-0 flex-col border-l overflow-y-auto" style={{ borderColor: 'var(--border)' }}>
          {/* ── Pod: Buyer ─────────────────────────────────────── */}
          {renderBuyerCard()}

          {/* ── Pod: Specs ─────────────────────────────────────── */}
          {renderSpecsCard()}

          {/* ── Pod: Status ────────────────────────────────────── */}
          {renderStatusCard()}

          {/* ── Pod: Big deal ──────────────────────────────────────── */}
          {detail && (detail.opportunities || []).filter(isBigDeal).length > 0 && (
            <div className="border-b p-4" style={{ borderColor: '#F59E0B40', background: 'linear-gradient(90deg, #FFFBEB 0%, #FEF3C7 100%)' }}>
              <div className="flex items-center gap-2 mb-2">
                <Trophy width="14" height="14" style={{ color: '#B45309' }} />
                <h3 className="text-[13px] font-semibold" style={{ color: '#78350F' }}>{t('Big deal', '大宗交易')}</h3>
              </div>
              {detail.opportunities.filter(isBigDeal).map((deal) => (
                <Link
                  key={deal.id}
                  href={`/admin/opportunities/${deal.id}`}
                  className="block rounded-[6px] border px-3 py-2.5 mb-2 last:mb-0 transition-colors hover:bg-black/[0.03]"
                  style={{ borderColor: '#F59E0B40', background: 'rgba(255,255,255,0.75)' }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[12.5px] font-semibold truncate" style={{ color: 'var(--text)' }}>{deal.title || t('Untitled deal', '未命名交易')}</p>
                    {deal.estimated_order_value != null && (
                      <span className="text-[13px] font-bold tabular-nums whitespace-nowrap flex-shrink-0" style={{ color: '#B45309' }}>
                        {fmtAmount(deal.estimated_order_value, deal.currency || 'USD')}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    {deal.priority && (deal.priority === 'high' || deal.priority === 'urgent') && (
                      <span className="text-[9.5px] px-1.5 py-0.5 rounded-full font-semibold" style={{ background: '#FEE2E2', color: '#DC2626' }}>
                        {deal.priority === 'urgent' ? t('Urgent', '緊急') : t('High priority', '高優先')}
                      </span>
                    )}
                    <span className="text-[9.5px] px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wide" style={{ background: '#FEF3C7', color: '#B45309' }}>
                      {t('In play', '在談中')}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* ── Pod: Quote (FX + target + citations) ───────────── */}
          <div className="border-b p-4" style={{ borderColor: 'var(--border)' }}>
            <button
              type="button"
              onClick={() => setQuoteOpen((o) => !o)}
              className="flex items-center gap-2 w-full text-left mb-2"
            >
              <Sparkles width="14" height="14" style={{ color: 'var(--accent)' }} />
              <h3 className="text-[13px] font-semibold">{t('Quote', '報價')}</h3>
              {suggestion && (
                <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
                  {suggestion.extraction?.source === 'heuristic' ? t('Heuristic', '規則提取') : 'AI'}
                </span>
              )}
              <span className="ml-auto text-[12px] leading-none" style={{ color: 'var(--text-muted)' }}>
                {quoteOpen ? '▾' : '▸'}
              </span>
            </button>
            {quoteOpen && (
              <>
            {loadingSuggest ? (
              <SkeletonBlock lines={3} />
            ) : suggestion && suggestion.request_summary ? (
              <p className="text-[12px] leading-relaxed mb-3" style={{ color: 'var(--text)' }}>
                {suggestion.request_summary}
              </p>
            ) : (
              <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                {t('Press "Price" to draft a quote from this thread', '按「定價」從此對話產生報價草稿')}
              </p>
            )}

            {suggestion?.fx && (
              <div className="flex items-center gap-1.5 text-[11px] mb-1.5" style={{ color: '#0EA5E9' }}>
                <Globe width="11" height="11" />
                {t('FX', '匯率')}: 1 → {suggestion.fx.rate.toFixed(4)} · {suggestion.fx.pair}
                {suggestion.fx.live && (
                  <span className="text-[9px] px-1 py-0.5 rounded-full font-semibold uppercase tracking-wide" style={{ background: '#E8F5F1', color: '#038153' }}>
                    {t('Live', '即時')}
                  </span>
                )}
              </div>
            )}
            {suggestion && suggestion.margin_rules.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {suggestion.margin_rules.map((r) => (
                  <span key={r.name} className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: '#FEF3C7', color: '#D97706' }}>
                    {r.name} +{r.margin_pct}%
                  </span>
                ))}
              </div>
            )}

            {suggestion && suggestion.lines.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {suggestion.lines.map((l, i) => (
                  <span key={l.id} className="text-[10px] px-2 py-1 rounded font-medium" style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}>
                    #{i + 1}{l.quantity ? ` ${l.quantity.toLocaleString()} ${l.unit || 'pcs'}` : ''} · {l.product.slice(0, 42)}
                  </span>
                ))}
              </div>
            )}

            <div className="flex gap-2 mb-3">
              <button
                onClick={handleClarify}
                className="flex-1 text-[12px] font-medium px-3 py-2 rounded-[4px] border"
                style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
              >
                {t('Clarify', '澄清')}
              </button>
              <button
                onClick={() => fetchSuggestion()}
                className="flex-1 text-[12px] font-medium px-3 py-2 rounded-[4px] border flex items-center justify-center gap-1"
                style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                disabled={loadingSuggest}
              >
                <RefreshCw width="12" height="12" className={loadingSuggest ? 'animate-spin' : ''} />
                {t('Price', '定價')}
              </button>
              <button
                onClick={handleQuote}
                disabled={!suggestion || suggestion.lines.filter((l) => l.unit_price > 0).length === 0}
                className="flex-1 text-[12px] font-medium px-3 py-2 rounded-[4px] text-white disabled:opacity-40"
                style={{ background: 'var(--accent)' }}
              >
                {t('Create draft', '建立草稿')}
              </button>
            </div>

            {loadingSuggest ? (
              <SkeletonBlock lines={5} />
            ) : !suggestion || suggestion.lines.length === 0 ? (
              <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                {t('No price suggested yet — press "Price"', '尚未建議價格——請按「定價」')}
              </p>
            ) : (
              <>
                <div className="space-y-2.5">
                  {suggestion.lines.map((l) => {
                    const expanded = expandedCites.has(l.id);
                    return (
                      <div key={l.id} className="rounded-[4px] border p-2.5" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[12px] font-medium leading-snug">
                              {l.quantity ? `${l.quantity.toLocaleString()} ${l.unit || 'pcs'}` : '—'} · {l.product}
                            </p>
                            <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                              {l.matched_product_name || (l.requires_manual_pricing ? t('No matching product', '未匹配到產品') : '')}
                            </p>
                            {l.target_price && (
                              <p className="text-[10px] mt-0.5 font-medium" style={{ color: '#0EA5E9' }}>
                                {t('Customer target', '客戶目標價')}: {l.target_price}
                              </p>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0">
                            {l.requires_manual_pricing || l.unit_price <= 0 ? (
                              <p className="text-[14px] font-semibold" style={{ color: 'var(--text-muted)' }}>—</p>
                            ) : (
                              <>
                                <p className="text-[14px] font-semibold">{fmtAmount(l.unit_price, suggestion.currency || 'USD')}</p>
                                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                                  / {l.unit || 'pc'} · {fmtAmount(l.total, suggestion.currency || 'USD')}
                                </p>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {l.sources.slice(0, expanded ? l.sources.length : 2).map((s, si) => (
                            <span key={si} className="text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1" style={{ background: 'var(--surface)', border: `1px solid ${citeColor(s.type)}`, color: citeColor(s.type) }}>
                              {citeIcon(s.type)}
                              {s.label} · {s.ref} · {s.detail}
                            </span>
                          ))}
                        </div>
                        {l.sources.length > 2 && (
                          <button onClick={() => toggleCites(l.id)} className="text-[10px] mt-1.5 font-medium" style={{ color: 'var(--text-muted)' }}>
                            {expanded ? t('Show less', '收合') : t(`Show ${l.sources.length - 2} more sources`, `顯示其餘 ${l.sources.length - 2} 個來源`)}
                          </button>
                        )}
                        {l.target_price && l.unit_price > 0 && (
                          <p className="text-[10px] mt-1.5 font-medium" style={{ color: '#0EA5E9' }}>
                            {l.unit_price > parseFloat(String(l.target_price).replace(/[^0-9.]/g, '') || '0') && parseFloat(String(l.target_price).replace(/[^0-9.]/g, '') || '0') > 0
                              ? t('Above customer target — consider adjusting', '高於客戶目標價——建議調整')
                              : t('Within customer target range', '在客戶目標價範圍內')}
                          </p>
                        )}
                        {l.requires_manual_pricing && (
                          <p className="text-[10px] mt-1.5 font-medium flex items-center gap-1" style={{ color: 'var(--error)' }}>
                            <AlertTriangle width="10" height="10" />
                            {t('Needs your review — not auto-priced', '需人手審閱——不會自動定價')}
                          </p>
                        )}
                        {l.tiers_pending_review && !l.requires_manual_pricing && (
                          <p className="text-[10px] mt-1.5 font-medium flex items-center gap-1" style={{ color: '#D97706' }}>
                            <Clock width="10" height="10" />
                            {t('Tier pricing pending your review', '階梯價待你審閱')}
                          </p>
                        )}
                        {l.at_cost && !l.requires_manual_pricing && !l.tiers_pending_review && (
                          <p className="text-[10px] mt-1.5 font-medium" style={{ color: '#D97706' }}>
                            {t('Billed at cost', '按成本價計')}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                  <span className="text-[12px] font-semibold">{t('Subtotal', '小計')}</span>
                  <span className="text-[15px] font-semibold">
                    {suggestion.subtotal > 0 ? fmtAmount(suggestion.subtotal, suggestion.currency || 'USD') : '—'}
                  </span>
                </div>
                {suggestion.sources_summary && suggestion.sources_summary.length > 0 && (
                  <p className="text-[11px] mt-3 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                    {suggestion.sources_summary.join(' ')}
                  </p>
                )}
              </>
            )}
              </>
            )}
          </div>

          {/* ── Pod: Stage (only once an opportunity exists) ────── */}
          {detail?.opportunities && detail.opportunities.length > 0 && (
          <div className="border-b p-4" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Flag width="14" height="14" style={{ color: 'var(--accent)' }} />
              <h3 className="text-[13px] font-semibold">{t('Stage', '階段')}</h3>
            </div>
            {detail.opportunities.map((opp) => {
                const meta = STAGE_META[opp.stage] || STAGE_META.NEW;
                const nexts = STAGE_TRANSITIONS[opp.stage] || [];
                return (
                  <div key={opp.id} className="rounded-[4px] border p-2.5 mb-2" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold" style={{ color: meta.color, background: meta.bg }}>
                        {t(meta.en, meta.zh)}
                      </span>
                      {opp.estimated_order_value != null && (
                        <span className="text-[12px] font-semibold">{fmtAmount(opp.estimated_order_value, opp.currency || suggestion?.currency || 'USD')}</span>
                      )}
                    </div>
                    <p className="text-[12px] font-medium mt-1.5 truncate">{opp.title}</p>
                    {opp.trading_model && (
                      <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{opp.trading_model}</p>
                    )}
                    {nexts.length > 0 && (
                      <div className="flex gap-1.5 mt-2">
                        <button
                          onClick={() => advanceStage(opp.id)}
                          className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 rounded-[4px] border"
                          style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                        >
                          {t('Advance', '推進')} →
                          {t(STAGE_META[nexts[0]].en, STAGE_META[nexts[0]].zh)}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
          )}

          {/* ── Pod: Approvals (only once a quote exists) ───────── */}
          {detail?.quotes && detail.quotes.length > 0 && (
          <div className="border-b p-4" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle width="14" height="14" style={{ color: 'var(--accent)' }} />
              <h3 className="text-[13px] font-semibold">{t('Approvals', '審批')}</h3>
            </div>
            {detail.quotes.map((q) => {
                const qm = QUOTE_STATUS_META[q.status] || QUOTE_STATUS_META.DRAFT;
                const approval = detail.approvals.find((a) => a.quote_id === q.id);
                return (
                  <div key={q.id} className="rounded-[4px] border p-2.5 mb-2" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[12px] font-medium truncate">{q.quote_number || q.id.slice(0, 8)}</p>
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold flex-shrink-0" style={{ color: qm.color, background: qm.bg }}>
                        {t(qm.en, qm.zh)}
                      </span>
                    </div>
                    {q.total_amount != null && (
                      <p className="text-[12px] mt-1 font-semibold">{fmtAmount(q.total_amount, q.currency || 'USD')}</p>
                    )}
                    {approval && (
                      <p className="text-[10px] mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                        {approval.status}{approval.comments ? ` · ${approval.comments}` : ''}
                      </p>
                    )}
                    {q.status === 'DRAFT' && (
                      <button
                        onClick={() => runApprovalAction(q.id, 'request')}
                        className="text-[11px] font-medium px-2.5 py-1.5 rounded-[4px] border mt-2"
                        style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                      >
                        {t('Request approval', '送交審批')}
                      </button>
                    )}
                    {q.status === 'IN_REVIEW' && (
                      <div className="flex gap-1.5 mt-2">
                        <button
                          onClick={() => runApprovalAction(q.id, 'approve')}
                          className="text-[11px] font-medium px-2.5 py-1.5 rounded-[4px] text-white"
                          style={{ background: '#059669' }}
                        >
                          {t('Approve', '核准')}
                        </button>
                        <button
                          onClick={() => runApprovalAction(q.id, 'reject')}
                          className="text-[11px] font-medium px-2.5 py-1.5 rounded-[4px] border"
                          style={{ borderColor: 'var(--border)', color: 'var(--error)' }}
                        >
                          {t('Reject', '拒絕')}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
          )}

          {/* ── Pod: PDFs (only once a quote exists) ────────────── */}
          {detail?.quotes && detail.quotes.length > 0 && (
          <div className="border-b p-4" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Download width="14" height="14" style={{ color: 'var(--accent)' }} />
              <h3 className="text-[13px] font-semibold">{t('Quote PDFs', '報價 PDF')}</h3>
            </div>
            <div className="space-y-2">
              {detail.quotes.map((q) => (
                <div key={q.id} className="flex items-center justify-between gap-2 rounded-[4px] border p-2.5" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
                  <div className="min-w-0">
                    <p className="text-[12px] font-medium truncate">{q.quote_number || q.id.slice(0, 8)}</p>
                    {q.valid_until && (
                      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        {t('Valid until', '有效期至')} {new Date(q.valid_until).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => downloadQuotePdf(q.id, `${q.quote_number || q.id}.pdf`)}
                    className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 rounded-[4px] border shrink-0"
                    style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                  >
                    <Download width="11" height="11" />
                    {t('Download', '下載')}
                  </button>
                </div>
              ))}
            </div>
          </div>
          )}
        </div>
      </div>

      {/* Mobile copy of the rail */}
      <div className="lg:hidden mt-4 border rounded-[4px] p-4 space-y-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        {body && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <User width="14" height="14" style={{ color: 'var(--accent)' }} />
              <h3 className="text-[13px] font-semibold">{t('Customer', '客戶')}</h3>
            </div>
            <p className="text-[13px] font-medium">{contactName}</p>
            {contactEmailLine && <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>{contactEmailLine}</p>}
            {body.contact?.customer_name && (
              <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>{body.contact.customer_name}</p>
            )}
          </div>
        )}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles width="14" height="14" style={{ color: 'var(--accent)' }} />
            <h3 className="text-[13px] font-semibold">{t('Suggested quote', '建議報價')}</h3>
          </div>
          {/* Same actions as the desktop rail — without them this panel is a
              dead end on mobile ("press Price" with no Price button). */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={handleClarify}
              className="flex-1 text-[12px] font-medium px-3 py-2.5 rounded-[4px] border"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
            >
              {t('Clarify', '澄清')}
            </button>
            <button
              onClick={() => fetchSuggestion()}
              className="flex-1 text-[12px] font-medium px-3 py-2.5 rounded-[4px] border flex items-center justify-center gap-1"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
              disabled={loadingSuggest}
            >
              <RefreshCw width="12" height="12" className={loadingSuggest ? 'animate-spin' : ''} />
              {t('Price', '定價')}
            </button>
            <button
              onClick={handleQuote}
              disabled={!suggestion || suggestion.lines.filter((l) => l.unit_price > 0).length === 0}
              className="flex-1 text-[12px] font-medium px-3 py-2.5 rounded-[4px] text-white disabled:opacity-40"
              style={{ background: 'var(--accent)' }}
            >
              {t('Create draft', '建立草稿')}
            </button>
          </div>
          {loadingSuggest ? (
            <SkeletonBlock lines={4} />
          ) : suggestion && suggestion.lines.length > 0 ? (
            <div className="flex items-center justify-between">
              <span className="text-[13px]">{t('Subtotal', '小計')}</span>
              <span className="text-[15px] font-semibold">{fmtAmount(suggestion.subtotal, suggestion.currency || 'USD')}</span>
            </div>
          ) : (
            <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
              {t('No suggestion yet — press "Price"', '尚未建議——請按「定價」')}
            </p>
          )}
        </div>
        {detail?.opportunities && detail.opportunities.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Flag width="14" height="14" style={{ color: 'var(--accent)' }} />
              <h3 className="text-[13px] font-semibold">{t('Stage', '階段')}</h3>
            </div>
            {detail.opportunities.map((opp) => {
              const meta = STAGE_META[opp.stage] || STAGE_META.NEW;
              return (
                <div key={opp.id} className="flex items-center justify-between gap-2">
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold" style={{ color: meta.color, background: meta.bg }}>
                    {t(meta.en, meta.zh)}
                  </span>
                  {opp.estimated_order_value != null && (
                    <span className="text-[13px] font-semibold">{fmtAmount(opp.estimated_order_value, opp.currency || 'USD')}</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {detail?.quotes && detail.quotes.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Download width="14" height="14" style={{ color: 'var(--accent)' }} />
              <h3 className="text-[13px] font-semibold">{t('Quote PDFs', '報價 PDF')}</h3>
            </div>
            <div className="space-y-1.5">
              {detail.quotes.map((q) => (
                <button
                  key={q.id}
                  onClick={() => downloadQuotePdf(q.id, `${q.quote_number || q.id}.pdf`)}
                  className="flex items-center gap-1.5 text-[12px] font-medium"
                  style={{ color: 'var(--accent)' }}
                >
                  <Download width="11" height="11" />
                  {q.quote_number || q.id.slice(0, 8)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}