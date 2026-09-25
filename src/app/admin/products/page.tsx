'use client';

import { useState, useEffect, useRef } from 'react';
import { useLang } from '@/lib/lang';
import { useCompany } from '@/lib/company';
import { useToast } from '@/components/Toast';
import { authFetch } from '@/lib/auth-fetch';

interface Product {
  id: string;
  name: string;
  description: string;
  moq: string;
  price_range: string;
  category: string;
  lead_time?: string;
  specs?: Record<string, unknown>;
  photos?: string[];
}

export default function ProductsPage() {
  const { t } = useLang();
  const { companyId } = useCompany();
  const { showToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newProduct, setNewProduct] = useState({ name: '', description: '', moq: '', price_range: '', category: '' });
  const [newPhotos, setNewPhotos] = useState<string[]>([]);
  const [editPhotos, setEditPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const addPhotoRef = useRef<HTMLInputElement>(null);
  const editPhotoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!companyId) return;
    setLoading(true);
    authFetch(`/api/admin/products?company_id=${companyId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          console.error('[products]', data.error);
          setProducts([]);
        } else {
          setProducts(data.products || data || []);
        }
      })
      .catch((e) => { console.error('[products] fetch error', e); setProducts([]); })
      .finally(() => setLoading(false));
  }, [companyId]);

  const handlePhotoUpload = async (files: FileList | null, target: 'new' | 'edit'): Promise<string[]> => {
    if (!files?.length) return [];
    setUploading(true);
    const results: string[] = [];

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      if (file.size > 5 * 1024 * 1024) {
        showToast(t('Image too large (max 5MB)', '圖片太大（最大 5MB）'), 'error');
        continue;
      }
      try {
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        results.push(base64);
      } catch {
        // skip
      }
    }

    setUploading(false);
    return results;
  };

  const handleAddPhotoClick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const photos = await handlePhotoUpload(e.target.files, 'new');
    if (photos.length) setNewPhotos(prev => [...prev, ...photos]);
    if (addPhotoRef.current) addPhotoRef.current.value = '';
  };

  const handleEditPhotoClick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const photos = await handlePhotoUpload(e.target.files, 'edit');
    if (photos.length) setEditPhotos(prev => [...prev, ...photos]);
    if (editPhotoRef.current) editPhotoRef.current.value = '';
  };

  const handleAdd = async () => {
    if (!newProduct.name) {
      showToast(t('Product name is required', '產品名稱為必填'), 'error');
      return;
    }
    if (!companyId) {
      showToast(t('No company linked. Please refresh the page.', '未連結公司，請重新整理頁面。'), 'error');
      return;
    }
    try {
      const res = await authFetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: companyId, ...newProduct, photos: newPhotos }),
      });
      if (!res.ok) throw new Error('Failed to add product');
      const body = await res.json();
      const product = body.product || body;
      setProducts([...products, product]);
      showToast(t('Product added', '產品已新增'), 'success');
    } catch (err) {
      console.error('[products] add error:', err);
      showToast(t('Failed to add product', '新增產品失敗'), 'error');
    }
    setNewProduct({ name: '', description: '', moq: '', price_range: '', category: '' });
    setNewPhotos([]);
    setShowAdd(false);
  };

  const handleEdit = async () => {
    if (!editingProduct || !companyId) return;
    try {
      const res = await authFetch('/api/admin/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingProduct.id,
          company_id: companyId,
          name: editingProduct.name,
          description: editingProduct.description,
          moq: editingProduct.moq,
          price_range: editingProduct.price_range,
          category: editingProduct.category,
          photos: editPhotos,
        }),
      });
      if (!res.ok) throw new Error('Failed to update product');
      const body = await res.json();
      const updated = body.product || body;
      setProducts(products.map((p) => (p.id === updated.id ? updated : p)));
      showToast(t('Product updated', '產品已更新'), 'success');
    } catch (err) {
      console.error('[products] edit error:', err);
      showToast(t('Failed to update product', '更新產品失敗'), 'error');
    }
    setEditingProduct(null);
    setEditPhotos([]);
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await authFetch(`/api/admin/products?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete product');
      setProducts(products.filter((p) => p.id !== id));
      showToast(t('Product deleted', '產品已刪除'), 'success');
    } catch (err) {
      console.error('[products] delete error:', err);
      showToast(t('Failed to delete product', '刪除產品失敗'), 'error');
    }
  };

  const removeNewPhoto = (index: number) => setNewPhotos(prev => prev.filter((_, i) => i !== index));
  const removeEditPhoto = (index: number) => setEditPhotos(prev => prev.filter((_, i) => i !== index));

  const startEditing = (product: Product) => {
    setEditingProduct(product);
    setEditPhotos(product.photos || []);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-[20px] md:text-[24px] font-semibold tracking-[-0.5px]">{t('Products', '產品')}</h1>
          <p className="text-[13px] md:text-[14px] mt-1" style={{ color: 'var(--text-muted)' }}>
            {t('Manage your product catalog — the AI uses these to answer customer inquiries', '管理您的產品目錄——AI 使用這些資料回覆客戶查詢')}
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="text-[13px] md:text-[14px] font-medium px-4 py-2.5 rounded-[4px] text-white w-full sm:w-auto"
          style={{ background: 'var(--accent)' }}
        >
          {t('Add product', '新增產品')}
        </button>
      </div>

      {showAdd && (
        <div className="border rounded-[4px] p-4 md:p-5 mb-6" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <h2 className="text-[14px] md:text-[15px] font-semibold mb-4">{t('New product', '新產品')}</h2>

          {/* Photos */}
          <div className="mb-4">
            <label className="block text-[12px] font-medium mb-2">{t('Product photos', '產品圖片')}</label>
            <div className="flex flex-wrap gap-3">
              {newPhotos.map((photo, i) => (
                <div key={i} className="relative w-20 h-20 rounded-[4px] overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
                  <img src={photo} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => removeNewPhoto(i)}
                    className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 text-white text-[10px] flex items-center justify-center"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                onClick={() => addPhotoRef.current?.click()}
                disabled={uploading}
                className="w-20 h-20 rounded-[4px] border-2 border-dashed flex flex-col items-center justify-center text-[11px] hover:border-[var(--accent)] transition-colors"
                style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                {uploading ? '...' : t('Add', '新增')}
              </button>
              <input ref={addPhotoRef} type="file" accept="image/*" multiple onChange={handleAddPhotoClick} className="hidden" />
            </div>
            <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
              {t('Max 5MB per image. These photos can be shared with customers in your quotes.', '每張圖片最大 5MB。這些圖片可在您的報價中分享給客戶。')}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <input
              placeholder={t('Product name', '產品名稱')}
              value={newProduct.name}
              onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
              className="border rounded-[4px] px-3 py-2 text-[13px] md:text-[14px] focus:outline-none"
              style={{ borderColor: 'var(--border)' }}
            />
            <input
              placeholder={t('Category', '類別')}
              value={newProduct.category}
              onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
              className="border rounded-[4px] px-3 py-2 text-[13px] md:text-[14px] focus:outline-none"
              style={{ borderColor: 'var(--border)' }}
            />
            <input
              placeholder={t('MOQ (e.g. 500 pcs)', 'MOQ（例如 500個）')}
              value={newProduct.moq}
              onChange={(e) => setNewProduct({ ...newProduct, moq: e.target.value })}
              className="border rounded-[4px] px-3 py-2 text-[13px] md:text-[14px] focus:outline-none"
              style={{ borderColor: 'var(--border)' }}
            />
            <input
              placeholder={t('Price range (e.g. USD 2.80–3.50)', '價格範圍（例如 USD 2.80–3.50）')}
              value={newProduct.price_range}
              onChange={(e) => setNewProduct({ ...newProduct, price_range: e.target.value })}
              className="border rounded-[4px] px-3 py-2 text-[13px] md:text-[14px] focus:outline-none"
              style={{ borderColor: 'var(--border)' }}
            />
          </div>
          <input
            placeholder={t('Description', '描述')}
            value={newProduct.description}
            onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
            className="border rounded-[4px] px-3 py-2 text-[13px] md:text-[14px] w-full mb-4 focus:outline-none"
            style={{ borderColor: 'var(--border)' }}
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setShowAdd(false); setNewPhotos([]); }}
              className="text-[12px] md:text-[13px] px-4 py-2 rounded-[4px] border"
              style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
            >
              {t('Cancel', '取消')}
            </button>
            <button
              onClick={handleAdd}
              className="text-[12px] md:text-[13px] font-medium px-4 py-2 rounded-[4px] text-white"
              style={{ background: 'var(--accent)' }}
            >
              {t('Add product', '新增產品')}
            </button>
          </div>
        </div>
      )}

      {editingProduct && (
        <div className="border rounded-[4px] p-4 md:p-5 mb-6" style={{ borderColor: 'var(--accent)', background: 'var(--surface)' }}>
          <h2 className="text-[14px] md:text-[15px] font-semibold mb-4">{t('Edit product', '編輯產品')}</h2>

          {/* Photos */}
          <div className="mb-4">
            <label className="block text-[12px] font-medium mb-2">{t('Product photos', '產品圖片')}</label>
            <div className="flex flex-wrap gap-3">
              {editPhotos.map((photo, i) => (
                <div key={i} className="relative w-20 h-20 rounded-[4px] overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
                  <img src={photo} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => removeEditPhoto(i)}
                    className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 text-white text-[10px] flex items-center justify-center"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                onClick={() => editPhotoRef.current?.click()}
                disabled={uploading}
                className="w-20 h-20 rounded-[4px] border-2 border-dashed flex flex-col items-center justify-center text-[11px] hover:border-[var(--accent)] transition-colors"
                style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                {uploading ? '...' : t('Add', '新增')}
              </button>
              <input ref={editPhotoRef} type="file" accept="image/*" multiple onChange={handleEditPhotoClick} className="hidden" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <input
              placeholder={t('Product name', '產品名稱')}
              value={editingProduct.name}
              onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
              className="border rounded-[4px] px-3 py-2 text-[13px] md:text-[14px] focus:outline-none"
              style={{ borderColor: 'var(--border)' }}
            />
            <input
              placeholder={t('Category', '類別')}
              value={editingProduct.category || ''}
              onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
              className="border rounded-[4px] px-3 py-2 text-[13px] md:text-[14px] focus:outline-none"
              style={{ borderColor: 'var(--border)' }}
            />
            <input
              placeholder={t('MOQ (e.g. 500 pcs)', 'MOQ（例如 500個）')}
              value={editingProduct.moq || ''}
              onChange={(e) => setEditingProduct({ ...editingProduct, moq: e.target.value })}
              className="border rounded-[4px] px-3 py-2 text-[13px] md:text-[14px] focus:outline-none"
              style={{ borderColor: 'var(--border)' }}
            />
            <input
              placeholder={t('Price range (e.g. USD 2.80–3.50)', '價格範圍（例如 USD 2.80–3.50）')}
              value={editingProduct.price_range || ''}
              onChange={(e) => setEditingProduct({ ...editingProduct, price_range: e.target.value })}
              className="border rounded-[4px] px-3 py-2 text-[13px] md:text-[14px] focus:outline-none"
              style={{ borderColor: 'var(--border)' }}
            />
          </div>
          <input
            placeholder={t('Description', '描述')}
            value={editingProduct.description || ''}
            onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
            className="border rounded-[4px] px-3 py-2 text-[13px] md:text-[14px] w-full mb-4 focus:outline-none"
            style={{ borderColor: 'var(--border)' }}
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setEditingProduct(null); setEditPhotos([]); }}
              className="text-[12px] md:text-[13px] px-4 py-2 rounded-[4px] border"
              style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
            >
              {t('Cancel', '取消')}
            </button>
            <button
              onClick={handleEdit}
              className="text-[12px] md:text-[13px] font-medium px-4 py-2 rounded-[4px] text-white"
              style={{ background: 'var(--accent)' }}
            >
              {t('Save changes', '儲存變更')}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="border rounded-[4px] overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4 border-b last:border-b-0 animate-pulse" style={{ borderColor: 'var(--border)' }}>
              <div className="w-12 h-12 rounded bg-gray-200" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-32 rounded" style={{ background: 'var(--border)' }} />
                <div className="h-3 w-48 rounded" style={{ background: 'var(--border)' }} />
              </div>
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="border rounded-[4px] p-8 md:p-10 text-center" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <svg className="mx-auto mb-3" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <p className="text-[14px] font-medium mb-1" style={{ color: 'var(--text)' }}>
            {t('No products yet', '暫無產品')}
          </p>
          <p className="text-[13px] mb-4" style={{ color: 'var(--text-muted)' }}>
            {t('Add products so your AI can answer customer questions about them', '新增產品讓 AI 能回答客戶關於產品的問題')}
          </p>
          <button
            onClick={() => setShowAdd(true)}
            className="text-[13px] font-medium px-4 py-2 rounded-[4px] text-white"
            style={{ background: 'var(--accent)' }}
          >
            {t('Add your first product', '新增第一個產品')}
          </button>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block border rounded-[4px]" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <table className="w-full text-[14px]">
              <thead>
                <tr className="border-b text-left" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                  <th className="px-5 py-3 font-medium">{t('Product', '產品')}</th>
                  <th className="px-5 py-3 font-medium">{t('Category', '類別')}</th>
                  <th className="px-5 py-3 font-medium">{t('MOQ', 'MOQ')}</th>
                  <th className="px-5 py-3 font-medium">{t('Price range', '價格範圍')}</th>
                  <th className="px-5 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className="border-b last:border-b-0" style={{ borderColor: 'var(--border)' }}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        {product.photos?.[0] ? (
                          <img src={product.photos[0]} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded flex items-center justify-center shrink-0" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>{product.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3" style={{ color: 'var(--text-muted)' }}>{product.category}</td>
                    <td className="px-5 py-3">{product.moq}</td>
                    <td className="px-5 py-3">{product.price_range}</td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => startEditing(product)}
                        className="text-[13px] px-3 py-1 rounded mr-2"
                        style={{ color: 'var(--accent)' }}
                      >
                        {t('Edit', '編輯')}
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
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
            {products.map((product) => (
              <div key={product.id} className="border rounded-[4px] p-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                <div className="flex items-start gap-3 mb-2">
                  {product.photos?.[0] ? (
                    <img src={product.photos[0]} alt="" className="w-14 h-14 rounded object-cover shrink-0" />
                  ) : null}
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium">{product.name}</p>
                    {product.description && (
                      <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{product.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => startEditing(product)}
                    className="text-[12px] px-2 py-1 rounded shrink-0 ml-2"
                    style={{ color: 'var(--accent)' }}
                  >
                    {t('Edit', '編輯')}
                  </button>
                  <button
                    onClick={() => handleDelete(product.id)}
                    className="text-[12px] px-2 py-1 rounded shrink-0 ml-2"
                    style={{ color: 'var(--error)' }}
                  >
                    {t('Delete', '刪除')}
                  </button>
                </div>
                {/* Photo gallery preview */}
                {product.photos && product.photos.length > 1 && (
                  <div className="flex gap-1.5 mb-2 overflow-x-auto">
                    {product.photos.slice(0, 4).map((photo, i) => (
                      <img key={i} src={photo} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
                    ))}
                    {product.photos.length > 4 && (
                      <div className="w-10 h-10 rounded flex items-center justify-center text-[11px] shrink-0" style={{ background: 'var(--bg)', color: 'var(--text-muted)' }}>
                        +{product.photos.length - 4}
                      </div>
                    )}
                  </div>
                )}
                <div className="flex flex-wrap gap-2 text-[12px]">
                  {product.category && (
                    <span className="px-2 py-0.5 rounded" style={{ background: 'var(--bg)', color: 'var(--text-muted)' }}>
                      {product.category}
                    </span>
                  )}
                  {product.moq && (
                    <span className="px-2 py-0.5 rounded" style={{ background: 'var(--bg)', color: 'var(--text-muted)' }}>
                      MOQ: {product.moq}
                    </span>
                  )}
                  {product.price_range && (
                    <span className="px-2 py-0.5 rounded font-medium" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
                      {product.price_range}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
