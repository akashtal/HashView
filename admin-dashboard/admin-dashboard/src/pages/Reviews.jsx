import React, { useState, useEffect } from 'react';
import { Star, CheckCircle, XCircle } from 'lucide-react';
import { adminApi } from '../api/adminApi';
import { format } from 'date-fns';

const Reviews = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchReviews();
  }, [page, statusFilter]);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (statusFilter) params.status = statusFilter;

      const response = await adminApi.getAllReviews(params);
      setReviews(response.data.reviews);
      setTotalPages(response.data.pages);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (reviewId, newStatus) => {
    if (!confirm(`Are you sure you want to ${newStatus} this review?`)) return;

    try {
      await adminApi.updateReviewStatus(reviewId, newStatus);
      fetchReviews();
    } catch (error) {
      alert('Error updating review status');
    }
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={16}
        className={i < rating ? 'text-yellow-500 fill-current' : 'text-gray-300'}
      />
    ));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reviews Management</h1>
          <p className="text-gray-600 mt-1">Monitor and moderate user reviews</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Filter by status:</label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
          >
            <option value="">All Reviews</option>
            <option value="active">Active</option>
            <option value="flagged">Flagged</option>
            <option value="removed">Removed</option>
          </select>
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-500">
            Loading...
          </div>
        ) : reviews.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-500">
            No reviews found
          </div>
        ) : (
          reviews.map((review) => (
            <div key={review._id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <div className="flex items-center">{renderStars(review.rating)}</div>
                    <span
                      className={`ml-3 px-2 py-1 text-xs font-medium rounded-full ${
                        review.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : review.status === 'flagged'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {review.status}
                    </span>
                  </div>

                  <p className="text-gray-900 mb-3">{review.comment}</p>

                  <div className="flex items-center text-sm text-gray-500">
                    <span className="font-medium">{review.user?.name}</span>
                    <span className="mx-2">•</span>
                    <span>for {review.business?.name}</span>
                    <span className="mx-2">•</span>
                    <span>{format(new Date(review.createdAt), 'MMM dd, yyyy')}</span>
                  </div>

                  {review.images && review.images.length > 0 && (
                    <div className="flex gap-2 mt-4">
                      {review.images.slice(0, 3).map((image, idx) => (
                        <img
                          key={idx}
                          src={image.url}
                          alt={`Review ${idx + 1}`}
                          className="h-20 w-20 object-cover rounded-lg"
                        />
                      ))}
                      {review.images.length > 3 && (
                        <div className="h-20 w-20 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 text-sm">
                          +{review.images.length - 3}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="ml-6 flex flex-col gap-2">
                  {review.status !== 'active' && (
                    <button
                      onClick={() => handleStatusUpdate(review._id, 'active')}
                      className="flex items-center px-3 py-2 text-sm bg-green-100 hover:bg-green-200 text-green-700 font-medium rounded-lg transition"
                    >
                      <CheckCircle size={16} className="mr-2" />
                      Approve
                    </button>
                  )}
                  {review.status !== 'removed' && (
                    <button
                      onClick={() => handleStatusUpdate(review._id, 'removed')}
                      className="flex items-center px-3 py-2 text-sm bg-red-100 hover:bg-red-200 text-red-700 font-medium rounded-lg transition"
                    >
                      <XCircle size={16} className="mr-2" />
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-gray-700">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page === totalPages}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default Reviews;

