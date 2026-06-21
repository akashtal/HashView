import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Settings, Trash2, Edit2, GripVertical, CheckCircle2, Circle } from 'lucide-react';
import biz from '../../api/businessApi';

export default function CustomizationBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState([]);
  const [menuItem, setMenuItem] = useState(null);

  // Modals
  const [editGroup, setEditGroup] = useState(null);
  const [editOption, setEditOption] = useState(null);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const resGroups = await biz.getCustomizationGroups(id);
      setGroups(resGroups.data.data || []);
      // Can't easily fetch just the menu item name without a specific endpoint, 
      // but we might not need it for now.
    } catch (error) {
      console.error('Error fetching customizations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGroup = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      menuItem: id,
      name: formData.get('name'),
      isRequired: formData.get('isRequired') === 'on',
      minSelections: parseInt(formData.get('minSelections')) || 0,
      maxSelections: parseInt(formData.get('maxSelections')) || 0,
      status: formData.get('status') || 'active'
    };

    try {
      if (editGroup._id) {
        await biz.updateCustomizationGroup(editGroup._id, data);
      } else {
        await biz.createCustomizationGroup(data);
      }
      setEditGroup(null);
      fetchData();
    } catch (e) {
      alert('Error saving group: ' + (e.response?.data?.message || e.message));
      console.error('Error saving group:', e.response?.data || e);
    }
  };

  const handleDeleteGroup = async (groupId) => {
    if (!window.confirm('Delete this group and all its options?')) return;
    try {
      await biz.deleteCustomizationGroup(groupId);
      fetchData();
    } catch (e) {
      alert('Error deleting group: ' + (e.response?.data?.message || e.message));
    }
  };

  const handleSaveOption = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      group: editOption.groupId,
      name: formData.get('name'),
      additionalPrice: parseFloat(formData.get('additionalPrice')) || 0,
      isDefault: formData.get('isDefault') === 'on',
      isActive: formData.get('isActive') === 'on'
    };

    try {
      if (editOption._id) {
        await biz.updateCustomizationOption(editOption._id, data);
      } else {
        await biz.createCustomizationOption(data);
      }
      setEditOption(null);
      fetchData();
    } catch (e) {
      alert('Error saving option: ' + (e.response?.data?.message || e.message));
      console.error('Error saving option:', e.response?.data || e);
    }
  };

  const handleDeleteOption = async (optionId) => {
    if (!window.confirm('Delete this option?')) return;
    try {
      await biz.deleteCustomizationOption(optionId);
      fetchData();
    } catch (e) {
      alert('Error deleting option: ' + (e.response?.data?.message || e.message));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/business/menu')} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Customization Builder</h1>
          <p className="text-sm text-gray-500">Configure add-ons, sizes, and modifications</p>
        </div>
        <button 
          onClick={() => setEditGroup({})}
          className="ml-auto flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-gray-800 transition"
        >
          <Plus size={18} /> Add Group
        </button>
      </div>

      <div className="space-y-6">
        {groups.map((group, index) => (
          <div key={group._id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-b border-gray-100">
              <div className="flex items-center gap-3">
                <GripVertical size={18} className="text-gray-400 cursor-grab" />
                <div>
                  <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    {group.name}
                    {group.isRequired && <span className="bg-red-100 text-red-600 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide">Required</span>}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Select {group.minSelections} - {group.maxSelections || 'unlimited'} options
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setEditOption({ groupId: group._id })}
                  className="text-sm font-semibold text-purple-600 hover:bg-purple-50 px-3 py-1.5 rounded-lg transition"
                >
                  + Add Option
                </button>
                <button 
                  onClick={() => setEditGroup(group)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  onClick={() => handleDeleteGroup(group._id)}
                  className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            
            <div className="divide-y divide-gray-50">
              {group.options && group.options.length > 0 ? (
                group.options.map((option) => (
                  <div key={option._id} className="px-6 py-3 flex items-center justify-between hover:bg-gray-50 transition">
                    <div className="flex items-center gap-3">
                      <GripVertical size={16} className="text-gray-300 cursor-grab" />
                      <div>
                        <span className="font-medium text-gray-700">{option.name}</span>
                        {option.isDefault && (
                          <span className="ml-2 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">Default</span>
                        )}
                        {!option.isActive && (
                          <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">Inactive</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-semibold text-gray-600">
                        {option.additionalPrice > 0 ? `+£${option.additionalPrice.toFixed(2)}` : 'Free'}
                      </span>
                      <div className="flex gap-1">
                        <button 
                          onClick={() => setEditOption({ ...option, groupId: group._id })}
                          className="p-1.5 text-gray-400 hover:text-purple-600 rounded-md"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={() => handleDeleteOption(option._id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded-md"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-6 py-4 text-sm text-gray-400 text-center">No options added yet.</div>
              )}
            </div>
          </div>
        ))}
        {groups.length === 0 && (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-200 border-dashed">
            <Settings size={40} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 font-medium">No customizations configured</p>
            <p className="text-sm text-gray-400 mt-1 mb-4">Add your first group to start offering choices</p>
            <button 
              onClick={() => setEditGroup({})}
              className="inline-flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-purple-700"
            >
              <Plus size={16} /> Create Group
            </button>
          </div>
        )}
      </div>

      {/* Group Modal */}
      {editGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="font-bold text-gray-900 text-lg mb-4">{editGroup._id ? 'Edit Group' : 'New Group'}</h3>
            <form onSubmit={handleSaveGroup} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Group Name</label>
                <input required name="name" defaultValue={editGroup.name} className="w-full border rounded-xl px-4 py-2 focus:ring-2 focus:ring-purple-500/20" placeholder="e.g. Choose Size" />
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" name="isRequired" id="isRequired" defaultChecked={editGroup.isRequired} className="w-4 h-4 rounded text-purple-600" />
                <label htmlFor="isRequired" className="text-sm font-semibold text-gray-700">Customer must make a selection (Required)</label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Min Selections</label>
                  <input type="number" min="0" name="minSelections" defaultValue={editGroup.minSelections || 0} className="w-full border rounded-xl px-4 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Max Selections</label>
                  <input type="number" min="0" name="maxSelections" defaultValue={editGroup.maxSelections || 1} className="w-full border rounded-xl px-4 py-2" />
                  <p className="text-xs text-gray-400 mt-1">0 for unlimited</p>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setEditGroup(null)} className="flex-1 py-2.5 border rounded-xl font-medium">Cancel</button>
                <button type="submit" className="flex-1 py-2.5 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Option Modal */}
      {editOption && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="font-bold text-gray-900 text-lg mb-4">{editOption._id ? 'Edit Option' : 'New Option'}</h3>
            <form onSubmit={handleSaveOption} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Option Name</label>
                <input required name="name" defaultValue={editOption.name} className="w-full border rounded-xl px-4 py-2 focus:ring-2 focus:ring-purple-500/20" placeholder="e.g. Large, Extra Cheese" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Additional Price (£)</label>
                <input type="number" step="0.01" min="0" name="additionalPrice" defaultValue={editOption.additionalPrice || 0} className="w-full border rounded-xl px-4 py-2" />
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" name="isDefault" id="isDefault" defaultChecked={editOption.isDefault} className="w-4 h-4 rounded text-purple-600" />
                <label htmlFor="isDefault" className="text-sm font-semibold text-gray-700">Select this option by default</label>
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" name="isActive" id="isActive" defaultChecked={editOption.isActive !== false} className="w-4 h-4 rounded text-purple-600" />
                <label htmlFor="isActive" className="text-sm font-semibold text-gray-700">Active (Available to order)</label>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setEditOption(null)} className="flex-1 py-2.5 border rounded-xl font-medium">Cancel</button>
                <button type="submit" className="flex-1 py-2.5 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
