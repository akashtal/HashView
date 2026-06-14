import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BusinessAuthProvider, useBusinessAuth } from './context/BusinessAuthContext';

// ── Admin pages ──────────────────────────────────────────────────────────────
import UnifiedLogin from './pages/UnifiedLogin';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Businesses from './pages/Businesses';
import BusinessDetails from './pages/BusinessDetails';
import CreateBusiness from './pages/CreateBusiness';
import Reviews from './pages/Reviews';
import ReviewAnalytics from './pages/ReviewAnalytics';
import Notifications from './pages/Notifications';
import Categories from './pages/Categories';
import Coupons from './pages/Coupons';
import TripAdvisor from './pages/TripAdvisor';
import BusinessClaims from './pages/BusinessClaims';
import AdminUsers from './pages/AdminUsers';
import Layout from './components/Layout';

// ── Business portal pages ─────────────────────────────────────────────────────
// Business login is now handled in UnifiedLogin
import BusinessOverview from './pages/business/BusinessOverview';
import LiveOrders from './pages/business/LiveOrders';
import OrderDetail from './pages/business/OrderDetail';
import KitchenView from './pages/business/KitchenView';
import OrderAnalytics from './pages/business/OrderAnalytics';
import MenuManagement from './pages/business/MenuManagement';
import BusinessReviews from './pages/business/BusinessReviews';
import ManageCoupons from './pages/business/ManageCoupons';
import TaxManagement from './pages/business/TaxManagement';
import ChargeManagement from './pages/business/ChargeManagement';
import BusinessUpdates from './pages/business/BusinessUpdates';
import BusinessSettings from './pages/business/BusinessSettings';
import BusinessLayout from './components/BusinessLayout';

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 text-sm">Loading...</p>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <BusinessAuthProvider>
          <Routes>
            {/* ── Business Portal ── */}
            <Route path="/business/*" element={<BusinessPortalGuard />} />

            {/* ── Admin Dashboard ── */}
            <Route path="/login" element={<UnifiedLoginGuard />} />
            <Route path="/*" element={<AdminGuard />} />
          </Routes>
        </BusinessAuthProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

function UnifiedLoginGuard() {
  const adminAuth = useAuth();
  const bizAuth = useBusinessAuth();
  
  if (adminAuth.loading || bizAuth.loading) return <Spinner />;
  
  // If already logged in, redirect to respective portal
  if (adminAuth.isAuthenticated) return <Navigate to="/" replace />;
  if (bizAuth.isAuthenticated) return <Navigate to="/business" replace />;
  
  return <UnifiedLogin />;
}

function BusinessPortalGuard() {
  const { isAuthenticated, loading } = useBusinessAuth();
  if (loading) return <Spinner />;
  if (!isAuthenticated) return <Navigate to="/business/login" replace />;
  return (
    <BusinessLayout>
      <Routes>
        <Route path="/" element={<BusinessOverview />} />
        <Route path="/orders" element={<LiveOrders />} />
        <Route path="/orders/:id" element={<OrderDetail />} />
        <Route path="/kitchen" element={<KitchenView />} />
        <Route path="/order-analytics" element={<OrderAnalytics />} />
        <Route path="/menu" element={<MenuManagement />} />
        <Route path="/reviews" element={<BusinessReviews />} />
        <Route path="/coupons" element={<ManageCoupons />} />
        <Route path="/tax" element={<TaxManagement />} />
        <Route path="/charges" element={<ChargeManagement />} />
        <Route path="/updates" element={<BusinessUpdates />} />
        <Route path="/settings" element={<BusinessSettings />} />
      </Routes>
    </BusinessLayout>
  );
}

// AdminLoginGuard is now merged into UnifiedLoginGuard

function AdminGuard() {
  const { isAuthenticated, loading, logout } = useAuth();
  if (loading) return <Spinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return (
    <Layout onLogout={logout}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/users" element={<Users />} />
        <Route path="/businesses" element={<Businesses />} />
        <Route path="/businesses/create" element={<CreateBusiness />} />
        <Route path="/businesses/:id" element={<BusinessDetails />} />
        <Route path="/coupons" element={<Coupons />} />
        <Route path="/reviews" element={<Reviews />} />
        <Route path="/reviews/analytics" element={<ReviewAnalytics />} />
        <Route path="/tripadvisor" element={<TripAdvisor />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/business-claims" element={<BusinessClaims />} />
        <Route path="/admin-users" element={<AdminUsers />} />
      </Routes>
    </Layout>
  );
}

export default App;

