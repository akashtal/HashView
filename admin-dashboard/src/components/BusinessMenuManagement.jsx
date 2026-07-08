/**
 * BusinessMenuManagement
 * ──────────────────────
 * Orchestrates menu item data and delegates all heavy UI to focused sub-components:
 *
 *   menu/MenuItemModal.jsx      — Add / Edit item modal
 *   menu/AIMenuScanPanel.jsx    — AI scan slide-over review panel
 *   menu/CustomizationsPanel.jsx— Inline customization group + option builder
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, Trash2, Edit2, Sparkles, Clock, Utensils, Check,
  Image as ImageIcon, Eye, EyeOff, RotateCw,
  ScanLine, Settings,
} from 'lucide-react';
import { adminApi } from '../api/adminApi';
import MenuItemModal    from './menu/MenuItemModal';
import AIMenuScanPanel  from './menu/AIMenuScanPanel';
import CustomizationsPanel from './menu/CustomizationsPanel';

const BLANK_FORM = {
  name: '', description: '', price: '', currency: 'GBP',
  menuCategory: '', type: 'food', tags: '', dietary: [],
  isAvailable: true, isPopular: false, duration: '',
};

export default function BusinessMenuManagement({ businessId }) {
  // ── Menu data ─────────────────────────────────────────────────────────────
  const [groupedItems, setGroupedItems]   = useState({});
  const [stats, setStats]                 = useState(null);
  const [loading, setLoading]             = useState(true);
  const [statsLoading, setStatsLoading]   = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // ── Add / Edit modal ──────────────────────────────────────────────────────
  const [modalOpen, setModalOpen]     = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm]               = useState({ ...BLANK_FORM });
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview]   = useState('');
  const [saving, setSaving]             = useState(false);

  // ── AI scanner ────────────────────────────────────────────────────────────
  const [aiScanning, setAiScanning]         = useState(false);
  const [reviewItems, setReviewItems]       = useState([]);
  const [reviewPanelOpen, setReviewPanelOpen] = useState(false);
  const [savingBatch, setSavingBatch]       = useState(false);
  const scanFileRef = useRef(null);

  // ── Customizations ────────────────────────────────────────────────────────
  const [customizingItemId, setCustomizingItemId] = useState(null);

  // ─────────────────────────────────────────────────────────────────────────
  // Data loading
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (businessId) loadMenuData();
  }, [businessId]);

  const loadMenuData = async () => {
    try {
      setLoading(true);
      const [menuRes, statsRes] = await Promise.all([
        adminApi.getMenuItems(businessId),
        adminApi.getMenuStats(businessId).catch(() => null),
      ]);
      if (menuRes.data?.success)  setGroupedItems(menuRes.data.data || {});
      if (statsRes?.data?.success) setStats(statsRes.data.data);
    } catch (err) {
      console.error('Error loading menu:', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshStats = async () => {
    try {
      setStatsLoading(true);
      const res = await adminApi.getMenuStats(businessId);
      if (res.data?.success) setStats(res.data.data);
    } catch (err) {
      console.error('Error refreshing stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Add / Edit modal handlers
  // ─────────────────────────────────────────────────────────────────────────
  const openAddModal = () => {
    setEditingItem(null);
    setForm({ ...BLANK_FORM });
    setSelectedFile(null);
    setFilePreview('');
    setModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setForm({
      name:         item.name || '',
      description:  item.description || '',
      price:        item.price !== undefined ? String(item.price) : '',
      currency:     item.currency || 'GBP',
      menuCategory: item.menuCategory || '',
      type:         item.type || 'food',
      tags:         (item.tags || []).join(', '),
      dietary:      item.dietary || [],
      isAvailable:  item.isAvailable !== false,
      isPopular:    item.isPopular || false,
      duration:     item.duration !== undefined ? String(item.duration) : '',
    });
    setSelectedFile(null);
    setFilePreview(item.image?.url || '');
    setModalOpen(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setFilePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleToggleDietary = (option) => {
    setForm(prev => ({
      ...prev,
      dietary: prev.dietary.includes(option)
        ? prev.dietary.filter(d => d !== option)
        : [...prev.dietary, option],
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return alert('Item name is required');
    if (!form.price || isNaN(parseFloat(form.price))) return alert('A valid price is required');

    try {
      setSaving(true);
      const fd = new FormData();
      fd.append('businessId',   businessId);
      fd.append('name',         form.name.trim());
      fd.append('description',  form.description.trim());
      fd.append('price',        parseFloat(form.price));
      fd.append('currency',     form.currency);
      fd.append('menuCategory', form.menuCategory.trim() || 'General');
      fd.append('type',         form.type);
      fd.append('tags',         form.tags.trim());
      fd.append('isAvailable',  form.isAvailable ? 'true' : 'false');
      fd.append('isPopular',    form.isPopular   ? 'true' : 'false');
      fd.append('dietary',      JSON.stringify(form.dietary));
      if (form.duration && form.type === 'service') fd.append('duration', parseInt(form.duration));
      if (selectedFile) fd.append('image', selectedFile);

      if (editingItem) {
        await adminApi.updateMenuItem(editingItem._id, fd);
      } else {
        await adminApi.createMenuItem(fd);
      }
      setModalOpen(false);
      await loadMenuData();
    } catch (err) {
      console.error('Error saving menu item:', err);
      alert(err.response?.data?.message || 'Server error saving menu item');
    } finally {
      setSaving(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Item actions (delete / toggle)
  // ─────────────────────────────────────────────────────────────────────────
  const handleDelete = async (item) => {
    if (!window.confirm(`Delete "${item.name}" from the menu? This action is permanent.`)) return;
    try {
      setActionLoadingId(item._id);
      await adminApi.deleteMenuItem(item._id);
      await loadMenuData();
    } catch (err) {
      console.error(err);
      alert('Failed to delete menu item');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleAvailability = async (item) => {
    try {
      setActionLoadingId(item._id);
      await adminApi.toggleMenuItemAvailability(item._id);
      await loadMenuData();
    } catch (err) {
      console.error(err);
      alert('Failed to toggle availability');
    } finally {
      setActionLoadingId(null);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // AI scanner handlers
  // ─────────────────────────────────────────────────────────────────────────
  const handleAIScan = () => scanFileRef.current?.click();

  const handleScanFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    try {
      setAiScanning(true);
      const fd = new FormData();
      fd.append('businessId', businessId);
      fd.append('currency', 'GBP');
      fd.append('menuImage', file);
      const res = await adminApi.extractMenuFromImage(fd);
      if (!res.data?.success || !res.data?.data?.length) {
        return alert('AI could not extract any items. Please try a clearer photo.');
      }
      setReviewItems(res.data.data.map((item, idx) => ({ ...item, _localId: `draft_${idx}`, _selected: true })));
      setReviewPanelOpen(true);
    } catch (err) {
      console.error('AI scan error:', err);
      alert(err.response?.data?.message || 'AI scan failed. Please try again.');
    } finally {
      setAiScanning(false);
    }
  };

  const handleBatchSave = async () => {
    const selected = reviewItems.filter(i => i._selected);
    if (!selected.length) return alert('Please select at least one item to save.');
    try {
      setSavingBatch(true);
      const items = selected.map(({ _localId, _selected, ...rest }) => rest);
      const res = await adminApi.createMenuItemsBatch(businessId, items, true);
      setReviewPanelOpen(false);
      setReviewItems([]);
      await loadMenuData();
      alert(res.data.message || 'Items saved successfully!');
    } catch (err) {
      console.error('Batch save error:', err);
      alert(err.response?.data?.message || 'Failed to save items.');
    } finally {
      setSavingBatch(false);
    }
  };

  const handleToggleReviewItem = (localId) =>
    setReviewItems(prev => prev.map(i => i._localId === localId ? { ...i, _selected: !i._selected } : i));

  const handleToggleAllReviewItems = () => {
    const allSelected = reviewItems.every(i => i._selected);
    setReviewItems(prev => prev.map(i => ({ ...i, _selected: !allSelected })));
  };

  const handleUpdateReviewItem = (localId, field, value) =>
    setReviewItems(prev => prev.map(i => i._localId === localId ? { ...i, [field]: value } : i));

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  const totalItemsCount = Object.values(groupedItems).flat().length;

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Utensils className="mr-2 text-primary-600" size={24} />
            Menu &amp; Services Management
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Admin can manage catalog items — fully visible to users &amp; searchable by AI.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={scanFileRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            className="hidden"
            onChange={handleScanFileChange}
          />
          <button
            onClick={handleAIScan}
            disabled={aiScanning}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white font-medium rounded-lg transition flex items-center gap-2 shadow-sm"
          >
            {aiScanning ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <ScanLine size={16} />
                <Sparkles size={14} className="text-yellow-300" />
                AI Scan Menu
              </>
            )}
          </button>
          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition flex items-center shadow-sm"
          >
            <Plus size={18} className="mr-1.5" />
            Add Menu Item
          </button>
        </div>
      </div>

      {/* ── Stats banner ── */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-xl border">
          {[
            { label: 'Total Items',  value: stats.total  || 0, cls: 'text-gray-900' },
            { label: 'Active',       value: stats.active || 0, cls: 'text-green-600' },
            { label: 'Popular ⭐',   value: stats.popular || 0, cls: 'text-amber-500' },
          ].map(s => (
            <div key={s.label} className="text-center p-2 bg-white rounded-lg border shadow-sm">
              <p className={`text-2xl font-bold ${s.cls}`}>{s.value}</p>
              <p className="text-xs text-gray-500 font-semibold mt-0.5">{s.label}</p>
            </div>
          ))}
          <div className="text-center p-2 bg-white rounded-lg border shadow-sm">
            {stats.priceRange ? (
              <p className="text-base sm:text-lg font-bold text-primary-600 truncate px-1">
                £{stats.priceRange.min?.toFixed(0)} - £{stats.priceRange.max?.toFixed(0)}
              </p>
            ) : (
              <p className="text-lg font-bold text-gray-400">N/A</p>
            )}
            <p className="text-xs text-gray-500 font-semibold mt-0.5 flex items-center justify-center gap-1">
              Price Range
              <button onClick={refreshStats} disabled={statsLoading} className="text-gray-400 hover:text-primary-600">
                <RotateCw size={10} className={statsLoading ? 'animate-spin' : ''} />
              </button>
            </p>
          </div>
        </div>
      )}

      {/* ── AI discoverability notice ── */}
      <div className="bg-primary-50 rounded-xl p-4 border border-primary-200 flex items-start gap-3">
        <Sparkles className="text-primary-600 flex-shrink-0 mt-0.5" size={18} />
        <div>
          <h4 className="text-sm font-bold text-primary-900">AI Discovery Ready</h4>
          <p className="text-xs text-primary-700 mt-0.5 leading-relaxed">
            All menu items, descriptions, dietary labels, and search tags are indexed for real-time
            natural language queries (e.g. <span className="font-semibold">&quot;halal beef steak under £20&quot;</span>).
          </p>
        </div>
      </div>

      {/* ── Menu list ── */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto" />
          <p className="text-gray-500 mt-2 text-sm">Loading catalog items...</p>
        </div>
      ) : totalItemsCount === 0 ? (
        <div className="text-center py-16 border-2 border-dashed rounded-xl bg-gray-50/50 p-6">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4 border shadow-sm">
            <Utensils className="text-primary-600" size={28} />
          </div>
          <h3 className="text-lg font-bold text-gray-900">No Catalog Items Added Yet</h3>
          <p className="text-sm text-gray-500 max-w-sm mx-auto mt-2 leading-relaxed">
            Create items such as food dishes, drinks, haircuts, hotel rooms, spa services, packages, or retail products.
          </p>
          <button
            onClick={openAddModal}
            className="mt-5 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl shadow-md transition"
          >
            Add First Item
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedItems).map(([category, items]) => (
            <div key={category} className="space-y-4">
              {/* Category heading */}
              <div className="flex items-center gap-2 border-l-4 border-primary-600 pl-3 py-0.5 bg-gray-50 rounded-r-lg">
                <h3 className="text-lg font-bold text-gray-900">{category}</h3>
                <span className="text-xs font-semibold px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full">
                  {items.length} item{items.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Items grid — each item + optional customizations panel */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {items.map(item => (
                  <React.Fragment key={item._id}>

                    {/* Item card */}
                    <div className={`flex border rounded-xl overflow-hidden bg-white hover:shadow-md transition-shadow relative group ${!item.isAvailable ? 'opacity-65' : ''}`}>

                      {/* Thumbnail */}
                      {item.image?.url ? (
                        <div className="w-28 h-28 flex-shrink-0 bg-gray-100 relative">
                          <img src={item.image.url} alt={item.name} className="w-full h-full object-cover" />
                          {!item.isAvailable && (
                            <div className="absolute inset-0 bg-black/45 flex items-center justify-center">
                              <span className="text-[10px] font-bold text-white uppercase bg-red-600 px-1.5 py-0.5 rounded">
                                Unavailable
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="w-28 h-28 flex-shrink-0 bg-gray-50 border-r flex flex-col items-center justify-center text-gray-400">
                          <ImageIcon size={22} className="opacity-50" />
                          <span className="text-[10px] mt-1 font-medium">No Image</span>
                        </div>
                      )}

                      {/* Details */}
                      <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
                        <div>
                          <div className="flex justify-between items-start gap-2">
                            <h4 className="font-bold text-gray-900 truncate leading-snug group-hover:text-primary-600 transition-colors">
                              {item.name}
                              {item.isPopular && <span className="text-amber-500 ml-1.5">⭐</span>}
                            </h4>
                            <span className="font-bold text-primary-600 flex-shrink-0">
                              {item.currency === 'GBP' ? '£' : item.currency === 'USD' ? '$' : '€'}
                              {item.price?.toFixed(2)}
                            </span>
                          </div>
                          {item.description && (
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed break-words pr-2">
                              {item.description}
                            </p>
                          )}
                          {/* Badges */}
                          <div className="flex flex-wrap items-center gap-1.5 mt-2">
                            <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 border rounded text-[10px] uppercase font-bold">
                              {item.type}
                            </span>
                            {item.duration && (
                              <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded text-[10px] font-semibold flex items-center gap-1">
                                <Clock size={10} /> {item.duration} min
                              </span>
                            )}
                            {item.dietary?.slice(0, 3).map(diet => (
                              <span key={diet} className="px-1.5 py-0.5 bg-green-50 text-green-700 border border-green-100 rounded text-[10px] font-semibold">
                                {diet}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex justify-end items-center gap-2 mt-3 pt-3 border-t">
                          {/* Toggle availability */}
                          <button
                            onClick={() => handleToggleAvailability(item)}
                            disabled={actionLoadingId === item._id}
                            title={item.isAvailable ? 'Click to disable item' : 'Click to enable item'}
                            className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition ${
                              item.isAvailable
                                ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100/70'
                                : 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100/70'
                            }`}
                          >
                            {item.isAvailable ? <Eye size={13} /> : <EyeOff size={13} />}
                            <span>{item.isAvailable ? 'Active' : 'Disabled'}</span>
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => openEditModal(item)}
                            disabled={actionLoadingId === item._id}
                            className="p-1.5 rounded-lg border bg-white hover:bg-gray-50 text-gray-700 transition"
                            title="Edit Item"
                          >
                            <Edit2 size={13} />
                          </button>

                          {/* Customizations toggle */}
                          <button
                            onClick={() => setCustomizingItemId(prev => prev === item._id ? null : item._id)}
                            className={`p-1.5 rounded-lg border transition ${
                              customizingItemId === item._id
                                ? 'bg-indigo-100 border-indigo-300 text-indigo-700'
                                : 'bg-white border-gray-200 text-gray-500 hover:bg-indigo-50 hover:text-indigo-600'
                            }`}
                            title="Manage Customizations (sub-categories / variants)"
                          >
                            <Settings size={13} />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDelete(item)}
                            disabled={actionLoadingId === item._id}
                            className="p-1.5 rounded-lg border border-red-100 bg-red-50/50 hover:bg-red-50 text-red-600 transition disabled:opacity-50"
                            title="Delete Item"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Customizations panel — renders below the card */}
                    {customizingItemId === item._id && (
                      <CustomizationsPanel itemId={item._id} itemName={item.name} />
                    )}

                  </React.Fragment>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Add / Edit modal ── */}
      <MenuItemModal
        open={modalOpen}
        editingItem={editingItem}
        form={form}
        setForm={setForm}
        filePreview={filePreview}
        saving={saving}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        onFileChange={handleFileChange}
        onClearFile={() => { setSelectedFile(null); setFilePreview(''); }}
        onToggleDietary={handleToggleDietary}
      />

      {/* ── AI scan slide-over ── */}
      <AIMenuScanPanel
        open={reviewPanelOpen}
        saving={savingBatch}
        reviewItems={reviewItems}
        onClose={() => setReviewPanelOpen(false)}
        onSave={handleBatchSave}
        onToggleItem={handleToggleReviewItem}
        onToggleAll={handleToggleAllReviewItems}
        onUpdateItem={handleUpdateReviewItem}
      />
    </div>
  );
}
