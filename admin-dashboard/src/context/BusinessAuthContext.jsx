import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const BusinessAuthContext = createContext(null);

// Separate axios instance for business owners — uses 'businessToken'
const businessApi = axios.create({
  baseURL: import.meta.env.PROD && import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/api`
    : '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

businessApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('businessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

businessApi.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('businessToken');
      window.location.href = '/business/login';
    }
    return Promise.reject(err);
  }
);

export { businessApi };

export const BusinessAuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    try {
      const res = await businessApi.get('/auth/me');
      if (res.data.success) {
        const u = res.data.user;  // /auth/me returns { success, user } not { data }
        if (!u || u.role !== 'business') throw new Error('Not a business account');
        setUser(u);
        // Fetch the business linked to this owner — correct route is /business/my/businesses
        try {
          const bRes = await businessApi.get('/business/my/businesses');
          const list = bRes.data.businesses || bRes.data.data || [];
          setBusiness(list[0] || null);
        } catch {
          // Business fetch failed but user is still logged in — set business from user object
          const businesses = u.businesses || [];
          setBusiness(businesses[0] || null);
        }
      }
    } catch {
      setUser(null);
      setBusiness(null);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('businessToken');
    if (token) {
      fetchMe().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [fetchMe]);

  const login = async (token) => {
    localStorage.setItem('businessToken', token);
    await fetchMe();
  };

  const logout = () => {
    localStorage.removeItem('businessToken');
    setUser(null);
    setBusiness(null);
  };

  return (
    <BusinessAuthContext.Provider value={{ user, business, loading, isAuthenticated: !!user, login, logout, refetch: fetchMe }}>
      {children}
    </BusinessAuthContext.Provider>
  );
};

export const useBusinessAuth = () => {
  const ctx = useContext(BusinessAuthContext);
  if (!ctx) throw new Error('useBusinessAuth must be inside BusinessAuthProvider');
  return ctx;
};

export default BusinessAuthContext;
