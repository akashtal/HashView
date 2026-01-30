import React, { useState, useEffect } from 'react';
import { Send, Users, Building2, User, Search } from 'lucide-react';
import { adminApi } from '../api/adminApi';

const Notifications = () => {
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    recipientType: 'all_users', // 'all_users', 'all_businesses', 'specific_user', 'specific_business'
    recipientIds: [],
    searchQuery: ''
  });
  
  const [users, setUsers] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  // Fetch users and businesses for selection
  useEffect(() => {
    fetchUsersAndBusinesses();
  }, []);

  const fetchUsersAndBusinesses = async () => {
    try {
      const [usersRes, businessesRes] = await Promise.all([
        adminApi.getAllUsers({ page: 1, limit: 1000 }),
        adminApi.getAllBusinesses({ page: 1, limit: 1000 })
      ]);
      setUsers(usersRes.data.users || []);
      setBusinesses(businessesRes.data.businesses || []);
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };

  const handleSearch = (query) => {
    setFormData({ ...formData, searchQuery: query });
    
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const searchLower = query.toLowerCase();
    
    if (formData.recipientType === 'specific_user') {
      const results = users.filter(user => 
        user.name?.toLowerCase().includes(searchLower) ||
        user.email?.toLowerCase().includes(searchLower) ||
        user.phoneNumber?.toLowerCase().includes(searchLower)
      );
      setSearchResults(results);
    } else if (formData.recipientType === 'specific_business') {
      const results = businesses.filter(business => 
        business.name?.toLowerCase().includes(searchLower) ||
        business.email?.toLowerCase().includes(searchLower) ||
        business.category?.toLowerCase().includes(searchLower)
      );
      setSearchResults(results);
    }
  };

  const toggleRecipient = (id) => {
    if (formData.recipientIds.includes(id)) {
      setFormData({
        ...formData,
        recipientIds: formData.recipientIds.filter(rid => rid !== id)
      });
    } else {
      setFormData({
        ...formData,
        recipientIds: [...formData.recipientIds, id]
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.title || !formData.message) {
      setError('Please fill in all fields');
      return;
    }

    if ((formData.recipientType === 'specific_user' || formData.recipientType === 'specific_business') 
        && formData.recipientIds.length === 0) {
      setError('Please select at least one recipient');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        title: formData.title,
        message: formData.message,
        recipientType: formData.recipientType,
        recipientIds: formData.recipientIds.length > 0 ? formData.recipientIds : undefined
      };

      const response = await adminApi.sendNotification(payload);
      setSuccess(response.data.message || 'Notification sent successfully!');
      setFormData({ 
        title: '', 
        message: '', 
        recipientType: 'all_users', 
        recipientIds: [],
        searchQuery: ''
      });
      setSearchResults([]);
    } catch (err) {
      console.error('Error sending notification:', err);
      setError(err.response?.data?.message || 'Error sending notification');
    } finally {
      setLoading(false);
    }
  };

  const getRecipientSummary = () => {
    switch (formData.recipientType) {
      case 'all_users':
        return `All Users (${users.length})`;
      case 'all_businesses':
        return `All Businesses (${businesses.length})`;
      case 'specific_user':
        return formData.recipientIds.length > 0 
          ? `${formData.recipientIds.length} Selected User(s)`
          : 'No users selected';
      case 'specific_business':
        return formData.recipientIds.length > 0 
          ? `${formData.recipientIds.length} Selected Business(es)`
          : 'No businesses selected';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Push Notifications</h1>
        <p className="text-gray-600 mt-1">Send notifications to users and businesses</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form - 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Compose Notification</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm flex items-start">
                  <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>{success}</span>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm flex items-start">
                  <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              {/* Recipient Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Send To
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, recipientType: 'all_users', recipientIds: [], searchQuery: '' })}
                    className={`flex items-center justify-center px-4 py-3 rounded-lg border-2 transition ${
                      formData.recipientType === 'all_users'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Users size={18} className="mr-2" />
                    <span className="font-medium">All Users</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, recipientType: 'all_businesses', recipientIds: [], searchQuery: '' })}
                    className={`flex items-center justify-center px-4 py-3 rounded-lg border-2 transition ${
                      formData.recipientType === 'all_businesses'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Building2 size={18} className="mr-2" />
                    <span className="font-medium">All Businesses</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, recipientType: 'specific_user', recipientIds: [], searchQuery: '' })}
                    className={`flex items-center justify-center px-4 py-3 rounded-lg border-2 transition ${
                      formData.recipientType === 'specific_user'
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <User size={18} className="mr-2" />
                    <span className="font-medium">Specific User</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, recipientType: 'specific_business', recipientIds: [], searchQuery: '' })}
                    className={`flex items-center justify-center px-4 py-3 rounded-lg border-2 transition ${
                      formData.recipientType === 'specific_business'
                        ? 'border-orange-500 bg-orange-50 text-orange-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Building2 size={18} className="mr-2" />
                    <span className="font-medium">Specific Business</span>
                  </button>
                </div>
              </div>

              {/* Search for Specific Recipients */}
              {(formData.recipientType === 'specific_user' || formData.recipientType === 'specific_business') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search & Select {formData.recipientType === 'specific_user' ? 'Users' : 'Businesses'}
                  </label>
                  <div className="relative">
                    <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={formData.searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                      placeholder={`Search ${formData.recipientType === 'specific_user' ? 'users by name, email, or phone' : 'businesses by name or category'}...`}
                    />
                  </div>

                  {/* Selected Recipients */}
                  {formData.recipientIds.length > 0 && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        Selected ({formData.recipientIds.length})
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {formData.recipientIds.map(id => {
                          const item = formData.recipientType === 'specific_user'
                            ? users.find(u => u._id === id)
                            : businesses.find(b => b._id === id);
                          
                          return (
                            <span 
                              key={id}
                              className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary-100 text-primary-800"
                            >
                              {item?.name || 'Unknown'}
                              <button
                                type="button"
                                onClick={() => toggleRecipient(id)}
                                className="ml-2 text-primary-600 hover:text-primary-800"
                              >
                                ×
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Search Results */}
                  {searchResults.length > 0 && (
                    <div className="mt-3 max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                      {searchResults.map(item => (
                        <button
                          key={item._id}
                          type="button"
                          onClick={() => toggleRecipient(item._id)}
                          className={`w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition ${
                            formData.recipientIds.includes(item._id) ? 'bg-blue-50' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900">{item.name}</p>
                              <p className="text-sm text-gray-500">
                                {formData.recipientType === 'specific_user' 
                                  ? (item.email || item.phoneNumber)
                                  : (item.category || item.address?.city)}
                              </p>
                            </div>
                            {formData.recipientIds.includes(item._id) && (
                              <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Title Input */}
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                  Notification Title
                </label>
                <input
                  id="title"
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  placeholder="Enter notification title (max 65 chars)"
                  maxLength={65}
                />
                <p className="text-xs text-gray-500 mt-1 text-right">{formData.title.length}/65</p>
              </div>

              {/* Message Input */}
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                  Message
                </label>
                <textarea
                  id="message"
                  required
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  rows="4"
                  placeholder="Enter notification message (max 200 chars)"
                  maxLength={200}
                />
                <p className="text-xs text-gray-500 mt-1 text-right">{formData.message.length}/200</p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-semibold rounded-lg transition shadow-lg shadow-primary-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={20} className="mr-2" />
                {loading ? 'Sending...' : 'Send Notification'}
              </button>
            </form>
          </div>
        </div>

        {/* Preview & Info - 1 column */}
        <div className="space-y-6">
          {/* Preview */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Preview</h2>
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 border-l-4 border-primary-600 shadow-sm">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary-600 to-primary-700 flex items-center justify-center shadow-md">
                    <span className="text-white font-bold text-sm">HV</span>
                  </div>
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-semibold text-gray-900">
                    {formData.title || 'Notification Title'}
                  </p>
                  <p className="text-sm text-gray-700 mt-1">
                    {formData.message || 'Your notification message will appear here...'}
                  </p>
                  <p className="text-xs text-gray-500 mt-2 flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                    Just now
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Recipients Summary */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recipients</h2>
            <div className="space-y-3">
              <div className={`flex items-center p-3 rounded-lg ${
                formData.recipientType === 'all_users' ? 'bg-blue-50 border border-blue-200' :
                formData.recipientType === 'all_businesses' ? 'bg-green-50 border border-green-200' :
                formData.recipientType === 'specific_user' ? 'bg-purple-50 border border-purple-200' :
                'bg-orange-50 border border-orange-200'
              }`}>
                {formData.recipientType === 'all_users' && <Users size={20} className="mr-3 text-blue-600" />}
                {formData.recipientType === 'all_businesses' && <Building2 size={20} className="mr-3 text-green-600" />}
                {formData.recipientType === 'specific_user' && <User size={20} className="mr-3 text-purple-600" />}
                {formData.recipientType === 'specific_business' && <Building2 size={20} className="mr-3 text-orange-600" />}
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {getRecipientSummary()}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {formData.recipientType === 'all_users' && 'Notification will be sent to all registered users'}
                    {formData.recipientType === 'all_businesses' && 'Notification will be sent to all business owners'}
                    {formData.recipientType === 'specific_user' && 'Search and select specific users above'}
                    {formData.recipientType === 'specific_business' && 'Search and select specific businesses above'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-900 mb-2 flex items-center">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              Best Practices
            </h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Keep titles clear and concise</li>
              <li>• Use actionable messages</li>
              <li>• Test with specific users first</li>
              <li>• Avoid sending too frequently</li>
              <li>• Time notifications appropriately</li>
            </ul>
          </div>

          {/* Stats */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Stats</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Users:</span>
                <span className="font-semibold text-gray-900">{users.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Businesses:</span>
                <span className="font-semibold text-gray-900">{businesses.length}</span>
              </div>
              {formData.recipientIds.length > 0 && (
                <div className="flex justify-between pt-2 border-t border-gray-200">
                  <span className="text-gray-600">Selected:</span>
                  <span className="font-bold text-primary-600">{formData.recipientIds.length}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Notifications;
