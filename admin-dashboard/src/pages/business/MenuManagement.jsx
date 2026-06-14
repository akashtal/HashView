import React, { useState, useEffect } from 'react';
import { Search, Pencil, Trash2, X, ToggleLeft, ToggleRight, CheckCircle, XCircle } from 'lucide-react';
import { useBusinessAuth } from '../../context/BusinessAuthContext';
import biz from '../../api/businessApi';

const CURRENCY_SYM = { GBP: '£', USD: '$', EUR: '€' };

function EditModal({ item, onClose, onSave }) {
  const [form, setForm] = useState({
    name: item.name || '',
    description: item.description || '',
    price: item.price || '',
    status: item.status || 'active',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(item._id, { name: form.name, description: form.description, price: Number(form.price), status: form.status });
      onClose();
    } catch (e) { alert('Failed: ' + (e.response?.data?.message || e.message)); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex justify-between items-center mb-5">
          <h3 className="font-bold text-gray-900 text-lg">Edit Menu Item</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Name</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 resize-none" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Price</label>
            <input type="number" min="0" step="0.01" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Status</label>
            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-3 border border-gray-200 rounded-xl text-gray-600 font-semibold hover:bg-gray-50 transition">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-3 text-white font-bold rounded-xl transition disabled:opacity-50" style={{ background: 'linear-gradient(135deg,#6C47FF,#4C35B5)' }}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MenuManagement() {
  const { business } = useBusinessAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editItem, setEditItem] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  useEffect(() => {
    if (!business?._id) return;
    setLoading(true);
    biz.getMenuItems(business._id)
      .then(res => {
        const list = res.data.data || res.data.items || [];
        setItems(list);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [business?._id]);

  const handleSave = async (id, data) => {
    const res = await biz.updateMenuItem(id, data);
    const updated = res.data.data || res.data;
    setItems(prev => prev.map(i => i._id === id ? { ...i, ...updated } : i));
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this menu item? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      await biz.deleteMenuItem(id);
      setItems(prev => prev.filter(i => i._id !== id));
    } catch (e) { alert('Delete failed: ' + (e.response?.data?.message || e.message)); }
    finally { setDeletingId(null); }
  };

  const handleToggle = async (id) => {
    setTogglingId(id);
    try {
      const res = await biz.toggleMenuItemAvailability(id);
      const updated = res.data.data || res.data;
      setItems(prev => prev.map(i => i._id === id ? { ...i, ...updated } : i));
    } catch (e) { alert('Toggle failed: ' + (e.response?.data?.message || e.message)); }
    finally { setTogglingId(null); }
  };

  const filtered = items.filter(i =>
    i.name?.toLowerCase().includes(search.toLowerCase()) ||
    i.category?.toLowerCase().includes(search.toLowerCase())
  );

  // Group by category
  const grouped = filtered.reduce((acc, item) => {
    const cat = item.category || 'Uncategorized';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Menu Management</h1>
          <p className="text-sm text-gray-500">{items.length} item{items.length !== 1 ? 's' : ''} · Edit or remove items</p>
        </div>
        <div className="sm:ml-auto relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search menu..." className="pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 w-64" />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-3">🍽️</p>
          <p className="font-medium">No menu items found</p>
        </div>
      ) : (
        Object.entries(grouped).map(([category, catItems]) => (
          <div key={category} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
              <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wide">{category} <span className="ml-2 text-gray-400 normal-case font-normal">({catItems.length})</span></h3>
            </div>
            <div className="divide-y divide-gray-50">
              {catItems.map(item => {
                const sym = CURRENCY_SYM[item.currency] || '£';
                const isActive = item.status === 'active';
                return (
                  <div key={item._id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition">
                    {/* Availability indicator */}
                    <div className={`w-2 h-10 rounded-full flex-shrink-0 ${isActive ? 'bg-green-400' : 'bg-gray-300'}`} />

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900 truncate">{item.name}</p>
                        {!isActive && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">Hidden</span>}
                      </div>
                      {item.description && <p className="text-xs text-gray-500 truncate mt-0.5">{item.description}</p>}
                    </div>

                    {/* Price */}
                    <p className="font-bold text-gray-900 flex-shrink-0">{sym}{item.price?.toFixed(2)}</p>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Toggle availability */}
                      <button
                        onClick={() => handleToggle(item._id)}
                        disabled={togglingId === item._id}
                        title={isActive ? 'Mark as unavailable' : 'Mark as available'}
                        className={`p-2 rounded-lg transition ${isActive ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}
                      >
                        {isActive ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                      </button>

                      {/* Edit */}
                      <button onClick={() => setEditItem(item)} className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition" title="Edit">
                        <Pencil size={16} />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => handleDelete(item._id)}
                        disabled={deletingId === item._id}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      {editItem && (
        <EditModal item={editItem} onClose={() => setEditItem(null)} onSave={handleSave} />
      )}
    </div>
  );
}
