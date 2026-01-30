import React, { useState, useEffect } from 'react';
import { Search, Filter, Trash2, Play, Pause, Tag } from 'lucide-react';
import { adminApi } from '../api/adminApi';
import { format } from 'date-fns';

const Coupons = () => {
  const [coupons, setCoupons] = useState([]);
  const [filteredCoupons, setFilteredCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchCoupons();
  }, []);

  useEffect(() => {
    filterCouponList();
  }, [coupons, searchQuery, filterStatus]);

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getAllCoupons();
      // Backend returns { success, count, data: [...coupons] }
      // Axios wraps it so: response.data.data is the coupons array
      setCoupons(response.data?.data || response.data || []);
    } catch (error) {
      console.error('Error fetching coupons:', error);
      alert('Failed to load coupons');
    } finally {
      setLoading(false);
    }
  };

  const filterCouponList = () => {
    let filtered = [...coupons];

    // Filter by status
    if (filterStatus === 'active') {
      filtered = filtered.filter(c => c.isActive && (!c.validUntil || new Date(c.validUntil) > new Date()));
    } else if (filterStatus === 'inactive') {
      filtered = filtered.filter(c => !c.isActive);
    } else if (filterStatus === 'expired') {
      filtered = filtered.filter(c => c.validUntil && new Date(c.validUntil) < new Date());
    }

    // Filter by search
    if (searchQuery.trim()) {
      filtered = filtered.filter(c =>
        c.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.business?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredCoupons(filtered);
  };

  const getDiscountDisplay = (coupon) => {
    if (coupon.rewardType === 'percentage') {
      return `${coupon.rewardValue}% OFF`;
    } else if (coupon.rewardType === 'fixed') {
      return `£${coupon.rewardValue} OFF`;
    } else if (coupon.rewardType === 'free_item' || coupon.rewardType === 'free_drink') {
      return coupon.itemName ? `FREE: ${coupon.itemName}` : 'FREE ITEM';
    } else if (coupon.rewardType === 'buy1get1') {
      return 'BUY 1 GET 1';
    }
    return 'DISCOUNT';
  };

  const isExpired = (validUntil) => {
    return validUntil && new Date(validUntil) < new Date();
  };

  const handleToggleStatus = async (couponId, currentStatus) => {
    try {
      await adminApi.toggleCouponStatus(couponId, !currentStatus);
      fetchCoupons();
    } catch (error) {
      console.error('Error toggling coupon:', error);
      alert('Failed to update coupon status');
    }
  };

  const handleDelete = async (couponId, code) => {
    if (!window.confirm(`Are you sure you want to delete coupon "${code}"?`)) {
      return;
    }

    try {
      await adminApi.deleteCoupon(couponId);
      alert('Coupon deleted successfully');
      fetchCoupons();
    } catch (error) {
      console.error('Error deleting coupon:', error);
      alert('Failed to delete coupon');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading coupons...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Coupon Management</h1>
        <p className="text-gray-600 mt-1">{filteredCoupons.length} coupons</p>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search coupons by code, business, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <div className="flex gap-2">
            {['all', 'active', 'inactive', 'expired'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded-lg font-medium capitalize transition ${
                  filterStatus === status
                    ? 'bg-pink-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Coupons List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredCoupons.length === 0 ? (
          <div className="col-span-full bg-white rounded-xl p-12 text-center border border-gray-200">
            <Tag className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-500">
              {searchQuery ? 'No coupons found' : 'No coupons yet'}
            </p>
          </div>
        ) : (
          filteredCoupons.map((coupon) => (
            <div
              key={coupon._id}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-3 py-1 bg-pink-50 text-pink-600 font-bold text-sm rounded-lg">
                      {coupon.code}
                    </span>
                    {isExpired(coupon.validUntil) ? (
                      <span className="px-2 py-1 bg-red-50 text-red-600 text-xs font-semibold rounded">
                        EXPIRED
                      </span>
                    ) : (
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded ${
                          coupon.isActive
                            ? 'bg-green-50 text-green-600'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {coupon.isActive ? 'Active' : 'Inactive'}
                      </span>
                    )}
                  </div>

                  <h3 className="text-xl font-bold text-gray-900 mb-1">
                    {getDiscountDisplay(coupon)}
                  </h3>

                  <p className="text-sm font-medium text-gray-700 mb-2">
                    {coupon.business?.name || 'Unknown Business'}
                  </p>

                  {coupon.description && (
                    <p className="text-sm text-gray-600 mb-3">{coupon.description}</p>
                  )}
                </div>
              </div>

              {/* Details */}
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {coupon.minPurchaseAmount > 0 && (
                    <div>
                      <span className="text-gray-500">Min. Purchase:</span>
                      <span className="ml-1 font-semibold text-gray-900">
                        £{coupon.minPurchaseAmount}
                      </span>
                    </div>
                  )}
                  {coupon.maxDiscountAmount > 0 && coupon.rewardType === 'percentage' && (
                    <div>
                      <span className="text-gray-500">Max. Discount:</span>
                      <span className="ml-1 font-semibold text-gray-900">
                        £{coupon.maxDiscountAmount}
                      </span>
                    </div>
                  )}
                  {coupon.validUntil && (
                    <div>
                      <span className="text-gray-500">Valid Until:</span>
                      <span className="ml-1 font-semibold text-gray-900">
                        {format(new Date(coupon.validUntil), 'MMM dd, yyyy')}
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-500">Uses:</span>
                    <span className="ml-1 font-semibold text-gray-900">
                      {coupon.usedCount || 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {!isExpired(coupon.validUntil) && (
                  <button
                    onClick={() => handleToggleStatus(coupon._id, coupon.isActive)}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-medium transition ${
                      coupon.isActive
                        ? 'bg-red-50 text-red-600 hover:bg-red-100'
                        : 'bg-green-50 text-green-600 hover:bg-green-100'
                    }`}
                  >
                    {coupon.isActive ? <Pause size={16} /> : <Play size={16} />}
                    {coupon.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                )}
                <button
                  onClick={() => handleDelete(coupon._id, coupon.code)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 font-medium transition"
                >
                  <Trash2 size={16} />
                  Delete
                </button>
              </div>

              {/* Terms & Conditions */}
              {coupon.termsAndConditions && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-700 mb-1">Terms & Conditions:</p>
                  <p className="text-xs text-gray-600">{coupon.termsAndConditions}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Coupons;

