import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Edit2, AlertCircle, Settings, X } from 'lucide-react';
import { adminApi } from '../../api/adminApi';

/**
 * Inline panel that manages customization groups + options for a single menu item.
 *
 * Props
 * ─────
 * itemId   – string  – the menu item's _id
 * itemName – string  – used only for the panel heading
 */
export default function CustomizationsPanel({ itemId, itemName }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ── Group modal ───────────────────────────────────────────────────────────
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [groupForm, setGroupForm] = useState({
    name: '', isRequired: false, selectionType: 'single',
    minSelections: 1, maxSelections: 1,
  });

  // ── Option modal ──────────────────────────────────────────────────────────
  const [optionModalOpen, setOptionModalOpen] = useState(false);
  const [editingOption, setEditingOption] = useState(null);
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [optionForm, setOptionForm] = useState({
    name: '', additionalPrice: '0', description: '',
  });

  // ── Data fetching ─────────────────────────────────────────────────────────
  const loadGroups = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminApi.getCustomizationGroups(itemId);
      setGroups(res.data?.data || res.data || []);
    } catch (e) {
      console.error('Failed to load customization groups', e);
    } finally {
      setLoading(false);
    }
  }, [itemId]);

  useEffect(() => { loadGroups(); }, [loadGroups]);

  // ── Group handlers ────────────────────────────────────────────────────────
  const openAddGroup = () => {
    setEditingGroup(null);
    setGroupForm({ name: '', isRequired: false, selectionType: 'single', minSelections: 1, maxSelections: 1 });
    setGroupModalOpen(true);
  };

  const openEditGroup = (group) => {
    setEditingGroup(group);
    setGroupForm({
      name: group.name,
      isRequired: group.isRequired,
      selectionType: group.selectionType,
      minSelections: group.minSelections || 1,
      maxSelections: group.maxSelections || 1,
    });
    setGroupModalOpen(true);
  };

  const handleSaveGroup = async () => {
    if (!groupForm.name.trim()) return alert('Group name is required');
    try {
      setSaving(true);
      const payload = { ...groupForm, menuItem: itemId, menuItemId: itemId };
      if (editingGroup) {
        await adminApi.updateCustomizationGroup(editingGroup._id, payload);
      } else {
        await adminApi.createCustomizationGroup(payload);
      }
      setGroupModalOpen(false);
      loadGroups();
    } catch (e) {
      alert('Failed to save group: ' + (e.response?.data?.message || e.message));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGroup = async (group) => {
    if (!window.confirm(`Delete group "${group.name}" and all its options?`)) return;
    try {
      await adminApi.deleteCustomizationGroup(group._id);
      loadGroups();
    } catch (e) {
      alert('Failed to delete group: ' + (e.response?.data?.message || e.message));
    }
  };

  // ── Option handlers ───────────────────────────────────────────────────────
  const openAddOption = (groupId) => {
    setActiveGroupId(groupId);
    setEditingOption(null);
    setOptionForm({ name: '', additionalPrice: '0', description: '' });
    setOptionModalOpen(true);
  };

  const openEditOption = (groupId, option) => {
    setActiveGroupId(groupId);
    setEditingOption(option);
    setOptionForm({
      name: option.name,
      additionalPrice: option.additionalPrice?.toString() || '0',
      description: option.description || '',
    });
    setOptionModalOpen(true);
  };

  const handleSaveOption = async () => {
    if (!optionForm.name.trim()) return alert('Option name is required');
    try {
      setSaving(true);
      const payload = {
        name: optionForm.name.trim(),
        additionalPrice: parseFloat(optionForm.additionalPrice) || 0,
        description: optionForm.description.trim(),
        group: activeGroupId,
        groupId: activeGroupId,
      };
      if (editingOption) {
        await adminApi.updateCustomizationOption(editingOption._id, payload);
      } else {
        await adminApi.createCustomizationOption(payload);
      }
      setOptionModalOpen(false);
      loadGroups();
    } catch (e) {
      alert('Failed to save option: ' + (e.response?.data?.message || e.message));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOption = async (option) => {
    if (!window.confirm(`Delete option "${option.name}"?`)) return;
    try {
      await adminApi.deleteCustomizationOption(option._id);
      loadGroups();
    } catch (e) {
      alert('Failed to delete option: ' + (e.response?.data?.message || e.message));
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="mt-2 border border-indigo-100 bg-gradient-to-b from-indigo-50/60 to-white rounded-xl px-5 py-4 shadow-sm">

      {/* Panel header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-bold text-indigo-900 flex items-center gap-1.5">
            <Settings size={14} className="text-indigo-600" />
            Customizations
            <span className="text-indigo-400 font-normal text-xs ml-1">— {itemName}</span>
          </h4>
          <p className="text-xs text-indigo-500 mt-0.5">
            Add option groups (e.g. &quot;Choose Type&quot;) and choices (e.g. Chicken, Veg, Egg)
          </p>
        </div>
        <button
          onClick={openAddGroup}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition shadow-sm"
        >
          <Plus size={13} /> Add Group
        </button>
      </div>

      {/* Group list */}
      {loading ? (
        <div className="flex justify-center py-6">
          <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-6 border-2 border-dashed border-indigo-200 rounded-xl bg-white/60">
          <Settings size={28} className="mx-auto text-indigo-200 mb-2" />
          <p className="text-xs text-indigo-400 font-medium">No customization groups yet.</p>
          <p className="text-xs text-indigo-300 mt-0.5">Click &quot;Add Group&quot; to create the first one.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map(group => (
            <div key={group._id} className="bg-white border border-indigo-100 rounded-xl overflow-hidden shadow-sm">

              {/* Group header */}
              <div className="flex items-center justify-between px-4 py-3 bg-indigo-50/60 border-b border-indigo-100">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="font-bold text-gray-800 text-sm truncate">{group.name}</span>
                  {group.isRequired && (
                    <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full shrink-0">
                      REQUIRED
                    </span>
                  )}
                  <span className="text-[10px] text-gray-400 shrink-0">
                    {group.selectionType === 'multiple'
                      ? `${group.minSelections}–${group.maxSelections || '∞'} selections`
                      : 'Single choice'}
                  </span>
                </div>
                <div className="flex items-center gap-1 ml-2 shrink-0">
                  <button
                    onClick={() => openAddOption(group._id)}
                    className="text-xs font-semibold text-indigo-600 hover:bg-indigo-100 px-2 py-1 rounded-lg transition"
                  >
                    + Option
                  </button>
                  <button
                    onClick={() => openEditGroup(group)}
                    className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                    title="Edit group"
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    onClick={() => handleDeleteGroup(group)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                    title="Delete group"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Options list */}
              <div className="divide-y divide-gray-50">
                {group.options?.length > 0 ? (
                  group.options.map(option => (
                    <div key={option._id} className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition">
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-gray-700">{option.name}</span>
                        {option.description && (
                          <p className="text-xs text-gray-400 mt-0.5 truncate">{option.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 ml-3 shrink-0">
                        <span className={`text-sm font-semibold ${option.additionalPrice > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
                          {option.additionalPrice > 0 ? `+£${option.additionalPrice.toFixed(2)}` : 'Free'}
                        </span>
                        <div className="flex gap-0.5">
                          <button
                            onClick={() => openEditOption(group._id, option)}
                            className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-md transition"
                            title="Edit option"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDeleteOption(option)}
                            className="p-1.5 text-gray-400 hover:text-red-600 rounded-md transition"
                            title="Delete option"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-3 text-xs text-amber-600 bg-amber-50 flex items-center gap-2">
                    <AlertCircle size={13} />
                    No options yet — customers won&apos;t see this group until you add at least one.
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Group Modal ───────────────────────────────────────────────────── */}
      {groupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b bg-gray-50">
              <h3 className="font-bold text-gray-900">{editingGroup ? 'Edit Group' : 'New Group'}</h3>
              <button onClick={() => setGroupModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">
                  Group Name *
                </label>
                <input
                  value={groupForm.name}
                  onChange={e => setGroupForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Choose Type, Size, Extras"
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>
              <label className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border cursor-pointer hover:bg-gray-100/60 transition">
                <input
                  type="checkbox"
                  checked={groupForm.isRequired}
                  onChange={e => setGroupForm(f => ({ ...f, isRequired: e.target.checked }))}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <div>
                  <span className="text-sm font-bold text-gray-800 block">Required Choice</span>
                  <span className="text-xs text-gray-500">Customer must select before ordering</span>
                </div>
              </label>
              <label className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border cursor-pointer hover:bg-gray-100/60 transition">
                <input
                  type="checkbox"
                  checked={groupForm.selectionType === 'multiple'}
                  onChange={e => setGroupForm(f => ({ ...f, selectionType: e.target.checked ? 'multiple' : 'single' }))}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <div>
                  <span className="text-sm font-bold text-gray-800 block">Allow Multiple Selections</span>
                  <span className="text-xs text-gray-500">Customer can pick more than one option</span>
                </div>
              </label>
              {groupForm.selectionType === 'multiple' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Min Selections</label>
                    <input
                      type="number" min="0"
                      value={groupForm.minSelections}
                      onChange={e => setGroupForm(f => ({ ...f, minSelections: parseInt(e.target.value) || 0 }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Max Selections</label>
                    <input
                      type="number" min="1"
                      value={groupForm.maxSelections}
                      onChange={e => setGroupForm(f => ({ ...f, maxSelections: parseInt(e.target.value) || 1 }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-3 px-5 pb-5">
              <button
                onClick={() => setGroupModalOpen(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 font-semibold text-sm hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveGroup}
                disabled={saving}
                className="flex-1 py-2.5 text-white font-bold rounded-xl text-sm transition disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#4F46E5,#6366F1)' }}
              >
                {saving ? 'Saving...' : 'Save Group'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Option Modal ──────────────────────────────────────────────────── */}
      {optionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b bg-gray-50">
              <h3 className="font-bold text-gray-900">{editingOption ? 'Edit Option' : 'New Option'}</h3>
              <button onClick={() => setOptionModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">
                  Option Name *
                </label>
                <input
                  value={optionForm.name}
                  onChange={e => setOptionForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Chicken, Veg, Large, Extra Cheese"
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">
                  Additional Price (£)
                </label>
                <input
                  type="number" step="0.01" min="0"
                  value={optionForm.additionalPrice}
                  onChange={e => setOptionForm(f => ({ ...f, additionalPrice: e.target.value }))}
                  placeholder="0.00"
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
                <p className="text-xs text-gray-400 mt-1">Leave as 0 for no extra charge (free)</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">
                  Description (optional)
                </label>
                <textarea
                  value={optionForm.description}
                  onChange={e => setOptionForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="e.g. Adds 200 calories, grilled only"
                  rows={2}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 px-5 pb-5">
              <button
                onClick={() => setOptionModalOpen(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 font-semibold text-sm hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveOption}
                disabled={saving}
                className="flex-1 py-2.5 text-white font-bold rounded-xl text-sm transition disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#4F46E5,#6366F1)' }}
              >
                {saving ? 'Saving...' : 'Save Option'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
