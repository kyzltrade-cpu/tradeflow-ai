'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLang, LangToggle } from '@/lib/lang';
import { useAuth, supabaseBrowser } from '@/lib/auth';
import * as XLSX from 'xlsx';

type Step = 'welcome' | 'company' | 'products' | 'goals' | 'done';

interface ParsedProduct {
  name: string;
  description?: string;
  moq?: string;
  price_range?: string;
  category?: string;
}

const GOAL_TEMPLATES = [
  {
    id: 'concierge',
    icon: '👋',
    label: 'The Concierge',
    labelZh: '禮賓服務',
    description: 'Warm, human-like greeting. Parses intent naturally, then routes to the right answer.',
    descriptionZh: '友善的人類式問候，自然理解意圖，然後導向正確的答案。',
    prompt: 'You are a warm, human-like sales assistant for {company}. Greet every customer naturally — like texting a real person. Listen to what they need, then provide helpful answers about products, pricing, MOQ, and availability. If you need more details, ask friendly follow-up questions. Never sound robotic or corporate.',
  },
  {
    id: 'kyc',
    icon: '📋',
    label: 'Automated KYC & Onboarding',
    labelZh: '自動化客戶審查',
    description: 'Collects requirements, compliance needs, and pricing targets through a structured flow.',
    descriptionZh: '透過結構化流程收集需求、合規要求和目標價格。',
    prompt: 'You are a professional onboarding assistant for {company}. When a new buyer contacts you, guide them through a structured but friendly conversation to collect: company name, contact person, email, phone, product interest, required quantity (MOQ), target price, delivery timeline, and any compliance requirements. Be warm but efficient. Summarize what you collected at the end.',
  },
  {
    id: 'quote',
    icon: '💰',
    label: 'Instant Quote Generation',
    labelZh: '即時報價',
    description: 'Generates preliminary quotes by asking for quantity, specs, and delivery needs.',
    descriptionZh: '透過詢問數量、規格和交貨需求來生成初步報價。',
    prompt: 'You are a quote specialist for {company}. When a buyer asks about pricing, first ask for: product name/type, quantity needed, specifications or model, delivery destination, and required delivery date. Then provide a clear, structured quote with unit price, total price, MOQ, lead time, and payment terms. Reference the product catalog for accurate pricing.',
  },
  {
    id: 'multilingual',
    icon: '🌍',
    label: '24/7 Multilingual Support',
    labelZh: '24/7 多語言支援',
    description: 'Handles inquiries in English, Chinese, Cantonese, and Spanish. Detects language automatically.',
    descriptionZh: '支援英文、中文、廣東話和西班牙語。自動偵測語言並以相同語言回覆。',
    prompt: 'You are a multilingual sales assistant for {company}. ALWAYS reply in the same language the customer uses. If they write in English, reply in English. If they write in Traditional Chinese (繁體中文), reply in Traditional Chinese. If they write in Simplified Chinese (简体中文), reply in Simplified Chinese. If they write in Cantonese style, reply in Cantonese style. If they write in Spanish, reply in Spanish. Detect the language from the first message and stay consistent. Be helpful with product info, pricing, and MOQ questions.',
  },
  {
    id: 'tracking',
    icon: '📦',
    label: 'Order Tracking & Updates',
    labelZh: '訂單追蹤與更新',
    description: 'Provides order status, shipping tracking, and delivery estimates.',
    descriptionZh: '提供訂單狀態、運輸追蹤和交貨估算。',
    prompt: 'You are an order support assistant for {company}. When customers ask about their order status, help them with: order confirmation, production status, estimated shipping date, tracking number, and delivery timeline. Be clear and professional. If you don\'t have specific order data, ask for their order number or contact details to look it up. Always provide realistic timelines.',
  },
];

