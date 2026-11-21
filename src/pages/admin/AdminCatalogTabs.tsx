import React, { useMemo, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { Edit2, Plus, Search, Trash2, Upload, X } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { useStore } from '../../context/StoreContext';
import { compressImageFileToDataUrl } from '../../utils/imageUpload';
import { Banner, Category, Coupon, formatPKR, InventoryLog, Product, StorePublicSettings } from '../../types';

export const AdminProductsTab: React.FC = () => {
  const { products, categories, showToast, seedInitialCatalog } = useStore();
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [editing, setEditing] = useState<Partial<Product> | null>(null);
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (catFilter !== 'all' && p.categoryId !== catFilter) return false;
      if (q && !`${p.name} ${p.sku || ''} ${p.categoryName || ''}`.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [products, search, catFilter]);

  const openNew = () => {
    const firstCat = categories[0];
    setEditing({
      id: `prod-${Date.now()}`,
      name: '',
      slug: '',
      sku: `VLX-${Math.floor(1000 + Math.random() * 9000)}`,
      categoryId: firstCat?.id || 'cat-lighting',
      categoryName: firstCat?.name || 'Smart Lighting',
      description: '',
      specifications: '',
      price: 0,
      originalPrice: 0,
      stock: 10,
      inStock: true,
      isFeatured: false,
      isTrending: false,
      isBestSeller: false,
      isNewArrival: true,
      isVisible: true,
      rating: 4.9,
      reviewCount: 1,
      images: ['/assets/products/led-desk-lamp.jpg'],
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !editing) return;
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files).slice(0, 4)) {
        const dataUrl = await compressImageFileToDataUrl(file);
        uploaded.push(dataUrl);
      }
      setEditing({
        ...editing,
        images: [...(editing.images || []), ...uploaded].slice(0, 8),
      });
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Image upload failed.');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing || !editing.name?.trim()) return;
    setSaving(true);
    try {
      const id = editing.id || `prod-${Date.now()}`;
      const slug =
        editing.slug?.trim() ||
        editing.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
      const cat = categories.find((c) => c.id === editing.categoryId);
      const price = Number(editing.price || 0);
      const originalPrice = Number(editing.originalPrice || 0);
      const discountPercent =
        originalPrice > price ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;
      const stock = Math.max(0, Math.floor(Number(editing.stock || 0)));

      const payload: Record<string, unknown> = {
        id,
        name: editing.name.trim().slice(0, 160),
        slug,
        sku: (editing.sku || '').trim(),
        categoryId: editing.categoryId || 'cat-lighting',
        categoryName: cat?.name || editing.categoryName || 'Essentials',
        description: (editing.description || '').trim(),
        specifications: (editing.specifications || '').trim(),
        price,
        originalPrice,
        discountPercent,
        stock,
        inStock: stock > 0 && editing.inStock !== false,
        isFeatured: Boolean(editing.isFeatured),
        isTrending: Boolean(editing.isTrending),
        isBestSeller: Boolean(editing.isBestSeller),
        isNewArrival: Boolean(editing.isNewArrival),
        isVisible: editing.isVisible !== false,
        rating: Number(editing.rating || 4.8),
        reviewCount: Math.floor(Number(editing.reviewCount || 1)),
        images: (editing.images?.length ? editing.images : ['/assets/products/led-desk-lamp.jpg']).slice(0, 8),
        updatedAt: serverTimestamp(),
      };

      if (editing.createdAt) {
        payload.createdAt = editing.createdAt;
        await updateDoc(doc(db, 'products', id), payload);
        showToast('Product updated.');
      } else {
        payload.createdAt = serverTimestamp();
        await setDoc(doc(db, 'products', id), payload);
        showToast('Product added to catalog.');
      }
      setEditing(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'products');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'products', id));
      showToast('Product deleted.');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `products/${id}`);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products or SKU..."
              className="pl-9 pr-3 py-2 text-sm bg-white border border-zinc-200 rounded-lg w-60"
            />
          </div>
          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-white border border-zinc-200 rounded-lg"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          {products.length === 0 && (
            <button
              type="button"
              onClick={() => seedInitialCatalog().then(() => showToast('Starter catalog seeded.'))}
              className="px-4 py-2 border border-zinc-300 bg-white text-zinc-800 text-xs font-semibold rounded-lg hover:bg-zinc-50"
            >
              Seed Starter Catalog
            </button>
          )}
          <button
            type="button"
            onClick={openNew}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#111317] text-white text-xs font-semibold rounded-lg hover:bg-zinc-800"
          >
            <Plus className="w-4 h-4" /> Add Product
          </button>
        </div>
      </div>

      <div className="bg-white border border-zinc-200 rounded-xl overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 border-b border-zinc-200 text-xs uppercase text-zinc-500">
            <tr>
              <th className="py-3 px-4">Product</th>
              <th className="py-3 px-4">SKU</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4 text-right">Price</th>
              <th className="py-3 px-4 text-right">Stock</th>
              <th className="py-3 px-4">Visibility</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {filtered.map((p) => (
              <tr key={p.id} className="hover:bg-zinc-50">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={p.images[0]}
                      alt={p.name}
                      referrerPolicy="no-referrer"
                      className="w-11 h-9 rounded object-cover bg-[#121417] shrink-0"
                    />
                    <span className="font-medium text-[#111317] line-clamp-1">{p.name}</span>
                  </div>
                </td>
                <td className="py-3 px-4 font-mono text-xs text-zinc-500">{p.sku || '-'}</td>
                <td className="py-3 px-4 text-xs text-zinc-600">{p.categoryName}</td>
                <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold">
                  {formatPKR(p.price)}
                </td>
                <td className="py-3 px-4 text-right font-mono tabular-nums">
                  <span className={p.stock <= 5 ? 'text-amber-700 font-semibold' : 'text-zinc-800'}>
                    {p.stock}
                  </span>
                </td>
                <td className="py-3 px-4 text-xs">
                  {p.isVisible ? (
                    <span className="text-emerald-700 font-medium">Live</span>
                  ) : (
                    <span className="text-zinc-400">Hidden</span>
                  )}
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="inline-flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setEditing(p)}
                      className="p-1.5 text-zinc-500 hover:text-[#111317]"
                      aria-label="Edit product"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(p.id)}
                      className="p-1.5 text-zinc-500 hover:text-rose-600"
                      aria-label="Delete product"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Product Editor Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSave}
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
              <h3 className="font-display text-lg font-bold text-[#111317]">
                {editing.createdAt ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button type="button" onClick={() => setEditing(null)} className="p-1 text-zinc-400 hover:text-zinc-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  value={editing.name || ''}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Category *</label>
                <select
                  value={editing.categoryId || ''}
                  onChange={(e) => setEditing({ ...editing, categoryId: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">SKU</label>
                <input
                  type="text"
                  value={editing.sku || ''}
                  onChange={(e) => setEditing({ ...editing, sku: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Selling Price (PKR) *</label>
                <input
                  type="number"
                  required
                  min={0}
                  value={editing.price ?? 0}
                  onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Original Price (PKR)</label>
                <input
                  type="number"
                  min={0}
                  value={editing.originalPrice ?? 0}
                  onChange={(e) => setEditing({ ...editing, originalPrice: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Stock Quantity *</label>
                <input
                  type="number"
                  required
                  min={0}
                  value={editing.stock ?? 0}
                  onChange={(e) => setEditing({ ...editing, stock: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg font-mono"
                />
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-5 text-xs font-medium text-zinc-700">
                <label className="inline-flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={editing.isVisible !== false}
                    onChange={(e) => setEditing({ ...editing, isVisible: e.target.checked })}
                  />
                  Visible
                </label>
                <label className="inline-flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={Boolean(editing.isFeatured)}
                    onChange={(e) => setEditing({ ...editing, isFeatured: e.target.checked })}
                  />
                  Featured
                </label>
                <label className="inline-flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={Boolean(editing.isTrending)}
                    onChange={(e) => setEditing({ ...editing, isTrending: e.target.checked })}
                  />
                  Trending
                </label>
                <label className="inline-flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={Boolean(editing.isBestSeller)}
                    onChange={(e) => setEditing({ ...editing, isBestSeller: e.target.checked })}
                  />
                  Best Seller
                </label>
                <label className="inline-flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={Boolean(editing.isNewArrival)}
                    onChange={(e) => setEditing({ ...editing, isNewArrival: e.target.checked })}
                  />
                  New Arrival
                </label>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={editing.description || ''}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Specifications (separate items with | )
                </label>
                <input
                  type="text"
                  value={editing.specifications || ''}
                  onChange={(e) => setEditing({ ...editing, specifications: e.target.value })}
                  placeholder="Material: Anodized Aluminum | Battery: 5200mAh"
                  className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg"
                />
              </div>

              <div className="sm:col-span-2 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-700">Product Images (max 8)</label>
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-xs font-medium rounded-lg cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    Upload Images
                    <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                  </label>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(editing.images || []).map((img, i) => (
                    <div key={i} className="relative w-20 h-16 rounded-lg overflow-hidden border border-zinc-200 bg-[#121417]">
                      <img src={img} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() =>
                          setEditing({
                            ...editing,
                            images: (editing.images || []).filter((_, idx) => idx !== i),
                          })
                        }
                        className="absolute top-0.5 right-0.5 bg-black/70 text-white rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Or paste an image URL and press Enter"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const val = (e.currentTarget.value || '').trim();
                      if (val) {
                        setEditing({
                          ...editing,
                          images: [...(editing.images || []), val].slice(0, 8),
                        });
                        e.currentTarget.value = '';
                      }
                    }
                  }}
                  className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-lg"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="px-4 py-2 border border-zinc-300 text-xs font-semibold rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 bg-[#111317] text-white text-xs font-semibold rounded-lg hover:bg-zinc-800"
              >
                {saving ? 'Saving...' : 'Save Product'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export const AdminCategoriesTab: React.FC = () => {
  const { categories, showToast } = useStore();
  const [editing, setEditing] = useState<Partial<Category> | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing || !editing.name?.trim()) return;
    const id = editing.id || `cat-${Date.now()}`;
    const slug =
      editing.slug?.trim() ||
      editing.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    try {
      const payload: Record<string, unknown> = {
        id,
        name: editing.name.trim(),
        slug,
        description: (editing.description || '').trim(),
        imageUrl: editing.imageUrl || '/assets/products/led-desk-lamp.jpg',
        displayOrder: Number(editing.displayOrder || 1),
        isActive: editing.isActive !== false,
        updatedAt: serverTimestamp(),
      };
      if (editing.createdAt) {
        payload.createdAt = editing.createdAt;
        await updateDoc(doc(db, 'categories', id), payload);
        showToast('Category updated.');
      } else {
        payload.createdAt = serverTimestamp();
        await setDoc(doc(db, 'categories', id), payload);
        showToast('Category created.');
      }
      setEditing(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `categories/${id}`);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <h2 className="font-display text-lg font-bold text-[#111317]">Categories ({categories.length})</h2>
        <button
          type="button"
          onClick={() =>
            setEditing({
              id: `cat-${Date.now()}`,
              name: '',
              description: '',
              imageUrl: '/assets/products/led-desk-lamp.jpg',
              displayOrder: categories.length + 1,
              isActive: true,
            })
          }
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#111317] text-white text-xs font-semibold rounded-lg"
        >
          <Plus className="w-4 h-4" /> Add Category
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((cat) => (
          <div key={cat.id} className="bg-white border border-zinc-200 rounded-xl p-4 flex gap-4 items-center">
            <img
              src={cat.imageUrl || '/assets/products/led-desk-lamp.jpg'}
              alt={cat.name}
              className="w-16 h-14 rounded-lg object-cover bg-[#121417] shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-[#111317] truncate">{cat.name}</p>
              <p className="text-xs text-zinc-500">Order: {cat.displayOrder} · {cat.isActive ? 'Active' : 'Hidden'}</p>
            </div>
            <div className="flex gap-1">
              <button type="button" onClick={() => setEditing(cat)} className="p-1.5 text-zinc-500 hover:text-[#111317]">
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={async () => {
                  await deleteDoc(doc(db, 'categories', cat.id));
                  showToast('Category deleted.');
                }}
                className="p-1.5 text-zinc-500 hover:text-rose-600"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form onSubmit={handleSave} className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-display text-lg font-bold">{editing.createdAt ? 'Edit Category' : 'New Category'}</h3>
            <input
              type="text"
              required
              placeholder="Category Name"
              value={editing.name || ''}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg"
            />
            <textarea
              rows={2}
              placeholder="Description"
              value={editing.description || ''}
              onChange={(e) => setEditing({ ...editing, description: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                placeholder="Display Order"
                value={editing.displayOrder ?? 1}
                onChange={(e) => setEditing({ ...editing, displayOrder: Number(e.target.value) })}
                className="px-3 py-2 text-sm border border-zinc-300 rounded-lg"
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editing.isActive !== false}
                  onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })}
                />
                Active
              </label>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">Category Image URL or Upload</label>
              <input
                type="text"
                value={editing.imageUrl || ''}
                onChange={(e) => setEditing({ ...editing, imageUrl: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-lg mb-2"
              />
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    const url = await compressImageFileToDataUrl(f, 640);
                    setEditing({ ...editing, imageUrl: url });
                  }
                }}
                className="text-xs"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setEditing(null)} className="px-4 py-2 border rounded-lg text-xs">
                Cancel
              </button>
              <button type="submit" className="px-4 py-2 bg-[#111317] text-white rounded-lg text-xs font-semibold">
                Save
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export const AdminInventoryTab: React.FC<{ logs: InventoryLog[] }> = ({ logs }) => {
  const { products, user, showToast } = useStore();
  const [adjusting, setAdjusting] = useState<Product | null>(null);
  const [newStock, setNewStock] = useState(0);
  const [reason, setReason] = useState('Manual Restock');

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjusting || !user) return;
    const clamped = Math.max(0, Math.floor(newStock));
    try {
      await runTransaction(db, async (tx) => {
        const pRef = doc(db, 'products', adjusting.id);
        const pSnap = await tx.get(pRef);
        if (!pSnap.exists()) throw new Error('Product not found');
        const current = pSnap.data() as Product;
        tx.update(pRef, {
          stock: clamped,
          inStock: clamped > 0,
          updatedAt: serverTimestamp(),
        });
        tx.set(doc(collection(db, 'inventoryLogs')), {
          productId: adjusting.id,
          productName: current.name,
          changeAmount: clamped - current.stock,
          previousStock: current.stock,
          newStock: clamped,
          reason: reason.trim() || 'Manual Adjustment',
          referenceId: 'admin',
          actorUid: user.uid,
          createdAt: serverTimestamp(),
        });
      });
      setAdjusting(null);
      showToast('Inventory updated.');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `products/${adjusting.id}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-zinc-200 rounded-xl overflow-x-auto">
        <div className="px-4 py-3 border-b border-zinc-200 font-display font-bold text-sm text-[#111317]">
          Live Inventory Status
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 border-b border-zinc-200 text-xs uppercase text-zinc-500">
            <tr>
              <th className="py-3 px-4">Product</th>
              <th className="py-3 px-4">SKU</th>
              <th className="py-3 px-4 text-right">Current Stock</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {products.map((p) => (
              <tr key={p.id}>
                <td className="py-3 px-4 font-medium">{p.name}</td>
                <td className="py-3 px-4 font-mono text-xs text-zinc-500">{p.sku}</td>
                <td className="py-3 px-4 text-right font-mono font-bold tabular-nums">{p.stock}</td>
                <td className="py-3 px-4 text-xs font-semibold">
                  {p.stock === 0 ? (
                    <span className="text-rose-600">Out of Stock</span>
                  ) : p.stock <= 5 ? (
                    <span className="text-amber-700">Low Stock</span>
                  ) : (
                    <span className="text-emerald-700">Healthy</span>
                  )}
                </td>
                <td className="py-3 px-4 text-right">
                  <button
                    type="button"
                    onClick={() => {
                      setAdjusting(p);
                      setNewStock(p.stock);
                    }}
                    className="px-3 py-1.5 border border-zinc-300 rounded-lg text-xs font-semibold hover:bg-zinc-50"
                  >
                    Adjust Stock
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white border border-zinc-200 rounded-xl overflow-x-auto">
        <div className="px-4 py-3 border-b border-zinc-200 font-display font-bold text-sm text-[#111317]">
          Recent Stock History
        </div>
        <table className="w-full text-left text-xs">
          <thead className="bg-zinc-50 border-b border-zinc-200 uppercase text-zinc-500">
            <tr>
              <th className="py-2.5 px-4">Product</th>
              <th className="py-2.5 px-4">Reason</th>
              <th className="py-2.5 px-4 text-right">Change</th>
              <th className="py-2.5 px-4 text-right">New Stock</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {logs.slice(0, 20).map((l, idx) => (
              <tr key={l.id || idx}>
                <td className="py-2.5 px-4 font-medium text-zinc-800">{l.productName}</td>
                <td className="py-2.5 px-4 text-zinc-600">{l.reason}</td>
                <td className={`py-2.5 px-4 text-right font-mono font-semibold ${l.changeAmount < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                  {l.changeAmount > 0 ? `+${l.changeAmount}` : l.changeAmount}
                </td>
                <td className="py-2.5 px-4 text-right font-mono">{l.newStock}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {adjusting && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form onSubmit={handleAdjust} className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4">
            <h3 className="font-display text-lg font-bold">Adjust Stock: {adjusting.name}</h3>
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">New Stock Quantity</label>
              <input
                type="number"
                min={0}
                required
                value={newStock}
                onChange={(e) => setNewStock(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">Reason</label>
              <input
                type="text"
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setAdjusting(null)} className="px-4 py-2 border rounded-lg text-xs">
                Cancel
              </button>
              <button type="submit" className="px-4 py-2 bg-[#111317] text-white rounded-lg text-xs font-semibold">
                Update Stock
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export const AdminBannersTab: React.FC = () => {
  const { banners, storeSettings, showToast } = useStore();
  const [editing, setEditing] = useState<Partial<Banner> | null>(null);

  const vis = storeSettings.sectionsVisibility || {
    announcementBar: true,
    categories: true,
    featured: true,
    trending: true,
    bestSellers: true,
    newArrivals: true,
    promoBanner: true,
    benefits: true,
    newsletter: true,
  };

  const toggleSection = async (key: keyof NonNullable<StorePublicSettings['sectionsVisibility']>) => {
    try {
      await updateDoc(doc(db, 'storeConfig', 'public'), {
        sectionsVisibility: { ...vis, [key]: !vis[key] },
        updatedAt: serverTimestamp(),
      });
      showToast('Homepage section visibility updated.');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'storeConfig/public');
    }
  };

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing || !editing.title?.trim()) return;
    const id = editing.id || `banner-${Date.now()}`;
    try {
      const payload: Record<string, unknown> = {
        id,
        title: editing.title.trim(),
        subtitle: (editing.subtitle || '').trim(),
        ctaText: (editing.ctaText || 'Shop Now').trim(),
        ctaLink: (editing.ctaLink || '/shop').trim(),
        imageUrl: editing.imageUrl || '/assets/aistudio/velloxb_5c666189.jpg',
        placement: editing.placement || 'hero',
        isActive: editing.isActive !== false,
        displayOrder: Number(editing.displayOrder || 1),
        updatedAt: serverTimestamp(),
      };
      if (editing.createdAt) {
        payload.createdAt = editing.createdAt;
        await updateDoc(doc(db, 'banners', id), payload);
      } else {
        payload.createdAt = serverTimestamp();
        await setDoc(doc(db, 'banners', id), payload);
      }
      setEditing(null);
      showToast('Banner saved.');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `banners/${id}`);
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-white border border-zinc-200 rounded-xl p-6">
        <h2 className="font-display text-lg font-bold text-[#111317] mb-3">Homepage Sections Visibility</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          {[
            ['announcementBar', 'Announcement Bar'],
            ['categories', 'Shop by Category'],
            ['featured', 'Featured Products'],
            ['trending', 'Trending Tab'],
            ['bestSellers', 'Best Sellers Tab'],
            ['newArrivals', 'New Arrivals Tab'],
            ['promoBanner', 'Promo & Offers'],
            ['benefits', 'Customer Benefits'],
            ['newsletter', 'Newsletter'],
          ].map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 p-2.5 border border-zinc-200 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={vis[key as keyof typeof vis]}
                onChange={() => toggleSection(key as keyof typeof vis)}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="font-display text-lg font-bold text-[#111317]">Banners</h2>
          <button
            type="button"
            onClick={() =>
              setEditing({
                id: `banner-${Date.now()}`,
                title: '',
                subtitle: '',
                ctaText: 'Shop Collection',
                ctaLink: '/shop',
                imageUrl: '/assets/aistudio/velloxb_5c666189.jpg',
                placement: 'promo',
                isActive: true,
                displayOrder: banners.length + 1,
              })
            }
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#111317] text-white text-xs font-semibold rounded-lg"
          >
            <Plus className="w-4 h-4" /> Add Banner
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {banners.map((b) => (
            <div key={b.id} className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
              <div className="aspect-[16/7] bg-[#111317]">
                <img src={b.imageUrl} alt={b.title} className="w-full h-full object-cover" />
              </div>
              <div className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs uppercase font-semibold text-zinc-500">
                    {b.placement} · {b.isActive ? 'Active' : 'Inactive'}
                  </p>
                  <p className="font-semibold text-sm text-[#111317] truncate">{b.title}</p>
                </div>
                <div className="flex gap-1">
                  <button type="button" onClick={() => setEditing(b)} className="p-1.5 text-zinc-500 hover:text-[#111317]">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await deleteDoc(doc(db, 'banners', b.id));
                      showToast('Banner deleted.');
                    }}
                    className="p-1.5 text-zinc-500 hover:text-rose-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form onSubmit={handleSaveBanner} className="bg-white rounded-2xl max-w-md w-full p-6 space-y-3.5">
            <h3 className="font-display text-lg font-bold">{editing.createdAt ? 'Edit Banner' : 'Add Banner'}</h3>
            <input
              type="text"
              required
              placeholder="Headline"
              value={editing.title || ''}
              onChange={(e) => setEditing({ ...editing, title: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg"
            />
            <textarea
              rows={2}
              placeholder="Subtitle"
              value={editing.subtitle || ''}
              onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="CTA Text"
                value={editing.ctaText || ''}
                onChange={(e) => setEditing({ ...editing, ctaText: e.target.value })}
                className="px-3 py-2 text-sm border border-zinc-300 rounded-lg"
              />
              <input
                type="text"
                placeholder="CTA Link (/shop)"
                value={editing.ctaLink || ''}
                onChange={(e) => setEditing({ ...editing, ctaLink: e.target.value })}
                className="px-3 py-2 text-sm border border-zinc-300 rounded-lg"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <select
                value={editing.placement || 'hero'}
                onChange={(e) => setEditing({ ...editing, placement: e.target.value as 'hero' | 'promo' })}
                className="px-3 py-2 text-sm border border-zinc-300 rounded-lg"
              >
                <option value="hero">Hero Banner</option>
                <option value="promo">Promo Banner</option>
              </select>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editing.isActive !== false}
                  onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })}
                />
                Active
              </label>
            </div>
            <div>
              <input
                type="text"
                placeholder="Image URL"
                value={editing.imageUrl || ''}
                onChange={(e) => setEditing({ ...editing, imageUrl: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-lg mb-2"
              />
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    const url = await compressImageFileToDataUrl(f, 1200, 0.78);
                    setEditing({ ...editing, imageUrl: url });
                  }
                }}
                className="text-xs"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setEditing(null)} className="px-4 py-2 border rounded-lg text-xs">
                Cancel
              </button>
              <button type="submit" className="px-4 py-2 bg-[#111317] text-white rounded-lg text-xs font-semibold">
                Save Banner
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export const AdminCouponsTab: React.FC<{ coupons: Coupon[] }> = ({ coupons }) => {
  const { showToast } = useStore();
  const [code, setCode] = useState('');
  const [type, setType] = useState<'percentage' | 'fixed'>('percentage');
  const [value, setValue] = useState(10);
  const [minOrderAmount, setMinOrderAmount] = useState(1000);
  const [expiresAt, setExpiresAt] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    if (cleanCode.length < 2) {
      showToast('Coupon code must be at least 2 characters.');
      return;
    }
    try {
      await setDoc(doc(db, 'coupons', cleanCode), {
        code: cleanCode,
        type,
        value: Number(value),
        minOrderAmount: Number(minOrderAmount),
        expiresAt: expiresAt || '',
        isActive: true,
        usageCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setCode('');
      showToast(`Coupon ${cleanCode} created.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `coupons/${cleanCode}`);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleCreate} className="bg-white border border-zinc-200 rounded-xl p-6 space-y-4">
        <h2 className="font-display text-lg font-bold text-[#111317]">Create Discount Coupon</h2>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          <input
            type="text"
            required
            placeholder="Code (e.g. VELLOX10)"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="px-3 py-2 text-sm border border-zinc-300 rounded-lg font-mono uppercase"
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value as 'percentage' | 'fixed')}
            className="px-3 py-2 text-sm border border-zinc-300 rounded-lg"
          >
            <option value="percentage">Percentage (%)</option>
            <option value="fixed">Fixed Amount (PKR)</option>
          </select>
          <input
            type="number"
            min={1}
            required
            placeholder="Discount Value"
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
            className="px-3 py-2 text-sm border border-zinc-300 rounded-lg font-mono"
          />
          <input
            type="number"
            min={0}
            required
            placeholder="Min Order (PKR)"
            value={minOrderAmount}
            onChange={(e) => setMinOrderAmount(Number(e.target.value))}
            className="px-3 py-2 text-sm border border-zinc-300 rounded-lg font-mono"
          />
          <input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="px-3 py-2 text-sm border border-zinc-300 rounded-lg"
          />
        </div>
        <button type="submit" className="px-5 py-2 bg-[#111317] text-white text-xs font-semibold rounded-lg">
          Create Coupon
        </button>
      </form>

      <div className="bg-white border border-zinc-200 rounded-xl overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 border-b border-zinc-200 text-xs uppercase text-zinc-500">
            <tr>
              <th className="py-3 px-4">Code</th>
              <th className="py-3 px-4">Discount</th>
              <th className="py-3 px-4">Min Order</th>
              <th className="py-3 px-4">Used</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {coupons.map((c) => (
              <tr key={c.code}>
                <td className="py-3 px-4 font-mono font-bold">{c.code}</td>
                <td className="py-3 px-4 font-mono">
                  {c.type === 'percentage' ? `${c.value}%` : formatPKR(c.value)}
                </td>
                <td className="py-3 px-4 font-mono">{formatPKR(c.minOrderAmount)}</td>
                <td className="py-3 px-4 font-mono">{c.usageCount}</td>
                <td className="py-3 px-4 text-xs font-semibold">
                  {c.isActive ? <span className="text-emerald-700">Active</span> : <span className="text-zinc-400">Disabled</span>}
                </td>
                <td className="py-3 px-4 text-right space-x-2">
                  <button
                    type="button"
                    onClick={async () => {
                      await updateDoc(doc(db, 'coupons', c.code), {
                        isActive: !c.isActive,
                        updatedAt: serverTimestamp(),
                      });
                      showToast(`Coupon ${c.code} updated.`);
                    }}
                    className="text-xs font-semibold text-zinc-700 hover:underline"
                  >
                    {c.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await deleteDoc(doc(db, 'coupons', c.code));
                      showToast('Coupon deleted.');
                    }}
                    className="text-xs font-semibold text-rose-600 hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
