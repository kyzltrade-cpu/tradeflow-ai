'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useLang } from '@/lib/lang';
import { useCompany } from '@/lib/company';
import { useToast } from '@/components/Toast';
import { authFetch } from '@/lib/auth-fetch';

interface Supplier {
  id: string;
  name: string;
  country: string | null;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  whatsapp_number: string | null;
  wechat_id: string | null;
  specialties: string[];
  certifications: string[];
  rating: number | null;
  lead_time_days: number | null;
  payment_terms: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
}

interface SupplierListResponse {
  suppliers: Supplier[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

const ITEMS_PER_PAGE = 10;

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function StarRating({ rating }: { rating: number | null }) {
  const { t } = useLang();
  if (rating == null) return <span style={{ color: 'var(--text-muted)' }}>—</span>;
  return (
    <span className="font-medium" style={{ color: 'var(--text)' }}>
      {rating.toFixed(1)} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>{t('stars', '星')}</span>
    </span>
  );
}

export default function SuppliersPage() {
  const { t } = useLang();
  const { companyId, loading: companyLoading } = useCompany();
  const { showToast } = useToast();
  const router = useRouter();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [search, setSearch] = useState('');
  const [filterApproved, setFilterApproved] = useState('all');
  const [page, setPage] = useState(1);

  const [showAdd, setShowAdd] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newSupplier, setNewSupplier] = useState({
    name: '',
    country: '',
    contact_name: '',
    email: '',
    phone: '',
    whatsapp_number: '',
    wechat_id: '',
    specialties: '',
    certifications: '',
    lead_time_days: '',
    payment_terms: '',
    notes: '',
  });

  const fetchSuppliers = useCallback(async () => {
    if (companyLoading || !companyId) return;
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ company_id: companyId, page: String(page), limit: String(ITEMS_PER_PAGE) });
      if (search) params.set('search', search);
      if (filterApproved === 'approved') params.set('approved', 'true');
      if (filterApproved === 'pending') params.set('approved', 'false');
      const res = await authFetch(`/api/admin/suppliers?${params}`);
      if (!res.ok) throw new Error('Failed to load suppliers');
      const data: SupplierListResponse = await res.json();
      setSuppliers(data.suppliers || []);
      setTotal(data.pagination?.total || 0);
      setTotalPages(data.pagination?.totalPages || 0);
    } catch (err) {
      console.error('[suppliers] fetch error:', err);
      setError(t('Failed to load suppliers. Please try again.', '載入供應商失敗，請重試。'));
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  }, [companyId, companyLoading, page, search, filterApproved, t]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const handleCreate = async () => {
    if (!newSupplier.name) {
      showToast(t('Supplier name is required', '供應商名稱為必填'), 'error');
      return;
    }
    if (!companyId) {
      showToast(t('No company linked. Please refresh the page.', '未連結公司，請重新整理頁面。'), 'error');
      return;
    }

    setCreating(true);
    try {
      const res = await authFetch('/api/admin/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: companyId,
          name: newSupplier.name,
          country: newSupplier.country || null,
          contact_name: newSupplier.contact_name || null,
          email: newSupplier.email || null,
          phone: newSupplier.phone || null,
          whatsapp_number: newSupplier.whatsapp_number || null,
          wechat_id: newSupplier.wechat_id || null,
          specialties: newSupplier.specialties ? newSupplier.specialties.split(',').map((s) => s.trim()).filter(Boolean) : [],
          certifications: newSupplier.certifications ? newSupplier.certifications.split(',').map((s) => s.trim()).filter(Boolean) : [],
          lead_time_days: newSupplier.lead_time_days ? parseInt(newSupplier.lead_time_days) : null,
          payment_terms: newSupplier.payment_terms || null,
          notes: newSupplier.notes || null,
        }),
      });
      if (!res.ok) throw new Error('Failed to create supplier');
      const body = await res.json();
      const created = body.supplier || body;
      setSuppliers((prev) => [created, ...prev]);
      setTotal((prev) => prev + 1);
      showToast(t('Supplier added', '供應商已新增'), 'success');
      setShowAdd(false);
      setNewSupplier({ name: '', country: '', contact_name: '', email: '', phone: '', whatsapp_number: '', wechat_id: '', specialties: '', certifications: '', lead_time_days: '', payment_terms: '', notes: '' });
    } catch (err) {
      console.error('[suppliers] create error:', err);
      showToast(t('Failed to add supplier', '新增供應商失敗'), 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (supplier: Supplier) => {
    const newState = !supplier.is_active;
    setSuppliers((prev) => prev.map((s) => s.id === supplier.id ? { ...s, is_active: newState } : s));

    try {
      const res = await authFetch('/api/admin/suppliers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: supplier.id, company_id: companyId, is_active: newState }),
      });
      if (!res.ok) throw new Error('Failed to update supplier');
      showToast(
        newState ? t('Supplier approved', '供應商已核准') : t('Supplier deactivated', '供應商已停用'),
        'success'
      );
    } catch (err) {
      console.error('[suppliers] toggle error:', err);
      setSuppliers((prev) => prev.map((s) => s.id === supplier.id ? { ...s, is_active: !newState } : s));
      showToast(t('Failed to update supplier', '更新供應商失敗'), 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await authFetch(`/api/admin/suppliers?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete supplier');
      setSuppliers((prev) => prev.filter((s) => s.id !== id));
      setTotal((prev) => prev - 1);
      showToast(t('Supplier deleted', '供應商已刪除'), 'success');
    } catch (err) {
      console.error('[suppliers] delete error:', err);
      showToast(t('Failed to delete supplier', '刪除供應商失敗'), 'error');
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-[20px] md:text-[24px] font-semibold tracking-[-0.5px]">{t('Suppliers', '供應商')}</h1>
          <p className="text-[13px] md:text-[14px] mt-1" style={{ color: 'var(--text-muted)' }}>
            {t('Manage your supplier directory and sourcing partners', '管理您的供應商名錄和採購合作夥伴')}
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="text-[13px] md:text-[14px] font-medium px-4 py-2.5 rounded-[4px] text-white w-full sm:w-auto"
          style={{ background: 'var(--accent)' }}
        >
          {t('Add Supplier', '新增供應商')}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          type="text"
          placeholder={t('Search by name, location, or contact...', '搜尋名稱、地點或聯絡人...')}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="border rounded-[4px] px-3 py-2 text-[13px] md:text-[14px] flex-1 focus:outline-none"
          style={{ borderColor: 'var(--border)' }}
        />
        <select
          value={filterApproved}
          onChange={(e) => { setFilterApproved(e.target.value); setPage(1); }}
          className="border rounded-[4px] px-3 py-2 text-[13px] md:text-[14px] focus:outline-none"
          style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
        >
          <option value="all">{t('All Status', '所有狀態')}</option>
          <option value="approved">{t('Approved', '已核准')}</option>
          <option value="pending">{t('Pending', '待核准')}</option>
        </select>
      </div>

      {/* Inline add form */}
      {showAdd && (
        <div className="border rounded-[4px] p-4 md:p-5 mb-6" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <h2 className="text-[14px] md:text-[15px] font-semibold mb-4">{t('New supplier', '新供應商')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <input
              placeholder={t('Supplier name', '供應商名稱')}
              value={newSupplier.name}
              onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
              className="border rounded-[4px] px-3 py-2 text-[13px] md:text-[14px] focus:outline-none"
              style={{ borderColor: 'var(--border)' }}
            />
            <input
              placeholder={t('Country / Region', '國家/地區')}
              value={newSupplier.country}
              onChange={(e) => setNewSupplier({ ...newSupplier, country: e.target.value })}
              className="border rounded-[4px] px-3 py-2 text-[13px] md:text-[14px] focus:outline-none"
              style={{ borderColor: 'var(--border)' }}
            />
            <input
              placeholder={t('Contact person', '聯絡人')}
              value={newSupplier.contact_name}
              onChange={(e) => setNewSupplier({ ...newSupplier, contact_name: e.target.value })}
              className="border rounded-[4px] px-3 py-2 text-[13px] md:text-[14px] focus:outline-none"
              style={{ borderColor: 'var(--border)' }}
            />
            <input
              placeholder={t('Email', '電子郵件')}
              type="email"
              value={newSupplier.email}
              onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })}
              className="border rounded-[4px] px-3 py-2 text-[13px] md:text-[14px] focus:outline-none"
              style={{ borderColor: 'var(--border)' }}
            />
            <input
              placeholder={t('Phone', '電話')}
              value={newSupplier.phone}
              onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
              className="border rounded-[4px] px-3 py-2 text-[13px] md:text-[14px] focus:outline-none"
              style={{ borderColor: 'var(--border)' }}
            />
            <input
              placeholder={t('WhatsApp', 'WhatsApp')}
              value={newSupplier.whatsapp_number}
              onChange={(e) => setNewSupplier({ ...newSupplier, whatsapp_number: e.target.value })}
              className="border rounded-[4px] px-3 py-2 text-[13px] md:text-[14px] focus:outline-none"
              style={{ borderColor: 'var(--border)' }}
            />
            <input
              placeholder={t('WeChat ID', '微信 ID')}
              value={newSupplier.wechat_id}
              onChange={(e) => setNewSupplier({ ...newSupplier, wechat_id: e.target.value })}
              className="border rounded-[4px] px-3 py-2 text-[13px] md:text-[14px] focus:outline-none"
              style={{ borderColor: 'var(--border)' }}
            />
            <input
              placeholder={t('Lead time (days)', '交期（天）')}
              type="number"
              value={newSupplier.lead_time_days}
              onChange={(e) => setNewSupplier({ ...newSupplier, lead_time_days: e.target.value })}
              className="border rounded-[4px] px-3 py-2 text-[13px] md:text-[14px] focus:outline-none"
              style={{ borderColor: 'var(--border)' }}
            />
            <input
              placeholder={t('Specialties (comma-separated)', '專長（逗號分隔）')}
              value={newSupplier.specialties}
              onChange={(e) => setNewSupplier({ ...newSupplier, specialties: e.target.value })}
              className="border rounded-[4px] px-3 py-2 text-[13px] md:text-[14px] focus:outline-none"
              style={{ borderColor: 'var(--border)' }}
            />
            <input
              placeholder={t('Certifications (comma-separated)', '認證（逗號分隔）')}
              value={newSupplier.certifications}
              onChange={(e) => setNewSupplier({ ...newSupplier, certifications: e.target.value })}
              className="border rounded-[4px] px-3 py-2 text-[13px] md:text-[14px] focus:outline-none"
              style={{ borderColor: 'var(--border)' }}
            />
            <input
              placeholder={t('Payment terms', '付款條件')}
              value={newSupplier.payment_terms}
              onChange={(e) => setNewSupplier({ ...newSupplier, payment_terms: e.target.value })}
              className="border rounded-[4px] px-3 py-2 text-[13px] md:text-[14px] focus:outline-none"
              style={{ borderColor: 'var(--border)' }}
            />
          </div>
          <textarea
            placeholder={t('Notes', '備註')}
            value={newSupplier.notes}
            onChange={(e) => setNewSupplier({ ...newSupplier, notes: e.target.value })}
            rows={3}
            className="border rounded-[4px] px-3 py-2 text-[13px] md:text-[14px] w-full mb-4 focus:outline-none resize-none"
            style={{ borderColor: 'var(--border)' }}
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setShowAdd(false)}
              className="text-[12px] md:text-[13px] px-4 py-2 rounded-[4px] border"
              style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
            >
              {t('Cancel', '取消')}
            </button>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="text-[12px] md:text-[13px] font-medium px-4 py-2 rounded-[4px] text-white disabled:opacity-50"
              style={{ background: 'var(--accent)' }}
            >
              {creating ? t('Adding...', '新增中...') : t('Add Supplier', '新增供應商')}
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="border rounded-[4px] p-4 mb-4" style={{ borderColor: 'var(--error)', background: '#FEF2F2' }}>
          <p className="text-[13px] md:text-[14px]" style={{ color: 'var(--error)' }}>{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="border rounded-[4px] overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4 border-b last:border-b-0 animate-pulse" style={{ borderColor: 'var(--border)' }}>
              <div className="flex-1 space-y-2">
                <div className="h-3 w-40 rounded" style={{ background: 'var(--border)' }} />
                <div className="h-3 w-24 rounded" style={{ background: 'var(--border)' }} />
              </div>
              <div className="h-6 w-16 rounded" style={{ background: 'var(--border)' }} />
              <div className="h-6 w-20 rounded" style={{ background: 'var(--border)' }} />
            </div>
          ))}
        </div>
      ) : suppliers.length === 0 ? (
        <div className="border rounded-[4px] p-8 md:p-10 text-center" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <svg className="mx-auto mb-3" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <p className="text-[14px] font-medium mb-1" style={{ color: 'var(--text)' }}>
            {search || filterApproved !== 'all'
              ? t('No matching suppliers', '沒有符合的供應商')
              : t('No suppliers yet', '暫無供應商')}
          </p>
          <p className="text-[13px] mb-4" style={{ color: 'var(--text-muted)' }}>
            {search || filterApproved !== 'all'
              ? t('Try adjusting your filters', '嘗試調整您的篩選條件')
              : t('Add suppliers to track sourcing and compare quotes', '新增供應商以追蹤採購和比較報價')}
          </p>
          {!search && filterApproved === 'all' && (
            <button
              onClick={() => setShowAdd(true)}
              className="text-[13px] font-medium px-4 py-2 rounded-[4px] text-white"
              style={{ background: 'var(--accent)' }}
            >
              {t('Add your first supplier', '新增第一個供應商')}
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block border rounded-[4px] overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <table className="w-full text-[14px]">
              <thead>
                <tr className="border-b text-left" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                  <th className="px-5 py-3 font-medium">{t('Name', '名稱')}</th>
                  <th className="px-5 py-3 font-medium">{t('Location', '地點')}</th>
                  <th className="px-5 py-3 font-medium">{t('Capabilities', '能力')}</th>
                  <th className="px-5 py-3 font-medium">{t('Contact', '聯絡人')}</th>
                  <th className="px-5 py-3 font-medium">{t('Status', '狀態')}</th>
                  <th className="px-5 py-3 font-medium">{t('Performance', '績效')}</th>
                  <th className="px-5 py-3 font-medium text-right">{t('Actions', '操作')}</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((supplier) => (
                  <tr
                    key={supplier.id}
                    className="border-b last:border-b-0 hover:bg-black/[0.02] cursor-pointer"
                    style={{ borderColor: 'var(--border)' }}
                    onClick={() => router.push(`/admin/suppliers/${supplier.id}`)}
                  >
                    <td className="px-5 py-3">
                      <div>
                        <p className="font-medium" style={{ color: 'var(--text)' }}>{supplier.name}</p>
                        {supplier.specialties?.length > 0 && (
                          <p className="text-[11px] mt-0.5 truncate max-w-[200px]" style={{ color: 'var(--text-muted)' }}>
                            {supplier.specialties.slice(0, 3).join(', ')}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3" style={{ color: 'var(--text-muted)' }}>
                      {supplier.country || '—'}
                    </td>
                    <td className="px-5 py-3">
                      {supplier.certifications?.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {supplier.certifications.slice(0, 2).map((cert) => (
                            <span
                              key={cert}
                              className="text-[10px] px-1.5 py-0.5 rounded"
                              style={{ background: 'var(--bg)', color: 'var(--text-muted)' }}
                            >
                              {cert}
                            </span>
                          ))}
                          {supplier.certifications.length > 2 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg)', color: 'var(--text-muted)' }}>
                              +{supplier.certifications.length - 2}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td className="px-5 py-3" style={{ color: 'var(--text-muted)' }}>
                      <div>
                        {supplier.contact_name && <p>{supplier.contact_name}</p>}
                        {supplier.email && <p className="text-[12px]">{supplier.email}</p>}
                        {!supplier.contact_name && !supplier.email && <span>—</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className="text-[11px] font-medium px-2 py-0.5 rounded"
                        style={{
                          color: supplier.is_active ? '#059669' : '#D97706',
                          background: supplier.is_active ? '#ECFDF5' : '#FEF3C7',
                        }}
                      >
                        {supplier.is_active ? t('Approved', '已核准') : t('Pending', '待核准')}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <StarRating rating={supplier.rating} />
                    </td>
                    <td className="px-5 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleToggleActive(supplier)}
                          className="text-[11px] px-2 py-1 rounded hover:opacity-80"
                          style={{
                            color: supplier.is_active ? '#D97706' : '#059669',
                            border: `1px solid ${supplier.is_active ? '#D97706' : '#059669'}`,
                          }}
                        >
                          {supplier.is_active ? t('Deactivate', '停用') : t('Approve', '核准')}
                        </button>
                        <button
                          onClick={() => handleDelete(supplier.id)}
                          className="text-[11px] px-2 py-1 rounded hover:opacity-80"
                          style={{ color: 'var(--error)' }}
                        >
                          {t('Delete', '刪除')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {suppliers.map((supplier) => (
              <div
                key={supplier.id}
                className="border rounded-[4px] p-4"
                style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                onClick={() => router.push(`/admin/suppliers/${supplier.id}`)}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="text-[14px] font-medium truncate">{supplier.name}</p>
                    {supplier.contact_name && (
                      <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{supplier.contact_name}</p>
                    )}
                  </div>
                  <span
                    className="text-[10px] font-medium px-1.5 py-0.5 rounded flex-shrink-0"
                    style={{
                      color: supplier.is_active ? '#059669' : '#D97706',
                      background: supplier.is_active ? '#ECFDF5' : '#FEF3C7',
                    }}
                  >
                    {supplier.is_active ? t('Approved', '已核准') : t('Pending', '待核准')}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 text-[12px] mb-3">
                  {supplier.country && (
                    <span style={{ color: 'var(--text-muted)' }}>{supplier.country}</span>
                  )}
                  <StarRating rating={supplier.rating} />
                  {supplier.specialties?.slice(0, 2).map((s) => (
                    <span key={s} className="px-1.5 py-0.5 rounded" style={{ background: 'var(--bg)', color: 'var(--text-muted)' }}>{s}</span>
                  ))}
                </div>
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => handleToggleActive(supplier)}
                    className="text-[11px] font-medium px-2.5 py-1 rounded-[4px]"
                    style={{
                      color: supplier.is_active ? '#D97706' : '#059669',
                      border: `1px solid ${supplier.is_active ? '#D97706' : '#059669'}`,
                    }}
                  >
                    {supplier.is_active ? t('Deactivate', '停用') : t('Approve', '核准')}
                  </button>
                  <button
                    onClick={() => handleDelete(supplier.id)}
                    className="text-[11px] px-2.5 py-1 rounded-[4px]"
                    style={{ color: 'var(--error)' }}
                  >
                    {t('Delete', '刪除')}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 px-1">
              <p className="text-[12px] md:text-[13px]" style={{ color: 'var(--text-muted)' }}>
                {t('Showing', '顯示')} {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, total)} {t('of', '/')} {total}
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="text-[12px] px-3 py-1.5 rounded-[4px] border disabled:opacity-40"
                  style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                >
                  {t('Prev', '上一頁')}
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .reduce<(number | string)[]>((acc, p, i, arr) => {
                    if (i > 0 && (arr[i - 1] as number) < (p as number) - 1) acc.push('...');
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) =>
                    typeof p === 'string' ? (
                      <span key={`dots-${i}`} className="text-[12px] px-1.5 py-1.5" style={{ color: 'var(--text-muted)' }}>...</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className="text-[12px] min-w-[28px] h-[28px] rounded-[4px] font-medium"
                        style={{
                          background: page === p ? 'var(--accent)' : 'transparent',
                          color: page === p ? 'white' : 'var(--text)',
                        }}
                      >
                        {p}
                      </button>
                    )
                  )}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="text-[12px] px-3 py-1.5 rounded-[4px] border disabled:opacity-40"
                  style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                >
                  {t('Next', '下一頁')}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
