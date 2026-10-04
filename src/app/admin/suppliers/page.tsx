'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLang } from '@/lib/lang';
import { useToast } from '@/components/Toast';
import { authFetch } from '@/lib/auth-fetch';

/* The suppliers table stores legal_name / trading_name (there is no `name`
   column) and JSONB arrays for capabilities, certifications and tags. The
   fields below mirror that schema exactly — an earlier version of this page
   used invented columns (name, category, website) that do not exist. */

interface Supplier {
  id: string;
  legal_name: string;
  trading_name: string | null;
  location: string | null;
  product_capabilities: string[] | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  moq_notes: string | null;
  payment_terms: string | null;
  typical_lead_time_days: number | null;
  certifications: string[] | null;
  is_approved: boolean;
  notes: string | null;
}

type FormState = {
  legal_name: string;
  trading_name: string;
  location: string;
  capabilities: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  payment_terms: string;
  typical_lead_time_days: string;
  moq_notes: string;
  certifications: string;
  notes: string;
  is_approved: boolean;
};

const EMPTY: FormState = {
  legal_name: '',
  trading_name: '',
  location: '',
  capabilities: '',
  contact_name: '',
  contact_email: '',
  contact_phone: '',
  payment_terms: '',
  typical_lead_time_days: '',
  moq_notes: '',
  certifications: '',
  notes: '',
  is_approved: true,
};

const listOf = (v: string): string[] =>
  v
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const joined = (v: string[] | null): string => (v || []).join(', ');

function displayName(s: Supplier): string {
  return s.trading_name || s.legal_name;
}

