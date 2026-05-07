'use client';

/**
 * HashView Auth Context
 * ─────────────────────────────────────────────────────────────────────────────
 * Web equivalent of the mobile app's authSlice.js + Redux store.
 * Provides:
 *   - useAuth() hook for components
 *   - AuthProvider wrapper for the app
 *   - Persists JWT token in localStorage (tokenStorage)
 *   - Subscription / Pro status management (mirrors authSlice subscription fields)
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react';
import ApiService, { tokenStorage } from '@/lib/api';
import type {
  AuthUser,
  LoginCredentials,
  RegisterPayload,
  SubscriptionInfo,
  FreeTrialInfo,
} from '@/lib/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  // Subscription (for business owners — mirrors authSlice)
  isPro: boolean;
  subscriptionEnabled: boolean;
  hasFreeTrial: boolean;
  freeTrial: FreeTrialInfo;
  subscription: SubscriptionInfo;
}

interface AuthContextValue extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  loginAsGuest: () => void;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  updateUser: (updates: Partial<AuthUser>) => void;
  refreshSubscription: () => Promise<void>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const USER_KEY = 'hv_user';
const GUEST_KEY = 'hv_guest';  // sessionStorage — clears on tab close

const defaultFreeTrial: FreeTrialInfo = { updatesUsed: 0, maxFreeUpdates: 25, remaining: 25 };
const defaultSubscription: SubscriptionInfo = {
  status: 'inactive',
  plan: null,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
};

function extractSubscription(user: AuthUser) {
  const u = user as unknown as Record<string, unknown>;
  return {
    isPro: (u.isPro as boolean) ?? false,
    subscriptionEnabled: (u.subscriptionEnabled as boolean) ?? true,
    hasFreeTrial: (u.hasFreeTrial as boolean) ?? false,
    freeTrial: (u.freeTrial as FreeTrialInfo) ?? defaultFreeTrial,
    subscription: (u.subscription as SubscriptionInfo) ?? defaultSubscription,
  };
}

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  loading: true, // start true so we hydrate before render
  error: null,
  isPro: false,
  subscriptionEnabled: true,
  hasFreeTrial: true,
  freeTrial: defaultFreeTrial,
  subscription: defaultSubscription,
};

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(initialState);
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Hydrate from localStorage on mount ──────────────────────────────────────
  useEffect(() => {
    const hydrate = async () => {
      const token = tokenStorage.get();
      const userRaw = typeof window !== 'undefined' ? localStorage.getItem(USER_KEY) : null;

      // Check for guest session first (sessionStorage)
      const guestRaw = typeof window !== 'undefined' ? sessionStorage.getItem(GUEST_KEY) : null;
      if (guestRaw) {
        try {
          const user = JSON.parse(guestRaw) as AuthUser;
          setState((s) => ({ ...s, user, token: 'guest-token', isAuthenticated: true, loading: false }));
        } catch {
          sessionStorage.removeItem(GUEST_KEY);
          setState((s) => ({ ...s, loading: false }));
        }
        return;
      }

      if (!token) {
        setState((s) => ({ ...s, loading: false }));
        return;
      }

      // Optimistic restore from localStorage first (fast)
      if (userRaw) {
        try {
          const user = JSON.parse(userRaw) as AuthUser;
          const sub = user.role === 'business' ? extractSubscription(user) : {};
          setState((s) => ({
            ...s,
            user,
            token,
            isAuthenticated: true,
            loading: true, // still validating with server
            ...sub,
          }));
        } catch {
          // ignore parse error
        }
      }

      // Validate token with server
      try {
        const response = await ApiService.getMe();
        const user = response.user as AuthUser;
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        const sub = user.role === 'business' ? extractSubscription(user) : {};
        setState((s) => ({
          ...s,
          user,
          token,
          isAuthenticated: true,
          loading: false,
          error: null,
          ...sub,
        }));
      } catch {
        // Token invalid — clear
        tokenStorage.remove();
        localStorage.removeItem(USER_KEY);
        setState({ ...initialState, loading: false });
      }
    };

    hydrate();
  }, []);

  // ── Auto-refresh subscription status every 5 min for business owners ────────
  useEffect(() => {
    if (!state.isAuthenticated || state.user?.role !== 'business') return;

    refreshIntervalRef.current = setInterval(async () => {
      try {
        const sub = await ApiService.getSubscriptionStatus();
        setState((s) => ({
          ...s,
          isPro: sub.isPro ?? s.isPro,
          subscriptionEnabled: sub.subscriptionEnabled ?? s.subscriptionEnabled,
          hasFreeTrial: sub.hasFreeTrial ?? s.hasFreeTrial,
          freeTrial: sub.freeTrial ?? s.freeTrial,
          subscription: sub.subscription ?? s.subscription,
        }));
      } catch {
        // silent — subscription refresh failures should not disrupt UX
      }
    }, 5 * 60 * 1000);

    return () => {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    };
  }, [state.isAuthenticated, state.user?.role]);

  // ── login ───────────────────────────────────────────────────────────────────
  const login = useCallback(async (credentials: LoginCredentials) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const response = await ApiService.login(credentials);

      // Role validation (mirrors authSlice login thunk)
      if (
        credentials.role &&
        response.user.role !== 'admin' &&
        response.user.role !== credentials.role
      ) {
        throw new Error(
          `Wrong account type. This is a ${response.user.role} account. Please login from the ${response.user.role} section.`
        );
      }

      if (typeof window !== 'undefined') sessionStorage.removeItem(GUEST_KEY);
      tokenStorage.set(response.token);
      localStorage.setItem(USER_KEY, JSON.stringify(response.user));

      const sub = response.user.role === 'business' ? extractSubscription(response.user) : {};
      setState((s) => ({
        ...s,
        user: response.user,
        token: response.token,
        isAuthenticated: true,
        loading: false,
        error: null,
        ...sub,
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setState((s) => ({ ...s, loading: false, error: message }));
      throw err;
    }
  }, []);

  // ── register ─────────────────────────────────────────────────────────────────
  const register = useCallback(async (payload: RegisterPayload) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const response = await ApiService.register(payload);
      if (typeof window !== 'undefined') sessionStorage.removeItem(GUEST_KEY);
      tokenStorage.set(response.token);
      localStorage.setItem(USER_KEY, JSON.stringify(response.user));
      const sub = response.user.role === 'business' ? extractSubscription(response.user) : {};
      setState((s) => ({
        ...s,
        user: response.user,
        token: response.token,
        isAuthenticated: true,
        loading: false,
        error: null,
        ...sub,
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      setState((s) => ({ ...s, loading: false, error: message }));
      throw err;
    }
  }, []);

  // ── loginAsGuest ──────────────────────────────────────────────────────────
  const loginAsGuest = useCallback(() => {
    const guestUser: AuthUser = {
      _id: 'guest-user-id',
      name: 'Guest User',
      email: 'guest@hashview.app',
      role: 'guest',
      isGuest: true,
      status: 'active',
      emailVerified: false,
      phoneVerified: false,
      createdAt: new Date().toISOString(),
    } as AuthUser;
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(GUEST_KEY, JSON.stringify(guestUser));
    }
    setState((s) => ({
      ...s,
      user: guestUser,
      token: 'guest-token',
      isAuthenticated: true,
      loading: false,
      error: null,
    }));
  }, []);

  // ── logout ───────────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    tokenStorage.remove();
    localStorage.removeItem(USER_KEY);
    if (typeof window !== 'undefined') sessionStorage.removeItem(GUEST_KEY);
    if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    setState({ ...initialState, loading: false });
    window.location.href = '/login';
  }, []);

  // ── clearError ───────────────────────────────────────────────────────────────
  const clearError = useCallback(() => {
    setState((s) => ({ ...s, error: null }));
  }, []);

  // ── updateUser ───────────────────────────────────────────────────────────────
  const updateUser = useCallback((updates: Partial<AuthUser>) => {
    setState((s) => {
      if (!s.user) return s;
      const updated = { ...s.user, ...updates } as AuthUser;
      localStorage.setItem(USER_KEY, JSON.stringify(updated));
      return { ...s, user: updated };
    });
  }, []);

  // ── refreshSubscription ──────────────────────────────────────────────────────
  const refreshSubscription = useCallback(async () => {
    try {
      const sub = await ApiService.getSubscriptionStatus();
      setState((s) => ({
        ...s,
        isPro: sub.isPro ?? s.isPro,
        subscriptionEnabled: sub.subscriptionEnabled ?? s.subscriptionEnabled,
        hasFreeTrial: sub.hasFreeTrial ?? s.hasFreeTrial,
        freeTrial: sub.freeTrial ?? s.freeTrial,
        subscription: sub.subscription ?? s.subscription,
      }));
    } catch {
      // silent
    }
  }, []);

  const value: AuthContextValue = {
    ...state,
    login,
    loginAsGuest,
    register,
    logout,
    clearError,
    updateUser,
    refreshSubscription,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
}

export default AuthContext;
