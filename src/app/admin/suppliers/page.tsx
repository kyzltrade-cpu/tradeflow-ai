'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Globe, Pencil, Trash2, X, Building2 } from 'lucide-react';
import { useLang } from '@/lib/lang';
import { useCompany } from '@/lib/company';
import { useToast } from '@/components/Toast';
import { authFetch } from '@/lib/auth-fetch';

interface Supplier {
  id: string;
  name: string;
  description: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  location: string | null;
  category: string | null;
  product_capabilities: string[] | null;
  certifications: string[] | null;
  tags: string[] | null;
  payment_terms: string | null;
  min_order_value: number | null;
  is_approved: boolean;
  performance_score: number | null;
  typical_lead_time_days: number | null;
  website: string | null;
  notes: string | null;
}

const emptyForm = {
  name: '', description: '', contact_name: '', contact_email: '', contact_phone: '',
  location: '', category: '', capabilities: '', certifications: '', tags: '',
  payment_terms: '', min_order_value: '', typical_lead_time_days: '', performance_score: '', website: '', notes: '',
};

type FormState = typeof emptyForm;

function capArr(v: string): string[] | null {
  const arr = v.split(',').map((s) => s.trim()).filter(Boolean);
  return arr.length ? arr : null;
}

function SupplierForm({
  initial,
  saving,
  onSave,
  onCancel,
}: {
  initial: Supplier | null;
  saving: boolean;
  onSave: (f: FormState) => void;
  onCancel: () => void;
}) {
  const { t } = useLang();
  const [form, setForm] = useState<FormState>(() => {
    if (!initial) return { ...emptyForm, is_approved: 'true' } as unknown as FormState;
    return {
      name: initial.name,
      description: initial.description || '',
      contact_name: initial.contact_name || '',
      contact_email: initial.contact_email || '',
      contact_phone: initial.contact_phone || '',
      location: initial.location || '',
      category: initial.category || '',
      capabilities: (initial.product_capabilities || []).join(', '),
      certifications: (initial.certifications || []).join(', '),
      tags: (initial.tags || []).join(', '),
      payment_terms: initial.payment_terms || '',
      min_order_value: initial.min_order_value != null ? String(initial.min_order_value) : '',
      typical_lead_time_days: initial.typical_lead_time_days != null ? String(initial.typical_lead_time_days) : '',
      performance_score: initial.performance_score != null ? String(initial.performance_score) : '',
      website: initial.website || '',
      notes: initial.notes || '',
      is_approved: String(initial.is_approved),
    } as unknown as FormState;
  });

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const inputCls = 'border rounded-[4px] px-2.5 py-2 text-[13px] focus:outline-none w-full';
  const labelCls = 'text-[11px] font-semibold mb-1 block';

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center overflow-y-auto p-4" onClick={onCancel}>
      <div
        className="w-full max-w-[620px] border rounded-[4px] mt-6 mb-6"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <h3 className="text-[15px] font-semibold">
            {initial ? t('Edit supplier', '編輯供應商') : t('Add supplier', '新增供應商')}
          </h3>
          <button onClick={onCancel} className="p-1 rounded" style={{ color: 'var(--text-muted)' }}>
            <X width="16" height="16" />
          </button>
        </div>
        <div className="p-4 grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className={labelCls}>{t('Name (required)', '名稱（必填）')}</label>
            <input className={inputCls} value={form.name} onChange={set('name')} />
          </div>
          <div className="col-span-2">
            <label className={labelCls}>{t('Description', '描述')}</label>
            <textarea rows={2} className={`${inputCls} resize-none`} value={form.description} onChange={set('description')} />
          </div>
          <div>
            <label className={labelCls}>{t('Contact name', '聯絡人')}</label>
            <input className={inputCls} value={form.contact_name} onChange={set('contact_name')} />
          </div>
          <div>
            <label className={labelCls}>{t('Contact email', '聯絡電郵')}</label>
            <input className={inputCls} value={form.contact_email} onChange={set('contact_email')} />
          </div>
          <div>
            <label className={labelCls}>{t('Contact phone', '聯絡電話')}</label>
            <input className={inputCls} value={form.contact_phone} onChange={set('contact_phone')} />
          </div>
          <div>
            <label className={labelCls}>{t('Location', '所在地')}</label>
            <input className={inputCls} value={form.location} onChange={set('location')} />
          </div>
          <div>
            <label className={labelCls}>{t('Category', '類別')}</label>
            <input className={inputCls} value={form.category} onChange={set('category')} />
          </div>
          <div>
            <label className={labelCls}>{t('Website', '網站')}</label>
            <input className={inputCls} value={form.website} onChange={set('website')} />
          </div>
          <div className="col-span-2">
            <label className={labelCls}>{t('Product capabilities (comma separated)', '產品能力（逗號分隔）')}</label>
            <input className={inputCls} value={form.capabilities} onChange={set('capabilities')} placeholder="E.g. 304 stainless, double-wall vacuum, custom printing" />
          </div>
          <div className="col-span-2">
            <label className={labelCls}>{t('Certifications (comma separated)', '認證（逗號分隔）')}</label>
            <input className={inputCls} value={form.certifications} onChange={set('certifications')} placeholder="E.g. ISO9001, FDA, BSCI" />
          </div>
          <div className="col-span-2">
            <label className={labelCls}>{t('Tags (comma separated)', '標籤（逗號分隔）')}</label>
            <input className={inputCls} value={form.tags} onChange={set('tags')} />
          </div>
          <div>
            <label className={labelCls}>{t('Payment terms', '付款條款')}</label>
            <input className={inputCls} value={form.payment_terms} onChange={set('payment_terms')} placeholder="T/T 30%" />
          </div>
          <div>
            <label className={labelCls}>{t('MOQ value', '最低起訂金額')}</label>
            <input className={inputCls} value={form.min_order_value} onChange={set('min_order_value')} placeholder="1000" />
          </div>
          <div>
            <label className={labelCls}>{t('Lead time (days)', '交期（日）')}</label>
            <input className={inputCls} value={form.typical_lead_time_days} onChange={set('typical_lead_time_days')} placeholder="15" />
          </div>
          <div>
            <label className={labelCls}>{t('Performance score (0-100)', '表現評分（0-100）')}</label>
            <input className={inputCls} value={form.performance_score} onChange={set('performance_score')} placeholder="85" />
          </div>
          <div className="col-span-2">
            <label className="flex items-center gap-2 text-[13px] cursor-pointer">
              <input
                type="checkbox"
                checked={(form as unknown as { is_approved: string }).is_approved === 'true'}
                onChange={(e) => setForm((f) => ({ ...f, is_approved: String(e.target.checked) }))}
              />
              {t('Approved (recommended for sourcing)', '已核准（推薦用於採購）')}
            </label>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-4 py-3 border-t" style={{ borderColor: 'var(--border)' }}>
          <button onClick={onCancel} className="text-[13px] font-medium px-4 py-2 rounded-[4px] border" style={{ borderColor: 'var(--border)' }}>
            {t('Cancel', '取消')}
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={saving || !form.name.trim()}
            className="text-[13px] font-medium px-4 py-2 rounded-[4px] text-white disabled:opacity-50"
            style={{ background: 'var(--accent)' }}
          >
            {saving ? t('Saving…', '儲存中…') : initial ? t('Save changes', '儲存變更') : t('Add supplier', '新增供應商')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SuppliersPage() {
  const { t } = useLang();
  const { companyId, loading: companyLoading } = useCompany();
  const { showToast } = useToast();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState('');
  const [approvedOnly, setApprovedOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchSuppliers = useCallback(async () => {
    if (companyLoading || !companyId) return;
    try {
      setLoading(true);
      setError(null);
      const params = approvedOnly ? '?approved=true' : '';
      const res = await authFetch(`/api/admin/suppliers${params}`);
      if (!res.ok) throw new Error('Failed to load suppliers');
      const data = await res.json();
      setSuppliers(data.suppliers || []);
    } catch (err) {
      console.error('[suppliers] fetch error:', err);
      setError(t('Failed to load suppliers', '載入供應商失敗'));
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  }, [companyId, companyLoading, approvedOnly, t]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
  };

  const handleSave = async (f: FormState) => {
    if (!f.name.trim()) return;
    setSaving(true);
    try {
      const body = {
        name: f.name.trim(),
        description: f.description.trim() || null,
        contact_name: f.contact_name.trim() || null,
        contact_email: f.contact_email.trim() || null,
        contact_phone: f.contact_phone.trim() || null,
        location: f.location.trim() || null,
        category: f.category.trim() || null,
        product_capabilities: capArr(f.capabilities),
        certifications: capArr(f.certifications),
        tags: capArr(f.tags),
        payment_terms: f.payment_terms.trim() || null,
        min_order_value: f.min_order_value ? parseFloat(f.min_order_value) : null,
        typical_lead_time_days: f.typical_lead_time_days ? parseInt(f.typical_lead_time_days, 10) : null,
        performance_score: f.performance_score ? parseFloat(f.performance_score) : null,
        website: f.website.trim() || null,
        notes: f.notes.trim() || null,
        is_approved: (f as unknown as { is_approved: string }).is_approved === 'true',
      };
      const res = editing
        ? await authFetch(`/api/admin/suppliers/${editing.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        : await authFetch('/api/admin/suppliers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error('Save failed');
      showToast(t('Supplier saved', '供應商已儲存'), 'success');
      closeForm();
      fetchSuppliers();
    } catch {
      showToast(t('Failed to save supplier', '儲存供應商失敗'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleApproved = async (supplier: Supplier) => {
    const next = !supplier.is_approved;
    setSuppliers((prev) => prev.map((s) => (s.id === supplier.id ? { ...s, is_approved: next } : s)));
    try {
      const res = await authFetch(`/api/admin/suppliers/${supplier.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_approved: next }),
      });
      if (!res.ok) throw new Error('Patch failed');
    } catch {
      setSuppliers((prev) => prev.map((s) => (s.id === supplier.id ? { ...s, is_approved: supplier.is_approved } : s)));
      showToast(t('Failed to update', '更新失敗'), 'error');
    }
  };

  const handleDelete = async (supplier: Supplier) => {
    if (!confirm(t('Delete this supplier? This cannot be undone.', '刪除此供應商？此操作無法復原。'))) return;
    try {
      const res = await authFetch(`/api/admin/suppliers/${supplier.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setSuppliers((prev) => prev.filter((s) => s.id !== supplier.id));
      showToast(t('Supplier deleted', '供應商已刪除'), 'success');
    } catch {
      showToast(t('Failed to delete supplier', '刪除供應商失敗'), 'error');
    }
  };

  const visible = search.trim()
    ? suppliers.filter((s) =>
        [s.name, s.description, s.location, s.category, (s.product_capabilities || []).join(' ')]
          .filter(Boolean).join(' ').toLowerCase().includes(search.toLowerCase())
      )
    : suppliers;

  return (
    <div className="flex flex-col h-[calc(100vh-112px)]">
      <div className="flex items-center justify-between gap-3 mb-4 flex-shrink-0 flex-wrap">
        <div>
          <h1 className="text-[20px] md:text-[24px] font-semibold tracking-[-0.5px]">{t('Suppliers', '供應商')}</h1>
          <p className="text-[13px] md:text-[14px] mt-1" style={{ color: 'var(--text-muted)' }}>
            {t('Your trusted directory — suggested against every inbox quote', '您的可信供應商目錄——每個收件匣報價都會自動比對')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2" width="14" height="14" style={{ color: 'var(--text-muted)' }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('Search…', '搜尋…')}
              className="border rounded-[4px] pl-8 pr-3 py-2 text-[13px] focus:outline-none w-44"
              style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
            />
          </div>
          <button
            onClick={() => { setEditing(null); setShowForm(true); }}
            className="flex items-center gap-1.5 text-[13px] font-medium px-3 py-2 rounded-[4px] text-white"
            style={{ background: 'var(--accent)' }}
          >
            <Plus width="14" height="14" />
            {t('Add supplier', '新增供應商')}
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col border rounded-[4px] min-h-0 overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <div className="flex gap-1 px-3 pt-3 pb-2 flex-shrink-0 overflow-x-auto border-b" style={{ borderColor: 'var(--border)' }}>
          <button
            onClick={() => setApprovedOnly(false)}
            className="text-[11px] md:text-[12px] px-2.5 py-1 rounded-[4px] font-medium whitespace-nowrap"
            style={{ background: !approvedOnly ? 'var(--accent)' : 'transparent', color: !approvedOnly ? 'white' : 'var(--text-muted)' }}
          >
            {t('All', '全部')}
          </button>
          <button
            onClick={() => setApprovedOnly(true)}
            className="text-[11px] md:text-[12px] px-2.5 py-1 rounded-[4px] font-medium whitespace-nowrap"
            style={{ background: approvedOnly ? 'var(--accent)' : 'transparent', color: approvedOnly ? 'white' : 'var(--text-muted)' }}
          >
            {t('Approved', '已核准')}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="rounded-[4px] border p-3 animate-pulse space-y-2" style={{ borderColor: 'var(--border)' }}>
                  <div className="h-3 w-28 rounded" style={{ background: 'var(--border)' }} />
                  <div className="h-3 w-40 rounded" style={{ background: 'var(--border)' }} />
                  <div className="h-3 w-24 rounded" style={{ background: 'var(--border)' }} />
                </div>
              ))}
            </div>
          ) : visible.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <Building2 className="mx-auto mb-3" width="32" height="32" style={{ stroke: 'var(--text-muted)' }} />
              <p className="text-[14px] font-medium mb-1">{error || t('No suppliers found', '找不到供應商')}</p>
              <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                {t('Add your trusted suppliers so the inbox can recommend them', '新增您的可信供應商，收件匣便能自動推薦')}
              </p>
            </div>
          ) : (
            <div className="p-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {visible.map((s) => (
                <div key={s.id} className="rounded-[4px] border p-3 flex flex-col" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold truncate">{s.name}</p>
                      <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                        {s.location || '—'}{s.category ? ` · ${s.category}` : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => toggleApproved(s)}
                      className="text-[9px] px-1.5 py-0.5 rounded font-semibold flex-shrink-0"
                      style={{
                        background: s.is_approved ? '#E8F5F1' : 'var(--bg)',
                        color: s.is_approved ? '#038153' : 'var(--text-muted)',
                        border: `1px solid ${s.is_approved ? '#038153' : 'var(--border)'}`,
                      }}
                      title={t('Toggle approved', '切換核准狀態')}
                    >
                      {s.is_approved ? t('APPROVED', '已核准') : t('UNVERIFIED', '未核准')}
                    </button>
                  </div>
                  {s.description && (
                    <p className="text-[12px] mt-1.5 line-clamp-2" style={{ color: 'var(--text-muted)' }}>{s.description}</p>
                  )}
                  {s.product_capabilities && s.product_capabilities.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {s.product_capabilities.slice(0, 4).map((c) => (
                        <span key={c} className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                          {c}
                        </span>
                      ))}
                      {s.product_capabilities.length > 4 && (
                        <span className="text-[10px] px-1 py-0.5 rounded" style={{ color: 'var(--text-muted)' }}>
                          +{s.product_capabilities.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="text-[11px] mt-2 space-y-0.5" style={{ color: 'var(--text-muted)' }}>
                    {s.contact_name && <p>👤 {s.contact_name}{s.contact_email ? ` · ${s.contact_email}` : ''}</p>}
                    {s.typical_lead_time_days && <p>⏱ {t('Lead time', '交期')} {s.typical_lead_time_days}d</p>}
                    {s.payment_terms && <p>💳 {s.payment_terms}</p>}
                    {s.performance_score != null && <p>⭐ {s.performance_score}/100</p>}
                  </div>
                  <div className="flex items-center gap-2 mt-auto pt-3">
                    {s.website && (
                      <a href={s.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[11px] font-medium" style={{ color: 'var(--accent)' }}>
                        <Globe width="11" height="11" />
                        {t('Website', '網站')}
                      </a>
                    )}
                    <button
                      onClick={() => { setEditing(s); setShowForm(true); }}
                      className="ml-auto flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-[4px] border"
                      style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
                    >
                      <Pencil width="11" height="11" />
                      {t('Edit', '編輯')}
                    </button>
                    <button
                      onClick={() => handleDelete(s)}
                      className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-[4px] border"
                      style={{ borderColor: 'var(--border)', color: 'var(--error)' }}
                    >
                      <Trash2 width="11" height="11" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <SupplierForm
          initial={editing}
          saving={saving}
          onSave={handleSave}
          onCancel={closeForm}
        />
      )}
    </div>
  );
}