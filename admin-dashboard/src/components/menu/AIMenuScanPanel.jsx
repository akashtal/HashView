import React from 'react';
import { Sparkles, Check, X, CheckSquare, Square } from 'lucide-react';

/**
 * AI Menu Scan slide-over review panel.
 *
 * Props
 * ─────
 * open         – boolean
 * saving       – boolean
 * reviewItems  – array of draft items
 * onClose      – () => void
 * onSave       – () => void  (batch save)
 * onToggleItem – (localId) => void
 * onToggleAll  – () => void
 * onUpdateItem – (localId, field, value) => void
 */
export default function AIMenuScanPanel({
  open, saving, reviewItems,
  onClose, onSave, onToggleItem, onToggleAll, onUpdateItem,
}) {
  if (!open) return null;

  const selectedCount = reviewItems.filter(i => i._selected).length;
  const allSelected   = reviewItems.every(i => i._selected);

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="flex-1 bg-black/40 backdrop-blur-sm"
        onClick={() => !saving && onClose()}
      />

      {/* Panel */}
      <div className="w-full max-w-xl bg-white shadow-2xl flex flex-col h-full overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-violet-700 to-indigo-600 p-5 text-white flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles size={20} className="text-yellow-300" />
              <h3 className="text-lg font-bold">AI Scan Results</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onToggleAll}
                className="text-xs bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-lg font-semibold transition"
              >
                {allSelected ? 'Deselect All' : 'Select All'}
              </button>
              <button
                onClick={onClose}
                disabled={saving}
                className="text-white/80 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
          </div>
          <p className="text-sm text-white/80">{selectedCount} of {reviewItems.length} items selected</p>
          <div className="mt-3 bg-white/10 rounded-lg p-3 text-xs text-white/80 leading-relaxed">
            Review the AI-extracted items below. Click any field to edit it. Uncheck items you don't
            want. Then click &quot;Save to Menu&quot;.
          </div>
        </div>

        {/* Items list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-32">
          {reviewItems.map(item => (
            <div
              key={item._localId}
              className={`border rounded-xl p-4 bg-white shadow-sm transition-opacity ${!item._selected ? 'opacity-40' : ''}`}
            >
              {/* Checkbox + Name */}
              <div className="flex items-center gap-3 mb-3">
                <button
                  onClick={() => onToggleItem(item._localId)}
                  className="flex-shrink-0"
                >
                  {item._selected
                    ? <CheckSquare size={20} className="text-indigo-600" />
                    : <Square size={20} className="text-gray-400" />}
                </button>
                <input
                  type="text"
                  value={item.name}
                  onChange={e => onUpdateItem(item._localId, 'name', e.target.value)}
                  className="flex-1 font-bold text-gray-900 border-b border-gray-200 focus:border-indigo-500 outline-none text-sm pb-0.5 bg-transparent"
                  placeholder="Item name"
                />
                {item.isPopular && (
                  <span className="text-xs bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full">
                    ⭐ Popular
                  </span>
                )}
              </div>

              {/* Category + Price */}
              <div className="grid grid-cols-3 gap-3 mb-2">
                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Category</label>
                  <input
                    type="text"
                    value={item.menuCategory}
                    onChange={e => onUpdateItem(item._localId, 'menuCategory', e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:border-indigo-400 outline-none mt-1"
                    placeholder="e.g. Mains"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Price (£)</label>
                  <input
                    type="number" step="0.01" min="0"
                    value={item.price}
                    onChange={e => onUpdateItem(item._localId, 'price', e.target.value)}
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

        {/* Sticky footer */}
        <div className="absolute bottom-0 left-0 right-0 bg-white border-t p-4 shadow-lg">
          <p className="text-xs text-gray-500 text-center mb-3">
            {selectedCount} item{selectedCount !== 1 ? 's' : ''} will be added to this business&apos;s menu
          </p>
          <button
            onClick={onSave}
            disabled={saving || selectedCount === 0}
            className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-md"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check size={18} />
                Save {selectedCount} Item{selectedCount !== 1 ? 's' : ''} to Menu
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
