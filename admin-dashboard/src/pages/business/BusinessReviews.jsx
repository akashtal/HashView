import React, { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { useBusinessAuth } from '../../context/BusinessAuthContext';
import biz from '../../api/businessApi';

function StarRating({ value }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={14} className={i <= value ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200'} />
      ))}
    </div>
  );
}

export default function BusinessReviews() {
  const { business } = useBusinessAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (!business?._id) return;
    setLoading(true);
    biz.getBusinessReviews(business._id, { limit: 50 })
      .then(res => {
        const list = res.data.data || res.data.reviews || [];
        setReviews(list);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [business?._id]);

  const filtered = reviews.filter(r => filter === 'all' || String(r.rating) === filter);
  const avgRating = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : '—';

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Customer Reviews</h1>
        <p className="text-sm text-gray-500">{reviews.length} total reviews · Avg: {avgRating} ⭐</p>
      </div>

      {/* Rating filter */}
      <div className="flex gap-2 flex-wrap">
        {['all', '5', '4', '3', '2', '1'].map(v => (
          <button key={v} onClick={() => setFilter(v)} className={`px-4 py-2 rounded-xl text-sm font-semibold border transition ${filter === v ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
            {v === 'all' ? 'All' : `${v} ★`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Star size={40} className="mx-auto mb-3 opacity-30" />
          <p>No reviews found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(review => (
            <div key={review._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center font-bold text-purple-700 text-sm">
                    {review.user?.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{review.user?.name || 'Anonymous'}</p>
                    <p className="text-xs text-gray-400">{new Date(review.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <StarRating value={review.rating} />
              </div>
              {review.comment && (
                <p className="text-sm text-gray-700 leading-relaxed">{review.comment}</p>
              )}
              {review.couponAwarded && (
                <div className="mt-3 inline-flex items-center gap-1.5 bg-green-50 border border-green-200 text-green-700 text-xs font-semibold px-3 py-1 rounded-full">
                  🎁 Coupon awarded
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
