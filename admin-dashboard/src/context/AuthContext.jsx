import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch the current user's profile + resolved permissions from backend
  const fetchMyPermissions = useCallback(async () => {
    try {
      const res = await api.get('/admin/rbac/me');
      if (res.data.success) {
        setUser(res.data.user);
        setPermissions(res.data.user.effectivePermissions || []);
      }
    } catch {
      // Token may be invalid – clear state
      setUser(null);
      setPermissions([]);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      fetchMyPermissions().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [fetchMyPermissions]);

  /**
   * Called after a successful login.
   * @param {string} token  - JWT token
   * @param {object} userData - Basic user object from login response
   */
  const login = async (token, userData) => {
    localStorage.setItem('adminToken', token);
    // Now fetch full permissions from /rbac/me
    try {
      const res = await api.get('/admin/rbac/me');
      if (res.data.success) {
        setUser(res.data.user);
        setPermissions(res.data.user.effectivePermissions || []);
      } else {
        // Fallback: use the basic login data, assume full admin
        setUser({ ...userData, effectivePermissions: [] });
        setPermissions([]);
      }
    } catch {
      setUser({ ...userData, effectivePermissions: [] });
      setPermissions([]);
    }
  };

  const logout = () => {
    localStorage.removeItem('adminToken');
    setUser(null);
    setPermissions([]);
  };

  /**
   * Check if the current user has a specific permission.
   * Admins without an adminRole (legacy full admins) always return true.
   */
  const hasPermission = useCallback(
    (permission) => {
      if (!user) return false;
      // Legacy admin with no sub-role → full access
      if (user.role === 'admin' && !user.adminRole) return true;
      return permissions.includes(permission);
    },
    [user, permissions]
  );

  /**
   * Check if the user has ALL of the provided permissions.
   */
  const hasAllPermissions = useCallback(
    (perms) => perms.every((p) => hasPermission(p)),
    [hasPermission]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        permissions,
        loading,
        isAuthenticated: !!user,
        login,
        logout,
        hasPermission,
        hasAllPermissions,
        refetchPermissions: fetchMyPermissions,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};

export default AuthContext;
