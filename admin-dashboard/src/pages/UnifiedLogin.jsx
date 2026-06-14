import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Eye, EyeOff, Store, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useBusinessAuth } from '../context/BusinessAuthContext';
import biz from '../api/businessApi';
import { adminApi } from '../api/adminApi';

const ALLOWED_ADMIN_ROLES = ['admin', 'BUSINESS_MANAGER', 'VIEWER'];

export default function UnifiedLogin() {
  const navigate = useNavigate();
  const adminAuth = useAuth();
  const bizAuth = useBusinessAuth();
  
  const [activeTab, setActiveTab] = useState('business'); // 'business' or 'admin'
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (activeTab === 'business') {
        const res = await biz.login({ 
          email: form.email.trim(), 
          password: form.password.trim(), 
          role: 'business' 
        });
        
        if (res.data.success) {
          const { token, user } = res.data;
          if (user.role !== 'business') {
            setError('No business account found with these credentials. Please use your business owner login details.');
            setLoading(false);
            return;
          }
          await bizAuth.login(token);
          navigate('/business');
        } else {
          setError(res.data.message || 'Login failed');
        }
      } else {
        // Admin Login
        const res = await adminApi.login({ 
          email: form.email.trim(), 
          password: form.password.trim() 
        });
        
        if (res.data.success) {
          const { token, user } = res.data;
          if (!ALLOWED_ADMIN_ROLES.includes(user.role)) {
            setError('Access denied. Admin privileges required.');
            setLoading(false);
            return;
          }
          await adminAuth.login(token, user);
          navigate('/');
        } else {
          setError(res.data.message || 'Login failed');
        }
      }
    } catch (err) {
      if (!err.response) {
        setError('Network error. Please check your connection.');
      } else {
        setError(err.response.data?.message || 'Invalid email or password');
      }
    } finally {
      setLoading(false);
    }
  };

  const switchTab = (tab) => {
    setActiveTab(tab);
    setError('');
    setForm({ email: '', password: '' });
  };

  const isBusiness = activeTab === 'business';

  return (
    <div className="min-h-screen flex" style={{ background: isBusiness ? 'linear-gradient(135deg, #1a0533 0%, #2d1660 50%, #0f0520 100%)' : 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #020617 100%)', transition: 'background 0.5s ease' }}>
      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 relative overflow-hidden transition-all duration-500">
        {/* Decorative circles */}
        <div className="absolute top-20 left-10 w-64 h-64 rounded-full opacity-10" style={{ background: `radial-gradient(circle, ${isBusiness ? '#a855f7' : '#3b82f6'}, transparent)`, transition: 'background 0.5s ease' }} />
        <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full opacity-10" style={{ background: `radial-gradient(circle, ${isBusiness ? '#7c3aed' : '#2563eb'}, transparent)`, transition: 'background 0.5s ease' }} />

        <div className="relative text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-6 shadow-2xl transition-all duration-500" style={{ background: isBusiness ? 'linear-gradient(135deg,#7c3aed,#4c1d95)' : 'linear-gradient(135deg,#2563eb,#1d4ed8)' }}>
            {isBusiness ? <Store size={40} className="text-white" /> : <Shield size={40} className="text-white" />}
          </div>
          <h1 className="text-4xl font-extrabold text-white mb-4">
            {isBusiness ? 'Business Portal' : 'Admin Dashboard'}
          </h1>
          <p className="text-gray-300 text-lg max-w-md">
            {isBusiness 
              ? 'Manage your restaurant from anywhere. Track orders in real-time, manage your menu, and grow your business.'
              : 'System administration. Manage users, monitor all businesses, handle claims, and configure platform settings.'}
          </p>

          {isBusiness && (
            <div className="mt-12 grid grid-cols-2 gap-4 max-w-sm mx-auto animate-fade-in">
              {[
                { label: 'Live Orders', value: '🔴 Real-time' },
                { label: 'Kitchen View', value: '🍳 All tables' },
                { label: 'Menu Control', value: '📋 Full CRUD' },
                { label: 'Analytics', value: '📊 Insights' },
              ].map((f) => (
                <div key={f.label} className="bg-white/10 backdrop-blur rounded-xl p-4 text-left">
                  <p className="text-purple-200 text-xs font-medium">{f.label}</p>
                  <p className="text-white font-bold text-sm mt-1">{f.value}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right login panel */}
      <div className="flex-1 flex items-center justify-center p-6 relative">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl shadow-2xl p-8 relative overflow-hidden">
            
            {/* Mobile logo */}
            <div className="lg:hidden text-center mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-3" style={{ background: isBusiness ? 'linear-gradient(135deg,#6C47FF,#4C35B5)' : 'linear-gradient(135deg,#2563eb,#1d4ed8)' }}>
                {isBusiness ? <Store size={26} className="text-white" /> : <Shield size={26} className="text-white" />}
              </div>
              <h2 className="text-2xl font-bold text-gray-900">{isBusiness ? 'Business Portal' : 'Admin Area'}</h2>
            </div>

            <h2 className="hidden lg:block text-2xl font-bold text-gray-900 mb-1">Welcome back</h2>
            <p className="hidden lg:block text-gray-500 text-sm mb-6">Sign in to your account</p>

            {/* Tabs */}
            <div className="flex bg-gray-100 p-1 rounded-xl mb-8 relative">
              <div 
                className="absolute top-1 bottom-1 w-[calc(50%-0.25rem)] bg-white rounded-lg shadow-sm transition-all duration-300 ease-in-out"
                style={{ transform: isBusiness ? 'translateX(0)' : 'translateX(100%)' }}
              />
              <button
                type="button"
                onClick={() => switchTab('business')}
                className={`relative z-10 flex-1 py-2.5 text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 ${isBusiness ? 'text-purple-700' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <Store size={16} /> Business
              </button>
              <button
                type="button"
                onClick={() => switchTab('admin')}
                className={`relative z-10 flex-1 py-2.5 text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 ${!isBusiness ? 'text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <Shield size={16} /> Admin
              </button>
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-5">
                <span className="mt-0.5">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:border-transparent transition"
                    style={{ '--tw-ring-color': isBusiness ? '#7c3aed' : '#2563eb' }}
                    placeholder={isBusiness ? "owner@restaurant.com" : "admin@hashview.com"}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPwd ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl pl-10 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:border-transparent transition"
                    placeholder="••••••••"
                  />
                  <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
                    {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full text-white font-bold py-3.5 px-4 rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2 mt-2 shadow-lg hover:opacity-90"
                style={{ background: isBusiness ? 'linear-gradient(135deg,#6C47FF,#4C35B5)' : 'linear-gradient(135deg,#2563eb,#1d4ed8)' }}
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Signing in...
                  </>
                ) : (isBusiness ? 'Sign In to Business Portal' : 'Sign In as Admin')}
              </button>
            </form>
            
            <p className="mt-6 text-center text-xs text-gray-400">
              HashView v1.0
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
