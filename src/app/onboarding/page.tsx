'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLang, LangToggle } from '@/lib/lang';
import { ExtractionMock } from '@/components/landing/ProductMocks';
import { useAuth, supabaseBrowser } from '@/lib/auth';
import type { WorkBook } from 'xlsx';
import { track } from '@/lib/analytics';

type Step = 'welcome' | 'company' | 'excel' | 'email' | 'done';

interface ParsedProduct {
  name: string;
  description?: string;
  moq?: string;
  price_range?: string;
  category?: string;
}

type MailboxState = {
  connected: boolean;
  address: string | null;
  provider: string | null;
  pending?: boolean;
};

export default function OnboardingPage() {
  const { t } = useLang();
  const { user, loading } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<Step>('welcome');
  const mailboxWasConnected = useRef<boolean | null>(null);
  const stepDoneTracked = useRef<boolean | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [saving, setSaving] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  // Counts of the deletable starter data the company API seeded for this account
  const [starterKit, setStarterKit] = useState<{ products?: number; conversations?: number; quotes?: number } | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/signup');
    }
  }, [user, loading, router]);

  // Excel / CSV catalog
  const [parsedProducts, setParsedProducts] = useState<ParsedProduct[]>([]);
  const [csvDragOver, setCsvDragOver] = useState(false);
  const [csvParsing, setCsvParsing] = useState(false);
  // What the server actually committed, as opposed to what we parsed client-side.
  const [importResult, setImportResult] = useState<{ imported?: number; updated?: number; skipped?: number } | null>(null);
  const [csvError, setCsvError] = useState<string | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  // Email connect
  const [mailbox, setMailbox] = useState<MailboxState | null>(null);
  const [emailConfigured, setEmailConfigured] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  const STEPS: Step[] = ['welcome', 'company', 'excel', 'email', 'done'];
  const currentStepIndex = STEPS.indexOf(step);

  const parseCsvFile = async (file: File): Promise<ParsedProduct[]> => {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!['xlsx', 'xls', 'csv'].includes(ext)) return [];
    // Loaded on demand, not at module scope: SheetJS is ~400kB of parser and
    // the visitor sees the welcome and company steps before ever touching the
    // catalog step, so shipping it in the entry chunk slowed the first paint
    // for a parser most sessions never use. `xlsx` is split into its own async
    // chunk and fetched only once a file is actually dropped in.
    const XLSX = await import('xlsx');
    const buffer = await file.arrayBuffer();
    const workbook: WorkBook = XLSX.read(buffer, { type: 'buffer' });
    const products: ParsedProduct[] = [];
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
      for (const row of rows) {
        const keys = Object.keys(row);
        const find = (patterns: string[]) => {
          const key = keys.find(k => patterns.some(p => k.toLowerCase().includes(p)));
          return key ? String(row[key]).trim() : '';
        };
        const name = find(['product', 'name', 'item', 'title', '品名', '產品', '名称']);
        if (!name) continue;
        products.push({
          name,
          description: find(['desc', 'detail', 'info', '描述', '說明']),
          moq: find(['moq', 'minimum', 'qty', '數量', '最低']),
          price_range: find(['price', 'cost', 'rate', '價格', '單價']),
          category: find(['category', 'type', 'group', '類別', '分類']),
        });
      }
    }
    return products;
  };

  const handleCsvDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setCsvDragOver(false);
    if (e.dataTransfer.files.length) handleCsvFile(e.dataTransfer.files[0]);
  };

  const handleCsvFile = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!['xlsx', 'xls', 'csv'].includes(ext)) {
      setCsvError(t('Unsupported file type. Upload an .xlsx, .xls or .csv file.', '不支援的檔案類型。請上載 .xlsx、.xls 或 .csv 檔案。'));
      return;
    }
    setCsvError(null);
    setCsvParsing(true);
    try {
      const products = await parseCsvFile(file);
      setParsedProducts(products);
      // Zero recognized rows is the usual symptom of a header the matcher does
      // not know. Say so, instead of leaving an empty preview that reads as
      // "still loading".
      if (!products.length) {
        setCsvError(t(
          'No product rows found. Check that a column is headed product name, 產品 or 品名.',
          '找不到產品資料。請確認其中一欄的標題為 product name、產品 或 品名。'
        ));
      }
    } catch (err) {
      console.error('[onboarding] catalog parse error:', err);
      setCsvError(t(
        "That file couldn't be read. If it's an old .xls, re-save it as .xlsx and try again.",
        '無法讀取該檔案。若為舊版 .xls，請另存為 .xlsx 後再試。'
      ));
    } finally {
      setCsvParsing(false);
      if (csvInputRef.current) csvInputRef.current.value = '';
    }
  };

  const removeParsedProduct = (index: number) => {
    setParsedProducts(prev => prev.filter((_, i) => i !== index));
  };

  const getSystemPrompt = (): string =>
    `You are a helpful sales assistant for ${companyName}${industry ? `, a ${industry.toLowerCase()} company` : ''}. You reply professionally, concisely, and in the same language the customer uses. You know all products, pricing, MOQ, shipping terms, and certifications. If a question is beyond your knowledge, say you will connect them with a human agent.`;

  // Reports what the server committed. The old copy printed parsedProducts.length,
  // so a sheet whose rows were rejected as unreadable still claimed a full
  // catalog was imported and the customer only found out in the dashboard.
  const catalogSummary = (): string => {
    if (!importResult) {
      return parsedProducts.length
        ? t(`${parsedProducts.length} imported`, `已匯入 ${parsedProducts.length} 個`)
        : t('None yet', '尚未匯入');
    }
    const imported = importResult.imported ?? 0;
    const updated = importResult.updated ?? 0;
    const skipped = importResult.skipped ?? 0;
    const parts: string[] = [];
    if (imported) parts.push(t(`${imported} imported`, `已匯入 ${imported} 個`));
    if (updated) parts.push(t(`${updated} updated`, `已更新 ${updated} 個`));
    if (skipped) parts.push(t(`${skipped} skipped`, `已略過 ${skipped} 個`));
    return parts.join(' · ') || t('None yet', '尚未匯入');
  };

  const authHeaders = async (): Promise<Record<string, string>> => {
    const { data: { session } } = await supabaseBrowser.auth.getSession();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
    return headers;
  };

  // Create the company, save settings and import the Excel catalog, then move to
  // the email step. Guarded by companyId so re-entering the step never duplicates.
  const finalizeSetup = async () => {
    if (companyId) {
      setStep('email');
      return;
    }
    setSaving(true);
    setSetupError(null);
    try {
      const headers = await authHeaders();

      const companyRes = await fetch('/api/admin/company', {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: companyName, industry, user_id: user?.id }),
      });
      const companyData = await companyRes.json();

      if (!companyRes.ok || !companyData.id) {
        throw new Error(companyData.error || 'Failed to create company');
      }

      const newCompanyId = companyData.id;
      setCompanyId(newCompanyId);
      localStorage.setItem('tradeflow_company_id', newCompanyId);
      if (companyData.starter_kit) setStarterKit(companyData.starter_kit);

      const settingsRes = await fetch('/api/admin/settings', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          company_id: newCompanyId,
          system_prompt: getSystemPrompt(),
          company_name: companyName,
          industry,
        }),
      });
      if (!settingsRes.ok) {
        const settingsData = await settingsRes.json().catch(() => ({}));
        throw new Error(settingsData.error || 'Failed to save settings');
      }

      // One request for the whole reviewed catalog. This used to POST a product
      // per row in sequence, so a 50-row sheet meant 50 sequential round trips:
      // onboarding crawled, and a failure halfway through left a partial
      // catalog with no way to tell which rows landed.
      if (parsedProducts.length) {
        const prodRes = await fetch('/api/admin/products/import', {
          method: 'POST',
          headers,
          body: JSON.stringify({ products: parsedProducts }),
        });
        const prodData = await prodRes.json().catch(() => ({}));
        if (!prodRes.ok) {
          throw new Error(prodData.error || 'Failed to import products');
        }
        setImportResult(prodData);
        // The company was just created, so this is the one import that can be
        // attributed to a company id without waiting for CompanyProvider.
        track('catalog_imported', {
          source: 'onboarding',
          imported: prodData.imported ?? 0,
          updated: prodData.updated ?? 0,
          skipped: prodData.skipped ?? 0,
        });
      }

      setStep('email');
      void refreshMailbox();
    } catch (err) {
      console.error('[onboarding] setup error:', err);
      setSetupError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const refreshMailbox = useCallback(async () => {
    try {
      const headers = await authHeaders();
      const res = await fetch('/api/admin/composio/status', { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setEmailConfigured(data.configured !== false);
      const mailbox = data.mailbox ?? { connected: false, address: null, provider: null };
      // Fire only on the transition. refreshMailbox runs on mount and on a timer
      // after the OAuth popup, so a plain "is connected" check would re-report an
      // inbox that was connected before this page was ever opened.
      if (mailbox.connected && mailboxWasConnected.current === false) {
        track('mailbox_connected', { provider: mailbox.provider ?? 'unknown', source: 'onboarding' });
      }
      mailboxWasConnected.current = mailbox.connected === true;
      setMailbox(mailbox);
    } catch {
      setMailbox({ connected: false, address: null, provider: null });
    }
  }, []);

  const connectEmail = async (toolkit: string) => {
    setConnecting(toolkit);
    setEmailError(null);
    try {
      const headers = await authHeaders();
      const res = await fetch('/api/admin/composio/connect', {
        method: 'POST',
        headers,
        body: JSON.stringify({ toolkit }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to connect');
      if (data.url) window.open(data.url, '_blank', 'noopener,noreferrer');
      setMailbox(prev => ({ ...(prev ?? { connected: false, address: null, provider: null }), pending: true }));
      window.setTimeout(() => void refreshMailbox(), 4000);
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : 'Failed to connect');
    } finally {
      setConnecting(null);
    }
  };

  return (
    <div className="landing flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-[560px]">
        <div className="mb-9 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <img
              src="/brand/sailwise-mark.png"
              alt=""
              aria-hidden="true"
              className="h-6 w-auto object-contain"
            />
            <span className="display text-[1.15rem]">Sailwise</span>
          </Link>
          <LangToggle variant="quiet" />
        </div>

        {/* Progress */}
        <p className="eyebrow">
          {t(`Step ${currentStepIndex + 1} of ${STEPS.length}`, `第 ${currentStepIndex + 1} 步，共 ${STEPS.length} 步`)}
        </p>
        <div className="mt-3 mb-8 flex gap-1.5">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className="h-[3px] flex-1"
              style={{
                background: currentStepIndex >= i ? 'var(--pine)' : 'var(--hairline)',
              }}
            />
          ))}
        </div>

        <div className="card p-7 sm:p-8" style={{ background: 'var(--paper-2)' }}>

          {/* WELCOME */}
          {step === 'welcome' && (
            <div>
              <h1 className="display text-[2rem] leading-[1.1] mb-3">
                {t('Get started with Sailwise', '開始使用 Sailwise')}
              </h1>
              <p className="text-[15px] leading-[1.6] mb-8" style={{ color: 'var(--text-muted)' }}>
                {t('Your AI copilot for trading companies. An inquiry lands in your inbox and Sailwise drives it through the whole process — extract specs, clarify details, prepare a price you approve, and follow up until the deal closes.', '您的貿易公司 AI 副駕駛。詢盤進入您的收件匣後，Sailwise 將它推進整個流程 — 抽取規格、澄清細節、準備您審批的報價、直到成交跟進。')}
              </p>
              <div className="space-y-3 mb-8">
                <div className="flex items-center gap-3 text-[14px]">
                  <span style={{ color: 'var(--success)' }}>✓</span>
                  <span>{t('Connect your Excel catalog', '連接您的 Excel 產品目錄')}</span>
                </div>
                <div className="flex items-center gap-3 text-[14px]">
                  <span style={{ color: 'var(--success)' }}>✓</span>
                  <span>{t('Connect your email inbox', '連接您的電郵收件匣')}</span>
                </div>
                <div className="flex items-center gap-3 text-[14px]">
                  <span style={{ color: 'var(--success)' }}>✓</span>
                  <span>{t('A cited quote draft you approve before it is sent', '附引用的報價草稿，發送前由您審批')}</span>
                </div>
              </div>
              {/* What they are about to set up, cropped so it teases rather
                  than explains: the specs and the source lines they came from. */}
              <div
                className="mb-8 overflow-hidden rounded-[6px] border"
                style={{ borderColor: 'var(--hairline-2)', maxHeight: 240 }}
                role="img"
                aria-label="The extraction panel: every spec shown with the source line it was read from."
                data-nosnippet
                translate="no"
              >
                <ExtractionMock />
              </div>

              <button
                onClick={() => setStep('company')}
                className="btn btn-primary w-full"
              >
                {t('Get started', '開始使用')}
              </button>
              <p className="text-[13px] text-center mt-4" style={{ color: 'var(--text-muted)' }}>
                {t('Already have an account?', '已有帳戶？')}{' '}
                <Link href="/admin/inbox" style={{ color: 'var(--accent)' }}>{t('Go to inbox', '前往收件匣')}</Link>
              </p>
            </div>
          )}

          {/* COMPANY */}
          {step === 'company' && (
            <div>
              <h2 className="display text-[1.6rem] leading-[1.15] mb-2">{t('About your company', '關於您的公司')}</h2>
              <p className="text-[14px] mb-6" style={{ color: 'var(--text-muted)' }}>
                {t('Tell us about your trading business.', '請告訴我們您的貿易業務。')}
              </p>
              <div className="space-y-4 mb-8">
                <div>
                  <label className="block text-[13px] font-medium mb-1">{t('Company name', '公司名稱')}</label>
                  <input
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder={t('e.g. Elite Global Trading Ltd.', '例如：環球貿易有限公司')}
                    className="w-full border rounded-[4px] px-3 py-2.5 text-[14px] focus:outline-none"
                    style={{ borderColor: 'var(--border)' }}
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium mb-1">{t('Industry', '行業')}</label>
                  <select
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full border rounded-[4px] px-3 py-2.5 text-[14px] focus:outline-none"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <option value="">{t('Select your main industry', '選擇您的主要行業')}</option>
                    <option>{t('General Trading', '綜合貿易')}</option>
                    <option>{t('Electronics', '電子')}</option>
                    <option>{t('Drinkware & Kitchenware', '飲品容器與廚房用品')}</option>
                    <option>{t('Accessories & Fashion', '配件與時尚')}</option>
                    <option>{t('Home & Garden', '家居與園藝')}</option>
                    <option>{t('Industrial & Hardware', '工業與五金')}</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep('welcome')}
                  className="flex-1 text-[14px] py-3 rounded-[4px] border"
                  style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                >
                  {t('Back', '返回')}
                </button>
                <button
                  onClick={() => setStep('excel')}
                  disabled={!companyName}
                  className="btn btn-primary flex-1"
                >
                  {t('Continue', '繼續')}
                </button>
              </div>
            </div>
          )}

          {/* EXCEL */}
          {step === 'excel' && (
            <div>
              <h2 className="display text-[1.6rem] leading-[1.15] mb-2">{t('Connect your catalog', '連接您的產品目錄')}</h2>
              <p className="text-[14px] mb-6" style={{ color: 'var(--text-muted)' }}>
                {t('Drop your product list — Excel or CSV. Sailwise quotes straight from it.', '拖放您的產品清單 — Excel 或 CSV。Sailwise 會直接依它報價。')}
              </p>

              <div
                onDragOver={(e) => { e.preventDefault(); setCsvDragOver(true); }}
                onDragLeave={() => setCsvDragOver(false)}
                onDrop={handleCsvDrop}
                onClick={() => csvInputRef.current?.click()}
                className="border-2 border-dashed rounded-[4px] p-6 text-center cursor-pointer mb-4 transition-colors"
                style={{
                  borderColor: csvDragOver ? 'var(--accent)' : 'var(--border)',
                  background: csvDragOver ? 'var(--accent-light)' : 'var(--bg)',
                }}
              >
                <input
                  ref={csvInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => e.target.files?.[0] && handleCsvFile(e.target.files[0])}
                  className="hidden"
                />
                <svg className="mx-auto mb-2" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                <p className="text-[14px] font-medium mb-1">
                  {csvParsing ? t('Parsing...', '正在解析...') : t('Drop Excel/CSV here or click to upload', '拖放 Excel/CSV 到此處或點擊上傳')}
                </p>
                <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                  {t('Headers: product name, description, MOQ, price, category', '欄位：product name, description, MOQ, price, category')}
                </p>
              </div>

              {csvError && (
                <div className="mb-4 text-[13px] px-4 py-3 rounded-[4px]" style={{ background: '#FEE8EA', color: 'var(--error)' }}>
                  {csvError}
                </div>
              )}

              {parsedProducts.length > 0 && (
                <div className="mb-6">
                  <p className="text-[13px] font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
                    {t(`${parsedProducts.length} product(s) found`, `找到 ${parsedProducts.length} 個產品`)}
                  </p>
                  <div className="max-h-[160px] overflow-y-auto space-y-2 pr-1">
                    {parsedProducts.map((p, i) => (
                      <div key={i} className="flex items-center justify-between border rounded-[4px] px-3 py-2" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-medium truncate">{p.name}</p>
                          <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>
                            {p.moq && `${p.moq}`}
                            {p.moq && p.price_range && ' · '}
                            {p.price_range && p.price_range}
                          </p>
                        </div>
                        <button onClick={() => removeParsedProduct(i)} className="text-[12px] px-2 py-1 ml-2 shrink-0" style={{ color: 'var(--error)' }}>✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-[13px] mb-6" style={{ color: 'var(--text-muted)' }}>
                {t('No file handy? You can add products later from the dashboard.', '手邊沒有檔案？您可稍後在控制台新增產品。')}
              </p>

              {setupError && (
                <div className="mb-4 text-[13px] px-4 py-3 rounded-[4px]" style={{ background: '#FEE8EA', color: 'var(--error)' }}>
                  {setupError}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('company')}
                  className="flex-1 text-[14px] py-3 rounded-[4px] border"
                  style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                >
                  {t('Back', '返回')}
                </button>
                <button
                  onClick={finalizeSetup}
                  disabled={saving}
                  className="btn btn-primary flex-1"
                >
                  {saving ? t('Saving...', '儲存中...') : t('Continue', '繼續')}
                </button>
              </div>
            </div>
          )}

          {/* EMAIL */}
          {step === 'email' && (
            <div>
              <h2 className="display text-[1.6rem] leading-[1.15] mb-2">{t('Connect your email', '連接您的電郵')}</h2>
              <p className="text-[14px] mb-6" style={{ color: 'var(--text-muted)' }}>
                {t('So real inquiries land in your inbox and replies send from your own address.', '讓真實詢盤進入收件匣，並以您自己的地址回覆。')}
              </p>

              {mailbox?.connected ? (
                <div className="flex items-center gap-3 border rounded-[4px] p-4 mb-6" style={{ borderColor: 'var(--success)', background: '#E8F5F1' }}>
                  <span style={{ color: 'var(--success)' }}>✓</span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium truncate">{mailbox.address || t('Inbox connected', '收件匣已連接')}</p>
                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{t('Connected', '已連接')}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 mb-6">
                  {[
                    { slug: 'gmail', label: 'Gmail' },
                    { slug: 'outlook', label: 'Outlook' },
                  ].map((app) => (
                    <button
                      key={app.slug}
                      onClick={() => connectEmail(app.slug)}
                      disabled={connecting !== null || !emailConfigured}
                      className="w-full flex items-center justify-center gap-2 text-[14px] font-medium py-3 rounded-[4px] border disabled:opacity-40"
                      style={{ borderColor: 'var(--border)', color: 'var(--text)', background: 'var(--surface)' }}
                    >
                      {connecting === app.slug
                        ? t('Opening authorization…', '正在開啟授權…')
                        : t(`Connect ${app.label}`, `連接 ${app.label}`)}
                    </button>
                  ))}
                  {!emailConfigured && (
                    <p className="text-[12px]" style={{ color: '#b45309' }}>
                      {t('Mailbox connections are not available on this deployment yet. You can connect later in Settings.', '此部署暫未支援連接信箱，您可稍後在設定中連接。')}
                    </p>
                  )}
                  {emailError && (
                    <p className="text-[12px]" style={{ color: 'var(--error)' }}>{emailError}</p>
                  )}
                </div>
              )}

              <button
                onClick={() => {
                  if (stepDoneTracked.current === false) {
                    track('onboarding_completed', {
                      catalog: (importResult?.imported ?? 0) > 0,
                      mailbox: mailbox?.connected === true,
                    });
                    stepDoneTracked.current = true;
                  }
                  setStep('done');
                }}
                className="btn btn-primary w-full"
              >
                {mailbox?.connected ? t('Continue', '繼續') : t('Skip for now', '暫時略過')}
              </button>
            </div>
          )}

          {/* DONE */}
          {step === 'done' && (
            <div className="text-center">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: '#E8F5F1' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#038153" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h2 className="display text-[1.6rem] leading-[1.15] mb-2">{t("You're all set!", '設定完成！')}</h2>
              <p className="text-[14px] mb-6" style={{ color: 'var(--text-muted)' }}>
                {t('Your AI assistant is ready to handle customer inquiries.', '您的 AI 助手已準備好處理客戶查詢。')}
              </p>

              {/* Setup summary */}
              <div className="text-left space-y-3 mb-6 p-4 rounded-[4px]" style={{ background: 'var(--bg)' }}>
                <p className="text-[13px] font-medium mb-3">{t('What was set up:', '已設定的項目：')}</p>
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2.5">
                    <span style={{ color: 'var(--success)' }}>✓</span>
                    <span className="text-[13px]">{t('Company', '公司')}：<span className="font-medium">{companyName}</span></span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span style={{ color: 'var(--success)' }}>✓</span>
                    <span className="text-[13px]">{t('Catalog', '產品目錄')}：<span className="font-medium">{catalogSummary()}</span></span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span style={{ color: 'var(--success)' }}>✓</span>
                    <span className="text-[13px]">{t('Email', '電郵')}：<span className="font-medium">{mailbox?.connected ? (mailbox.address || t('Connected', '已連接')) : t('Not connected yet', '尚未連接')}</span></span>
                  </div>
                  {starterKit && (starterKit.products || starterKit.conversations) ? (
                    <div className="flex items-start gap-2.5">
                      <span style={{ color: 'var(--success)' }}>✓</span>
                      <span className="text-[13px]">
                        {t('Sample data', '範例資料')}：<span className="font-medium">
                          {[
                            starterKit.products ? `${starterKit.products} ${t('products', '產品')}` : null,
                            starterKit.conversations ? `${starterKit.conversations} ${t('conversations', '對話')}` : null,
                          ].filter(Boolean).join(' · ')}
                        </span>
                      </span>
                    </div>
                  ) : null}
                </div>

                {starterKit && (starterKit.products || starterKit.conversations) ? (
                  <p className="text-[12px] leading-[1.6] mt-3" style={{ color: 'var(--text-muted)' }}>
                    {t(
                      'We added a sample catalog and conversations so you can explore Sailwise with real-looking data. Delete anything you don\'t need — your own products are always kept separate.',
                      '我們已加入範例產品及對話，讓您可以用真實感資料體驗 Sailwise。您可隨時刪除不需要的項目 — 您自己上載的產品會獨立保留。'
                    )}
                  </p>
                ) : null}
              </div>

              {/* Quick links */}
              <div className="space-y-2 mb-6">
                {!mailbox?.connected && (
                  <Link
                    href="/admin/settings"
                    className="flex items-center justify-center gap-2 w-full text-[13px] font-medium py-3 rounded-[4px] border"
                    style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    {t('Connect your inbox in Settings', '在設定中連接您的收件匣')}
                  </Link>
                )}
                <Link
                  href="/admin/inbox"
                  className="btn btn-primary w-full"
                >
                  {t('Go to Inbox', '前往收件匣')}
                </Link>
              </div>

              <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                {t('Your AI inbox assistant replies to customers around the clock', '您的 AI 收件匣助手全天候回覆客戶')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
