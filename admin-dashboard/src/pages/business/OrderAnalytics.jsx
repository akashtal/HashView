import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import { TrendingUp, ShoppingBag, CheckCircle, DollarSign } from 'lucide-react';
import { useBusinessAuth } from '../../context/BusinessAuthContext';
import biz from '../../api/businessApi';

const TIMEFRAMES = [
  { k: 'daily', l: 'Today' },
  { k: 'weekly', l: 'This Week' },
  { k: 'monthly', l: 'This Month' },
];

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  );
}

export default function OrderAnalytics() {
  const { business } = useBusinessAuth();
  const [tf, setTf] = useState('weekly');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!business?._id) return;
    setLoading(true);
    biz.getOrderAnalytics(business._id, tf)
      .then(res => {
        if (res.data.success) setData(res.data.data || res.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [business?._id, tf]);

  const currency = business?.currency === 'GBP' ? '£' : '$';

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Order Analytics</h1>
          <p className="text-sm text-gray-500">Revenue and order trends for your business</p>
        </div>
        <div className="flex bg-gray-100 rounded-xl p-1 gap-1 sm:ml-auto">
          {TIMEFRAMES.map(t => (
            <button key={t.k} onClick={() => setTf(t.k)} className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${tf === t.k ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {t.l}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !data ? (
        <div className="text-center py-20 text-gray-400">No analytics data available</div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={ShoppingBag} label="Total Orders" value={data.totalOrders ?? 0} color="bg-blue-100 text-blue-600" />
            <StatCard icon={CheckCircle} label="Delivered" value={data.statusBreakdown?.delivered ?? 0} color="bg-green-100 text-green-600" />
            <StatCard icon={DollarSign} label="Total Revenue" value={`${currency}${(data.totalRevenue || 0).toFixed(2)}`} color="bg-purple-100 text-purple-600" />
            <StatCard icon={TrendingUp} label="Avg Order Value" value={`${currency}${(data.averageOrderValue || 0).toFixed(2)}`} color="bg-amber-100 text-amber-600" />
          </div>

          {/* Revenue chart */}
          {data.timeSeries?.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-bold text-gray-900 mb-5">Revenue Over Time</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={data.timeSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="_id" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v) => `${currency}${Number(v).toFixed(2)}`} labelFormatter={(label) => `Date: ${label}`} />
                  <Line type="monotone" dataKey="revenue" stroke="#6C47FF" strokeWidth={2.5} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Orders by status */}
          {data.statusBreakdown && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-bold text-gray-900 mb-5">Orders by Status</h3>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={Object.entries(data.statusBreakdown).map(([status, count]) => ({ status, count }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="status" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#6C47FF" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  );
}
