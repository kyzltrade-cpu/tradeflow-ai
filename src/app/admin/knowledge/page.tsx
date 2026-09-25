'use client';

import { useState, useRef, useEffect } from 'react';
import { useLang } from '@/lib/lang';
import { useCompany } from '@/lib/company';
import { useToast } from '@/components/Toast';
import { authFetch } from '@/lib/auth-fetch';
import { supabaseBrowser } from '@/lib/auth';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';

async function parsePdf(file: File): Promise<{ text: string; pageCount: number }> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => (item as { str?: string }).str || '')
      .join(' ');
    fullText += `--- Page ${i} ---\n${pageText}\n\n`;
  }

  return { text: fullText.trim(), pageCount: pdf.numPages };
}

async function parseDocx(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

interface KbDocument {
  id: string;
  name: string;
  type: string;
  content: string;
  addedAt: string;
  size: string;
}

interface FlowStep {
  trigger: string;
  response: string;
}

interface Goal {
  id?: string;
  title: string;
  description: string;
  enabled: boolean;
  greeting: string;
  flow_steps: FlowStep[];
  handoff_message: string;
  triggers: string[];
}

const EMPTY_GOAL: Goal = {
  title: '',
  description: '',
  enabled: true,
  greeting: '',
  flow_steps: [],
  handoff_message: '',
  triggers: [],
};

const GOAL_TEMPLATES: Omit<Goal, 'id' | 'enabled'>[] = [
  {
    title: 'The Concierge (Warm Welcome)',
    description: 'Open-ended, human-like greeting. Parses customer intent naturally, then routes to the right specialist. Feels like a helpful email conversation.',
    greeting: "Hi there! Thanks for reaching out to {company}. I'm here to help. Could you tell me a bit about what you're looking for today?",
    flow_steps: [
      { trigger: 'product inquiry / specific item', response: "Got it. That sounds like a great project. Could you share a bit more detail — like the quantity you're looking for, any specific specs, and whether you have drawings, samples, or a product catalog ready?" },
      { trigger: 'has tech pack / ready to order', response: "Perfect. Since you already have a tech pack, I'll flag this as 'Ready for Quote' for our team. You can reply with the file attached and our team will review it." },
      { trigger: 'just browsing / not ready yet', response: "No problem at all. Feel free to reply whenever you're ready — I'm here 24/7 if you have any questions." },
      { trigger: 'pricing question', response: "Pricing depends on quantity, specs, and materials. Could you share a few details about what you need? I'll get you a ballpark range right away." },
    ],
    handoff_message: "🔥 New Lead: {client_info} | {product} | {volume} | {status}. Priority: {priority}",
    triggers: ['hello', 'hi', 'hey', 'inquiry', 'interested'],
  },
  {
    title: 'Automated KYC & Onboarding',
    description: 'Collects customer requirements, compliance needs, and target pricing through a structured email conversation. Instantly structures data for your sales team.',
    greeting: "Welcome to {company}! I'd love to help you find the right products. To get started, could you tell me what you're looking for and roughly how many units you need?",
    flow_steps: [
      { trigger: 'product / industry type', response: "Great — a few quick questions so I can prepare your quote:\n\n1. What's your target order quantity?\n2. Which certification documents do you need for the product (CE, FDA, UL, etc.)?\n3. What's your ideal price range per unit?" },
      { trigger: 'certifications needed', response: "Got it — {certifications} required. I'll include the relevant certification documents with your quote. Note that this can add 2-3 weeks to lead time. Is that workable?" },
      { trigger: 'budget / price range', response: "Perfect, I've noted your budget range. Based on what you've shared, this looks like a {priority} priority project. I'm connecting you with our {specialist} team now." },
      { trigger: 'timeline / urgency', response: "Understood on the timeline. I'll flag this as {urgency} priority. Our team will review your inquiry and get back to you within {sla}." },
    ],
    handoff_message: "📋 New KYC Lead: {client_info} | Industry: {industry} | Products: {products} | Budget: {budget} | Certs: {certs} | Timeline: {timeline}",
    triggers: ['new customer', 'registration', 'sign up', 'onboard'],
  },
  {
    title: 'Instant Quote Generation',
    description: 'Generates preliminary quotes by asking for quantity, specs, and delivery requirements. Matches against product catalog and provides pricing tiers.',
    greeting: "Hi! I can help you get a quick quote. What product are you interested in, and how many units do you need?",
    flow_steps: [
      { trigger: 'product + quantity', response: "Thanks! For {quantity} units of {product}, the estimated range is {price_range}. This includes standard packaging. Need any custom branding or special packaging?" },
      { trigger: 'customization request', response: "Customization is definitely available. Could you share more details? Things like:\n- Logo printing (screen print, embroidery, laser engraving?)\n- Custom packaging or labels\n- Color variants\n\nThis helps me give you an accurate quote." },
      { trigger: 'lead time / MOQ', response: "Standard lead time for {product} is {lead_time}, and our MOQ is {moq}. If you need a faster delivery, let me know your target date and I'll check what we can do." },
      { trigger: 'payment terms', response: "We typically accept T/T (bank transfer) for standard orders and L/C for larger orders. We can discuss terms once we understand your requirements better." },
      { trigger: 'shipping / delivery', response: "For shipping, I need to know:\n1. Destination country?\n2. preferred method (sea freight, air, express)?\n3. Required delivery date?\n\nI'll factor this into the total cost." },
      { trigger: 'ready to order', response: "Great! I've prepared your preliminary quote. I'm sending it to our team for final confirmation. You'll receive the formal quotation within 24 hours. In the meantime, is there anything else you'd like to adjust?" },
    ],
    handoff_message: "💰 Quote Request: {client_info} | Product: {product} | Qty: {quantity} | Est: {price_range} | Customization: {customization} | Shipping: {shipping}",
    triggers: ['price', 'quote', 'cost', 'how much', 'pricing'],
  },
  {
    title: '24/7 Multilingual Support',
    description: 'Handles inquiries in English, Chinese (Simplified & Traditional), and Cantonese. Detects language and responds naturally in the same language.',
    greeting: "Hi! Welcome to {company}. How can I help you today? / 你好！歡迎來到 {company}。有什麼可以幫到你？",
    flow_steps: [
      { trigger: 'Chinese language detected', response: "您好！感謝您聯繫 {company}。請問有什麼可以幫到您？我可以為您介紹產品、報價，或者解答任何問題。" },
      { trigger: 'English language detected', response: "Hi there! Thanks for reaching out. I can help with product info, pricing, orders, or any questions you have. What are you looking for?" },
      { trigger: 'product inquiry (any language)', response: "Sure! I'd be happy to help. Could you tell me more about what you're looking for? (Quantity, specs, any certifications needed?)" },
    ],
    handoff_message: "🌐 Multilingual Lead: {client_info} | Language: {language} | Product: {product} | Volume: {volume}",
    triggers: ['你好', '中文', 'chinese', 'multilingual'],
  },
  {
    title: 'Order Tracking & Updates',
    description: 'Provides real-time order status, shipping tracking, and delivery estimates. Handles common post-order questions automatically.',
    greeting: "Hi! I can help you track your order. Could you share your order number or the email address used for the purchase?",
    flow_steps: [
      { trigger: 'order number provided', response: "Let me look that up for you. One moment...\n\n📦 Order #{order_number}\nStatus: {status}\nEstimated delivery: {eta}\n\nWould you like me to send you the tracking link?" },
      { trigger: 'shipping delay', response: "I see there's a delay with your order. Here's what I know:\n- Original ETA: {original_eta}\n- Updated ETA: {new_eta}\n- Reason: {reason}\n\nI've flagged this for priority follow-up. Is there anything else I can help with?" },
      { trigger: 'return / exchange', response: "I can help with that. Could you share:\n1. Order number\n2. Reason for return\n3. Preferred resolution (refund, exchange, store credit?)\n\nI'll get this processed for you." },
    ],
    handoff_message: "📦 Order Inquiry: {client_info} | Order: {order_number} | Status: {status} | Issue: {issue}",
    triggers: ['track', 'order', 'shipping', 'delivery', 'where is'],
  },
];

export default function KnowledgeBasePage() {
  const { t } = useLang();
  const { companyId } = useCompany();
  const { showToast } = useToast();
  const [documents, setDocuments] = useState<KbDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [scraping, setScraping] = useState(false);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [savingGoals, setSavingGoals] = useState(false);
  const [editingGoal, setEditingGoal] = useState<string | number | null>(null);
  const [newStepTrigger, setNewStepTrigger] = useState('');
  const [newStepResponse, setNewStepResponse] = useState('');
  const [selectedTemplates, setSelectedTemplates] = useState<number[]>([]);
  const [goalJustAdded, setGoalJustAdded] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!companyId) return;
    setLoading(true);
    Promise.all([
      authFetch(`/api/admin/knowledge?company_id=${companyId}`).then(r => r.json()),
      authFetch(`/api/admin/goals?company_id=${companyId}`).then(r => r.json()),
    ]).then(([kbData, goalsData]) => {
      if (Array.isArray(kbData)) {
        setDocuments(kbData.map(d => ({
          id: d.id,
          name: d.name,
          type: d.type,
          content: d.content,
          addedAt: new Date(d.created_at).toLocaleDateString(),
          size: `${(d.file_size / 1024).toFixed(1)} KB`,
        })));
      }
      if (goalsData.goals) {
        setGoals(goalsData.goals.map((g: Goal & { id: string; flow_steps?: FlowStep[]; triggers?: string[] }) => ({
          id: g.id,
          title: g.title,
          description: g.description,
          enabled: g.enabled,
          greeting: g.greeting || '',
          flow_steps: g.flow_steps || [],
          handoff_message: g.handoff_message || '',
          triggers: g.triggers || [],
        })));
      }
    }).catch((e) => { console.error('[knowledge] fetch error', e); })
      .finally(() => setLoading(false));
  }, [companyId]);

  const parseFile = async (file: File): Promise<{ content: string; type: string }> => {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';

    if (['xlsx', 'xls', 'csv'].includes(ext)) {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      let allText = '';
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const csv = XLSX.utils.sheet_to_csv(sheet);
        allText += `--- Sheet: ${sheetName} ---\n${csv}\n\n`;
      }
      return { content: allText.trim(), type: 'spreadsheet' };
    }

    if (ext === 'pdf') {
      const { text, pageCount } = await parsePdf(file);
      if (!text.trim()) {
        throw new Error(`PDF contains no extractable text (${pageCount} pages). The file may be scanned images.`);
      }
      return { content: text, type: 'pdf' };
    }

    if (ext === 'docx' || ext === 'doc') {
      const text = await parseDocx(file);
      if (!text.trim()) {
        throw new Error('DOCX file contains no extractable text.');
      }
      return { content: text, type: 'document' };
    }

    const text = await file.text();
    return { content: text, type: 'text' };
  };

  const handleFiles = async (files: FileList | File[]) => {
    setParsing(true);
    setParseError(null);
    for (const file of Array.from(files)) {
      try {
        const { content, type } = await parseFile(file);
        const sizeKB = (file.size / 1024).toFixed(1);
        const res = await authFetch('/api/admin/knowledge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            company_id: companyId,
            name: file.name,
            type,
            content,
            file_size: file.size,
          }),
        });
        const saved = await res.json();
        if (saved.id) {
          setDocuments(prev => [...prev, {
            id: saved.id,
            name: saved.name,
            type: saved.type,
            content: saved.content,
            addedAt: new Date(saved.created_at).toLocaleDateString(),
            size: `${sizeKB} KB`,
          }]);
        } else if (saved.error) {
          setParseError(`${file.name}: ${saved.error}`);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        setParseError(`${file.name}: ${msg}`);
        console.error('[knowledge] parse error', err);
      }
    }
    setParsing(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  };

  const handleDelete = async (id: string) => {
    try {
      await authFetch(`/api/admin/knowledge?id=${id}`, { method: 'DELETE' });
      setDocuments(documents.filter(d => d.id !== id));
    } catch {
      // silently fail
    }
  };

  const handleScrapeWebsite = async () => {
    if (!websiteUrl.trim() || !companyId) return;
    setScraping(true);
    setParseError(null);
    try {
      const url = websiteUrl.trim();
      const res = await authFetch('/api/admin/knowledge/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: companyId, url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to scrape website');
      if (data.id) {
        setDocuments(prev => [...prev, {
          id: data.id,
          name: data.name,
          type: data.type,
          content: data.content,
          addedAt: new Date(data.created_at).toLocaleDateString(),
          size: `${(data.file_size / 1024).toFixed(1)} KB`,
        }]);
        setWebsiteUrl('');
        showToast(t('Website added to knowledge base', '網站已加入知識庫'), 'success');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setParseError(msg);
      showToast(msg, 'error');
    } finally {
      setScraping(false);
    }
  };

  // --- Goals ---
  const saveGoalsToServer = async (goalsToSave: Goal[]) => {
    if (!companyId) return;
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      const token = session?.access_token;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await authFetch('/api/admin/goals', {
        method: 'POST',
        headers,
        body: JSON.stringify({ company_id: companyId, goals: goalsToSave }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('[goals] save failed:', err);
        throw new Error(err.error || 'Failed to save goals');
      }
    } catch (e) {
      console.error('[goals] save error:', e);
      showToast(t('Failed to save goals', '儲存目標失敗'), 'error');
    }
  };

  const handleSaveGoals = async () => {
    setSavingGoals(true);
    await saveGoalsToServer(goals);
    showToast(t('Goals saved', '目標已儲存'), 'success');
    setSavingGoals(false);
  };

  const toggleGoal = (index: number) => {
    const newGoals = goals.map((g, i) => i === index ? { ...g, enabled: !g.enabled } : g);
    setGoals(newGoals);
    saveGoalsToServer(newGoals);
  };

  const removeGoal = (index: number) => {
    const newGoals = goals.filter((_, i) => i !== index);
    setGoals(newGoals);
    if (editingGoal === index) setEditingGoal(null);
    saveGoalsToServer(newGoals);
  };

  const addGoalFromTemplate = (template: Omit<Goal, 'id' | 'enabled'>) => {
    if (goals.some(g => g.title === template.title)) {
      showToast(t('Goal already added', '目標已存在'), 'error');
      return;
    }
    setGoals(prev => [...prev, { ...template, enabled: true }]);
  };

  const toggleTemplateSelection = (templateIndex: number) => {
    // no-op, templates are one-click add now
  };

  const addSelectedTemplates = () => {
    // no-op
  };

  const addBlankGoal = () => {
    const newGoals = [...goals, { ...EMPTY_GOAL }];
    setGoals(newGoals);
    setEditingGoal(`custom-${newGoals.length - 1}`);
    saveGoalsToServer(newGoals);
  };

  const updateGoal = (index: number, updates: Partial<Goal>) => {
    setGoals(prev => prev.map((g, i) => i === index ? { ...g, ...updates } : g));
  };

  const addFlowStep = (goalIndex: number) => {
    if (!newStepTrigger.trim() || !newStepResponse.trim()) return;
    const goal = goals[goalIndex];
    updateGoal(goalIndex, {
      flow_steps: [...goal.flow_steps, { trigger: newStepTrigger.trim(), response: newStepResponse.trim() }],
    });
    setNewStepTrigger('');
    setNewStepResponse('');
  };

  const removeFlowStep = (goalIndex: number, stepIndex: number) => {
    const goal = goals[goalIndex];
    updateGoal(goalIndex, {
      flow_steps: goal.flow_steps.filter((_, i) => i !== stepIndex),
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-[14px]" style={{ color: 'var(--text-muted)' }}>
          {t('Loading...', '載入中...')}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[20px] md:text-[24px] font-semibold tracking-[-0.5px]">{t('Knowledge Base', '知識庫')}</h1>
          <p className="text-[14px] mt-1" style={{ color: 'var(--text-muted)' }}>
            {t('Upload files, connect your website, and set AI goals — the AI uses all of this to answer customer questions', '上傳檔案、連接網站、設定 AI 目標——AI 使用這些資料回答客戶問題')}
          </p>
        </div>
      </div>

      {/* Upload area */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed rounded-[4px] p-10 text-center cursor-pointer mb-6 transition-colors"
        style={{
          borderColor: dragOver ? 'var(--accent)' : 'var(--border)',
          background: dragOver ? 'var(--accent-light)' : 'var(--surface)',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".xlsx,.xls,.csv,.txt,.md,.pdf,.docx,.doc"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          className="hidden"
        />
        <svg className="mx-auto mb-3" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        <p className="text-[14px] font-medium mb-1">
          {parsing ? t('Parsing files...', '正在解析檔案...') : t('Drop files here or click to upload', '拖放檔案到此處或點擊上傳')}
        </p>
        <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
          {t('Supports Excel, CSV, TXT, MD, PDF, Word (.docx)', '支援 Excel、CSV、TXT、MD、PDF、Word (.docx)')}
        </p>
      </div>

      {/* Website URL input */}
      <div className="border rounded-[4px] p-5 mb-6" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <div className="flex items-center gap-2 mb-3">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="2" y1="12" x2="22" y2="12"/>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
          </svg>
          <div>
            <p className="text-[14px] font-medium">{t('Add company website', '新增公司網站')}</p>
            <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
              {t('The AI will learn from your website to answer customer questions', 'AI 會從您的網站學習以回答客戶問題')}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <input
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            placeholder="https://yourcompany.com"
            className="flex-1 border rounded-[4px] px-3 py-2 text-[14px] focus:outline-none"
            style={{ borderColor: 'var(--border)' }}
            onKeyDown={(e) => e.key === 'Enter' && handleScrapeWebsite()}
          />
          <button
            onClick={handleScrapeWebsite}
            disabled={scraping || !websiteUrl.trim()}
            className="text-[13px] font-medium px-4 py-2 rounded-[4px] text-white disabled:opacity-50 shrink-0"
            style={{ background: 'var(--accent)' }}
          >
            {scraping ? t('Adding...', '新增中...') : t('Add website', '新增網站')}
          </button>
        </div>
      </div>

      {/* AI Goals Section */}
      <div className="border rounded-[4px] p-5 mb-6" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <div className="flex items-center gap-2 mb-1">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
          <div>
            <p className="text-[14px] font-medium">{t('AI Conversation Goals', 'AI 對話目標')}</p>
            <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
              {t('Define how the AI greets customers, handles conversations, and hands off to your team', '定義 AI 如何問候客戶、處理對話，以及轉交給您的團隊')}
            </p>
          </div>
        </div>

        {/* Templates */}
        <div className="mt-4 mb-4">
          <p className="text-[12px] font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
            {t('Quick-start templates:', '快速開始範本：')}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {GOAL_TEMPLATES.map((template, i) => {
              const activeGoal = goals.find(g => g.title === template.title);
              const isActive = !!activeGoal;
              const isEditing = editingGoal === i;
              const goalIndex = goals.findIndex(g => g.title === template.title);

              return (
                <div key={i}>
                  <button
                    onClick={() => {
                      if (!isActive) {
                        // Activate: add to goals
                        const newGoals = [...goals, { ...template, enabled: true }];
                        setGoals(newGoals);
                        saveGoalsToServer(newGoals);
                      } else {
                        // Toggle editor
                        setEditingGoal(isEditing ? null : i);
                      }
                    }}
                    className="w-full text-left border rounded-[4px] p-3 transition-all duration-200"
                    style={{
                      borderColor: isActive ? 'var(--accent)' : 'var(--border)',
                      background: isActive ? 'var(--accent-light)' : 'transparent',
                    }}
                  >
                    <div className="flex items-center gap-2">
                      {isActive && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // Deactivate: remove from goals
                            const newGoals = goals.filter(g => g.title !== template.title);
                            setGoals(newGoals);
                            saveGoalsToServer(newGoals);
                            setEditingGoal(null);
                          }}
                          className="w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all duration-200"
                          style={{
                            borderColor: 'var(--accent)',
                            background: 'var(--accent)',
                          }}
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                        </button>
                      )}
                      {!isActive && (
                        <div
                          className="w-4 h-4 rounded border-2 shrink-0"
                          style={{ borderColor: 'var(--border)' }}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium" style={{ color: isActive ? 'var(--accent)' : 'var(--text)' }}>{template.title}</p>
                        <p className="text-[11px] mt-0.5 line-clamp-2" style={{ color: 'var(--text-muted)' }}>
                          {template.description}
                        </p>
                      </div>
                      {isActive && (
                        <svg
                          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5"
                          style={{ transform: isEditing ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s', flexShrink: 0 }}
                        >
                          <polyline points="6 9 12 15 18 9"/>
                        </svg>
                      )}
                    </div>
                  </button>

                  {/* Inline editor when active and expanded */}
                  {isActive && isEditing && goalIndex >= 0 && (
                    <div className="border border-t-0 rounded-b-[4px] p-3 space-y-3" style={{ borderColor: 'var(--accent)', background: 'var(--bg)' }}>
                      {/* Greeting */}
                      <div>
                        <label className="block text-[11px] font-medium mb-1">{t('Opening message', '問候語')}</label>
                        <textarea
                          value={goals[goalIndex].greeting}
                          onChange={(e) => {
                            const newGoals = [...goals];
                            newGoals[goalIndex] = { ...newGoals[goalIndex], greeting: e.target.value };
                            setGoals(newGoals);
                          }}
                          onBlur={() => saveGoalsToServer(goals)}
                          rows={2}
                          className="w-full border rounded-[4px] px-2 py-1.5 text-[12px] focus:outline-none resize-none"
                          style={{ borderColor: 'var(--border)' }}
                          placeholder={t('What the AI says first', 'AI 第一句說什麼')}
                        />
                      </div>

                      {/* Flow steps */}
                      <div>
                        <label className="block text-[11px] font-medium mb-1">{t('Flow steps', '流程步驟')}</label>
                        {goals[goalIndex].flow_steps.map((step, si) => (
                          <div key={si} className="flex items-start gap-1 mb-1">
                            <div className="flex-1 min-w-0">
                              <input
                                value={step.trigger}
                                onChange={(e) => {
                                  const newGoals = [...goals];
                                  const steps = [...newGoals[goalIndex].flow_steps];
                                  steps[si] = { ...steps[si], trigger: e.target.value };
                                  newGoals[goalIndex] = { ...newGoals[goalIndex], flow_steps: steps };
                                  setGoals(newGoals);
                                }}
                                onBlur={() => saveGoalsToServer(goals)}
                                className="w-full border rounded px-1.5 py-1 text-[11px] focus:outline-none"
                                style={{ borderColor: 'var(--border)' }}
                                placeholder={t('Trigger', '觸發詞')}
                              />
                              <input
                                value={step.response}
                                onChange={(e) => {
                                  const newGoals = [...goals];
                                  const steps = [...newGoals[goalIndex].flow_steps];
                                  steps[si] = { ...steps[si], response: e.target.value };
                                  newGoals[goalIndex] = { ...newGoals[goalIndex], flow_steps: steps };
                                  setGoals(newGoals);
                                }}
                                onBlur={() => saveGoalsToServer(goals)}
                                className="w-full border rounded px-1.5 py-1 text-[11px] focus:outline-none mt-1"
                                style={{ borderColor: 'var(--border)' }}
                                placeholder={t('Response', '回覆')}
                              />
                            </div>
                            <button
                              onClick={() => {
                                const newGoals = [...goals];
                                newGoals[goalIndex] = { ...newGoals[goalIndex], flow_steps: newGoals[goalIndex].flow_steps.filter((_, j) => j !== si) };
                                setGoals(newGoals);
                                saveGoalsToServer(newGoals);
                              }}
                              className="text-[11px] mt-1 shrink-0"
                              style={{ color: 'var(--error)' }}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => {
                            const newGoals = [...goals];
                            newGoals[goalIndex] = { ...newGoals[goalIndex], flow_steps: [...newGoals[goalIndex].flow_steps, { trigger: '', response: '' }] };
                            setGoals(newGoals);
                          }}
                          className="text-[11px] mt-1"
                          style={{ color: 'var(--accent)' }}
                        >
                          + {t('Add step', '新增步驟')}
                        </button>
                      </div>

                      {/* Handoff */}
                      <div>
                        <label className="block text-[11px] font-medium mb-1">{t('Handoff message', '轉接訊息')}</label>
                        <input
                          value={goals[goalIndex].handoff_message}
                          onChange={(e) => {
                            const newGoals = [...goals];
                            newGoals[goalIndex] = { ...newGoals[goalIndex], handoff_message: e.target.value };
                            setGoals(newGoals);
                          }}
                          onBlur={() => saveGoalsToServer(goals)}
                          className="w-full border rounded px-2 py-1.5 text-[11px] focus:outline-none"
                          style={{ borderColor: 'var(--border)' }}
                          placeholder={t('Message when transferring to human', '轉接真人時的訊息')}
                        />
                      </div>

                      {/* Triggers */}
                      <div>
                        <label className="block text-[11px] font-medium mb-1">
                          {t('Trigger keywords', '觸發關鍵字')}
                          <span className="font-normal ml-1" style={{ color: 'var(--text-muted)' }}>
                            {t('(goal activates when these words appear)', '（當這些字詞出現時啟動目標）')}
                          </span>
                        </label>
                        <div className="flex flex-wrap gap-1 mb-1">
                          {(goals[goalIndex].triggers || []).map((trigger, ti) => (
                            <span
                              key={ti}
                              className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border"
                              style={{ borderColor: 'var(--accent)', color: 'var(--accent)', background: 'var(--accent-light)' }}
                            >
                              {trigger}
                              <button
                                onClick={() => {
                                  const newGoals = [...goals];
                                  newGoals[goalIndex] = { ...newGoals[goalIndex], triggers: newGoals[goalIndex].triggers.filter((_, j) => j !== ti) };
                                  setGoals(newGoals);
                                  saveGoalsToServer(newGoals);
                                }}
                                className="text-[10px]"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                        <input
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ',') {
                              e.preventDefault();
                              const val = (e.target as HTMLInputElement).value.trim();
                              if (val && !(goals[goalIndex].triggers || []).includes(val)) {
                                const newGoals = [...goals];
                                newGoals[goalIndex] = { ...newGoals[goalIndex], triggers: [...(newGoals[goalIndex].triggers || []), val] };
                                setGoals(newGoals);
                                saveGoalsToServer(newGoals);
                              }
                              (e.target as HTMLInputElement).value = '';
                            }
                          }}
                          className="w-full border rounded px-2 py-1.5 text-[11px] focus:outline-none"
                          style={{ borderColor: 'var(--border)' }}
                          placeholder={t('Type a keyword and press Enter', '輸入關鍵字後按 Enter')}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Custom goals (non-template) */}
        {goals.filter(g => !GOAL_TEMPLATES.some(t => t.title === g.title)).length > 0 && (
          <div className="mt-4 mb-4">
            <p className="text-[12px] font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
              {t('Custom goals:', '自訂目標：')}
            </p>
            <div className="space-y-2">
              {goals.map((goal, i) => {
                if (GOAL_TEMPLATES.some(t => t.title === goal.title)) return null;
                const isEditing = editingGoal === `custom-${i}`;
                return (
                  <div key={i}>
                    <div
                      className="border rounded-[4px] p-3 cursor-pointer transition-all duration-200"
                      style={{
                        borderColor: goal.enabled ? 'var(--accent)' : 'var(--border)',
                        background: goal.enabled ? 'var(--accent-light)' : 'transparent',
                      }}
                      onClick={() => setEditingGoal(isEditing ? null : `custom-${i}`)}
                    >
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const newGoals = goals.map((g, j) => j === i ? { ...g, enabled: !g.enabled } : g);
                            setGoals(newGoals);
                            saveGoalsToServer(newGoals);
                          }}
                          className="w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all duration-200"
                          style={{
                            borderColor: goal.enabled ? 'var(--accent)' : 'var(--border)',
                            background: goal.enabled ? 'var(--accent)' : 'transparent',
                          }}
                        >
                          {goal.enabled && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium" style={{ color: goal.enabled ? 'var(--accent)' : 'var(--text)' }}>
                            {goal.title || t('Untitled goal', '未命名目標')}
                          </p>
                          {goal.triggers && goal.triggers.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {goal.triggers.map((tr, ti) => (
                                <span key={ti} className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
                                  {tr}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const newGoals = goals.filter((_, j) => j !== i);
                            setGoals(newGoals);
                            saveGoalsToServer(newGoals);
                          }}
                          className="text-[11px] shrink-0 px-2 py-1"
                          style={{ color: 'var(--error)' }}
                        >
                          {t('Delete', '刪除')}
                        </button>
                      </div>
                    </div>

                    {/* Inline editor */}
                    {isEditing && (
                      <div className="border border-t-0 rounded-b-[4px] p-3 space-y-3" style={{ borderColor: 'var(--accent)', background: 'var(--bg)' }}>
                        <div>
                          <label className="block text-[11px] font-medium mb-1">{t('Goal title', '目標標題')}</label>
                          <input
                            value={goal.title}
                            onChange={(e) => {
                              const newGoals = [...goals];
                              newGoals[i] = { ...newGoals[i], title: e.target.value };
                              setGoals(newGoals);
                            }}
                            onBlur={() => saveGoalsToServer(goals)}
                            className="w-full border rounded px-2 py-1.5 text-[12px] focus:outline-none"
                            style={{ borderColor: 'var(--border)' }}
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium mb-1">{t('Opening message', '問候語')}</label>
                          <textarea
                            value={goal.greeting}
                            onChange={(e) => {
                              const newGoals = [...goals];
                              newGoals[i] = { ...newGoals[i], greeting: e.target.value };
                              setGoals(newGoals);
                            }}
                            onBlur={() => saveGoalsToServer(goals)}
                            rows={2}
                            className="w-full border rounded px-2 py-1.5 text-[11px] focus:outline-none resize-none"
                            style={{ borderColor: 'var(--border)' }}
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium mb-1">
                            {t('Trigger keywords', '觸發關鍵字')}
                            <span className="font-normal ml-1" style={{ color: 'var(--text-muted)' }}>
                              {t('(goal activates when these words appear)', '（當這些字詞出現時啟動目標）')}
                            </span>
                          </label>
                          <div className="flex flex-wrap gap-1 mb-1">
                            {(goal.triggers || []).map((trigger, ti) => (
                              <span
                                key={ti}
                                className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border"
                                style={{ borderColor: 'var(--accent)', color: 'var(--accent)', background: 'var(--accent-light)' }}
                              >
                                {trigger}
                                <button
                                  onClick={() => {
                                    const newGoals = [...goals];
                                    newGoals[i] = { ...newGoals[i], triggers: newGoals[i].triggers.filter((_, j) => j !== ti) };
                                    setGoals(newGoals);
                                    saveGoalsToServer(newGoals);
                                  }}
                                  className="text-[10px]"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                          <input
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ',') {
                                e.preventDefault();
                                const val = (e.target as HTMLInputElement).value.trim();
                                if (val && !(goal.triggers || []).includes(val)) {
                                  const newGoals = [...goals];
                                  newGoals[i] = { ...newGoals[i], triggers: [...(newGoals[i].triggers || []), val] };
                                  setGoals(newGoals);
                                  saveGoalsToServer(newGoals);
                                }
                                (e.target as HTMLInputElement).value = '';
                              }
                            }}
                            className="w-full border rounded px-2 py-1.5 text-[11px] focus:outline-none"
                            style={{ borderColor: 'var(--border)' }}
                            placeholder={t('Type a keyword and press Enter', '輸入關鍵字後按 Enter')}
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium mb-1">{t('Handoff message', '轉接訊息')}</label>
                          <input
                            value={goal.handoff_message}
                            onChange={(e) => {
                              const newGoals = [...goals];
                              newGoals[i] = { ...newGoals[i], handoff_message: e.target.value };
                              setGoals(newGoals);
                            }}
                            onBlur={() => saveGoalsToServer(goals)}
                            className="w-full border rounded px-2 py-1.5 text-[11px] focus:outline-none"
                            style={{ borderColor: 'var(--border)' }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Add blank goal */}
        <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <button
            onClick={addBlankGoal}
            className="text-[13px] font-medium px-4 py-2 rounded-[4px] border"
            style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
          >
            + {t('Add blank goal', '新增空白目標')}
          </button>
        </div>
      </div>

      {/* Parse error */}
      {parseError && (
        <div className="mb-4 p-3 rounded-[4px] text-[13px]" style={{ background: 'var(--error-light, #fef2f2)', color: 'var(--error, #dc2626)', border: '1px solid var(--error, #dc2626)' }}>
          {parseError}
          <button onClick={() => setParseError(null)} className="ml-2 underline">{t('Dismiss', '關閉')}</button>
        </div>
      )}

      {/* Document list */}
      <div className="space-y-3">
        {documents.map((doc) => (
          <div key={doc.id} className="border rounded-[4px] p-5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-[4px] flex items-center justify-center" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                  {doc.type === 'website' ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="2" y1="12" x2="22" y2="12"/>
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                    </svg>
                  ) : doc.type === 'spreadsheet' ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                      <line x1="3" y1="9" x2="21" y2="9"/>
                      <line x1="3" y1="15" x2="21" y2="15"/>
                      <line x1="9" y1="3" x2="9" y2="21"/>
                      <line x1="15" y1="3" x2="15" y2="21"/>
                    </svg>
                  ) : doc.type === 'pdf' ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--error)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                  ) : doc.type === 'document' ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/>
                      <line x1="16" y1="17" x2="8" y2="17"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/>
                      <line x1="16" y1="17" x2="8" y2="17"/>
                    </svg>
                  )}
                </div>
                <div>
                  <p className="text-[14px] font-medium">{doc.name}</p>
                  <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                    {doc.addedAt} · {doc.size}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleDelete(doc.id)}
                className="text-[13px] px-3 py-1 rounded"
                style={{ color: 'var(--error)' }}
              >
                {t('Delete', '刪除')}
              </button>
            </div>
            <div className="mt-3 p-3 rounded-[4px] text-[12px] leading-[1.6] max-h-[120px] overflow-y-auto whitespace-pre-wrap" style={{ background: 'var(--bg)', color: 'var(--text-muted)' }}>
              {doc.content}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
