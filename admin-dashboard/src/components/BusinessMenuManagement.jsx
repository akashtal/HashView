import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, Trash2, Edit2, Sparkles, Clock, Utensils, ChevronDown, Check, X,
  Search, Image as ImageIcon, DollarSign, AlertCircle, Eye, EyeOff, RotateCw,
  ScanLine, CheckSquare, Square
} from 'lucide-react';
import { adminApi } from '../api/adminApi';

const ITEM_TYPES = [
  { value: 'food', label: 'Food', icon: '🍔' },
  { value: 'drink', label: 'Drink', icon: '🥤' },
  { value: 'service', label: 'Service', icon: '✂️' },
  { value: 'product', label: 'Product', icon: '📦' },
  { value: 'package', label: 'Package', icon: '🎁' },
  { value: 'room', label: 'Room', icon: '🛌' }
];

const DIETARY_OPTIONS = [
  'vegetarian', 'vegan', 'halal', 'gluten-free', 'dairy-free', 'nut-free', 'kosher', 'organic'
];

const BLANK_FORM = {
  name: '',
  description: '',
  price: '',
  currency: 'GBP',
  menuCategory: '',
  type: 'food',
  tags: '',
  dietary: [],
  isAvailable: true,
  isPopular: false,
  duration: ''
};

