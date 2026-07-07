import React from 'react';
import { Plus, X, Clock, Image as ImageIcon } from 'lucide-react';

const ITEM_TYPES = [
  { value: 'food',    label: 'Food',    icon: '🍔' },
  { value: 'drink',   label: 'Drink',   icon: '🥤' },
  { value: 'service', label: 'Service', icon: '✂️' },
  { value: 'product', label: 'Product', icon: '📦' },
  { value: 'package', label: 'Package', icon: '🎁' },
  { value: 'room',    label: 'Room',    icon: '🛌' },
];

const DIETARY_OPTIONS = [
  'vegetarian', 'vegan', 'halal', 'gluten-free',
  'dairy-free', 'nut-free', 'kosher', 'organic',
];

/**
 * Modal for creating or editing a single menu item.
 *
 * Props
 * ─────
 * open         – boolean – whether the modal is visible
 * editingItem  – object | null – the item being edited (null = create mode)
 * form         – form state object
 * setForm      – form state setter
 * filePreview  – string (data-url or remote URL)
 * saving       – boolean
 * onClose      – () => void
 * onSave       – (e) => void  (submit handler)
 * onFileChange – (e) => void
 * onClearFile  – () => void
 * onToggleDietary – (option) => void
 */
export default function MenuItemModal({
  open, editingItem, form, setForm,
  filePreview, saving,
  onClose, onSave, onFileChange, onClearFile, onToggleDietary,
}) {
  if (!open) return null;

  const currencySymbol = form.currency === 'GBP' ? '£' : form.currency === 'USD' ? '$' : '€';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col my-8">

        {/* Header */}
        <div className="p-6 border-b flex justify-between items-center bg-gray-50">
          <div>
            <h3 className="text-xl font-bold text-gray-900">
              {editingItem ? 'Edit Catalog Item' : 'Add New Catalog Item'}
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Configure item settings, dietary tags, and search keywords.
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={onSave} className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Item Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Item Type *</label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {ITEM_TYPES.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setForm(p => ({ ...p, type: t.value }))}
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

          {/* Name + Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Item Name *</label>
              <input
                type="text" required
                placeholder="e.g. Grilled Chicken Breast, Hair Cut"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className="w-full px-3.5 py-2.5 border rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm border-gray-300"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Section / Category *</label>
              <input
                type="text" required
                placeholder="e.g. Starters, Mains, Salon Services"
                value={form.menuCategory}
                onChange={e => setForm(p => ({ ...p, menuCategory: e.target.value }))}
                className="w-full px-3.5 py-2.5 border rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm border-gray-300"
              />
            </div>
          </div>

          {/* Price + Currency + Duration */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Price *</label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-gray-400 text-sm font-bold">
                  {currencySymbol}
                </span>
                <input
                  type="number" step="0.01" required min="0" placeholder="9.99"
                  value={form.price}
                  onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
                  className="w-full pl-8 pr-3.5 py-2.5 border rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm font-semibold border-gray-300"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Currency</label>
              <select
                value={form.currency}
                onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}
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
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Duration (minutes)
                </label>
                <input
                  type="number" min="1" placeholder="e.g. 45"
                  value={form.duration}
                  onChange={e => setForm(p => ({ ...p, duration: e.target.value }))}
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
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              rows={3}
              className="w-full px-3.5 py-2.5 border rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm border-gray-300 resize-none"
            />
          </div>

          {/* Search Tags */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Search Tags (AI Keywords)
            </label>
            <span className="text-xs text-gray-400 block mb-2 leading-relaxed">
              Comma-separated keywords (e.g. <span className="font-semibold">chicken, tikka, spicy, grill</span>) to help the AI find this item.
            </span>
            <input
              type="text" placeholder="spicy, chicken, grill, tikka"
              value={form.tags}
              onChange={e => setForm(p => ({ ...p, tags: e.target.value }))}
              className="w-full px-3.5 py-2.5 border rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm border-gray-300"
            />
          </div>

          {/* Dietary */}
          {(form.type === 'food' || form.type === 'drink') && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Dietary Labels</label>
              <div className="flex flex-wrap gap-2">
                {DIETARY_OPTIONS.map(opt => {
                  const active = form.dietary.includes(opt);
                  return (
                    <button
                      key={opt} type="button"
                      onClick={() => onToggleDietary(opt)}
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
                    onClick={onClearFile}
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
                  <input type="file" accept="image/*" onChange={onFileChange} className="hidden" />
                </label>
                <p className="text-[10px] text-gray-400 mt-1.5">JPEG, PNG or WebP. Max 8 MB.</p>
              </div>
            </div>
          </div>

          {/* Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t pt-4">
            <label className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl border cursor-pointer hover:bg-gray-100/50 transition">
              <input
                type="checkbox"
                checked={form.isAvailable}
                onChange={e => setForm(p => ({ ...p, isAvailable: e.target.checked }))}
                className="w-4 h-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <div>
                <span className="text-sm font-bold text-gray-900 block">Available Now</span>
                <span className="text-xs text-gray-500 mt-0.5 block">Visible to customers instantly</span>
              </div>
            </label>
            <label className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl border cursor-pointer hover:bg-gray-100/50 transition">
              <input
                type="checkbox"
                checked={form.isPopular}
                onChange={e => setForm(p => ({ ...p, isPopular: e.target.checked }))}
                className="w-4 h-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <div>
                <span className="text-sm font-bold text-gray-900 block">Mark as Popular ⭐</span>
                <span className="text-xs text-gray-500 mt-0.5 block">Display with popular badge</span>
              </div>
            </label>
          </div>
        </form>

        {/* Footer */}
        <div className="p-6 border-t flex justify-end gap-3 bg-gray-50">
          <button
            type="button" onClick={onClose}
            className="px-4 py-2.5 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-100 font-bold transition text-sm"
          >
            Cancel
          </button>
          <button
            type="submit" onClick={onSave} disabled={saving}
            className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl shadow-md transition disabled:opacity-50 text-sm flex items-center justify-center"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Saving...
              </>
            ) : (
              editingItem ? 'Save Changes' : 'Add Item'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
