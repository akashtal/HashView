import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Building2, Star, TrendingUp, CheckCircle, Clock } from 'lucide-react';
import { adminApi } from '../api/adminApi';
import { format } from 'date-fns';

const StatCard = ({ title, value, icon: Icon, change, color = 'primary' }) => (
  <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
        {change && (
          <p className="text-sm text-green-600 mt-2">
            +{change} this month
          </p>
        )}
      </div>
      <div className={`p-3 rounded-full bg-${color}-100`}>
        <Icon className={`text-${color}-600`} size={24} />
      </div>
    </div>
  </div>
);

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await adminApi.getDashboardStats();
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome to HashView Admin Panel</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Users"
          value={stats?.stats?.users?.total || 0}
          icon={Users}
          change={stats?.stats?.users?.newThisMonth}
          color="blue"
        />
        <StatCard
          title="Total Businesses"
          value={stats?.stats?.businesses?.total || 0}
          icon={Building2}
          change={stats?.stats?.businesses?.newThisMonth}
          color="purple"
        />
        <StatCard
          title="Active Businesses"
          value={stats?.stats?.businesses?.active || 0}
          icon={CheckCircle}
          color="green"
        />
        <StatCard
          title="Pending Approvals"
          value={stats?.stats?.businesses?.pending || 0}
          icon={Clock}
          color="yellow"
        />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Users */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Recent Users</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {stats?.recentUsers?.map((user) => (
                <div key={user._id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{user.name}</p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                  <span className="text-xs text-gray-500">
                    {format(new Date(user.createdAt), 'MMM dd')}
                  </span>
                </div>
              ))}
            </div>
            <Link
              to="/users"
              className="block text-center text-primary-600 hover:text-primary-700 font-medium text-sm mt-4"
            >
              View all users →
            </Link>
          </div>
        </div>

        {/* Recent Businesses */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Recent Businesses</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {stats?.recentBusinesses?.map((business) => (
                <div key={business._id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{business.name}</p>
                    <p className="text-sm text-gray-500">{business.category}</p>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                      business.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : business.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {business.status}
                  </span>
                </div>
              ))}
            </div>
            <Link
              to="/businesses"
              className="block text-center text-primary-600 hover:text-primary-700 font-medium text-sm mt-4"
            >
              View all businesses →
            </Link>
          </div>
        </div>
      </div>

      {/* Reviews Stats */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Reviews Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {stats?.stats?.reviews?.distribution?.map((item) => (
            <div key={item._id} className="text-center">
              <div className="text-2xl font-bold text-gray-900">{item.count}</div>
              <div className="text-sm text-gray-600 flex items-center justify-center mt-1">
                <Star size={16} className="text-yellow-500 mr-1 fill-current" />
                {item._id} Stars
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

