import React, { useState, useEffect } from 'react';
import { Plus, Trash2, X, Megaphone, Image } from 'lucide-react';
import { useBusinessAuth } from '../../context/BusinessAuthContext';
import biz from '../../api/businessApi';

function CreateModal({ businessId, onClose, onCreated }) {
  const [form, setForm] = useState({ title: '', content: '', type: 'announcement' });
  const [saving, setSaving] = useState(false);

  const handle = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await biz.createUpdate(businessId, form);
      onCreated(res.data.data || res.data);
      onClose();
    } catch (err) { alert(err.response?.data?.message || 'Failed to create update'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex justify-between items-center mb-5">
          <h3 className="font-bold text-gray-900 text-lg">Create Update</h3>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        <form onSubmit={handle} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Type</label>
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none">
              <option value="announcement">Announcement</option>
              <option value="offer">Offer</option>
              <option value="event">Event</option>
              <option value="news">News</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Title</label>
            <input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Happy Hour - 50% off drinks!" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Content</label>
            <textarea required value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} rows={4} placeholder="Share details about this update..." className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 resize-none" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 border border-gray-200 rounded-xl text-gray-600 font-semibold hover:bg-gray-50 transition">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-3 text-white font-bold rounded-xl disabled:opacity-50" style={{ background: 'linear-gradient(135deg,#6C47FF,#4C35B5)' }}>
              {saving ? 'Posting...' : 'Post Update'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const TYPE_COLORS = {
  announcement: 'bg-blue-100 text-blue-700',
  offer:        'bg-green-100 text-green-700',
  event:        'bg-purple-100 text-purple-700',
  news:         'bg-amber-100 text-amber-700',
};

export default function BusinessUpdates() {
  const { business } = useBusinessAuth();
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    if (!business?._id) return;
    setLoading(true);
    biz.getBusinessUpdates(business._id)
      .then(res => setUpdates(res.data.data || res.data.updates || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [business?._id]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this update?')) return;
    setDeletingId(id);
    try {
      await biz.deleteUpdate(business._id, id);
      setUpdates(prev => prev.filter(u => u._id !== id));
    } catch (e) { alert('Delete failed'); }
    finally { setDeletingId(null); }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Business Updates</h1>
          <p className="text-sm text-gray-500">Posts visible to customers in the app</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2.5 text-white font-semibold rounded-xl shadow-sm" style={{ background: 'linear-gradient(135deg,#6C47FF,#4C35B5)' }}>
          <Plus size={18} /> Post Update
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : updates.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Megaphone size={40} className="mx-auto mb-3 opacity-30" />
          <p>No updates posted yet. Share news with your customers!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {updates.map(u => (
            <div key={u._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize ${TYPE_COLORS[u.type] || 'bg-gray-100 text-gray-600'}`}>{u.type}</span>
                    <span className="text-xs text-gray-400">{new Date(u.createdAt).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                  <h3 className="font-bold text-gray-900">{u.title}</h3>
                  <p className="text-sm text-gray-600 mt-1 leading-relaxed">{u.content}</p>
                </div>
                <button onClick={() => handleDelete(u._id)} disabled={deletingId === u._id} className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition flex-shrink-0 disabled:opacity-40">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateModal businessId={business._id} onClose={() => setShowCreate(false)} onCreated={u => setUpdates(prev => [u, ...prev])} />
      )}
    </div>
  );
}
