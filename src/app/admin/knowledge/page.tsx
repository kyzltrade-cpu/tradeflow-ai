'use client';

import { useState, useRef, useEffect } from 'react';
import { useLang } from '@/lib/lang';
import { useCompany } from '@/lib/company';
import { useToast } from '@/components/Toast';
import { authFetch } from '@/lib/auth-fetch';
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

interface Rule {
  id?: string;
  category: string;
  text: string;
  enabled: boolean;
}

const DEFAULT_RULE_CATEGORIES = [
  'The Concierge (Warm Welcome)',
  'Automated KYC & Onboarding',
  'Instant Quote Generation',
  '24/7 Multilingual Support',
  'Order Tracking & Updates',
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
  const [rules, setRules] = useState<Rule[]>([]);
  const [newCategory, setNewCategory] = useState('');
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
        setRules(
          (goalsData.goals as Array<{ id: string; title?: string; description?: string; enabled?: boolean }>).map((g) => ({
            id: g.id,
            category: g.title || 'General',
            text: g.description || '',
            enabled: g.enabled ?? true,
          }))
        );
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

  // --- Rules ---
  const saveRulesToServer = async (rulesToSave: Rule[]) => {
    if (!companyId) return;
    try {
      const res = await authFetch('/api/admin/goals', {
        method: 'POST',
        body: JSON.stringify({
          company_id: companyId,
          goals: rulesToSave.map((r) => ({
            title: r.category,
            description: r.text,
            enabled: r.enabled,
          })),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('[rules] save failed:', err);
        throw new Error(err.error || 'Failed to save rules');
      }
    } catch (e) {
      console.error('[rules] save error:', e);
      showToast(t('Failed to save rules', '儲存規則失敗'), 'error');
    }
  };

  const addRule = (category: string) => {
    setRules((prev) => [...prev, { category, text: '', enabled: true }]);
  };

  const updateRule = (index: number, patch: Partial<Rule>) => {
    setRules((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const removeRule = (index: number) => {
    const next = rules.filter((_, i) => i !== index);
    setRules(next);
    saveRulesToServer(next);
  };

  const addCategory = (raw: string) => {
    const category = raw.trim();
    if (!category) return;
    if (rules.some((r) => r.category === category)) {
      setNewCategory('');
      return;
    }
    const next = [...rules, { category, text: '', enabled: true }];
    setRules(next);
    setNewCategory('');
    saveRulesToServer(next);
  };

  const removeCategory = (category: string) => {
    const next = rules.filter((r) => r.category !== category);
    setRules(next);
    saveRulesToServer(next);
  };

  const toggleRule = (index: number) => {
    const next = rules.map((r, i) => (i === index ? { ...r, enabled: !r.enabled } : r));
    setRules(next);
    saveRulesToServer(next);
  };

  const categories = Array.from(new Set(rules.map((r) => r.category)));
  const suggestedCategories = DEFAULT_RULE_CATEGORIES.filter((c) => !categories.includes(c));

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
            {t('Upload files, connect your website, and set AI rules — the AI uses all of this to answer customer questions', '上傳檔案、連接網站、設定 AI 規則——AI 使用這些資料回答客戶問題')}
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

      {/* AI Rules Section */}
      <div className="border rounded-[4px] p-5 mb-6" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <div className="flex items-center gap-2 mb-1">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
          <div>
            <p className="text-[14px] font-medium">{t('AI Rules', 'AI 規則')}</p>
            <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
              {t('Set the rules your AI must follow. Group them into categories — add anything you like.', '設定 AI 必須遵守的規則。可依類別分組——任何內容皆可。')}
            </p>
          </div>
        </div>

        {/* Suggested categories */}
        {suggestedCategories.length > 0 && (
          <div className="mt-4">
            <p className="text-[12px] font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
              {t('Quick-start categories:', '快速開始類別：')}
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestedCategories.map((category) => (
                <button
                  key={category}
                  onClick={() => addCategory(category)}
                  className="text-[12px] font-medium px-3 py-1.5 rounded-[4px] border transition-all duration-200"
                  style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                >
                  + {category}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Categories with their rules */}
        <div className="mt-4 space-y-3">
          {categories.length === 0 ? (
            <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
              {t('No rules yet. Add a category above, or create your own below.', '暫無規則。請從上方新增類別，或於下方建立自訂類別。')}
            </p>
          ) : (
            categories.map((category) => {
              const catRules = rules
                .map((rule, index) => ({ rule, index }))
                .filter(({ rule }) => rule.category === category);
              return (
                <div key={category} className="border rounded-[4px] p-3" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="text-[13px] font-semibold" style={{ color: 'var(--text)' }}>{category}</p>
                    <button
                      onClick={() => removeCategory(category)}
                      className="text-[12px] px-2 py-0.5 rounded border"
                      style={{ borderColor: 'var(--border)', color: 'var(--error)' }}
                    >
                      {t('Remove', '移除')}
                    </button>
                  </div>
                  <div className="space-y-2">
                    {catRules.map(({ rule, index }) => (
                      <div key={index} className="flex items-start gap-2">
                        <button
                          onClick={() => toggleRule(index)}
                          className="mt-1.5 w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all duration-200"
                          style={{
                            borderColor: rule.enabled ? 'var(--accent)' : 'var(--border)',
                            background: rule.enabled ? 'var(--accent)' : 'transparent',
                          }}
                        >
                          {rule.enabled && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                        </button>
                        <textarea
                          value={rule.text}
                          onChange={(e) => updateRule(index, { text: e.target.value })}
                          onBlur={() => saveRulesToServer(rules)}
                          rows={2}
                          className="flex-1 border rounded-[4px] px-2 py-1.5 text-[12px] focus:outline-none resize-none"
                          style={{ borderColor: 'var(--border)' }}
                          placeholder={t('Describe the rule your AI should follow', '描述 AI 應遵守的規則')}
                        />
                        <button
                          onClick={() => removeRule(index)}
                          className="mt-1 text-[13px] shrink-0 px-1.5"
                          style={{ color: 'var(--error)' }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => addRule(category)}
                    className="text-[12px] font-medium mt-2"
                    style={{ color: 'var(--accent)' }}
                  >
                    + {t('Add rule', '新增規則')}
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Add custom category */}
        <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <div className="flex gap-2">
            <input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCategory(newCategory); } }}
              className="flex-1 border rounded-[4px] px-3 py-2 text-[13px] focus:outline-none"
              style={{ borderColor: 'var(--border)' }}
              placeholder={t('New category name', '新類別名稱')}
            />
            <button
              onClick={() => addCategory(newCategory)}
              disabled={!newCategory.trim()}
              className="text-[13px] font-medium px-4 py-2 rounded-[4px] border disabled:opacity-50 shrink-0"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
            >
              + {t('Add category', '新增類別')}
            </button>
          </div>
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
