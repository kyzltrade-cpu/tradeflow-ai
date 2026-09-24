'use client';

import Link from 'next/link';
import { useLang, LangToggle } from '@/lib/lang';

export default function PrivacyPage() {
  const { t } = useLang();

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      {/* Nav */}
      <nav className="border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-[17px] font-semibold tracking-[-0.3px]" style={{ color: 'var(--accent)' }}>
              Sailwise
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <LangToggle />
            <Link href="/admin" className="text-[14px] hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
              {t('Dashboard', '控制台')}
            </Link>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-[640px] mx-auto px-6 py-16">
        <h1 className="text-[32px] font-semibold tracking-[-0.8px] mb-2">{t('Privacy Policy', '私隱政策')}</h1>
        <p className="text-[13px] mb-10" style={{ color: 'var(--text-muted)' }}>
          {t('Last updated: September 2026', '最後更新：2026 年 9 月')}
        </p>

        <div className="space-y-8">
          {/* Data collection */}
          <section>
            <h2 className="text-[18px] font-semibold mb-3">{t('What data we collect', '我們收集的資料')}</h2>
            <p className="text-[14px] leading-[1.7]" style={{ color: 'var(--text-muted)' }}>
              {t(
                'We collect contact information (names, phone numbers, email addresses) from messages sent to your WhatsApp and WeChat channels. We also store your product catalog data (product names, pricing, specifications, MOQ) and conversation history between your business and customers.',
                '我們從發送到您 WhatsApp 和微信渠道的訊息中收集聯絡資訊（姓名、電話號碼、電郵地址）。我們亦會儲存您的產品目錄資料（產品名稱、價格、規格、MOQ）以及您與客戶之間的對話記錄。'
              )}
            </p>
          </section>

          {/* Data usage */}
          <section>
            <h2 className="text-[18px] font-semibold mb-3">{t('How we use data', '我們如何使用資料')}</h2>
            <p className="text-[14px] leading-[1.7]" style={{ color: 'var(--text-muted)' }}>
              {t(
                'Your data is used to power AI-generated responses to customer inquiries and to improve the quality and accuracy of our service. We do not use your data to train third-party models or for advertising purposes.',
                '您的資料用於支援 AI 生成的客戶查詢回覆，以及改善我們服務的質量和準確性。我們不會將您的資料用於訓練第三方模型或廣告用途。'
              )}
            </p>
          </section>

          {/* Data storage */}
          <section>
            <h2 className="text-[18px] font-semibold mb-3">{t('Data storage', '資料儲存')}</h2>
            <p className="text-[14px] leading-[1.7]" style={{ color: 'var(--text-muted)' }}>
              {t(
                'All data is stored in Supabase cloud infrastructure with encryption at rest and in transit. Your data is hosted in secure data centers with industry-standard security measures.',
                '所有資料均儲存在 Supabase 雲端基礎設施中，資料靜態和傳輸均採用加密。您的資料託管在具備業界標準安全措施的安全數據中心。'
              )}
            </p>
          </section>

          {/* Third parties */}
          <section>
            <h2 className="text-[18px] font-semibold mb-3">{t('Third parties', '第三方服務')}</h2>
            <p className="text-[14px] leading-[1.7]" style={{ color: 'var(--text-muted)' }}>
              {t(
                'We share data with the following third-party processors as necessary to provide our service: WhatsApp/Meta for message delivery, NVIDIA for AI processing, and Supabase for data storage. Each processor is bound by their respective data processing agreements.',
                '我們會根據提供服務的需要，與以下第三方處理者共享資料：WhatsApp/Meta 用於訊息傳送，NVIDIA 用於 AI 處理，Supabase 用於資料儲存。每個處理者均受其各自的資料處理協議約束。'
              )}
            </p>
          </section>

          {/* Data retention */}
          <section>
            <h2 className="text-[18px] font-semibold mb-3">{t('Data retention', '資料保留')}</h2>
            <p className="text-[14px] leading-[1.7]" style={{ color: 'var(--text-muted)' }}>
              {t(
                'Your data is retained while your account is active. Upon account closure, all personal data is permanently deleted within 30 days. Conversation logs and product data are removed from our servers during this period.',
                '您的資料會在您的帳戶使用期間保留。帳戶關閉後，所有個人資料會在 30 天內永久刪除。對話記錄和產品資料會在此期間從我們的伺服器中移除。'
              )}
            </p>
          </section>

          {/* Your rights */}
          <section>
            <h2 className="text-[18px] font-semibold mb-3">{t('Your rights', '您的權利')}</h2>
            <p className="text-[14px] leading-[1.7]" style={{ color: 'var(--text-muted)' }}>
              {t(
                'You have the right to access, delete, or export your data at any time. These actions can be performed from your admin dashboard or by contacting our support team. We will respond to all requests within 30 days.',
                '您有權隨時存取、刪除或匯出您的資料。這些操作可從您的管理控制台執行，或聯絡我們的客服團隊。我們會在 30 天內回應所有請求。'
              )}
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-[18px] font-semibold mb-3">{t('Contact', '聯絡我們')}</h2>
            <p className="text-[14px] leading-[1.7]" style={{ color: 'var(--text-muted)' }}>
              {t(
                'For any privacy-related questions or requests, please contact us at',
                '如有任何私隱相關的問題或請求，請聯絡我們'
              )}{' '}
              <a href="mailto:tradeflow.hk@gmail.com" className="underline" style={{ color: 'var(--accent)' }}>
                tradeflow.hk@gmail.com
              </a>
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-16 pt-6 border-t flex items-center justify-between text-[13px]" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
          <Link href="/" className="hover:opacity-70">{t('Back to home', '返回首頁')}</Link>
          <span>© 2026 Sailwise</span>
        </div>
      </div>
    </div>
  );
}