export default function SuppliersPage() {
  const { t } = useLang();
  const { showToast } = useToast();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/admin/suppliers');
      const data = await res.json().catch(() => ({}));
      if (data.error) {
        console.error('[suppliers]', data.error);
        setSuppliers([]);
      } else {
        setSuppliers((data.suppliers || []) as Supplier[]);
      }
    } catch (e) {
      console.error('[suppliers] fetch error', e);
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load. `loading` already starts true, so this only sets state from
  // async callbacks (setting it synchronously would cascade renders).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch('/api/admin/suppliers');
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (data.error) {
          console.error('[suppliers]', data.error);
          setSuppliers([]);
        } else {
          setSuppliers((data.suppliers || []) as Supplier[]);
        }
      } catch (e) {
        if (cancelled) return;
        console.error('[suppliers] fetch error', e);
        setSuppliers([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const startAdd = () => {
    setForm(EMPTY);
    setEditing(null);
    setShowAdd(true);
  };

  const startEdit = (s: Supplier) => {
    setEditing(s);
    setShowAdd(false);
    setForm({
      legal_name: s.legal_name || '',
      trading_name: s.trading_name || '',
      location: s.location || '',
      capabilities: joined(s.product_capabilities),
      contact_name: s.contact_name || '',
      contact_email: s.contact_email || '',
      contact_phone: s.contact_phone || '',
      payment_terms: s.payment_terms || '',
      typical_lead_time_days:
        s.typical_lead_time_days === null || s.typical_lead_time_days === undefined
          ? ''
          : String(s.typical_lead_time_days),
      moq_notes: s.moq_notes || '',
      certifications: joined(s.certifications),
      notes: s.notes || '',
      is_approved: Boolean(s.is_approved),
    });
  };

  const payload = () => ({
    legal_name: form.legal_name.trim(),
    trading_name: form.trading_name.trim() || null,
    location: form.location.trim() || null,
    product_capabilities: listOf(form.capabilities),
    contact_name: form.contact_name.trim() || null,
    contact_email: form.contact_email.trim() || null,
    contact_phone: form.contact_phone.trim() || null,
    payment_terms: form.payment_terms.trim() || null,
    typical_lead_time_days: form.typical_lead_time_days.trim()
      ? Number(form.typical_lead_time_days)
      : null,
    moq_notes: form.moq_notes.trim() || null,
    certifications: listOf(form.certifications),
    notes: form.notes.trim() || null,
    is_approved: form.is_approved,
  });

  const save = async () => {
    if (!form.legal_name.trim()) {
      showToast(t('Supplier name is required', '必須填寫供應商名稱'), 'error');
      return;
    }
    setSaving(true);
    try {
      const res = editing
        ? await authFetch(`/api/admin/suppliers/${editing.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload()),
          })
        : await authFetch('/api/admin/suppliers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload()),
          });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) {
        showToast(data.error || t('Could not save supplier', '無法儲存供應商'), 'error');
        return;
      }
      showToast(
        editing
          ? t('Supplier updated', '供應商已更新')
          : t('Supplier added', '供應商已新增'),
        'success'
      );
      setShowAdd(false);
      setEditing(null);
      setForm(EMPTY);
      await load();
    } catch (e) {
      console.error('[suppliers] save error', e);
      showToast(t('Could not save supplier', '無法儲存供應商'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleApproved = async (s: Supplier) => {
    // Optimistic: approval drives supplier ordering, so it should feel instant.
    setSuppliers((prev) =>
      prev.map((x) => (x.id === s.id ? { ...x, is_approved: !x.is_approved } : x))
    );
    try {
      const res = await authFetch(`/api/admin/suppliers/${s.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_approved: !s.is_approved }),
      });
      if (!res.ok) {
        showToast(t('Could not update approval', '無法更新核准狀態'), 'error');
        await load();
      }
    } catch (e) {
      console.error('[suppliers] approve error', e);
      showToast(t('Could not update approval', '無法更新核准狀態'), 'error');
      await load();
    }
  };

  const remove = async (s: Supplier) => {
    if (!confirm(t(`Delete ${displayName(s)}?`, `刪除 ${displayName(s)}？`))) return;
    try {
      const res = await authFetch(`/api/admin/suppliers/${s.id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) {
        showToast(data.error || t('Could not delete supplier', '無法刪除供應商'), 'error');
        return;
      }
      showToast(t('Supplier deleted', '供應商已刪除'), 'success');
      await load();
    } catch (e) {
      console.error('[suppliers] delete error', e);
      showToast(t('Could not delete supplier', '無法刪除供應商'), 'error');
    }
  };

  const term = search.trim().toLowerCase();
  const visible = term
    ? suppliers.filter((s) =>
        [s.legal_name, s.trading_name, s.location, joined(s.product_capabilities)]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(term)
      )
    : suppliers;

  const inputCls =
    'border rounded-[4px] px-3 py-2 text-[13px] md:text-[14px] focus:outline-none';
  const inputStyle = { borderColor: 'var(--border)' };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-[20px] md:text-[24px] font-semibold tracking-[-0.5px]">
            {t('Suppliers', '供應商')}
          </h1>
          <p className="text-[13px] md:text-[14px] mt-1" style={{ color: 'var(--text-muted)' }}>
            {t(
              'Your trusted supplier directory — capabilities here are what Sailwise matches customer inquiries against',
              '您的信任供應商目錄——此處的供應能力是 Sailwise 配對客戶詢盤的依據'
            )}
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('Search suppliers', '搜尋供應商')}
            className={`${inputCls} w-full sm:w-56`}
            style={inputStyle}
          />
          <button
            onClick={startAdd}
            className="text-[13px] md:text-[14px] font-medium px-4 py-2.5 rounded-[4px] text-white w-full sm:w-auto shrink-0"
            style={{ background: 'var(--accent)' }}
          >
            {t('Add supplier', '新增供應商')}
          </button>
        </div>
      </div>

      {(showAdd || editing) && (
        <div
          className="border rounded-[4px] p-4 md:p-5 mb-6"
          style={{ borderColor: editing ? 'var(--accent)' : 'var(--border)', background: 'var(--surface)' }}
        >
          <h2 className="text-[14px] md:text-[15px] font-semibold mb-1">
            {editing ? t('Edit supplier', '編輯供應商') : t('New supplier', '新增供應商')}
          </h2>
          <p className="text-[12px] mb-4" style={{ color: 'var(--text-muted)' }}>
            {t(
              'Capabilities are the matching surface: list what this supplier actually makes, comma separated.',
              '供應能力是配對依據：請以逗號分隔列出該供應商實際能製造的品項。'
            )}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <input
              placeholder={t('Legal name *', '法定名稱 *')}
              value={form.legal_name}
              onChange={(e) => setForm({ ...form, legal_name: e.target.value })}
              className={`${inputCls} w-full`}
              style={inputStyle}
            />
            <input
              placeholder={t('Trading name', '商號名稱')}
              value={form.trading_name}
              onChange={(e) => setForm({ ...form, trading_name: e.target.value })}
              className={`${inputCls} w-full`}
              style={inputStyle}
            />
          </div>

          <input
            placeholder={t('Capabilities (e.g. stainless steel flask, 500ml, OEM)', '供應能力（例如：不鏽鋼保溫瓶、500ml、OEM）')}
            value={form.capabilities}
            onChange={(e) => setForm({ ...form, capabilities: e.target.value })}
            className={`${inputCls} w-full mb-3`}
            style={inputStyle}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <input
              placeholder={t('Location', '地點')}
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              className={`${inputCls} w-full`}
              style={inputStyle}
            />
            <input
              placeholder={t('Certifications (comma separated)', '認證（逗號分隔）')}
              value={form.certifications}
              onChange={(e) => setForm({ ...form, certifications: e.target.value })}
              className={`${inputCls} w-full`}
              style={inputStyle}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <input
              placeholder={t('Contact name', '聯絡人')}
              value={form.contact_name}
              onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
              className={`${inputCls} w-full`}
              style={inputStyle}
            />
            <input
              placeholder={t('Contact email', '聯絡電郵')}
              value={form.contact_email}
              onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
              className={`${inputCls} w-full`}
              style={inputStyle}
            />
            <input
              placeholder={t('Contact phone', '聯絡電話')}
              value={form.contact_phone}
              onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
              className={`${inputCls} w-full`}
              style={inputStyle}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <input
              placeholder={t('Payment terms (e.g. 30% deposit)', '付款條件（例如：30% 定金）')}
              value={form.payment_terms}
              onChange={(e) => setForm({ ...form, payment_terms: e.target.value })}
              className={`${inputCls} w-full`}
              style={inputStyle}
            />
            <input
              placeholder={t('Lead time (days)', '交期（天）')}
              value={form.typical_lead_time_days}
              onChange={(e) => setForm({ ...form, typical_lead_time_days: e.target.value })}
              className={`${inputCls} w-full`}
              style={inputStyle}
            />
            <input
              placeholder={t('MOQ notes', 'MOQ 備註')}
              value={form.moq_notes}
              onChange={(e) => setForm({ ...form, moq_notes: e.target.value })}
              className={`${inputCls} w-full`}
              style={inputStyle}
            />
          </div>

          <input
            placeholder={t('Notes', '備註')}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className={`${inputCls} w-full mb-4`}
            style={inputStyle}
          />

          <label className="flex items-center gap-2 text-[13px] mb-4 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_approved}
              onChange={(e) => setForm({ ...form, is_approved: e.target.checked })}
              className="w-4 h-4"
              style={{ accentColor: 'var(--accent)' }}
            />
            {t('Approved — trusted, shown first in matches', '已核准——可信，於配對時優先顯示')}
          </label>

          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setShowAdd(false); setEditing(null); }}
              className="text-[12px] md:text-[13px] px-4 py-2 rounded-[4px] border"
              style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
            >
              {t('Cancel', '取消')}
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="text-[12px] md:text-[13px] font-medium px-4 py-2 rounded-[4px] text-white disabled:opacity-60"
              style={{ background: 'var(--accent)' }}
            >
              {saving
                ? '...'
                : editing
                  ? t('Save changes', '儲存變更')
                  : t('Add supplier', '新增供應商')}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="border rounded-[4px] p-4 flex items-center gap-3"
              style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
            >
              <div className="w-10 h-10 rounded" style={{ background: 'var(--border)' }} />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-40 rounded" style={{ background: 'var(--border)' }} />
                <div className="h-3 w-56 rounded" style={{ background: 'var(--border)' }} />
              </div>
            </div>
          ))}
        </div>
      ) : suppliers.length === 0 ? (
        <div
          className="border rounded-[4px] p-8 md:p-10 text-center"
          style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
        >
          <svg
            className="mx-auto mb-3"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--text-muted)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 21h18M5 21V7l7-4 7 4v14M9 9h1m4 0h1M9 13h1m4 0h1M9 17h1m4 0h1" />
          </svg>
          <p className="text-[14px] font-medium mb-1" style={{ color: 'var(--text)' }}>
            {t('No suppliers yet', '暫無供應商')}
          </p>
          <p className="text-[13px] mb-4" style={{ color: 'var(--text-muted)' }}>
            {t(
              'Add the suppliers you trust so Sailwise can match them to incoming inquiries',
              '新增您信任的供應商，Sailwise 才能配對到入站詢盤'
            )}
          </p>
          <button
            onClick={startAdd}
            className="text-[13px] font-medium px-4 py-2 rounded-[4px] text-white"
            style={{ background: 'var(--accent)' }}
          >
            {t('Add your first supplier', '新增第一個供應商')}
          </button>
        </div>
      ) : visible.length === 0 ? (
        <div
          className="border rounded-[4px] p-8 text-center"
          style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
        >
          <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
            {t('No suppliers match your search', '沒有符合搜尋的供應商')}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div
            className="hidden md:block border rounded-[4px]"
            style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
          >
            <table className="w-full text-[14px]">
              <thead>
                <tr className="border-b text-left" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                  <th className="px-5 py-3 font-medium">{t('Supplier', '供應商')}</th>
                  <th className="px-5 py-3 font-medium">{t('Capabilities', '供應能力')}</th>
                  <th className="px-5 py-3 font-medium">{t('Lead time', '交期')}</th>
                  <th className="px-5 py-3 font-medium">{t('Terms', '付款條件')}</th>
                  <th className="px-5 py-3 font-medium">{t('Approved', '已核准')}</th>
                  <th className="px-5 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {visible.map((s) => (
                  <tr key={s.id} className="border-b last:border-b-0" style={{ borderColor: 'var(--border)' }}>
                    <td className="px-5 py-3">
                      <p className="font-medium">{displayName(s)}</p>
                      <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                        {s.trading_name && s.legal_name !== s.trading_name ? `${s.legal_name} · ` : ''}
                        {s.location || '—'}
                      </p>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(s.product_capabilities || []).slice(0, 3).map((c) => (
                          <span
                            key={c}
                            className="text-[11px] px-1.5 py-0.5 rounded"
                            style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
                          >
                            {c}
                          </span>
                        ))}
                        {(s.product_capabilities || []).length > 3 && (
                          <span className="text-[11px] px-1.5 py-0.5" style={{ color: 'var(--text-muted)' }}>
                            +{(s.product_capabilities || []).length - 3}
                          </span>
                        )}
                        {(s.product_capabilities || []).length === 0 && (
                          <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                            —
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      {s.typical_lead_time_days ? `${s.typical_lead_time_days}d` : '—'}
                    </td>
                    <td className="px-5 py-3" style={{ color: 'var(--text-muted)' }}>
                      {s.payment_terms || '—'}
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => toggleApproved(s)}
                        className="text-[11px] px-2 py-1 rounded font-semibold"
                        style={
                          s.is_approved
                            ? { background: '#E8F5F1', color: '#038153' }
                            : { background: 'var(--bg)', color: 'var(--text-muted)', border: '1px solid var(--border)' }
                        }
                      >
                        {s.is_approved ? t('APPROVED', '已核准') : t('NOT APPROVED', '未核准')}
                      </button>
                    </td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => startEdit(s)}
                        className="text-[13px] px-3 py-1 rounded mr-2"
                        style={{ color: 'var(--accent)' }}
                      >
                        {t('Edit', '編輯')}
                      </button>
                      <button
                        onClick={() => remove(s)}
                        className="text-[13px] px-3 py-1 rounded"
                        style={{ color: 'var(--error)' }}
                      >
                        {t('Delete', '刪除')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {visible.map((s) => (
              <div
                key={s.id}
                className="border rounded-[4px] p-4"
                style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-medium">{displayName(s)}</p>
                    <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {s.location || '—'}
                      {s.typical_lead_time_days ? ` · ${s.typical_lead_time_days}d` : ''}
                      {s.payment_terms ? ` · ${s.payment_terms}` : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleApproved(s)}
                    className="text-[10px] px-1.5 py-0.5 rounded font-semibold shrink-0"
                    style={
                      s.is_approved
                        ? { background: '#E8F5F1', color: '#038153' }
                        : { background: 'var(--bg)', color: 'var(--text-muted)', border: '1px solid var(--border)' }
                    }
                  >
                    {s.is_approved ? t('APPROVED', '已核准') : t('NOT APPROVED', '未核准')}
                  </button>
                </div>

                {(s.product_capabilities || []).length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {(s.product_capabilities || []).slice(0, 4).map((c) => (
                      <span
                        key={c}
                        className="text-[10px] px-1.5 py-0.5 rounded"
                        style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex justify-end gap-1">
                  <button
                    onClick={() => startEdit(s)}
                    className="text-[12px] px-2 py-1 rounded"
                    style={{ color: 'var(--accent)' }}
                  >
                    {t('Edit', '編輯')}
                  </button>
                  <button
                    onClick={() => remove(s)}
                    className="text-[12px] px-2 py-1 rounded"
                    style={{ color: 'var(--error)' }}
                  >
                    {t('Delete', '刪除')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}