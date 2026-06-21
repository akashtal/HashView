import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, CheckCircle, Flame, Package, Truck, X, AlertCircle } from 'lucide-react';
import biz from '../../api/businessApi';

const STATUS_PIPELINE = [
  { key: 'new',       label: 'Received', icon: FileText },
  { key: 'accepted',  label: 'Confirmed', icon: CheckCircle },
  { key: 'preparing', label: 'Preparing', icon: Flame },
  { key: 'ready',     label: 'Ready', icon: Package },
  { key: 'delivered', label: 'Served', icon: Truck },
];
const STATUS_IDX = { new: 0, accepted: 1, preparing: 2, ready: 3, delivered: 4 };
const STATUS_COLORS = {
  new: 'border-blue-500 text-blue-700 bg-blue-50',
  accepted: 'border-purple-500 text-purple-700 bg-purple-50',
  preparing: 'border-amber-500 text-amber-700 bg-amber-50',
  ready: 'border-green-500 text-green-700 bg-green-50',
  delivered: 'border-gray-400 text-gray-600 bg-gray-50',
  cancelled: 'border-red-500 text-red-700 bg-red-50',
};

const NEXT_ACTIONS = {
  new:       { label: 'Accept Order',   next: 'accepted',  color: 'bg-purple-600 hover:bg-purple-700' },
  accepted:  { label: 'Start Preparing',next: 'preparing', color: 'bg-amber-500 hover:bg-amber-600' },
  preparing: { label: 'Mark Ready',     next: 'ready',     color: 'bg-green-600 hover:bg-green-700' },
  ready:     { label: 'Mark Delivered', next: 'delivered', color: 'bg-gray-800 hover:bg-gray-900' },
};

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [cancelModal, setCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await biz.getOrder(id);
        if (res.data.success) setOrder(res.data.data);
      } catch (e) {
        console.error(e);
        navigate('/business/orders');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleUpdateStatus = async (newStatus) => {
    setUpdating(true);
    try {
      const res = await biz.updateOrderStatus(id, newStatus);
      if (res.data.success) setOrder(res.data.data);
    } catch (e) { alert('Failed to update status: ' + (e.response?.data?.message || e.message)); }
    finally { setUpdating(false); }
  };

  const handleCancel = async () => {
    setUpdating(true);
    try {
      const res = await biz.cancelOrder(id, cancelReason || 'Business cancelled');
      if (res.data.success) { setOrder(res.data.data); setCancelModal(false); }
    } catch (e) { alert('Failed: ' + (e.response?.data?.message || e.message)); }
    finally { setUpdating(false); }
  };

  if (loading) return (
    <div className="flex justify-center py-24">
      <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!order) return null;

  const currency = order.items?.[0]?.currency === 'GBP' ? '£' : '$';
  const currentIdx = STATUS_IDX[order.status] ?? 0;
  const nextAction = NEXT_ACTIONS[order.status];
  const isCancelled = order.status === 'cancelled';
  const isDone = order.status === 'delivered' || isCancelled;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Back + title */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Order {order.orderNumber}</h1>
          <p className="text-xs text-gray-500">Placed {new Date(order.placedAt || order.createdAt).toLocaleString()}</p>
        </div>
        <div className="ml-auto">
          <span className={`text-sm font-bold uppercase px-4 py-1.5 rounded-full border-2 ${STATUS_COLORS[order.status]}`}>
            {order.status}
          </span>
        </div>
      </div>

      {/* Progress pipeline */}
      {!isCancelled && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between">
            {STATUS_PIPELINE.map((step, idx) => {
              const done = idx <= currentIdx;
              const Icon = step.icon;
              const isLast = idx === STATUS_PIPELINE.length - 1;
              return (
                <React.Fragment key={step.key}>
                  <div className="flex flex-col items-center gap-1.5">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${done ? 'text-white shadow-md' : 'bg-gray-100 text-gray-400'}`}
                      style={done ? { background: 'linear-gradient(135deg,#6C47FF,#4C35B5)' } : {}}>
                      <Icon size={18} />
                    </div>
                    <p className={`text-xs font-medium ${done ? 'text-purple-700' : 'text-gray-400'}`}>{step.label}</p>
                  </div>
                  {!isLast && (
                    <div className="flex-1 h-1 rounded-full mx-2" style={{ background: idx < currentIdx ? 'linear-gradient(to right,#6C47FF,#8B5CF6)' : '#E5E7EB' }} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      {/* Customer info */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 grid grid-cols-2 gap-4">
        {[
          ['Customer', order.customerName],
          ['Table', order.tableNumber],
          ['People', order.numberOfPeople],
          ['Time', new Date(order.placedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })],
        ].map(([k, v]) => (
          <div key={k}>
            <p className="text-xs text-gray-500 font-medium">{k}</p>
            <p className="font-bold text-gray-900 mt-0.5">{v}</p>
          </div>
        ))}
        {order.orderNotes && (
          <div className="col-span-2 bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2">
            <AlertCircle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-amber-700">Special Instructions</p>
              <p className="text-sm text-amber-900">{order.orderNotes}</p>
            </div>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-bold text-gray-900 mb-4">Order Items</h3>
        <div className="space-y-3">
          {order.items.map((item, i) => (
            <div key={i} className="flex justify-between items-start pb-3 border-b border-gray-50 last:border-0 last:pb-0">
              <div>
                <p className="font-semibold text-gray-900">{item.quantity}× {item.name}</p>
                {item.customizationSelections?.length > 0 && (
                  <div className="mt-1 space-y-0.5">
                    {item.customizationSelections.map((c, idx) => (
                      <p key={idx} className="text-xs text-gray-500">
                        <span className="font-medium text-gray-600">{c.groupName}:</span> {c.optionName} {c.priceAdjustment > 0 && `(+${currency}${c.priceAdjustment.toFixed(2)})`}
                      </p>
                    ))}
                  </div>
                )}
                {item.modifiers?.length > 0 && <p className="text-xs text-gray-500 mt-0.5">{item.modifiers.map(m => m.name).join(', ')}</p>}
                {item.addOns?.length > 0 && <p className="text-xs text-gray-500 mt-0.5">+ {item.addOns.map(a => a.name).join(', ')}</p>}
              </div>
              <p className="font-semibold text-gray-900">{currency}{item.itemTotal?.toFixed(2)}</p>
            </div>
          ))}
        </div>

        {/* Billing */}
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-1.5">
          {[
            ['Subtotal', order.billing.subtotal],
            ['Taxes', order.billing.totalTax],
            ['Charges', order.billing.totalCharges],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between text-sm">
              <span className="text-gray-500">{k}</span>
              <span className="text-gray-700">{currency}{(v || 0).toFixed(2)}</span>
            </div>
          ))}
          <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-100">
            <span>Total</span>
            <span className="text-purple-700">{currency}{order.billing.grandTotal.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      {!isDone && (
        <div className="space-y-3">
          {nextAction && (
            <button
              onClick={() => handleUpdateStatus(nextAction.next)}
              disabled={updating}
              className={`w-full py-4 rounded-2xl text-white font-bold text-lg transition shadow-lg ${nextAction.color} disabled:opacity-50`}
            >
              {updating ? 'Updating...' : nextAction.label}
            </button>
          )}
          <button
            onClick={() => setCancelModal(true)}
            disabled={updating}
            className="w-full py-3.5 rounded-2xl border-2 border-red-300 text-red-600 font-bold hover:bg-red-50 transition"
          >
            Cancel Order
          </button>
        </div>
      )}

      {/* Cancel modal */}
      {cancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Cancel Order</h3>
              <button onClick={() => setCancelModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <textarea
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              placeholder="Reason for cancellation (optional)"
              rows={3}
              className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-400/30 resize-none"
            />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setCancelModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 font-semibold hover:bg-gray-50 transition">Back</button>
              <button onClick={handleCancel} disabled={updating} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition disabled:opacity-50">
                {updating ? 'Cancelling...' : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
