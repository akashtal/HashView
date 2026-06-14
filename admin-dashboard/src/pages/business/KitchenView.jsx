import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, ArrowRight, Clock } from 'lucide-react';
import { useBusinessAuth } from '../../context/BusinessAuthContext';
import biz from '../../api/businessApi';
import useBusinessSocket from '../../hooks/useBusinessSocket';

const STATUS_CFG = {
  new:       { bg: 'bg-blue-500',   light: 'bg-blue-50 border-blue-200',   text: 'text-blue-700',   label: 'New Order' },
  accepted:  { bg: 'bg-purple-500', light: 'bg-purple-50 border-purple-200',text: 'text-purple-700', label: 'Accepted' },
  preparing: { bg: 'bg-amber-500',  light: 'bg-amber-50 border-amber-200',  text: 'text-amber-700',  label: 'Preparing' },
  ready:     { bg: 'bg-green-500',  light: 'bg-green-50 border-green-200',  text: 'text-green-700',  label: 'Ready' },
};

export default function KitchenView() {
  const { business } = useBusinessAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!business?._id) return;
    setLoading(true);
    try {
      const res = await biz.getBusinessOrders(business._id, { status: 'active', limit: 100 });
      if (res.data.success) setOrders(res.data.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [business?._id]);

  useEffect(() => { fetch(); }, [fetch]);

  useBusinessSocket({
    businessId: business?._id,
    onNewOrder: (o) => setOrders(prev => [o, ...prev]),
    onOrderStatusUpdated: (updated) => {
      if (['delivered', 'cancelled'].includes(updated.status)) {
        setOrders(prev => prev.filter(o => o._id !== updated._id));
      } else {
        setOrders(prev => prev.map(o => o._id === updated._id ? { ...o, ...updated } : o));
      }
    },
  });

  // Group by status (kitchen-relevant only)
  const groups = ['new', 'accepted', 'preparing', 'ready'].map(status => ({
    status,
    orders: orders.filter(o => o.status === status),
  }));

  const currency = business?.currency === 'GBP' ? '£' : '$';

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">🍳 Kitchen View</h1>
          <p className="text-sm text-gray-500">{orders.length} active order{orders.length !== 1 ? 's' : ''} · Live</p>
        </div>
        <button onClick={fetch} className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 transition rounded-xl text-sm font-semibold text-gray-700">
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {groups.map(({ status, orders: groupOrders }) => {
            const cfg = STATUS_CFG[status];
            return (
              <div key={status} className="flex flex-col gap-3">
                {/* Column header */}
                <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border ${cfg.light}`}>
                  <div className={`w-2.5 h-2.5 rounded-full ${cfg.bg}`} />
                  <span className={`font-bold text-sm ${cfg.text}`}>{cfg.label}</span>
                  <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${cfg.bg} text-white`}>{groupOrders.length}</span>
                </div>

                {/* Order cards */}
                {groupOrders.length === 0 ? (
                  <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-6 text-center">
                    <p className="text-gray-400 text-sm">No orders</p>
                  </div>
                ) : (
                  groupOrders.map(order => (
                    <Link key={order._id} to={`/business/orders/${order._id}`} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition hover:border-purple-200 block">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-bold text-gray-900 text-lg">Table {order.tableNumber}</p>
                          <p className="text-xs text-gray-500">{order.customerName}</p>
                        </div>
                        <div className="flex items-center gap-1 text-gray-400 text-xs">
                          <Clock size={12} />
                          {new Date(order.placedAt || order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>

                      {/* Items list */}
                      <div className="space-y-1 mb-3">
                        {order.items?.map((item, i) => (
                          <div key={i} className="flex justify-between text-sm">
                            <span className="text-gray-700"><span className="font-bold">{item.quantity}×</span> {item.name}</span>
                          </div>
                        ))}
                      </div>

                      {order.orderNotes && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800 mb-3">
                          📝 {order.orderNotes}
                        </div>
                      )}

                      <div className="flex justify-between items-center border-t border-gray-100 pt-2.5">
                        <span className="text-xs text-gray-500">{order.orderNumber}</span>
                        <div className="flex items-center gap-1 text-purple-600 text-xs font-semibold">
                          Manage <ArrowRight size={12} />
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
