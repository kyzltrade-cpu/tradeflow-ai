'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Send, Trash2, X } from 'lucide-react';
import { useLang } from '@/lib/lang';
import { useToast } from '@/components/Toast';
import {
  describeAddressErrors,
  splitAddresses,
  validateAddressFields,
} from '@/lib/address-validation';

export type ComposePayload = {
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  body: string;
};

/* The one email composer. It was written for /admin/inbox as a docked
   bottom-right panel; the thread view reuses the exact same surface centred
   on screen, so replies and new mail cannot drift apart visually or
   behaviourally. Only placement and the endpoint differ. */

const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';

export default function EmailCompose({
  placement = 'docked',
  title,
  initialTo = '',
  initialSubject = '',
  initialBody = '',
  lockTo = false,
  requireSubject = true,
  hint,
  onSend,
  onClose,
  onSent,
}: {
  placement?: 'docked' | 'centered';
  title?: string;
  initialTo?: string;
  initialSubject?: string;
  initialBody?: string;
  lockTo?: boolean;
  requireSubject?: boolean;
  hint?: string;
  onSend: (payload: ComposePayload) => Promise<void>;
  onClose: () => void;
  onSent?: () => void;
}) {
  const { t } = useLang();
  const { showToast } = useToast();
  const [minimized, setMinimized] = useState(false);
  const [showCc, setShowCc] = useState(false);
  const [to, setTo] = useState(initialTo);
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  const [sending, setSending] = useState(false);
  const toRef = useRef<HTMLInputElement>(null);

  const split = splitAddresses;

  // Typing in Cc/Bcc is the whole point of those fields, so a malformed entry
  // has to be reported against the field that owns it — not as a toast after
  // the send was already attempted.
  const [addressErrors, setAddressErrors] = useState<Partial<Record<'to' | 'cc' | 'bcc', string[]>>>({});

  const validateAddresses = (next: { to?: string; cc?: string; bcc?: string }) => {
    const errors = validateAddressFields({
      to: next.to ?? to,
      cc: next.cc ?? cc,
      bcc: next.bcc ?? bcc,
    });
    setAddressErrors(errors);
    return errors;
  };

  const send = async () => {
    const toList = split(to);
    if (toList.length === 0 || !body.trim() || (requireSubject && !subject.trim())) {
      showToast(t('Recipient, subject, and message are required', '請填寫收件人、主旨和內容'), 'error');
      return;
    }
    const addressErrors = validateAddressFields({ to, cc, bcc });
    if (Object.keys(addressErrors).length) {
      showToast(
        t(
          `Not a valid email address — ${describeAddressErrors(addressErrors)}`,
          `電郵地址無效 — ${describeAddressErrors(addressErrors)}`
        ),
        'error'
      );
      return;
    }
    setSending(true);
    try {
      await onSend({ to: toList, cc: split(cc), bcc: split(bcc), subject: subject.trim(), body: body.trim() });
      onSent?.();
    } catch {
      // The caller's onSend surfaces its own message; nothing to add here.
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (!sending) send();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  useEffect(() => {
    if (!minimized) toRef.current?.focus();
  }, [minimized]);

  // Only the centred variant covers the page; the docked one floats above the
  // list and must never trap scrolling underneath it.
  useEffect(() => {
    if (placement !== 'centered') return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [placement]);

  const fieldStyle = {
    borderColor: 'var(--border)',
    background: 'transparent',
    color: 'var(--text)',
  } as const;

  const card = (
    <div
      className="glass-anim-in pointer-events-auto flex w-full flex-col overflow-hidden rounded-t-[24px] transition-[height] duration-[420ms] sm:w-[580px] sm:rounded-[24px]"
      style={{
        height: minimized ? 54 : 'min(72vh, 660px)',
        transitionTimingFunction: EASE,
        color: 'var(--text)',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-float)',
      }}
      role="dialog"
      aria-modal={placement === 'centered' ? true : undefined}
      aria-label={title || t('New message', '新訊息')}
    >
      {/* The header stays put while the body morphs, so minimise and expand
          read as one continuous surface rather than two screens. */}
      <div className="relative z-10 flex h-[54px] flex-shrink-0 items-center gap-2 px-4">
        <button
          onClick={() => setMinimized((m) => !m)}
          className="glass-press flex h-7 w-7 items-center justify-center rounded-full hover:bg-black/[0.05]"
          title={minimized ? t('Expand', '展開') : t('Minimise', '縮到最小')}
          style={{ color: 'var(--text-muted)' }}
        >
          {minimized ? <ChevronUp width="15" height="15" /> : <ChevronDown width="15" height="15" />}
        </button>
        <span
          className={`flex-1 truncate text-[13px] font-semibold ${minimized ? 'cursor-pointer' : ''}`}
          style={{ color: 'var(--text)' }}
          onClick={() => {
            if (minimized) setMinimized(false);
          }}
        >
          {minimized
            ? subject.trim() || to.trim() || t('New message', '新訊息')
            : title || t('New message', '新訊息')}
        </span>
        <button
          onClick={onClose}
          className="glass-press flex h-7 w-7 items-center justify-center rounded-full hover:bg-black/[0.05]"
          title={t('Discard', '丟棄')}
          style={{ color: 'var(--text-muted)' }}
        >
          <X width="15" height="15" />
        </button>
      </div>

      <div
        className="relative z-10 flex min-h-0 flex-1 flex-col transition-[opacity,transform] duration-[300ms]"
        style={{
          opacity: minimized ? 0 : 1,
          transform: minimized ? 'translateY(-10px)' : 'translateY(0)',
          pointerEvents: minimized ? 'none' : 'auto',
          transitionTimingFunction: EASE,
        }}
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <div className="flex items-center gap-3 px-4 py-2.5 border-b" style={fieldStyle}>
            <span className="w-12 flex-shrink-0 text-[12px]" style={{ color: 'var(--text-muted)' }}>
              {t('To', '收件人')}
            </span>
            <input
              ref={toRef}
              value={to}
              onChange={(e) => { setTo(e.target.value); validateAddresses({ to: e.target.value }); }}
              readOnly={lockTo}
              placeholder={lockTo ? undefined : t('name@company.com, second@company.com', '名稱@公司.com，第二位@公司.com')}
              className="flex-1 text-[13px] focus:outline-none min-w-0 disabled:opacity-100 read-only:cursor-default"
              style={fieldStyle}
            />
          </div>

          {showCc ? (
            <>
              <div className="flex items-center gap-3 px-4 py-2.5 border-b" style={fieldStyle}>
                <span className="w-12 flex-shrink-0 text-[12px]" style={{ color: 'var(--text-muted)' }}>Cc</span>
                <input
                  value={cc}
                  onChange={(e) => { setCc(e.target.value); validateAddresses({ cc: e.target.value }); }}
                  placeholder={t('name@company.com', '名稱@公司.com')}
                  aria-invalid={Boolean(addressErrors.cc)}
                  className="flex-1 text-[13px] focus:outline-none min-w-0"
                  style={{ ...fieldStyle, ...(addressErrors.cc ? { borderColor: 'var(--error)' } : null) }}
                />
              </div>
              <div className="flex items-center gap-3 px-4 py-2.5 border-b" style={fieldStyle}>
                <span className="w-12 flex-shrink-0 text-[12px]" style={{ color: 'var(--text-muted)' }}>Bcc</span>
                <input
                  value={bcc}
                  onChange={(e) => { setBcc(e.target.value); validateAddresses({ bcc: e.target.value }); }}
                  placeholder={t('name@company.com', '名稱@公司.com')}
                  aria-invalid={Boolean(addressErrors.bcc)}
                  className="flex-1 text-[13px] focus:outline-none min-w-0"
                  style={{ ...fieldStyle, ...(addressErrors.bcc ? { borderColor: 'var(--error)' } : null) }}
                />
              </div>
            </>
          ) : (
            <div className="flex items-center px-4 py-1.5" style={fieldStyle}>
              <button
                type="button"
                onClick={() => setShowCc(true)}
                className="rounded-md px-2 py-1 text-[12px] font-medium transition-colors hover:bg-black/[0.04]"
                style={{ color: 'var(--text-muted)' }}
              >
                + Cc / Bcc
              </button>
            </div>
          )}

          {Object.keys(addressErrors).length > 0 && (
            <div
              role="alert"
              className="px-4 py-2 text-[12px]"
              style={{ background: '#FEE8EA', color: 'var(--error)' }}
            >
              {t(
                `Check the highlighted address — ${describeAddressErrors(addressErrors)}`,
                `請檢查標示的地址 — ${describeAddressErrors(addressErrors)}`
              )}
            </div>
          )}

          <div className="flex items-center gap-3 px-4 py-2.5 border-b" style={fieldStyle}>
            <span className="w-12 flex-shrink-0 text-[12px]" style={{ color: 'var(--text-muted)' }}>
              {t('Subject', '主旨')}
            </span>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={t('Subject', '主旨')}
              className="flex-1 text-[13px] focus:outline-none min-w-0"
              style={fieldStyle}
            />
          </div>

          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t('Write your message…', '輸入訊息內容…')}
            className="flex-1 min-h-[190px] px-4 py-3.5 text-[13.5px] leading-[1.7] focus:outline-none resize-none"
            style={fieldStyle}
          />

        </div>

        <div className="flex items-center gap-2 px-3 py-3 flex-shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
          <button
            onClick={send}
            disabled={sending}
            className="glass-press flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold text-white disabled:opacity-50"
            style={{ background: 'var(--accent)' }}
          >
            <Send width="13" height="13" />
            {sending ? t('Sending…', '傳送中…') : t('Send', '傳送')}
          </button>
          <button
            onClick={onClose}
            className="glass-press flex h-8 w-8 items-center justify-center rounded-full hover:bg-black/[0.05]"
            title={t('Discard', '丟棄')}
            style={{ color: 'var(--text-muted)' }}
          >
            <Trash2 width="15" height="15" />
          </button>
          <span className="ml-auto pr-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
            {hint || t('⌘ + Enter to send', '⌘ + Enter 傳送')}
          </span>
        </div>
      </div>
    </div>
  );

  if (placement === 'centered') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6">
        <div
          className="absolute inset-0"
          style={{ background: 'rgba(27,25,23,0.42)' }}
          onClick={() => {
            if (!sending) onClose();
          }}
        />
        <div className="relative flex w-full justify-center">{card}</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center pointer-events-none sm:inset-x-auto sm:bottom-5 sm:right-5 sm:justify-end">
      {card}
    </div>
  );
}