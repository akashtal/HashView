import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X, CreditCard } from 'lucide-react';
import { useBusinessAuth } from '../../context/BusinessAuthContext';
import biz from '../../api/businessApi';

function ChargeModal({ existing, businessId, onClose, onSave }) {
  const [form, setForm] = useState({
    name: existing?.name || '',
    type: existing?.type || 'percentage',
    rate: existing?.rate || '',
    isActive: existing?.isActive ?? true,
  });
  const [saving, setSaving] = useState(false);

  const handle = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({ ...form, rate: Number(form.rate) });
      onClose();
    } catch (err) { alert(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex justify-between items-center mb-5">
          <h3 className="font-bold text-gray-900">{existing ? 'Edit' : 'Add'} Charge</h3>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        <form onSubmit={handle} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Name</label>
            <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Service Charge, Packing" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Type</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none">
                <option value="percentage">Percentage %</option>
                <option value="fixed">Fixed Amount</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Rate / Amount</label>
              <input type="number" min="0" step="0.01" required value={form.rate} onChange={e => setForm({ ...form, rate: e.target.value })} placeholder={form.type === 'percentage' ? '5' : '20'} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 border border-gray-200 rounded-xl text-gray-600 font-semibold hover:bg-gray-50 transition">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-3 text-white font-bold rounded-xl disabled:opacity-50" style={{ background: 'linear-gradient(135deg,#6C47FF,#4C35B5)' }}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ChargeManagement() {
  const { business } = useBusinessAuth();
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);

  useEffect(() => {
    if (!business?._id) return;
    setLoading(true);
    biz.getChargeRules(business._id)
      .then(res => setRules(res.data.data || res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [business?._id]);

  const handleSave = async (data) => {
    if (modal && modal._id) {
      const res = await biz.updateChargeRule(business._id, modal._id, data);
      const updated = res.data.data || res.data;
      setRules(prev => prev.map(r => r._id === modal._id ? { ...r, ...updated } : r));
    } else {
      const res = await biz.createChargeRule(business._id, data);
      const created = res.data.data || res.data;
      setRules(prev => [...prev, created]);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this charge rule?')) return;
    await biz.deleteChargeRule(business._id, id);
    setRules(prev => prev.filter(r => r._id !== id));
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Service Charges</h1>
          <p className="text-sm text-gray-500">Configure extra charges added to orders</p>
        </div>
        <button onClick={() => setModal('create')} className="flex items-center gap-2 px-4 py-2.5 text-white font-semibold rounded-xl shadow-sm" style={{ background: 'linear-gradient(135deg,#6C47FF,#4C35B5)' }}>
          <Plus size={18} /> Add Charge
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : rules.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <CreditCard size={40} className="mx-auto mb-3 opacity-30" />
          <p>No service charges configured yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {rules.map((rule, i) => (
            <div key={rule._id} className={`flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition ${i < rules.length - 1 ? 'border-b border-gray-100' : ''}`}>
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm flex-shrink-0">
                {rule.type === 'percentage' ? '%' : '#'}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{rule.name}</p>
                <p className="text-sm text-gray-500">{rule.type === 'percentage' ? `${rule.rate}%` : `Fixed: ${rule.rate}`}</p>
              </div>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${rule.isActive !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {rule.isActive !== false ? 'Active' : 'Inactive'}
              </span>
              <button onClick={() => setModal(rule)} className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition"><Pencil size={15} /></button>
              <button onClick={() => handleDelete(rule._id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <ChargeModal existing={modal === 'create' ? null : modal} businessId={business._id} onClose={() => setModal(null)} onSave={handleSave} />
      )}
    </div>
  );
}
