'use client';

import { useLang } from '@/lib/lang';
import SiteHeader from '@/components/landing/SiteHeader';
import SiteFooter from '@/components/site/SiteFooter';

type Bi = [string, string];

const SECTIONS: { title: Bi; body: Bi }[] = [
  {
    title: ['What data we collect', '我們收集的資料'],
    body: [
      'We collect contact information (names, email addresses, and phone numbers when provided) from emails and conversations sent to your business. We also store your product catalog data (product names, pricing, specifications, MOQ) and conversation history between your business and customers.',
      '我們從發送給您的電郵和對話中收集聯絡資訊（姓名、電郵地址，以及如您提供的電話號碼）。我們亦會儲存您的產品目錄資料（產品名稱、價格、規格、MOQ）以及您與客戶之間的對話記錄。',
    ],
  },
  {
    title: ['How we use data', '我們如何使用資料'],
    body: [
      'Your data is used to power AI-generated responses to customer inquiries and to improve the quality and accuracy of our service. We do not use your data to train third-party models or for advertising purposes.',
      '您的資料用於支援 AI 生成的客戶查詢回覆，以及改善我們服務的質量和準確性。我們不會將您的資料用於訓練第三方模型或廣告用途。',
    ],
  },
  {
    title: ['Data storage', '資料儲存'],
    body: [
      'All data is stored in Supabase cloud infrastructure with encryption at rest and in transit. Your data is hosted in secure data centers with industry-standard security measures.',
      '所有資料均儲存在 Supabase 雲端基礎設施中，資料靜態和傳輸均採用加密。您的資料託管在具備業界標準安全措施的安全數據中心。',
    ],
  },
  {
    title: ['Third parties', '第三方服務'],
    body: [
      'We share data with the following third-party processors as necessary to provide our service: Google and Microsoft for your connected email inboxes, OpenAI for AI-generated responses, Supabase for data storage, and PostHog for product analytics. Each processor is bound by their respective data processing agreements.',
      '我們會根據提供服務的需要，與以下第三方處理者共享資料：Google 和 Microsoft 用於連接您的電郵收件匣，OpenAI 用於 AI 生成回覆，Supabase 用於資料儲存，PostHog 用於產品分析。每個處理者均受其各自的資料處理協議約束。',
    ],
  },
  {
    title: ['Product analytics', '產品分析'],
    body: [
      'We record which steps of setup you complete (account created, catalog imported, inbox connected, checkout started, quote sent) so we can find where setup breaks. Analytics records no cookies, keeps no visitor identifier between visits, and sends no message content, customer names or email addresses. It stores your company id and the numeric outcome of each step.',
      '我們記錄您完成了設定的哪些步驟（建立帳戶、匯入產品目錄、連接收件匣、開始結帳、已寄出報價），以便找出設定在哪一步失敗。分析功能不使用 Cookie、不保留跨造訪的訪客識別碼，亦不會傳送訊息內容、客戶名稱或電郵地址，只會儲存您的公司編號及各步驟的數值結果。',
    ],
  },
  {
    title: ['Data retention', '資料保留'],
    body: [
      'Your data is retained while your account is active. Upon account closure, all personal data is permanently deleted within 30 days. Conversation logs and product data are removed from our servers during this period.',
      '您的資料會在您的帳戶使用期間保留。帳戶關閉後，所有個人資料會在 30 天內永久刪除。對話記錄和產品資料會在此期間從我們的伺服器中移除。',
    ],
  },
  {
    title: ['Your rights', '您的權利'],
    body: [
      'You have the right to access, delete, or export your data at any time. These actions can be performed from your admin dashboard or by contacting our support team. We will respond to all requests within 30 days.',
      '您有權隨時存取、刪除或匯出您的資料。這些操作可從您的管理控制台執行，或聯絡我們的客服團隊。我們會在 30 天內回應所有請求。',
    ],
  },
];

const SUMMARY: Bi[] = [
  [
    'Your catalogue and conversations are encrypted, never sold, and never used to train models shared with other customers.',
    '您的目錄與對話均經加密，絕不出售，也絕不用於訓練與其他客戶共用的模型。',
  ],
  [
    'Product analytics uses no cookies and never sees message content, customer names or email addresses.',
    '產品分析不使用 Cookie，亦不會接觸訊息內容、客戶名稱或電郵地址。',
  ],
  [
    'Close your account and everything is purged within 30 days — or export it first from the dashboard.',
    '關閉帳戶後，所有資料會在 30 天內清除——您也可以先從控制台匯出。',
  ],
];

export default function PrivacyPage() {
  const { t } = useLang();

  return (
    <div className="landing min-h-screen">
      <SiteHeader />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="band-dark band-glow">
        <div className="shell pt-[116px] pb-16 lg:pt-[148px] lg:pb-20">
        <p className="eyebrow" style={{ color: 'var(--accent)' }}>{t('Legal', '法律')}</p>
        <h1 className="display h-section mt-5">{t('Privacy Policy', '私隱政策')}</h1>
        <p className="mt-4 text-[14px]" style={{ color: 'var(--ink-3)' }}>
          {t('Last updated: October 2026', '最後更新：2026 年 10 月')}
        </p>
      </div>
      </section>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <section className="shell pt-16 pb-20">
        <div className="grid gap-12 lg:grid-cols-[0.34fr_0.66fr] lg:gap-16">
          {/* Summary stays put while the long form scrolls past it. */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="card p-6" style={{ background: 'var(--paper-2)' }}>
              <p className="eyebrow">{t('The short version', '摘要')}</p>
              <ul className="mt-5 space-y-3.5">
                {SUMMARY.map((s) => (
                  <li key={s[0]} className="text-[13.5px] leading-relaxed" style={{ color: 'var(--ink-2)' }}>
                    {t(s[0], s[1])}
                  </li>
                ))}
              </ul>
            </div>
            <p className="mt-5 text-[13.5px] leading-relaxed" style={{ color: 'var(--ink-3)' }}>
              {t('Questions or requests:', '問題或請求：')}{' '}
              <a href="mailto:tradeflow.hk@gmail.com" className="link-quiet">
                tradeflow.hk@gmail.com
              </a>
            </p>
          </aside>

          <div className="prose-legal max-w-[68ch] space-y-10">
            {SECTIONS.map((s) => (
              <section key={s.title[0]}>
                <h2>{t(s.title[0], s.title[1])}</h2>
                <p>{t(s.body[0], s.body[1])}</p>
              </section>
            ))}

            <section>
              <h2>{t('Contact', '聯絡我們')}</h2>
              <p>
                {t(
                  'For any privacy-related questions or requests, please contact us at',
                  '如有任何私隱相關的問題或請求，請聯絡我們'
                )}{' '}
                <a href="mailto:tradeflow.hk@gmail.com">tradeflow.hk@gmail.com</a>
                {t('.', '。')}
              </p>
            </section>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
