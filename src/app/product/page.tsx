'use client';


import SiteHeader from '@/components/landing/SiteHeader';
import SiteFooter from '@/components/site/SiteFooter';
import { Chapter, SectionHead, Bullet, MockFrame, ClosingCTA } from '@/components/site/Section';
import {
  ExtractionMock,
  InboxMock,
  QuoteMock,
  WhatsAppMock,
} from '@/components/landing/ProductMocks';
import { useLang } from '@/lib/lang';
import { EXTRACTION, INTEGRATIONS, QUEUE, SETUP } from '@/lib/landing-content';

export default function ProductPage() {
  const { t } = useLang();

  return (
    <div className="landing min-h-screen">
      <SiteHeader />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="band-dark band-glow">
        <div className="shell pt-[116px] pb-16 lg:pt-[148px] lg:pb-20">
        <p className="eyebrow" style={{ color: 'var(--accent)' }}>{t('The product', '產品')}</p>
        <h1 className="display h-section mt-5 max-w-4xl text-balance">
          {t('The whole pipeline, screen by screen.', '整條流程，逐一畫面看。')}
        </h1>
        <p className="lede mt-5 max-w-2xl">
          {t(
            'Each stage runs on the same thread, so nothing is re-typed and nothing is lost between steps. Stop and take over wherever you want to decide.',
            '每個階段都在同一條對話上運行，不必重複輸入，也不會在步驟之間遺失。您可以在任何想決定的地方停下來接手。'
          )}
        </p>
      </div>
      </section>

      {/* ── 03 · Extraction ──────────────────────────────────────────────── */}
      <section
        id="extraction"
        className="band scroll-mt-20"
        style={{ background: 'var(--paper-2)', borderBlock: '1px solid var(--hairline)' }}
      >
        <div className="shell">
          <Chapter n="03" label={t('Extraction', '擷取')} />
          <SectionHead
            label={t('Reads the email', '讀懂郵件')}
            title={t('Every spec, with the line it came from', '每個規格，都附上它來自哪一行')}
            sub={t(
              'Quantities, materials, certifications and lead times are pulled from the thread and tied to source lines — so you can check the reading in seconds instead of re-reading the email.',
              '數量、材質、認證與交期都從對話中擷取，並綁定到來源行——您數秒就能核對，不必重讀整封郵件。'
            )}
          />
          <div className="mt-14 grid gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-start lg:gap-16">
            <MockFrame
              className="min-w-0"
              label="The extraction panel: every spec shown with the source line it was read from, and the clarifying question drafted for the buyer."
            >
              <ExtractionMock />
            </MockFrame>
            <div className="space-y-11">
              {EXTRACTION.map((b) => (
                <div key={b.label[0]}>
                  <p className="eyebrow">{t(b.label[0], b.label[1])}</p>
                  <h3 className="h-sub mt-3 font-medium">{t(b.title[0], b.title[1])}</h3>
                  <p className="mt-3 text-[15px] leading-[1.7]" style={{ color: 'var(--ink-2)' }}>
                    {t(b.body[0], b.body[1])}
                  </p>
                  <ul className="mt-5 space-y-3">
                    {b.points.map((p, j) => (
                      <Bullet key={j}>{t(p[0], p[1])}</Bullet>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 04 · The work queue ──────────────────────────────────────────── */}
      <section id="queue" className="band scroll-mt-20">
        <div className="shell">
          <Chapter n="04" label={t('One queue', '單一佇列')} />
          <SectionHead
            label={t('Nothing gets lost', '不再遺漏')}
            title={t('One queue that tells you what needs you next', '一個佇列，告訴您下一步要處理什麼')}
          />
          <div className="mt-14 grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-start lg:gap-16">
            <div>
              <p className="text-[17px] leading-[1.7]" style={{ color: 'var(--ink-2)' }}>
                {t(
                  'Inquiries land in the mailbox you already use — Gmail or Outlook, connected in one click. Sailwise extracts the specs, fills what it can, and sorts every thread by what it needs from you next, so nothing waits on someone remembering to check.',
                  '詢盤落入您現用的信箱——Gmail 或 Outlook，一鍵連接。Sailwise 擷取規格、能補的先補，並依每條對話下一步的需要排序，不必再靠誰記得去查看。'
                )}
              </p>
              <ul className="mt-7 space-y-3">
                <Bullet>{t('Works over the Gmail or Outlook mailbox you already use', '直接運作於您現用的 Gmail 或 Outlook 信箱')}</Bullet>
                <Bullet>{t('Specs, quantities and gaps pulled from the thread and its attachments', '從對話與附件擷取規格、數量與缺漏')}</Bullet>
                <Bullet>{t('Replies drafted in the customer’s own language', '以客戶的語言草擬回覆')}</Bullet>
              </ul>
              <p
                className="mt-9 border-t pt-6 text-[14px] leading-relaxed"
                style={{ borderColor: 'var(--hairline)', color: 'var(--ink-3)' }}
              >
                {t(
                  'Each thread’s state is derived from the conversation itself — who spoke last, what is still missing, how many chases have gone unanswered — so the queue stays current without anyone maintaining it.',
                  '每條對話的狀態由對話本身推導——誰最後發言、還缺什麼、追問了幾次未回——佇列無需人手維護，始終保持最新。'
                )}
              </p>
            </div>

            <MockFrame
              className="min-w-0"
              label="The unified inbox: enquiries sorted into needs-specs, owed-replies and needs-you, with the open thread and its buyer rail."
            >
              <InboxMock />
            </MockFrame>
          </div>

          <div
            className="mt-14 grid gap-px overflow-hidden rounded-[6px] md:grid-cols-3"
            style={{ background: 'var(--hairline)' }}
          >
            {QUEUE.map((q) => (
              <div key={q.title[0]} className="px-6 py-7" style={{ background: 'var(--paper)' }}>
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: q.tone }} />
                  <span className="eyebrow" style={{ color: q.tone }}>
                    {t(q.label[0], q.label[1])}
                  </span>
                </div>
                <h3 className="h-sub mt-3 font-medium">{t(q.title[0], q.title[1])}</h3>
                <p className="mt-2 text-[15px] leading-relaxed" style={{ color: 'var(--ink-2)' }}>
                  {t(q.body[0], q.body[1])}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 05 · Quotes ──────────────────────────────────────────────────── */}
      <section
        id="quotes"
        className="band scroll-mt-20"
        style={{ background: 'var(--paper-2)', borderBlock: '1px solid var(--hairline)' }}
      >
        <div className="shell">
          <Chapter n="05" label={t('Quotes', '報價')} />
          <SectionHead
            label={t('Priced from your data', '依您的資料定價')}
            title={t('Quotes priced from your list, not from memory', '報價取自您的清單，不是憑記憶')}
          />
          <div className="mt-14 grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:gap-16">
            <div>
              <p className="text-[17px] leading-[1.7]" style={{ color: 'var(--ink-2)' }}>
                {t(
                  'Every line is priced from your own product list and your margin rules, and shown on the quote so you can check it in seconds. It then sends as a normal email from your own address.',
                  '每一行都由您自己的產品清單與利潤規則定價，並顯示於報價單上，讓您數秒內核對，再以您自己的地址寄出一般電郵。'
                )}
              </p>
              <ul className="mt-7 space-y-3">
                <Bullet>{t('Priced from your product list and margin rules', '依產品清單與利潤規則定價')}</Bullet>
                <Bullet>{t('Lines that cannot be matched confidently are flagged, not guessed', '無法確信匹配的行會被標示，而非臆測')}</Bullet>
                <Bullet>{t('One click to send from your own mailbox', '一按即從您的信箱寄出')}</Bullet>
              </ul>
            </div>
            <MockFrame
              className="min-w-0"
              label="A quote draft priced from the product list and margin rules, marked as awaiting approval before it sends."
            >
              <QuoteMock />
            </MockFrame>
          </div>
        </div>
      </section>

      {/* ── 06 · Alerts ──────────────────────────────────────────────────── */}
      <section id="alerts" className="band scroll-mt-20">
        <div className="shell">
          <Chapter n="06" label={t('Alerts', '提示')} />
          <div className="grid gap-14 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:gap-20">
            <div className="order-2 lg:order-1">
              <WhatsAppMock />
            </div>
            <div className="order-1 lg:order-2">
              <p className="eyebrow">{t('Stay in the loop', '掌握動態')}</p>
              <h2 className="display h-section mt-5 text-balance">
                {t('Know the moment a deal needs you.', '商機需要您的當下，立即知道。')}
              </h2>
              <p className="lede mt-5 max-w-xl">
                {t(
                  'When a thread needs a decision, Sailwise sends a WhatsApp alert with the sender, the product and the quantity — so a deal never goes cold while you are away from your desk. Replies and quotes still go out as normal email from your own address.',
                  '當對話需要決定，Sailwise 會發送 WhatsApp 提示，附上寄件人、產品與數量——讓商機在您離開座位時不會冷掉。回覆與報價仍以您自己的地址、一般電郵寄出。'
                )}
              </p>
              <ul className="mt-7 space-y-3">
                <Bullet>{t('WhatsApp alert when a thread needs a decision', '對話需要決定時發出 WhatsApp 提示')}</Bullet>
                <Bullet>{t('Sender, product, quantity and status at a glance', '寄件人、產品、數量與狀態一目了然')}</Bullet>
                <Bullet>{t('Replies and quotes always sent from your own mailbox', '回覆與報價一律從您的信箱寄出')}</Bullet>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── 07 · Setup ───────────────────────────────────────────────────── */}
      <section id="setup" className="band scroll-mt-20">
        <div className="shell">
          <Chapter n="07" label={t('Setup', '設定')} />
          <SectionHead
            label={t('Live the same day', '當天即可使用')}
            title={t('Live the same day. Nothing to install.', '當天就能用，不需安裝任何東西。')}
            sub={t(
              'Your team keeps the mailbox and the price list it already has. Sailwise reads both.',
              '您的團隊繼續用原有的信箱與價格表，Sailwise 直接讀取兩者。'
            )}
          />

          <div className="mt-14 grid gap-px overflow-hidden rounded-[6px] md:grid-cols-3" style={{ background: 'var(--hairline)' }}>
            {SETUP.map((st) => (
              <div key={st.step} className="px-6 py-8" style={{ background: 'var(--paper)' }}>
                <div className="flex items-center justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-[4px]" style={{ background: 'var(--accent-light)', color: 'var(--pine)' }}>
                    <st.icon className="h-4 w-4" />
                  </span>
                  <span className="eyebrow" style={{ color: 'var(--ink-3)' }}>
                    {st.step}
                  </span>
                </div>
                <h3 className="h-sub mt-5 font-medium text-balance">{t(st.title[0], st.title[1])}</h3>
                <p className="mt-3 text-[14.5px] leading-relaxed" style={{ color: 'var(--ink-2)' }}>
                  {t(st.body[0], st.body[1])}
                </p>
              </div>
            ))}
          </div>

          {/* Named plainly. "Works with your tools" is only believable when the
              tools are listed, and every one of these exists in the product. */}
          <div className="mt-14">
            <p className="eyebrow">{t('Works with', '相容於')}</p>
            <ul className="mt-5 flex flex-wrap gap-2.5">
              {INTEGRATIONS.map((tag) => (
                <li key={tag[0]} className="chip">
                  {t(tag[0], tag[1])}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <ClosingCTA
        eyebrow={t('Next', '下一步')}
        title={t('See it on your own inquiries.', '用您自己的詢盤試一次。')}
        sub={t(
          'Connect a mailbox and answer your first inquiry the same day.',
          '連接信箱，當天就能回覆第一封詢盤。'
        )}
        t={t}
      />

      <SiteFooter />
    </div>
  );
}
