import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Businesses from './pages/Businesses';
import BusinessDetails from './pages/BusinessDetails';
import CreateBusiness from './pages/CreateBusiness';
import Reviews from './pages/Reviews';
import Notifications from './pages/Notifications';
import Categories from './pages/Categories';
import Coupons from './pages/Coupons';
import TripAdvisor from './pages/TripAdvisor';
import BusinessClaims from './pages/BusinessClaims';
import AdminUsers from './pages/AdminUsers';
import Layout from './components/Layout';

// Inner component that reads from AuthContext (must be inside AuthProvider)
function AppRoutes() {
  const { isAuthenticated, loading, login, logout } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isAuthenticated ? (
            <Navigate to="/" replace />
          ) : (
            <Login onLogin={login} />
          )
        }
      />
      <Route
        path="/*"
        element={
          isAuthenticated ? (
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
                <Route path="/tripadvisor" element={<TripAdvisor />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/business-claims" element={<BusinessClaims />} />
                <Route path="/admin-users" element={<AdminUsers />} />
              </Routes>
            </Layout>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
