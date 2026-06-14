import React, { useState, useEffect } from 'react';
import { Plus, Trash2, X, Tag } from 'lucide-react';
import { useBusinessAuth } from '../../context/BusinessAuthContext';
import biz from '../../api/businessApi';

function CreateModal({ businessId, onClose, onCreated }) {
  const [form, setForm] = useState({ code: '', description: '', rewardType: 'discount_percentage', rewardValue: '', minOrderAmount: '', validUntil: '' });
  const [saving, setSaving] = useState(false);

  const handle = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await biz.createCoupon(businessId, { ...form, rewardValue: Number(form.rewardValue), minOrderAmount: Number(form.minOrderAmount) || 0 });
      onCreated(res.data.data || res.data);
      onClose();
    } catch (err) { alert(err.response?.data?.message || 'Failed to create coupon'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex justify-between items-center mb-5">
          <h3 className="font-bold text-gray-900 text-lg">Create Coupon</h3>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        <form onSubmit={handle} className="space-y-4">
          {[['Code', 'code', 'text', 'e.g. SUMMER20'], ['Description', 'description', 'text', 'e.g. 20% off entire order']].map(([l, k, t, ph]) => (
            <div key={k}>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">{l}</label>
              <input type={t} required value={form[k]} onChange={e => setForm({ ...form, [k]: e.target.value })} placeholder={ph} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" />
            </div>
          ))}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Reward Type</label>
            <select value={form.rewardType} onChange={e => setForm({ ...form, rewardType: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none">
              <option value="discount_percentage">Percentage Discount</option>
              <option value="discount_fixed">Fixed Amount Off</option>
              <option value="free_item">Free Item</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Value</label>
              <input type="number" min="0" step="0.01" required value={form.rewardValue} onChange={e => setForm({ ...form, rewardValue: e.target.value })} placeholder="e.g. 20" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Min Order</label>
              <input type="number" min="0" step="0.01" value={form.minOrderAmount} onChange={e => setForm({ ...form, minOrderAmount: e.target.value })} placeholder="0" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Valid Until (optional)</label>
            <input type="date" value={form.validUntil} onChange={e => setForm({ ...form, validUntil: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 border border-gray-200 rounded-xl text-gray-600 font-semibold hover:bg-gray-50 transition">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-3 text-white font-bold rounded-xl disabled:opacity-50" style={{ background: 'linear-gradient(135deg,#6C47FF,#4C35B5)' }}>
              {saving ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ManageCoupons() {
  const { business } = useBusinessAuth();
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    if (!business?._id) return;
    setLoading(true);
    biz.getBusinessCoupons(business._id)
      .then(res => setCoupons(res.data.data || res.data.coupons || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [business?._id]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this coupon?')) return;
    setDeletingId(id);
    try {
      await biz.deleteCoupon(id);
      setCoupons(prev => prev.filter(c => c._id !== id));
    } catch (e) { alert('Delete failed'); }
    finally { setDeletingId(null); }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Manage Coupons</h1>
          <p className="text-sm text-gray-500">{coupons.length} coupon{coupons.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2.5 text-white font-semibold rounded-xl shadow-sm transition" style={{ background: 'linear-gradient(135deg,#6C47FF,#4C35B5)' }}>
          <Plus size={18} /> Create Coupon
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : coupons.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Tag size={40} className="mx-auto mb-3 opacity-30" />
          <p>No coupons yet. Create your first one!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {coupons.map(coupon => {
            const isActive = coupon.status === 'active' || coupon.isActive;
            const expired = coupon.validUntil && new Date(coupon.validUntil) < new Date();
            return (
              <div key={coupon._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <Tag size={20} className="text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-gray-900 font-mono">{coupon.code}</p>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${expired ? 'bg-red-100 text-red-600' : isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {expired ? 'Expired' : isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-0.5">{coupon.description}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {coupon.rewardType === 'discount_percentage' ? `${coupon.rewardValue}% off` : coupon.rewardType === 'discount_fixed' ? `${coupon.rewardValue} off` : 'Free item'} 
                    {coupon.validUntil && ` · Until ${new Date(coupon.validUntil).toLocaleDateString()}`}
                  </p>
                </div>
                <button onClick={() => handleDelete(coupon._id)} disabled={deletingId === coupon._id} className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition disabled:opacity-40">
                  <Trash2 size={17} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {showCreate && (
        <CreateModal businessId={business._id} onClose={() => setShowCreate(false)} onCreated={c => setCoupons(prev => [c, ...prev])} />
      )}
    </div>
  );
}
