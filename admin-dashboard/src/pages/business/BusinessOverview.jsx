import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingBag, Star, Tag, TrendingUp, Users,
  Clock, CheckCircle, Flame, ArrowRight, RefreshCw,
} from 'lucide-react';
import { useBusinessAuth } from '../../context/BusinessAuthContext';
import biz from '../../api/businessApi';
import useBusinessSocket from '../../hooks/useBusinessSocket';

const STATUS_COLORS = {
  new:       'bg-blue-100 text-blue-700 border border-blue-200',
  accepted:  'bg-purple-100 text-purple-700 border border-purple-200',
  preparing: 'bg-amber-100 text-amber-700 border border-amber-200',
  ready:     'bg-green-100 text-green-700 border border-green-200',
  delivered: 'bg-gray-100 text-gray-600 border border-gray-200',
  cancelled: 'bg-red-100 text-red-700 border border-red-200',
};

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-start gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm font-medium text-gray-600">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function BusinessOverview() {
  const { business } = useBusinessAuth();
  const [activeOrders, setActiveOrders] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!business?._id) return;
    setLoading(true);
    try {
      const [ordersRes, analyticsRes] = await Promise.all([
        biz.getBusinessOrders(business._id, { status: 'active', limit: 5 }),
        biz.getOrderAnalytics(business._id, 'today'),
      ]);
      if (ordersRes.data.success) setActiveOrders(ordersRes.data.data || []);
      if (analyticsRes.data.success) setAnalytics(analyticsRes.data.data || analyticsRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [business?._id]);

  useBusinessSocket({
    businessId: business?._id,
    onNewOrder: (order) => setActiveOrders(prev => [order, ...prev.slice(0, 4)]),
    onOrderStatusUpdated: (updated) => {
      setActiveOrders(prev => {
        if (['delivered', 'cancelled'].includes(updated.status)) {
          return prev.filter(o => o._id !== updated._id);
        }
        return prev.map(o => o._id === updated._id ? { ...o, ...updated } : o);
      });
    },
  });

  const currency = business?.currency === 'GBP' ? '£' : business?.currency === 'USD' ? '$' : '₹';

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Hero */}
      <div className="rounded-2xl p-6 text-white" style={{ background: 'linear-gradient(135deg,#6C47FF,#4C35B5)' }}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-purple-200 text-sm font-medium">Welcome back</p>
            <h1 className="text-2xl font-bold mt-0.5">{business?.name || 'Your Business'}</h1>
            <p className="text-purple-200 text-sm mt-1 capitalize">{business?.category} · {business?.status}</p>
          </div>
          <button onClick={fetchData} className="bg-white/20 hover:bg-white/30 transition rounded-xl p-2.5">
            <RefreshCw size={18} />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-4">
          {[
            { label: 'Active Orders', value: activeOrders.length },
            { label: "Today's Orders", value: analytics?.totalOrders ?? '—' },
            { label: "Today's Revenue", value: analytics?.totalRevenue ? `${currency}${analytics.totalRevenue.toFixed(2)}` : '—' },
          ].map(s => (
            <div key={s.label} className="bg-white/15 rounded-xl px-4 py-3">
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-purple-200 text-xs mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={ShoppingBag} label="Active Orders" value={activeOrders.length} color="bg-blue-100 text-blue-600" />
        <StatCard icon={CheckCircle} label="Delivered Today" value={analytics?.deliveredOrders ?? '—'} color="bg-green-100 text-green-600" />
        <StatCard icon={TrendingUp} label="Avg Order Value" value={analytics?.avgOrderValue ? `${currency}${analytics.avgOrderValue.toFixed(2)}` : '—'} color="bg-purple-100 text-purple-600" />
        <StatCard icon={Star} label="Rating" value={business?.hashviewRating?.toFixed(1) ?? '—'} sub="HashView rating" color="bg-amber-100 text-amber-600" />
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Live Orders', to: '/business/orders', icon: ShoppingBag, color: 'from-blue-500 to-blue-600' },
          { label: 'Kitchen View', to: '/business/kitchen', icon: Flame, color: 'from-orange-500 to-orange-600' },
          { label: 'Menu', to: '/business/menu', icon: Tag, color: 'from-purple-500 to-purple-600' },
          { label: 'Analytics', to: '/business/order-analytics', icon: TrendingUp, color: 'from-green-500 to-green-600' },
        ].map(q => (
          <Link key={q.label} to={q.to} className={`bg-gradient-to-br ${q.color} text-white rounded-xl p-4 flex items-center justify-between hover:opacity-90 transition shadow-sm`}>
            <div>
              <q.icon size={20} className="mb-2" />
              <p className="font-semibold text-sm">{q.label}</p>
            </div>
            <ArrowRight size={16} className="opacity-70" />
          </Link>
        ))}
      </div>

      {/* Recent active orders */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Live Active Orders</h3>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs text-gray-500 font-medium">Real-time</span>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : activeOrders.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <ShoppingBag size={40} className="mx-auto mb-3 opacity-40" />
            <p>No active orders right now</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {activeOrders.map(order => (
              <Link key={order._id} to={`/business/orders/${order._id}`} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition">
                <div>
                  <p className="font-bold text-gray-900">Table {order.tableNumber}</p>
                  <p className="text-sm text-gray-500">{order.customerName} · {order.orderNumber}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-700">{currency}{order.billing?.grandTotal?.toFixed(2)}</span>
                  <span className={`text-xs font-bold uppercase px-2.5 py-1 rounded-full ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-600'}`}>
                    {order.status}
                  </span>
                  <ArrowRight size={14} className="text-gray-400" />
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="px-6 py-3 border-t border-gray-100">
          <Link to="/business/orders" className="text-sm font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-1">
            View all orders <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* QR Code Section */}
      {business?.qrCode && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col items-center">
          <h3 className="font-bold text-gray-900 mb-2">Your Business QR Code</h3>
          <p className="text-sm text-gray-500 mb-6 text-center max-w-md">
            Scan this QR code from any smartphone to instantly open your HashView menu. You can print this and place it on your tables!
          </p>
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 mb-4">
            <img 
              src={business.qrCode} 
              alt="Business QR Code" 
              className="w-48 h-48 object-contain"
            />
          </div>
          <a
            href={business.qrCode}
            download={`HashView_QR_${business.name.replace(/\s+/g, '_')}.png`}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2.5 rounded-xl font-semibold transition"
          >
            Download QR Code
          </a>
        </div>
      )}
    </div>
  );
}
