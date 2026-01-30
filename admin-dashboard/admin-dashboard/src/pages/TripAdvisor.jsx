import React, { useState, useEffect } from 'react';
import { Search, Filter, Edit2, Plane, X } from 'lucide-react';
import { adminApi } from '../api/adminApi';

const TripAdvisor = () => {
  const [businesses, setBusinesses] = useState([]);
  const [filteredBusinesses, setFilteredBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [editModal, setEditModal] = useState(null);
  const [formData, setFormData] = useState({ rating: '', reviewCount: '', profileUrl: '' });

  useEffect(() => {
    fetchBusinesses();
  }, []);

  useEffect(() => {
    filterBusinessList();
  }, [businesses, searchQuery, filterType]);

  const fetchBusinesses = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getAllBusinesses();
      // Backend returns { success, count, total, page, pages, businesses: [...] }
      // Axios wraps it so: response.data.businesses is the businesses array
      setBusinesses(response.data?.businesses || response.data || []);
    } catch (error) {
      console.error('Error fetching businesses:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterBusinessList = () => {
    let filtered = [...businesses];

    if (filterType === 'with-rating') {
      filtered = filtered.filter(b => b.externalProfiles?.tripAdvisor?.rating);
    } else if (filterType === 'without-rating') {
      filtered = filtered.filter(b => !b.externalProfiles?.tripAdvisor?.rating);
    }

    if (searchQuery.trim()) {
      filtered = filtered.filter(b =>
        b.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.ownerName?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredBusinesses(filtered);
  };

  const handleOpenEditModal = (business) => {
    setEditModal(business);
    setFormData({
      rating: business.externalProfiles?.tripAdvisor?.rating?.toString() || '',
      reviewCount: business.externalProfiles?.tripAdvisor?.reviewCount?.toString() || '',
      profileUrl: business.externalProfiles?.tripAdvisor?.profileUrl || ''
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.rating || !formData.reviewCount) {
      alert('Please enter both rating and review count');
      return;
    }

    const rating = parseFloat(formData.rating);
    if (rating < 0 || rating > 5) {
      alert('Rating must be between 0 and 5');
      return;
    }

    try {
      await adminApi.updateTripAdvisorRating(editModal._id, {
        rating: formData.rating || null,
        reviewCount: formData.reviewCount || null,
        profileUrl: formData.profileUrl || null
      });

      alert('TripAdvisor rating updated successfully');
      setEditModal(null);
      fetchBusinesses();
    } catch (error) {
      console.error('Error updating TripAdvisor:', error);
      alert(error.response?.data?.message || 'Failed to update TripAdvisor rating');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading businesses...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">TripAdvisor Ratings</h1>
        <p className="text-gray-600 mt-1">Manage TripAdvisor ratings for all businesses</p>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search businesses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-2">
            {['all', 'with-rating', 'without-rating'].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-4 py-2 rounded-lg font-medium capitalize transition whitespace-nowrap ${
                  filterType === type
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {type === 'with-rating' ? 'With Rating' : type === 'without-rating' ? 'No Rating' : 'All'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Businesses Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredBusinesses.length === 0 ? (
          <div className="col-span-full bg-white rounded-xl p-12 text-center border border-gray-200">
            <Plane className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-500">
              {searchQuery ? 'No businesses found' : 'No businesses yet'}
            </p>
          </div>
        ) : (
          filteredBusinesses.map((business) => {
            const hasRating = business.externalProfiles?.tripAdvisor?.rating;
            const rating = business.externalProfiles?.tripAdvisor?.rating || 0;
            const reviewCount = business.externalProfiles?.tripAdvisor?.reviewCount || 0;
            const profileUrl = business.externalProfiles?.tripAdvisor?.profileUrl;

            return (
              <div
                key={business._id}
                className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition"
              >
                <div className="flex items-start gap-4 mb-4">
                  {business.logo?.url ? (
                    <img
                      src={business.logo.url}
                      alt={business.name}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-gray-200 flex items-center justify-center">
                      <Plane className="text-gray-400" size={24} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 truncate">{business.name}</h3>
                    <p className="text-sm text-gray-500">{business.ownerName}</p>
                    {profileUrl && (
                      <a
                        href={profileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-500 hover:underline truncate block"
                      >
                        View Profile
                      </a>
                    )}
                  </div>
                </div>

                <div className="bg-green-50 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Plane className="text-green-600" size={20} />
                      <span className="text-sm font-semibold text-gray-700">TripAdvisor</span>
                    </div>
                    {hasRating ? (
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-green-600">{rating.toFixed(1)}</span>
                        <div className="text-sm text-gray-500">
                          ({reviewCount} reviews)
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">No rating yet</span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleOpenEditModal(business)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
                >
                  <Edit2 size={16} />
                  {hasRating ? 'Edit Rating' : 'Add Rating'}
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Edit Modal */}
      {editModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full">
            <div className="border-b border-gray-200 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">TripAdvisor Rating</h2>
              <button
                onClick={() => setEditModal(null)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-4">{editModal.name}</h3>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  TripAdvisor Profile URL (Optional)
                </label>
                <input
                  type="url"
                  value={formData.profileUrl}
                  onChange={(e) => setFormData({ ...formData, profileUrl: e.target.value })}
                  placeholder="https://www.tripadvisor.com/..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Rating * (0.0 - 5.0)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  value={formData.rating}
                  onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
                  placeholder="4.5"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Total Reviews *
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.reviewCount}
                  onChange={(e) => setFormData({ ...formData, reviewCount: e.target.value })}
                  placeholder="123"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg font-bold"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition"
              >
                Save TripAdvisor Rating
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TripAdvisor;