export default function OnboardingPage() {
  const { t } = useLang();
  const { user, loading } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<Step>('welcome');
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/signup');
    }
  }, [user, loading, router]);

  // Products
  const [manualProductName, setManualProductName] = useState('');
  const [manualProductMoq, setManualProductMoq] = useState('');
  const [manualProductPrice, setManualProductPrice] = useState('');
  const [parsedProducts, setParsedProducts] = useState<ParsedProduct[]>([]);
  const [csvDragOver, setCsvDragOver] = useState(false);
  const [csvParsing, setCsvParsing] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);

  // Goals
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [customGoal, setCustomGoal] = useState('');

  const STEPS: Step[] = ['welcome', 'company', 'products', 'goals', 'done'];
  const currentStepIndex = STEPS.indexOf(step);

  const parseCsvFile = async (file: File): Promise<ParsedProduct[]> => {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!['xlsx', 'xls', 'csv'].includes(ext)) return [];
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'buffer' });
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
    setCsvParsing(true);
    const products = await parseCsvFile(file);
    setParsedProducts(products);
    setCsvParsing(false);
  };

  const addManualProduct = () => {
    if (!manualProductName.trim()) return;
    setParsedProducts(prev => [...prev, {
      name: manualProductName.trim(),
      moq: manualProductMoq.trim() || undefined,
      price_range: manualProductPrice.trim() || undefined,
    }]);
    setManualProductName('');
    setManualProductMoq('');
    setManualProductPrice('');
  };

  const removeParsedProduct = (index: number) => {
    setParsedProducts(prev => prev.filter((_, i) => i !== index));
  };

  const getSystemPrompt = (): string => {
    const template = GOAL_TEMPLATES.find(g => g.id === selectedGoal);
    if (template) {
      return template.prompt.replace('{company}', companyName);
    }
    // Custom goal
    if (customGoal.trim()) {
      return `You are a sales assistant for {company}. ${customGoal}. Always reply in the same language the customer uses. Be helpful, professional, and concise.`.replace('{company}', companyName);
    }
    // Default
    return `You are a professional sales assistant for ${companyName}. Answer customer questions about products, pricing, MOQ, and availability. Always reply in the same language the customer uses. Be helpful, professional, and concise.`;
  };

  const handleComplete = async () => {
    setSaving(true);
    setSetupError(null);
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      const token = session?.access_token;
      const authHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) authHeaders['Authorization'] = `Bearer ${token}`;

      // 1. Create company
      const companyRes = await fetch('/api/admin/company', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ name: companyName, industry, user_id: user?.id }),
      });
      const companyData = await companyRes.json();

      if (!companyRes.ok || !companyData.id) {
        throw new Error(companyData.error || 'Failed to create company');
      }

      const companyId = companyData.id;
      localStorage.setItem('tradeflow_company_id', companyId);

      // 2. Save settings + system prompt
      const settingsRes = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          company_id: companyId,
          system_prompt: getSystemPrompt(),
          company_name: companyName,
          industry,
          whatsapp_phone_number_id: whatsappNumber || undefined,
        }),
      });

      if (!settingsRes.ok) {
        const settingsData = await settingsRes.json().catch(() => ({}));
        throw new Error(settingsData.error || 'Failed to save settings');
      }

      // 3. Save products
      for (const product of parsedProducts) {
        const prodRes = await fetch('/api/admin/products', {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            company_id: companyId,
            name: product.name,
            description: product.description || null,
            moq: product.moq || null,
            price_range: product.price_range || null,
            category: product.category || null,
          }),
        });
        if (!prodRes.ok) {
          const prodData = await prodRes.json().catch(() => ({}));
          throw new Error(prodData.error || 'Failed to save products');
        }
      }

      setStep('done');
    } catch (err) {
      console.error('[onboarding] setup error:', err);
      setSetupError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-[480px]">
        {/* Progress */}
        <p className="text-[13px] mb-2 text-center" style={{ color: 'var(--text-muted)' }}>
          {t(`Step ${currentStepIndex + 1} of ${STEPS.length}`, `第 ${currentStepIndex + 1} 步，共 ${STEPS.length} 步`)}
        </p>
        <div className="flex gap-1.5 mb-10">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className="h-[3px] flex-1 rounded-full"
              style={{
                background: currentStepIndex >= i ? 'var(--accent)' : 'var(--border)',
              }}
            />
          ))}
        </div>

        <div className="border rounded-[4px] p-8" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <div className="flex justify-end mb-2">
            <LangToggle />
          </div>

          {/* WELCOME */}
          {step === 'welcome' && (
            <div>
              <h1 className="text-[28px] font-semibold tracking-[-0.8px] mb-3">
                {t('Get started with Backtide', '開始使用 Backtide')}
              </h1>
              <p className="text-[15px] leading-[1.6] mb-8" style={{ color: 'var(--text-muted)' }}>
                {t('Your AI copilot for trading companies. An inquiry lands in your inbox and Backtide drives it through the whole sourcing pipeline — extract, clarify, RFQ, quote.', '您的貿易公司 AI 副駕駛。詢盤進入您的收件匣後，Backtide 將它推進整個採購流程 — 抽取、澄清、RFQ、報價。')}
              </p>
              <div className="space-y-3 mb-8">
                <div className="flex items-center gap-3 text-[14px]">
                  <span style={{ color: 'var(--success)' }}>✓</span>
                  <span>{t('Every spec extracted with source citations', '每個規格都附來源引用')}</span>
                </div>
                <div className="flex items-center gap-3 text-[14px]">
                  <span style={{ color: 'var(--success)' }}>✓</span>
                  <span>{t('Batch RFQ to your suppliers, you approve every send', '批次 RFQ 給供應商，每次發送由您審批')}</span>
                </div>
                <div className="flex items-center gap-3 text-[14px]">
                  <span style={{ color: 'var(--success)' }}>✓</span>
                  <span>{t('Works on Email + WhatsApp', '支援 Email + WhatsApp')}</span>
                </div>
                <div className="flex items-center gap-3 text-[14px]">
                  <span style={{ color: 'var(--success)' }}>✓</span>
                    <span>{t('HK$880/mo — no contracts', 'HK$880/月——無合約')}</span>
                </div>
              </div>
              <button
                onClick={() => setStep('company')}
                className="w-full text-[14px] font-medium py-3 rounded-[4px] text-white"
                style={{ background: 'var(--accent)' }}
              >
                {t('Get started', '開始使用')}
              </button>
              <p className="text-[13px] text-center mt-4" style={{ color: 'var(--text-muted)' }}>
                {t('Already have an account?', '已有帳戶？')}{' '}
                <Link href="/admin" style={{ color: 'var(--accent)' }}>{t('Go to dashboard', '前往控制台')}</Link>
              </p>
            </div>
          )}

          {/* COMPANY */}
          {step === 'company' && (
            <div>
              <h2 className="text-[22px] font-semibold tracking-[-0.5px] mb-2">{t('About your company', '關於您的公司')}</h2>
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
                <div>
                  <label className="block text-[13px] font-medium mb-1">{t('WhatsApp Phone Number ID (optional)', 'WhatsApp Phone Number ID（可選）')}</label>
                  <input
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    placeholder="e.g. 1234567890"
                    className="w-full border rounded-[4px] px-3 py-2.5 text-[14px] focus:outline-none"
                    style={{ borderColor: 'var(--border)' }}
                  />
                  <p className="text-[12px] mt-1" style={{ color: 'var(--text-muted)' }}>
                    {t('From Meta App Dashboard → WhatsApp → API Setup. You can set this up later in Settings.', '來自 Meta App Dashboard → WhatsApp → API Setup。您也可以稍後在設定中設定。')}
                  </p>
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
                  onClick={() => setStep('products')}
                  disabled={!companyName}
                  className="flex-1 text-[14px] font-medium py-3 rounded-[4px] text-white disabled:opacity-40"
                  style={{ background: 'var(--accent)' }}
                >
                  {t('Continue', '繼續')}
                </button>
              </div>
            </div>
          )}

          {/* PRODUCTS */}
          {step === 'products' && (
            <div>
              <h2 className="text-[22px] font-semibold tracking-[-0.5px] mb-2">{t('Add your products', '新增您的產品')}</h2>
              <p className="text-[14px] mb-6" style={{ color: 'var(--text-muted)' }}>
                {t('What do you sell? Upload a CSV or add products manually.', '您銷售什麼？上傳 CSV 或手動新增產品。')}
              </p>

              {/* CSV Upload */}
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
                  {csvParsing ? t('Parsing...', '正在解析...') : t('Drop CSV/Excel here or click to upload', '拖放 CSV/Excel 到此處或點擊上傳')}
                </p>
                <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                  {t('Headers: product name, description, MOQ, price, category', '欄位：product name, description, MOQ, price, category')}
                </p>
              </div>

              {/* Parsed preview */}
              {parsedProducts.length > 0 && (
                <div className="mb-4">
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

              {/* Manual */}
              <div className="mb-6">
                <p className="text-[13px] font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
                  {t('Or add manually:', '或手動新增：')}
                </p>
                <div className="space-y-2">
                  <input
                    value={manualProductName}
                    onChange={(e) => setManualProductName(e.target.value)}
                    placeholder={t('Product name (e.g. Stainless Steel Water Bottle)', '產品名稱（例如：不鏽鋼水瓶）')}
                    className="w-full border rounded-[4px] px-3 py-2.5 text-[14px] focus:outline-none"
                    style={{ borderColor: 'var(--border)' }}
                  />
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      value={manualProductMoq}
                      onChange={(e) => setManualProductMoq(e.target.value)}
                      placeholder="MOQ"
                      className="flex-1 min-w-0 border rounded-[4px] px-3 py-2.5 text-[14px] focus:outline-none"
                      style={{ borderColor: 'var(--border)' }}
                    />
                    <input
                      value={manualProductPrice}
                      onChange={(e) => setManualProductPrice(e.target.value)}
                      placeholder={t('Price range', '價格範圍')}
                      className="flex-1 min-w-0 border rounded-[4px] px-3 py-2.5 text-[14px] focus:outline-none"
                      style={{ borderColor: 'var(--border)' }}
                    />
                  </div>
                  <button
                    onClick={addManualProduct}
                    disabled={!manualProductName.trim()}
                    className="w-full text-[14px] font-medium py-2.5 rounded-[4px] text-white disabled:opacity-40"
                    style={{ background: 'var(--accent)' }}
                  >
                    {t('Add product', '新增產品')}
                  </button>
                </div>
              </div>

              <p className="text-[13px] mb-6" style={{ color: 'var(--text-muted)' }}>
                {t('You can add more products later from the dashboard.', '您可以稍後在控制台中新增更多產品。')}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep('company')}
                  className="flex-1 text-[14px] py-3 rounded-[4px] border"
                  style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                >
                  {t('Back', '返回')}
                </button>
                <button
                  onClick={() => setStep('goals')}
                  className="flex-1 text-[14px] font-medium py-3 rounded-[4px] text-white"
                  style={{ background: 'var(--accent)' }}
                >
                  {t('Continue', '繼續')}
                </button>
              </div>
            </div>
          )}

          {/* GOALS */}
          {step === 'goals' && (
            <div>
              <h2 className="text-[22px] font-semibold tracking-[-0.5px] mb-2">
                {t('AI Conversation Goals', 'AI 對話目標')}
              </h2>
              <p className="text-[14px] mb-2" style={{ color: 'var(--text-muted)' }}>
                {t('Define how the AI greets customers, handles conversations, and hands off to your team.', '定義 AI 如何問候客戶、處理對話，以及何時轉交給您的團隊。')}
              </p>

              <div className="space-y-3 mb-6 mt-6">
                {GOAL_TEMPLATES.map((goal) => (
                  <button
                    key={goal.id}
                    onClick={() => { setSelectedGoal(goal.id); setCustomGoal(''); }}
                    className="w-full text-left border rounded-[4px] p-4 transition-colors"
                    style={{
                      borderColor: selectedGoal === goal.id ? 'var(--accent)' : 'var(--border)',
                      background: selectedGoal === goal.id ? 'var(--accent-light)' : 'var(--surface)',
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-[20px]">{goal.icon}</span>
                      <div className="flex-1">
                        <p className="text-[14px] font-medium">{t(goal.label, goal.labelZh)}</p>
                        <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {t(goal.description, goal.descriptionZh)}
                        </p>
                      </div>
                      <div
                        className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                        style={{
                          borderColor: selectedGoal === goal.id ? 'var(--accent)' : 'var(--border)',
                          background: selectedGoal === goal.id ? 'var(--accent)' : 'transparent',
                        }}
                      >
                        {selectedGoal === goal.id && (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </button>
                ))}

                {/* Custom goal */}
                <div
                  className="border rounded-[4px] p-4 transition-colors"
                  style={{
                    borderColor: selectedGoal === 'custom' ? 'var(--accent)' : 'var(--border)',
                    background: selectedGoal === 'custom' ? 'var(--accent-light)' : 'var(--surface)',
                  }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-[20px]">✨</span>
                    <p className="text-[14px] font-medium">{t('Custom Goal', '自訂目標')}</p>
                    <div
                      className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ml-auto cursor-pointer"
                      onClick={() => { setSelectedGoal('custom'); }}
                      style={{
                        borderColor: selectedGoal === 'custom' ? 'var(--accent)' : 'var(--border)',
                        background: selectedGoal === 'custom' ? 'var(--accent)' : 'transparent',
                      }}
                    >
                      {selectedGoal === 'custom' && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                  </div>
                  {selectedGoal === 'custom' && (
                    <textarea
                      value={customGoal}
                      onChange={(e) => setCustomGoal(e.target.value)}
                      placeholder={t('Describe what you want the AI to do...', '描述您希望 AI 做什麼...')}
                      rows={3}
                      className="w-full border rounded-[4px] px-3 py-2.5 text-[13px] leading-[1.6] focus:outline-none resize-none"
                      style={{ borderColor: 'var(--border)' }}
                      autoFocus
                    />
                  )}
                </div>
              </div>

              {setupError && (
                <div className="mb-4 text-[13px] px-4 py-3 rounded-[4px]" style={{ background: '#FEE8EA', color: 'var(--error)' }}>
                  {setupError}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('products')}
                  className="flex-1 text-[14px] py-3 rounded-[4px] border"
                  style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                >
                  {t('Back', '返回')}
                </button>
                <button
                  onClick={handleComplete}
                  disabled={saving || (!selectedGoal && !customGoal.trim())}
                  className="flex-1 text-[14px] font-medium py-3 rounded-[4px] text-white disabled:opacity-40"
                  style={{ background: 'var(--accent)' }}
                >
                  {saving ? t('Saving...', '儲存中...') : t('Finish setup', '完成設定')}
                </button>
              </div>
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
              <h2 className="text-[22px] font-semibold tracking-[-0.5px] mb-2">{t("You're all set!", '設定完成！')}</h2>
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
                    <span className="text-[13px]">{t('Products', '產品')}：<span className="font-medium">{parsedProducts.length} {t('added', '已新增')}</span></span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span style={{ color: 'var(--success)' }}>✓</span>
                    <span className="text-[13px]">{t('AI Goal', 'AI 目標')}：<span className="font-medium">
                      {GOAL_TEMPLATES.find(g => g.id === selectedGoal)?.label || t('Custom', '自訂')}
                    </span></span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span style={{ color: 'var(--success)' }}>✓</span>
                    <span className="text-[13px]">{t('Languages', '語言')}：<span className="font-medium">{t('English + Chinese (auto)', '英文 + 中文（自動）')}</span></span>
                  </div>
                </div>
              </div>

              {/* Webhook URL */}
              <div className="text-left mb-6 p-4 rounded-[4px]" style={{ background: 'var(--bg)' }}>
                <p className="text-[13px] font-medium mb-2">{t('Your webhook URL:', '您的 Webhook URL：')}</p>
                <div className="border rounded-[4px] px-3 py-2 text-[12px] font-mono break-all" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                  {typeof window !== 'undefined' ? `${window.location.origin}/api/webhooks/whatsapp` : '/api/webhooks/whatsapp'}
                </div>
                <p className="text-[11px] mt-1.5" style={{ color: 'var(--text-muted)' }}>
                  {t('Set this in Meta App Dashboard → WhatsApp → Configuration → Webhook', '在 Meta App Dashboard → WhatsApp → Configuration → Webhook 中設定此 URL')}
                </p>
              </div>

              {/* Quick links */}
              <div className="space-y-2 mb-6">
                <Link
                  href="/admin/settings"
                  className="flex items-center justify-center gap-2 w-full text-[13px] font-medium py-3 rounded-[4px] border"
                  style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  {t('Connect WhatsApp in Settings', '在設定中連接 WhatsApp')}
                </Link>
                <Link
                  href="/admin"
                  className="block w-full text-center text-[14px] font-medium py-3 rounded-[4px] text-white"
                  style={{ background: 'var(--accent)' }}
                >
                  {t('Go to Dashboard', '前往控制台')}
                </Link>
              </div>

              <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                {t('Share your WhatsApp number with customers — AI replies 24/7', '將 WhatsApp 號碼分享給客戶——AI 全天候回覆')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
