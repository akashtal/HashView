import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search, RefreshCw, UtensilsCrossed, BarChart3, ArrowRight } from 'lucide-react';
import { useBusinessAuth } from '../../context/BusinessAuthContext';
import biz from '../../api/businessApi';
import useBusinessSocket from '../../hooks/useBusinessSocket';

const STATUS_CFG = {
  new:       { bg: 'bg-blue-100',   text: 'text-blue-700',   label: 'New' },
  accepted:  { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Accepted' },
  preparing: { bg: 'bg-amber-100',  text: 'text-amber-700',  label: 'Preparing' },
  ready:     { bg: 'bg-green-100',  text: 'text-green-700',  label: 'Ready' },
  delivered: { bg: 'bg-gray-100',   text: 'text-gray-600',   label: 'Delivered' },
  cancelled: { bg: 'bg-red-100',    text: 'text-red-700',    label: 'Cancelled' },
};

export default function LiveOrders() {
  const { business } = useBusinessAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('active');
  const [search, setSearch] = useState('');
  const [newOrderIds, setNewOrderIds] = useState(new Set());

  const fetchOrders = useCallback(async () => {
    if (!business?._id) return;
    setLoading(true);
    try {
      const res = await biz.getBusinessOrders(business._id, {
        status: tab === 'active' ? 'active' : 'delivered',
        limit: 50,
      });
      if (res.data.success) setOrders(res.data.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [business?._id, tab]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  useBusinessSocket({
    businessId: business?._id,
    onNewOrder: (order) => {
      if (tab === 'active') {
        setOrders(prev => [order, ...prev]);
        setNewOrderIds(prev => new Set([...prev, order._id]));
        // Flash effect — remove after 5s
        setTimeout(() => setNewOrderIds(prev => { const n = new Set(prev); n.delete(order._id); return n; }), 5000);
      }
    },
    onOrderStatusUpdated: (updated) => {
      setOrders(prev => {
        if (tab === 'active' && ['delivered', 'cancelled'].includes(updated.status)) {
          return prev.filter(o => o._id !== updated._id);
        }
        return prev.map(o => o._id === updated._id ? { ...o, ...updated } : o);
      });
    },
  });

  const filtered = orders.filter(o => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      o.orderNumber?.toLowerCase().includes(q) ||
      o.customerName?.toLowerCase().includes(q) ||
      String(o.tableNumber).includes(q)
    );
  });

  const currency = business?.currency === 'GBP' ? '£' : '$';

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">Orders Dashboard</h1>
          <p className="text-sm text-gray-500">{filtered.length} order{filtered.length !== 1 ? 's' : ''} · Real-time updates</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/business/kitchen" className="flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-700 border border-orange-200 rounded-lg text-sm font-semibold hover:bg-orange-100 transition">
            <UtensilsCrossed size={16} /> Kitchen View
          </Link>
          <Link to="/business/order-analytics" className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-sm font-semibold hover:bg-purple-100 transition">
            <BarChart3 size={16} /> Analytics
          </Link>
          <button onClick={fetchOrders} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition text-gray-600">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Tabs + Search */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-4 px-5 py-4 border-b border-gray-100">
          <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
            {[{ k: 'active', l: '🔴 Active' }, { k: 'past', l: '✅ Past' }].map(({ k, l }) => (
              <button key={k} onClick={() => setTab(k)} className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${tab === k ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {l}
              </button>
            ))}
          </div>
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by table, name, or order #..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">📋</p>
            <p className="font-medium">No {tab} orders found</p>
            {search && <p className="text-sm mt-1">Try clearing your search</p>}
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map(order => {
              const s = STATUS_CFG[order.status] || STATUS_CFG.new;
              const isNew = newOrderIds.has(order._id);
              return (
                <Link
                  key={order._id}
                  to={`/business/orders/${order._id}`}
                  className={`flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition ${isNew ? 'bg-blue-50 animate-pulse' : ''}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-11 h-11 rounded-xl ${s.bg} flex items-center justify-center font-bold ${s.text} text-sm flex-shrink-0`}>
                      T{order.tableNumber}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{order.customerName}</p>
                      <p className="text-xs text-gray-500">{order.orderNumber} · {order.items?.length || 0} items · {new Date(order.placedAt || order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-gray-800">{currency}{order.billing?.grandTotal?.toFixed(2)}</span>
                    <span className={`text-xs font-bold uppercase px-3 py-1 rounded-full ${s.bg} ${s.text}`}>{s.label}</span>
                    <ArrowRight size={14} className="text-gray-400" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
