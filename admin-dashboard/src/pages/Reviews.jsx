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
  const [businessFilter, setBusinessFilter] = useState('');
  const [businesses, setBusinesses] = useState([]);
  const [topReviewersList, setTopReviewersList] = useState([]);

  useEffect(() => {
    fetchReviews();
    fetchTopReviewers();
  }, [page, statusFilter, businessFilter]);

  const fetchTopReviewers = async () => {
    if (!businessFilter) {
      setTopReviewersList([]);
      return;
    }
    try {
      const res = await adminApi.getLiveTopReviewers([businessFilter]);
      if (res.data && res.data[businessFilter]) {
        setTopReviewersList(res.data[businessFilter]);
      } else {
        setTopReviewersList([]);
      }
    } catch (error) {
      console.error('Error fetching top reviewers:', error);
      setTopReviewersList([]);
    }
  };

  useEffect(() => {
    // Fetch businesses for the filter dropdown
    const fetchBusinesses = async () => {
      try {
        const response = await adminApi.getAllBusinesses({ limit: 1000 });
        if (response.data && response.data.businesses) {
          setBusinesses(response.data.businesses);
        }
      } catch (error) {
        console.error('Error fetching businesses for filter:', error);
      }
    };
    fetchBusinesses();
  }, []);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };

      // Map 'active' UI filter to include both 'active' and 'approved' backend statuses
      if (statusFilter === 'active') {
        params.status = 'active,approved';
      } else if (statusFilter) {
        params.status = statusFilter;
      }
      if (businessFilter) {
        params.businessId = businessFilter;
      }

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
            <option value="active">Active / Approved</option>
            <option value="pending">Pending</option>
            <option value="flagged">Flagged</option>
            <option value="removed">Removed / Rejected</option>
          </select>
        </div>

        <div className="flex items-center gap-4 mt-4">
          <label className="text-sm font-medium text-gray-700">Filter by Business:</label>
          <select
            value={businessFilter}
            onChange={(e) => {
              setBusinessFilter(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none flex-1 max-w-md"
          >
            <option value="">All Businesses</option>
            {businesses.map((b) => (
              <option key={b._id} value={b._id}>{b.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Top Reviewers Leaderboard (only shows when a business is selected) */}
      {businessFilter && topReviewersList.length > 0 && (
        <div className="bg-purple-50 rounded-xl shadow-sm border border-purple-100 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Star className="text-purple-600" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-purple-900">Top Reviewers</h2>
              <p className="text-sm text-purple-700">Users who have submitted the most reviews for this business.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {topReviewersList.map((reviewer, index) => (
              <div key={reviewer.user?._id || index} className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-4 border border-purple-100">
                <div className="relative">
                  {reviewer.user?.profileImage ? (
                    <img src={reviewer.user.profileImage} alt={reviewer.user.name} className="w-12 h-12 rounded-full object-cover border-2 border-purple-200" />
                  ) : (
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center border-2 border-purple-200">
                      <span className="text-purple-600 font-bold text-lg">{reviewer.user?.name?.charAt(0) || '?'}</span>
                    </div>
                  )}
                  {index === 0 && (
                    <div className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-0.5 rounded-full shadow-sm border border-yellow-500">
                      #1
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 truncate" title={reviewer.user?.name}>{reviewer.user?.name}</h3>
                  <p className="text-sm font-medium text-purple-600">{reviewer.reviewCount} review{reviewer.reviewCount !== 1 ? 's' : ''}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
                      className={`ml-3 px-2 py-1 text-xs font-medium rounded-full ${(review.status === 'active' || review.status === 'approved')
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

                  <div className="flex items-center text-sm text-gray-500 flex-wrap gap-y-2">
                    <span className="font-medium text-gray-900">{review.user?.name}</span>
                    {review.userReviewCountForBusiness !== undefined && (
                      <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                        {review.userReviewCountForBusiness} review{review.userReviewCountForBusiness !== 1 ? 's' : ''} here
                      </span>
                    )}
                    <span className="mx-2">•</span>
                    <span>for <span className="font-semibold text-gray-800">{review.business?.name}</span></span>
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
                  {(review.status !== 'active' && review.status !== 'approved') && (
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