export default function BusinessMenuManagement({ businessId }) {
  const [groupedItems, setGroupedItems] = useState({});
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState({ ...BLANK_FORM });
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // ─── AI Menu Scanner state ─────────────────────────────────────────────────────────────
  const [aiScanning, setAiScanning] = useState(false);
  const [reviewItems, setReviewItems] = useState([]);
  const [reviewPanelOpen, setReviewPanelOpen] = useState(false);
  const [savingBatch, setSavingBatch] = useState(false);
  const scanFileRef = useRef(null);

  useEffect(() => {
    if (businessId) {
      loadMenuData();
    }
  }, [businessId]);

  const loadMenuData = async () => {
    try {
      setLoading(true);
      const [menuRes, statsRes] = await Promise.all([
        adminApi.getMenuItems(businessId),
        adminApi.getMenuStats(businessId).catch(() => null)
      ]);

      if (menuRes.data?.success) {
        setGroupedItems(menuRes.data.data || {});
      }
      if (statsRes?.data?.success) {
        setStats(statsRes.data.data);
      }
    } catch (err) {
      console.error('Error loading menu:', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshStats = async () => {
    try {
      setStatsLoading(true);
      const statsRes = await adminApi.getMenuStats(businessId);
      if (statsRes.data?.success) {
        setStats(statsRes.data.data);
      }
    } catch (err) {
      console.error('Error refreshing menu stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingItem(null);
    setForm({ ...BLANK_FORM });
    setSelectedFile(null);
    setFilePreview('');
    setModalOpen(true);
  };

  // ─── AI Menu Scanner handlers ──────────────────────────────────────────────────────
  const handleAIScan = () => {
    scanFileRef.current?.click();
  };

  const handleScanFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so same file can be re-selected
    e.target.value = '';

    try {
      setAiScanning(true);
      const formData = new FormData();
      formData.append('businessId', businessId);
      formData.append('currency', 'GBP');
      formData.append('menuImage', file);

      const res = await adminApi.extractMenuFromImage(formData);
      if (!res.data?.success || !res.data?.data?.length) {
        alert('AI could not extract any items from this image. Please try a clearer photo.');
        return;
      }

      const drafts = res.data.data.map((item, idx) => ({
        ...item,
        _localId: `draft_${idx}`,
        _selected: true,
      }));

      setReviewItems(drafts);
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
    if (selected.length === 0) {
      alert('Please select at least one item to save.');
      return;
    }
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

  const openEditModal = (item) => {
    setEditingItem(item);
    setForm({
      name: item.name || '',
      description: item.description || '',
      price: item.price !== undefined ? String(item.price) : '',
      currency: item.currency || 'GBP',
      menuCategory: item.menuCategory || '',
      type: item.type || 'food',
      tags: (item.tags || []).join(', '),
      dietary: item.dietary || [],
      isAvailable: item.isAvailable !== false,
      isPopular: item.isPopular || false,
      duration: item.duration !== undefined ? String(item.duration) : ''
    });
    setSelectedFile(null);
    setFilePreview(item.image?.url || '');
    setModalOpen(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleDietary = (option) => {
    setForm(prev => {
      const active = prev.dietary.includes(option);
      return {
        ...prev,
        dietary: active
          ? prev.dietary.filter(d => d !== option)
          : [...prev.dietary, option]
      };
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      alert('Item name is required');
      return;
    }
    if (!form.price || isNaN(parseFloat(form.price))) {
      alert('A valid price is required');
      return;
    }

    try {
      setSaving(true);
      const formData = new FormData();
      formData.append('businessId', businessId);
      formData.append('name', form.name.trim());
      formData.append('description', form.description.trim());
      formData.append('price', parseFloat(form.price));
      formData.append('currency', form.currency);
      formData.append('menuCategory', form.menuCategory.trim() || 'General');
      formData.append('type', form.type);
      formData.append('tags', form.tags.trim());
      formData.append('isAvailable', form.isAvailable ? 'true' : 'false');
      formData.append('isPopular', form.isPopular ? 'true' : 'false');
      if (form.duration && form.type === 'service') {
        formData.append('duration', parseInt(form.duration));
      }
      formData.append('dietary', JSON.stringify(form.dietary));

      if (selectedFile) {
        formData.append('image', selectedFile);
      }

      if (editingItem) {
        await adminApi.updateMenuItem(editingItem._id, formData);
      } else {
        await adminApi.createMenuItem(formData);
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

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete "${item.name}" from the menu? This action is permanent.`)) {
      return;
    }

    try {
      setActionLoadingId(item._id);
      await adminApi.deleteMenuItem(item._id);
      await loadMenuData();
    } catch (err) {
      console.error('Error deleting menu item:', err);
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
      console.error('Error toggling availability:', err);
      alert('Failed to toggle availability');
    } finally {
      setActionLoadingId(null);
    }
  };

  const totalItemsCount = Object.values(groupedItems).flat().length;

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 space-y-6">
      {/* Header and Stats */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Utensils className="mr-2 text-primary-600" size={24} />
            Menu & Services Management
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Admin can manage catalog items — fully visible to users & searchable by AI.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Hidden file input for AI scan */}
          <input
            ref={scanFileRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            className="hidden"
            onChange={handleScanFileChange}
          />
          {/* AI Scan Button */}
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
          {/* Manual Add Button */}
          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition flex items-center shadow-sm"
          >
            <Plus size={18} className="mr-1.5" />
            Add Menu Item
          </button>
        </div>
      </div>

      {/* Stats Banner */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-xl border">
          <div className="text-center p-2 bg-white rounded-lg border shadow-sm">
            <p className="text-2xl font-bold text-gray-900">{stats.total || 0}</p>
            <p className="text-xs text-gray-500 font-semibold mt-0.5">Total Items</p>
          </div>
          <div className="text-center p-2 bg-white rounded-lg border shadow-sm">
            <p className="text-2xl font-bold text-green-600">{stats.active || 0}</p>
            <p className="text-xs text-gray-500 font-semibold mt-0.5">Active</p>
          </div>
          <div className="text-center p-2 bg-white rounded-lg border shadow-sm">
            <p className="text-2xl font-bold text-amber-500">{stats.popular || 0}</p>
            <p className="text-xs text-gray-500 font-semibold mt-0.5">Popular ⭐</p>
          </div>
          <div className="text-center p-2 bg-white rounded-lg border shadow-sm relative group">
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

      {/* AI discoverability notice */}
      <div className="bg-primary-50 rounded-xl p-4 border border-primary-200 flex items-start gap-3">
        <Sparkles className="text-primary-600 flex-shrink-0 mt-0.5" size={18} />
        <div>
          <h4 className="text-sm font-bold text-primary-900">AI Discovery Ready</h4>
          <p className="text-xs text-primary-700 mt-0.5 leading-relaxed">
            All menu items, descriptions, dietary labels, and search tags are indexed for real-time natural language query matches (e.g., <span className="font-semibold">"halal beef steak under £20"</span> or <span className="font-semibold">"hair cut for £30"</span>).
          </p>
        </div>
      </div>

      {/* Menu List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
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
              {/* Category Heading */}
              <div className="flex items-center gap-2 border-l-4 border-primary-600 pl-3 py-0.5 bg-gray-50 rounded-r-lg">
                <h3 className="text-lg font-bold text-gray-900">{category}</h3>
                <span className="text-xs font-semibold px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full">
                  {items.length} item{items.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Items Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {items.map((item) => (
                  <div
                    key={item._id}
                    className={`flex border rounded-xl overflow-hidden bg-white hover:shadow-md transition-shadow relative group ${
                      !item.isAvailable ? 'opacity-65' : ''
                    }`}
                  >
                    {/* Item Image */}
                    {item.image?.url ? (
                      <div className="w-28 h-28 flex-shrink-0 bg-gray-100 relative">
                        <img src={item.image.url} alt={item.name} className="w-full h-full object-cover" />
                        {!item.isAvailable && (
                          <div className="absolute inset-0 bg-black/45 flex items-center justify-center">
                            <span className="text-[10px] font-bold text-white uppercase bg-red-600 px-1.5 py-0.5 rounded">Unavailable</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="w-28 h-28 flex-shrink-0 bg-gray-50 border-r flex flex-col items-center justify-center text-gray-400">
                        <ImageIcon size={22} className="opacity-50" />
                        <span className="text-[10px] mt-1 font-medium">No Image</span>
                      </div>
                    )}

                    {/* Item Details */}
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

                        {/* Badges / Meta */}
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 border rounded text-[10px] uppercase font-bold">
                            {item.type}
                          </span>
                          {item.duration && (
                            <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded text-[10px] font-semibold flex items-center gap-1">
                              <Clock size={10} /> {item.duration} min
                            </span>
                          )}
                          {item.dietary?.slice(0, 3).map((diet) => (
                            <span key={diet} className="px-1.5 py-0.5 bg-green-50 text-green-700 border border-green-100 rounded text-[10px] font-semibold">
                              {diet}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Action buttons footer */}
                      <div className="flex justify-end items-center gap-2 mt-3 pt-3 border-t">
                        {/* Toggle active */}
                        <button
                          onClick={() => handleToggleAvailability(item)}
                          disabled={actionLoadingId === item._id}
                          className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition ${
                            item.isAvailable
                              ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100/70'
                              : 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100/70'
                          }`}
                          title={item.isAvailable ? 'Click to disable item' : 'Click to enable item'}
                        >
                          {item.isAvailable ? <Eye size={13} /> : <EyeOff size={13} />}
                          <span>{item.isAvailable ? 'Active' : 'Disabled'}</span>
                        </button>

                        <button
                          onClick={() => openEditModal(item)}
                          disabled={actionLoadingId === item._id}
                          className="p-1.5 rounded-lg border bg-white hover:bg-gray-50 text-gray-700 transition"
                          title="Edit Item"
                        >
                          <Edit2 size={13} />
                        </button>

                        <button
                          onClick={() => handleDelete(item)}
                          disabled={actionLoadingId === item._id}
                          className="p-1.5 rounded-lg border border-red-100 bg-red-50/50 hover:bg-red-50 text-red-600 transition"
                          title="Delete Item"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Add / Edit Modal ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col my-8">
            {/* Modal Header */}
            <div className="p-6 border-b flex justify-between items-center bg-gray-50">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {editingItem ? 'Edit Catalog Item' : 'Add New Catalog Item'}
                </h3>
                <p className="text-xs text-gray-500 mt-1">Configure item settings, dietary tags, and search keywords.</p>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition">
                <X size={24} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Type Select buttons */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Item Type *</label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {ITEM_TYPES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, type: t.value }))}
                      className={`py-2 px-3 border rounded-xl text-center text-sm font-medium flex flex-col items-center justify-center gap-1.5 transition ${
                        form.type === t.value
                          ? 'border-primary-500 bg-primary-50 text-primary-700 ring-2 ring-primary-500/20'
                          : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                      }`}
                    >
                      <span className="text-xl">{t.icon}</span>
                      <span className="text-xs font-semibold">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Core Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Item Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Grilled Chicken Breast, Hair Cut"
                    value={form.name}
                    onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm border-gray-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Section / Category *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Starters, Mains, Salon Services, Premium Rooms"
                    value={form.menuCategory}
                    onChange={(e) => setForm(prev => ({ ...prev, menuCategory: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm border-gray-300"
                  />
                </div>
              </div>

              {/* Pricing & Duration */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Price *</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-3 text-gray-400 text-sm font-bold flex items-center">
                      {form.currency === 'GBP' ? '£' : form.currency === 'USD' ? '$' : '€'}
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      min="0"
                      placeholder="9.99"
                      value={form.price}
                      onChange={(e) => setForm(prev => ({ ...prev, price: e.target.value }))}
                      className="w-full pl-8 pr-3.5 py-2.5 border rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm font-semibold border-gray-300"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Currency</label>
                  <select
                    value={form.currency}
                    onChange={(e) => setForm(prev => ({ ...prev, currency: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm border-gray-300 bg-white"
                  >
                    <option value="GBP">GBP (£)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="INR">INR (₹)</option>
                    <option value="AED">AED (Dh)</option>
                    <option value="CAD">CAD ($)</option>
                    <option value="AUD">AUD ($)</option>
                  </select>
                </div>
                {form.type === 'service' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Duration (minutes)</label>
                    <input
                      type="number"
                      min="1"
                      placeholder="e.g. 45"
                      value={form.duration}
                      onChange={(e) => setForm(prev => ({ ...prev, duration: e.target.value }))}
                      className="w-full px-3.5 py-2.5 border rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm border-gray-300"
                    />
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
                <textarea
                  placeholder="Tell customers about ingredients, portions, sizing, or service outline..."
                  value={form.description}
                  onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3.5 py-2.5 border rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm border-gray-300 resize-none"
                />
              </div>

              {/* AI tags */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Search Tags (AI Keywords)</label>
                <span className="text-xs text-gray-400 block mb-2 leading-relaxed">
                  Enter comma-separated keywords (e.g. <span className="font-semibold">chicken, tikka, spicy, grill</span>) to help the AI matching system find this item.
                </span>
                <input
                  type="text"
                  placeholder="spicy, chicken, grill, tikka"
                  value={form.tags}
                  onChange={(e) => setForm(prev => ({ ...prev, tags: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm border-gray-300"
                />
              </div>

              {/* Dietary (Food & Drinks only) */}
              {(form.type === 'food' || form.type === 'drink') && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Dietary Labels</label>
                  <div className="flex flex-wrap gap-2">
                    {DIETARY_OPTIONS.map((opt) => {
                      const active = form.dietary.includes(opt);
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => toggleDietary(opt)}
                          className={`py-1.5 px-3 border rounded-full text-xs font-semibold capitalize transition ${
                            active
                              ? 'bg-green-100 border-green-400 text-green-800 font-bold'
                              : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Item Image</label>
                <div className="flex flex-col sm:flex-row items-center gap-4 border p-4 rounded-xl bg-gray-50/50">
                  {filePreview ? (
                    <div className="relative w-24 h-24 rounded-lg overflow-hidden border bg-white flex-shrink-0">
                      <img src={filePreview} alt="Item preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => { setSelectedFile(null); setFilePreview(''); }}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 shadow hover:bg-red-600 transition"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 bg-white flex flex-col items-center justify-center text-gray-400 flex-shrink-0">
                      <ImageIcon size={20} className="opacity-50" />
                      <span className="text-[10px] font-medium mt-1">Select</span>
                    </div>
                  )}

                  <div className="flex-1 text-center sm:text-left">
                    <label className="inline-block px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-lg shadow-sm cursor-pointer transition">
                      Choose Image File
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[10px] text-gray-400 mt-1.5">JPEG, PNG or WebP files accepted. Max file size: 8MB.</p>
                  </div>
                </div>
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t pt-4">
                <label className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl border cursor-pointer hover:bg-gray-100/50 transition">
                  <input
                    type="checkbox"
                    checked={form.isAvailable}
                    onChange={(e) => setForm(prev => ({ ...prev, isAvailable: e.target.checked }))}
                    className="w-4.5 h-4.5 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <div>
                    <span className="text-sm font-bold text-gray-900 block">Available Now</span>
                    <span className="text-xs text-gray-500 mt-0.5 block">Visible to customers instantly on listings</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl border cursor-pointer hover:bg-gray-100/50 transition">
                  <input
                    type="checkbox"
                    checked={form.isPopular}
                    onChange={(e) => setForm(prev => ({ ...prev, isPopular: e.target.checked }))}
                    className="w-4.5 h-4.5 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <div>
                    <span className="text-sm font-bold text-gray-900 block">Mark as Popular ⭐</span>
                    <span className="text-xs text-gray-500 mt-0.5 block">Display with special popular badge in lists</span>
                  </div>
                </label>
              </div>
            </form>

            {/* Modal Footer */}
            <div className="p-6 border-t flex justify-end gap-3 bg-gray-50">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2.5 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-100 font-bold transition text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl shadow-md transition disabled:opacity-50 text-sm flex items-center justify-center"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  editingItem ? 'Save Changes' : 'Add Item'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* \u2500\u2500\u2500 AI Review Panel (slide-over) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
      {reviewPanelOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="flex-1 bg-black/40 backdrop-blur-sm"
            onClick={() => !savingBatch && setReviewPanelOpen(false)}
          />

          {/* Panel */}
          <div className="w-full max-w-xl bg-white shadow-2xl flex flex-col h-full overflow-hidden">

            {/* Panel Header */}
            <div className="bg-gradient-to-r from-violet-700 to-indigo-600 p-5 text-white flex-shrink-0">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles size={20} className="text-yellow-300" />
                  <h3 className="text-lg font-bold">AI Scan Results</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const allSel = reviewItems.every(i => i._selected);
                      setReviewItems(prev => prev.map(i => ({ ...i, _selected: !allSel })));
                    }}
                    className="text-xs bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-lg font-semibold transition"
                  >
                    {reviewItems.every(i => i._selected) ? 'Deselect All' : 'Select All'}
                  </button>
                  <button
                    onClick={() => setReviewPanelOpen(false)}
                    disabled={savingBatch}
                    className="text-white/80 hover:text-white"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              <p className="text-sm text-white/80">
                {reviewItems.filter(i => i._selected).length} of {reviewItems.length} items selected
              </p>
              <div className="mt-3 bg-white/10 rounded-lg p-3 text-xs text-white/80 leading-relaxed">
                Review the AI-extracted items below. Click any field to edit it. Uncheck items you don't want. Then click &quot;Save to Menu&quot;.
              </div>
            </div>

            {/* Scrollable Items List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-32">
              {reviewItems.map((item) => (
                <div
                  key={item._localId}
                  className={`border rounded-xl p-4 bg-white shadow-sm transition-opacity ${!item._selected ? 'opacity-40' : ''}`}
                >
                  {/* Checkbox + Name row */}
                  <div className="flex items-center gap-3 mb-3">
                    <button
                      onClick={() => setReviewItems(prev =>
                        prev.map(i => i._localId === item._localId ? { ...i, _selected: !i._selected } : i)
                      )}
                      className="flex-shrink-0"
                    >
                      {item._selected
                        ? <CheckSquare size={20} className="text-indigo-600" />
                        : <Square size={20} className="text-gray-400" />
                      }
                    </button>
                    <input
                      type="text"
                      value={item.name}
                      onChange={e => setReviewItems(prev =>
                        prev.map(i => i._localId === item._localId ? { ...i, name: e.target.value } : i)
                      )}
                      className="flex-1 font-bold text-gray-900 border-b border-gray-200 focus:border-indigo-500 outline-none text-sm pb-0.5 bg-transparent"
                      placeholder="Item name"
                    />
                    {item.isPopular && (
                      <span className="text-xs bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full">⭐ Popular</span>
                    )}
                  </div>

                  {/* Category + Price row */}
                  <div className="grid grid-cols-3 gap-3 mb-2">
                    <div className="col-span-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Category</label>
                      <input
                        type="text"
                        value={item.menuCategory}
                        onChange={e => setReviewItems(prev =>
                          prev.map(i => i._localId === item._localId ? { ...i, menuCategory: e.target.value } : i)
                        )}
                        className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:border-indigo-400 outline-none mt-1"
                        placeholder="e.g. Mains"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Price (£)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.price}
                        onChange={e => setReviewItems(prev =>
                          prev.map(i => i._localId === item._localId ? { ...i, price: e.target.value } : i)
                        )}
                        className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:border-indigo-400 outline-none mt-1"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  {/* Description */}
                  {item.description && (
                    <p className="text-xs text-gray-500 mb-2 line-clamp-2">{item.description}</p>
                  )}

                  {/* Dietary badges */}
                  {item.dietary?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {item.dietary.map(d => (
                        <span key={d} className="text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                          {d}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Sticky Footer */}
            <div className="absolute bottom-0 left-0 right-0 bg-white border-t p-4 shadow-lg">
              <p className="text-xs text-gray-500 text-center mb-3">
                {reviewItems.filter(i => i._selected).length} item{reviewItems.filter(i => i._selected).length !== 1 ? 's' : ''} will be added to this business&apos;s menu
              </p>
              <button
                onClick={handleBatchSave}
                disabled={savingBatch || reviewItems.filter(i => i._selected).length === 0}
                className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-md"
              >
                {savingBatch ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check size={18} />
                    Save {reviewItems.filter(i => i._selected).length} Item{reviewItems.filter(i => i._selected).length !== 1 ? 's' : ''} to Menu
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
