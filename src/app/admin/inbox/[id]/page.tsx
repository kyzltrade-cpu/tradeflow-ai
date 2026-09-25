'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { ArrowLeft, Globe, Sparkles, FileText, Building2, Percent, RefreshCw, AlertTriangle } from 'lucide-react';
import { useLang } from '@/lib/lang';
import { useCompany } from '@/lib/company';
import { useToast } from '@/components/Toast';
import { authFetch } from '@/lib/auth-fetch';

const supabaseRealtime = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Message {
  id?: string;
  role: 'user' | 'customer' | 'assistant' | 'human';
  content: string;
  created_at: string;
}

interface ConversationWithRelations {
  id: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  channel: string;
  status: string;
  detected_language: string | null;
  handoff_summary: string | null;
  external_search_enabled: boolean;
  updated_at: string;
  messages: Message[];
  inquiries: Array<Record<string, unknown>>;
  opportunities: Array<Record<string, unknown>>;
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
  sources: PriceSource[];
}

interface SupplierRec {
  id: string;
  name: string;
  location: string | null;
  is_approved: boolean;
  capabilities: string[];
  match_reason: string;
  performance_score: number | null;
  typical_lead_time_days: number | null;
  payment_terms: string | null;
}

interface Suggestion {
  request_summary: string | null;
  currency: string | null;
  lines: SuggestionLine[];
  subtotal: number;
  fx: { rate: number; pair: string } | null;
  margin_rules: Array<{ name: string; margin_pct: number }>;
  sources_summary: string[];
  suppliers: SupplierRec[];
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

export default function InboxDetailPage() {
  const { t } = useLang();
  const { companyId, loading: companyLoading } = useCompany();
  const { showToast } = useToast();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = String(params?.id || '');

  const [detail, setDetail] = useState<ConversationWithRelations | null>(null);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [loadingSuggest, setLoadingSuggest] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [togglingSearch, setTogglingSearch] = useState(false);
  const [detectLang, setDetectLang] = useState<string | null>(null);
  const [expandedCites, setExpandedCites] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const realtimeChannelRef = useRef<ReturnType<typeof supabaseRealtime.channel> | null>(null);

  const fetchDetail = useCallback(async () => {
    if (companyLoading || !companyId || !id) return;
    try {
      setLoadingDetail(true);
      const res = await authFetch(`/api/admin/inbox/${id}`);
      if (!res.ok) throw new Error('Failed to load conversation');
      const data = await res.json();
      setDetail(data);
      if (data.detected_language) setDetectLang(data.detected_language);
    } catch (err) {
      console.error('[inbox-detail] fetch error:', err);
      showToast(t('Failed to load this conversation', '載入對話失敗'), 'error');
    } finally {
      setLoadingDetail(false);
    }
  }, [id, companyId, companyLoading, showToast, t]);

  const fetchSuggestion = useCallback(async (silent = false) => {
    if (companyLoading || !companyId || !id) return;
    try {
      if (!silent) setLoadingSuggest(true);
      const res = await authFetch(`/api/admin/inbox/${id}/suggest`);
      if (!res.ok) throw new Error('Failed to load suggestion');
      const data = await res.json();
      setSuggestion(data);
    } catch (err) {
      console.error('[inbox-suggest] fetch error:', err);
      if (!silent) showToast(t('Failed to generate suggestion', '無法產生建議報價'), 'error');
    } finally {
      setLoadingSuggest(false);
    }
  }, [id, companyId, companyLoading, showToast, t]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  // Auto-suggest the quote when the workspace opens
  useEffect(() => {
    if (!companyLoading && companyId && id) fetchSuggestion();
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

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !detail || detail.status !== 'human') return;
    const content = inputValue.trim();
    setSending(true);
    try {
      const res = await authFetch(`/api/admin/conversations/${id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'human', content }),
      });
      if (!res.ok) throw new Error('Send failed');
      const data = await res.json();
      setDetail((prev) => prev ? { ...prev, messages: [...prev.messages, data.message] } : prev);
      setInputValue('');
      setDraft('');
    } catch {
      showToast(t('Failed to send message', '發送訊息失敗'), 'error');
    } finally {
      setSending(false);
    }
  };

  const handleClarify = () => {
    if (!suggestion) return;
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
      const inquiry = detail.inquiries && detail.inquiries[0] as Record<string, unknown> | undefined;
      const title = `${detail.contact_name || detail.contact_email || 'Customer'} — ${suggestion.request_summary || 'Quotation request'}`.slice(0, 200);
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
      const quoteRes = await authFetch('/api/admin/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opportunity_id: oppData.opportunity.id,
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
      router.push('/admin/quotes');
    } catch (err) {
      console.error('[inbox-quote] error:', err);
      showToast(t('Failed to create quote', '建立報價失敗'), 'error');
    }
  };

  const body = detail;
  const displayStatus = body?.status || 'ai';
  const badge = statusBadge(displayStatus);
  const contactLabel = body?.contact_name || body?.contact_email || body?.contact_phone || t('Customer', '客戶');

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

  return (
    <div className="flex flex-col h-[calc(100vh-112px)]">
      <div className="flex items-center justify-between gap-3 mb-4 flex-shrink-0 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/admin')}
            className="flex items-center gap-1.5 text-[13px] font-medium px-2 py-1.5 rounded-[4px] border"
            style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
          >
            <ArrowLeft width="14" height="14" />
            {t('Inbox', '收件匣')}
          </button>
          <div>
            <h1 className="text-[18px] md:text-[22px] font-semibold tracking-[-0.5px]">{contactLabel}</h1>
            <p className="text-[12px] md:text-[13px]" style={{ color: 'var(--text-muted)' }}>
              {body?.contact_email || body?.contact_phone || ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {body && (
            <>
              <button
                onClick={toggleExternalSearch}
                disabled={togglingSearch}
                className="flex items-center gap-1.5 text-[11px] md:text-[12px] font-medium px-2 md:px-3 py-1.5 rounded-[4px] border"
                style={{
                  borderColor: body.external_search_enabled ? '#038153' : 'var(--border)',
                  background: body.external_search_enabled ? '#E8F5F1' : 'transparent',
                  color: body.external_search_enabled ? '#038153' : 'var(--text-muted)',
                }}
                title={t('Allow AI auto-replies to use web search for this customer', '容許 AI 自動回覆為此客戶使用網絡搜尋')}
              >
                <Globe width="12" height="12" />
                <span className="hidden sm:inline">
                  {t('External search', '外部搜尋')}: {body.external_search_enabled ? 'ON' : 'OFF'}
                </span>
              </button>
              {displayStatus === 'human' ? (
                <button
                  onClick={() => setStatus('active')}
                  className="text-[11px] md:text-[12px] font-medium px-2 md:px-3 py-1.5 rounded-[4px] border"
                  style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                >
                  {t('Release to AI', '交還 AI')}
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setStatus(displayStatus === 'ai_paused' ? 'active' : 'ai_paused')}
                    className="text-[11px] md:text-[12px] font-medium px-2 md:px-3 py-1.5 rounded-[4px] border"
                    style={{ borderColor: 'var(--border)', color: displayStatus === 'ai_paused' ? '#D97706' : 'var(--text-muted)' }}
                  >
                    {displayStatus === 'ai_paused' ? t('Resume AI', '恢復 AI') : t('Pause AI', '暫停 AI')}
                  </button>
                  <button
                    onClick={() => setStatus(displayStatus === 'bookmarked' ? 'active' : 'bookmarked')}
                    className="text-[11px] md:text-[12px] font-medium px-2 md:px-3 py-1.5 rounded-[4px] border"
                    style={{ borderColor: 'var(--border)', color: displayStatus === 'bookmarked' ? 'var(--error)' : 'var(--text-muted)' }}
                  >
                    {displayStatus === 'bookmarked' ? t('Bookmarked', '已加書籤') : t('Bookmark', '加書籤')}
                  </button>
                  <button
                    onClick={() => setStatus('human')}
                    className="text-[11px] md:text-[12px] font-medium px-2 md:px-3 py-1.5 rounded-[4px] text-white"
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

      <div className="flex flex-1 border rounded-[4px] overflow-hidden min-h-0" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
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
              {t('AI assistant — customer sees this as a human rep', 'AI 助手 — 客戶看到的是人手代表')}
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
            ) : !body || body.messages.length === 0 ? (
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
                    {msg.role === 'human' && <p className="text-[10px] md:text-[11px] font-medium mb-1" style={{ color: '#038153' }}>{t('You (human)', '您（人手）')}</p>}
                    {msg.role === 'assistant' && <p className="text-[10px] md:text-[11px] font-medium mb-1" style={{ color: 'var(--accent)' }}>{t('AI', 'AI')}</p>}
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    <p className="text-[10px] md:text-[11px] mt-2" style={{ color: 'var(--text-muted)' }}>{formatMessageTime(msg.created_at)}</p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Composer */}
          <div className="px-3 md:px-5 py-3 md:py-4 border-t flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
            {body && displayStatus === 'human' ? (
              <div>
                <div className="flex gap-2 mb-2">
                  <textarea
                    value={inputValue}
                    onChange={(e) => { setInputValue(e.target.value); setDraft(e.target.value); }}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                    placeholder={t('Type your reply...', '輸入回覆...')}
                    rows={2}
                    className="flex-1 border rounded-[4px] px-3 py-2.5 text-[16px] focus:outline-none resize-none"
                    style={{ borderColor: 'var(--border)' }}
                    disabled={sending}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={sending || !inputValue.trim()}
                    className="text-[12px] md:text-[13px] font-medium px-4 md:px-5 rounded-[4px] text-white self-end disabled:opacity-50"
                    style={{ background: '#038153' }}
                  >
                    {sending ? t('Sending...', '發送中...') : t('Send', '發送')}
                  </button>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] md:text-[12px]" style={{ color: 'var(--text-muted)' }}>
                    {t("You're replying as a human.", '您正在以人手身份回覆。')}
                  </p>
                  <button
                    onClick={() => setStatus('active')}
                    className="text-[11px] md:text-[12px] font-medium px-3 py-1.5 rounded-[4px] border shrink-0"
                    style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                  >
                    {t('Release to AI', '交還 AI')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 py-2.5 px-3 rounded-[4px]" style={{ background: 'var(--bg)' }}>
                <span className="text-[12px] md:text-[13px]" style={{ color: 'var(--text-muted)' }}>
                  {displayStatus === 'human'
                    ? ''
                    : displayStatus === 'ai_paused'
                      ? t('AI paused — new messages will not get AI replies', 'AI 已暫停——新訊息不會收到 AI 回覆')
                      : displayStatus === 'bookmarked'
                        ? t('Bookmarked — take over to reply', '對話已加書籤——接管後可回覆')
                        : t('AI handles replies', 'AI 正在處理回覆')}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right rail */}
        <div className="hidden lg:flex w-[360px] xl:w-[400px] flex-shrink-0 flex-col border-l overflow-y-auto" style={{ borderColor: 'var(--border)' }}>
          {/* Inquiry panel */}
          <div className="border-b p-4" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles width="14" height="14" style={{ color: 'var(--accent)' }} />
              <h3 className="text-[13px] font-semibold">{t('Inquiry', '查詢')}</h3>
              {suggestion && (
                <span className="text-[10px] px-1.5 py-0.5 rounded font-medium ml-auto" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
                  {suggestion.extraction?.source === 'heuristic' ? t('Heuristic', '規則提取') : 'AI'}
                </span>
              )}
            </div>
            {loadingSuggest ? (
              <SkeletonBlock lines={3} />
            ) : suggestion && suggestion.request_summary ? (
              <p className="text-[13px] leading-relaxed mb-3" style={{ color: 'var(--text)' }}>
                {suggestion.request_summary}
              </p>
            ) : (
              <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                {t('Could not extract a request from this thread yet', '暫時未能從對話提取查詢')}
              </p>
            )}
            {suggestion && suggestion.lines.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {suggestion.lines.map((l, i) => (
                  <span key={l.id} className="text-[11px] px-2 py-1 rounded font-medium" style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}>
                    #{i + 1}{l.quantity ? ` ${l.quantity.toLocaleString()} ${l.unit || 'pcs'}` : ''} · {l.product.slice(0, 42)}
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
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
                className="flex-1 text-[12px] font-medium px-3 py-2 rounded-[4px] text-white"
                style={{ background: 'var(--accent)' }}
              >
                {t('Quote', '報價')}
              </button>
            </div>
          </div>

          {/* Suggested quote */}
          <div className="border-b p-4" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2 mb-3">
              <FileText width="14" height="14" style={{ color: 'var(--accent)' }} />
              <h3 className="text-[13px] font-semibold">{t('Suggested quote', '建議報價')}</h3>
            </div>
            {loadingSuggest ? (
              <SkeletonBlock lines={5} />
            ) : !suggestion || suggestion.lines.length === 0 ? (
              <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                {t('No quote suggested yet — press "Price"', '尚未建議報價——請按「定價」')}
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
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-[14px] font-semibold">{fmtAmount(l.unit_price, suggestion.currency || 'USD')}</p>
                            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                              / {l.unit || 'pc'} · {fmtAmount(l.total, suggestion.currency || 'USD')}
                            </p>
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
                        {l.requires_manual_pricing && (
                          <p className="text-[10px] mt-1.5 font-medium flex items-center gap-1" style={{ color: 'var(--error)' }}>
                            <AlertTriangle width="10" height="10" />
                            {t('Needs manual pricing', '需人手定價')}
                          </p>
                        )}
                        {l.at_cost && !l.requires_manual_pricing && (
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
                  <span className="text-[15px] font-semibold">{fmtAmount(suggestion.subtotal, suggestion.currency || 'USD')}</span>
                </div>
                {suggestion.sources_summary && suggestion.sources_summary.length > 0 && (
                  <p className="text-[11px] mt-3 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                    {suggestion.sources_summary.join(' ')}
                  </p>
                )}
              </>
            )}
          </div>

          {/* Recommended suppliers */}
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Building2 width="14" height="14" style={{ color: 'var(--accent)' }} />
              <h3 className="text-[13px] font-semibold">{t('Recommended suppliers', '推薦供應商')}</h3>
            </div>
            {loadingSuggest ? (
              <SkeletonBlock lines={4} />
            ) : !suggestion || suggestion.suppliers.length === 0 ? (
              <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                {t('No suppliers in your directory match yet', '目錄中暫無匹配的供應商')}
              </p>
            ) : (
              <div className="space-y-2">
                {suggestion.suppliers.map((s) => (
                  <div key={s.id} className="rounded-[4px] border p-2.5" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[13px] font-medium truncate">{s.name}</p>
                      {s.is_approved && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold flex-shrink-0" style={{ background: '#E8F5F1', color: '#038153' }}>
                          {t('APPROVED', '已核准')}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {s.location || '—'}
                      {s.typical_lead_time_days ? ` · ${t('lead', '交期')} ${s.typical_lead_time_days}d` : ''}
                      {s.payment_terms ? ` · ${s.payment_terms}` : ''}
                    </p>
                    {s.capabilities.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {s.capabilities.map((c) => (
                          <span key={c} className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                            {c}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="text-[10px] mt-1.5" style={{ color: 'var(--accent)' }}>{s.match_reason}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile copy of the rail */}
      <div className="lg:hidden mt-4 border rounded-[4px] p-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles width="14" height="14" style={{ color: 'var(--accent)' }} />
          <h3 className="text-[13px] font-semibold">{t('Suggested quote & suppliers', '建議報價與供應商')}</h3>
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
    </div>
  );
}