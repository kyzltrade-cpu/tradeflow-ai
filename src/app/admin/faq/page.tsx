'use client';

import { useState, useEffect } from 'react';
import { useLang } from '@/lib/lang';
import { useCompany } from '@/lib/company';
import { authFetch } from '@/lib/auth-fetch';

interface FaqRule {
  id: string;
  question_pattern: string;
  keywords: string[];
  answer: string;
  priority: number;
}

export default function FaqPage() {
  const { t } = useLang();
  const { companyId } = useCompany();
  const [rules, setRules] = useState<FaqRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newRule, setNewRule] = useState({ question_pattern: '', keywords: '', answer: '', priority: 0 });

  useEffect(() => {
    if (!companyId) return;
    setLoading(true);
    authFetch(`/api/admin/faq?company_id=${companyId}`)
      .then(r => r.json())
      .then((data: FaqRule[] | { error: string }) => {
        if (Array.isArray(data)) setRules(data);
        else { console.error('[faq]', data.error); setRules([]); }
      })
      .catch((e) => { console.error('[faq] fetch error', e); setRules([]); })
      .finally(() => setLoading(false));
  }, [companyId]);

  const handleSave = async () => {
    if (!newRule.question_pattern || !newRule.answer || !companyId) return;
    const keywords = newRule.keywords.split(',').map(k => k.trim().toLowerCase()).filter(Boolean);
    try {
      const isEditing = !!editingId;
      const res = await authFetch('/api/admin/faq', {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(isEditing ? { id: editingId } : { company_id: companyId }),
          question_pattern: newRule.question_pattern,
          answer: newRule.answer,
          priority: newRule.priority,
          keywords,
        }),
      });
      const body = await res.json();
      if (body.error) { console.error('[faq:save]', body.error); return; }
      if (isEditing) {
        setRules(rules.map(r => r.id === editingId ? body : r));
      } else {
        setRules([...rules, body]);
      }
      setNewRule({ question_pattern: '', keywords: '', answer: '', priority: 0 });
      setEditingId(null);
      setShowAdd(false);
    } catch {}
  };

  const handleEdit = (rule: FaqRule) => {
    setEditingId(rule.id);
    setNewRule({
      question_pattern: rule.question_pattern,
      keywords: rule.keywords.join(', '),
      answer: rule.answer,
      priority: rule.priority,
    });
    setShowAdd(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await authFetch(`/api/admin/faq?id=${id}`, { method: 'DELETE' });
      setRules(rules.filter((r) => r.id !== id));
    } catch {}
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-[14px]" style={{ color: 'var(--text-muted)' }}>{t('Loading...', '載入中...')}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-[20px] md:text-[24px] font-semibold tracking-[-0.5px]">{t('FAQ Rules', 'FAQ 規則')}</h1>
          <p className="text-[13px] md:text-[14px] mt-1" style={{ color: 'var(--text-muted)' }}>
            {t('Business rules the AI follows — keywords trigger matching answers', 'AI 遵守的業務規則——關鍵詞觸發匹配答案')}
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="text-[13px] md:text-[14px] font-medium px-4 py-2.5 rounded-[4px] text-white w-full sm:w-auto"
          style={{ background: 'var(--accent)' }}
        >
          {t('Add rule', '新增規則')}
        </button>
      </div>

      {showAdd && (
        <div className="border rounded-[4px] p-5 mb-6" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <h2 className="text-[15px] font-semibold mb-4">{editingId ? t('Edit rule', '編輯規則') : t('New rule', '新規則')}</h2>
          <div className="space-y-3 mb-4">
            <div>
              <label className="block text-[13px] font-medium mb-1">{t('Rule name', '規則名稱')}</label>
              <input
                placeholder={t('e.g. payment terms, shipping policy', '例如：付款條件、運輸政策')}
                value={newRule.question_pattern}
                onChange={(e) => setNewRule({ ...newRule, question_pattern: e.target.value })}
                className="w-full border rounded-[4px] px-3 py-2 text-[14px] focus:outline-none"
                style={{ borderColor: 'var(--border)' }}
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium mb-1">{t('Trigger keywords (comma-separated)', '觸發關鍵詞（逗號分隔）')}</label>
              <input
                placeholder={t('e.g. payment, pay, bank, transfer, deposit, 付款', '例如：payment, pay, bank, deposit, 付款')}
                value={newRule.keywords}
                onChange={(e) => setNewRule({ ...newRule, keywords: e.target.value })}
                className="w-full border rounded-[4px] px-3 py-2 text-[14px] focus:outline-none"
                style={{ borderColor: 'var(--border)' }}
              />
              <p className="text-[12px] mt-1" style={{ color: 'var(--text-muted)' }}>
                {t('When these words appear in a message, this rule fires', '當訊息中出現這些詞時，此規則會觸發')}
              </p>
            </div>
            <div>
              <label className="block text-[13px] font-medium mb-1">{t('AI response', 'AI 回覆')}</label>
              <textarea
                placeholder={t('The AI should answer...', 'AI 應該回答...')}
                value={newRule.answer}
                onChange={(e) => setNewRule({ ...newRule, answer: e.target.value })}
                className="w-full border rounded-[4px] px-3 py-2 text-[14px] h-24 focus:outline-none"
                style={{ borderColor: 'var(--border)' }}
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium mb-1">{t('Priority (higher = used first)', '優先級（越高越優先）')}</label>
              <input
                type="number"
                placeholder="10"
                value={newRule.priority || ''}
                onChange={(e) => setNewRule({ ...newRule, priority: parseInt(e.target.value) || 0 })}
                className="w-48 border rounded-[4px] px-3 py-2 text-[14px] focus:outline-none"
                style={{ borderColor: 'var(--border)' }}
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setShowAdd(false); setEditingId(null); setNewRule({ question_pattern: '', keywords: '', answer: '', priority: 0 }); }}
              className="text-[13px] px-4 py-2 rounded-[4px] border"
              style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
            >
              {t('Cancel', '取消')}
            </button>
            <button
              onClick={handleSave}
              className="text-[13px] font-medium px-4 py-2 rounded-[4px] text-white"
              style={{ background: 'var(--accent)' }}
            >
              {editingId ? t('Save', '儲存') : t('Add rule', '新增規則')}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {rules.map((rule) => (
          <div key={rule.id} className="border rounded-[4px] p-5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] px-2 py-0.5 rounded font-medium" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
                  {t('Priority', '優先級')} {rule.priority}
                </span>
                <p className="text-[14px] font-medium">{rule.question_pattern}</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleEdit(rule)}
                  className="text-[13px] px-3 py-1 rounded"
                  style={{ color: 'var(--accent)' }}
                >
                  {t('Edit', '編輯')}
                </button>
                <button
                  onClick={() => handleDelete(rule.id)}
                  className="text-[13px] px-3 py-1 rounded"
                  style={{ color: 'var(--error)' }}
                >
                  {t('Delete', '刪除')}
                </button>
              </div>
            </div>
            {rule.keywords.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {rule.keywords.map((kw) => (
                  <span key={kw} className="text-[11px] px-2 py-0.5 rounded" style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                    {kw}
                  </span>
                ))}
              </div>
            )}
            <p className="text-[13px] leading-[1.6] whitespace-pre-wrap" style={{ color: 'var(--text-muted)' }}>
              {rule.answer}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
