import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Building2,
  Star,
  Bell,
  LogOut,
  Menu,
  X,
  Grid,
  Tag,
  FileCheck,
  ShieldCheck,
  ChevronRight,
  BarChart3,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import adminApi from '../api/adminApi';
import useNotifications from '../hooks/useNotifications';
import NotificationBell from './NotificationBell';
import api from '../api/axios';

const ROLE_BADGE = {
  admin:            { label: 'Admin',            className: 'bg-primary-100 text-primary-700 border border-primary-200' },
  BUSINESS_MANAGER: { label: 'Business Manager', className: 'bg-green-100 text-green-700 border border-green-200' },
  VIEWER:           { label: 'Viewer',           className: 'bg-yellow-100 text-yellow-700 border border-yellow-200' },
};

const Layout = ({ children, onLogout }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [backupStatus, setBackupStatus] = useState(null);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const navigate = useNavigate();
  
  const location = useLocation();
  const { user, hasPermission } = useAuth();

  // ── Notification Bell ─────────────────────────────────────────────────────
  const notifs = useNotifications(api);

  useEffect(() => {
    if (hasPermission('VIEW_DASHBOARD')) {
      adminApi.getBackupStatus().then(res => {
        if (res.data?.success) {
          setBackupStatus(res.data);
        }
      }).catch(err => console.error("Failed to load backup status", err));
    }
  }, [hasPermission]);

  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
      const res = await adminApi.triggerBackup();
      if (res.data?.success) {
        setBackupStatus(prev => ({ ...prev, needsBackup: false }));
        alert('Database backup completed successfully!');
      }
    } catch (err) {
      alert('Failed to trigger backup');
      console.error(err);
    } finally {
      setIsBackingUp(false);
    }
  };

  const effectiveRole = user?.adminRole || user?.role || 'admin';
  const badge = ROLE_BADGE[effectiveRole] || ROLE_BADGE.admin;

  // Navigation items — each gated by a permission
  const allNavItems = [
    { name: 'Dashboard',        href: '/',                  icon: LayoutDashboard, permission: 'VIEW_DASHBOARD' },
    { name: 'Categories',       href: '/categories',         icon: Grid,            permission: 'MANAGE_CATEGORIES' },
    { name: 'Users',            href: '/users',              icon: Users,           permission: 'VIEW_USERS' },
    { name: 'Businesses',       href: '/businesses',         icon: Building2,       permission: 'VIEW_BUSINESS' },
    { name: 'Coupons',          href: '/coupons',            icon: Tag,             permission: 'VIEW_COUPONS' },
    { name: 'Reviews',          href: '/reviews',            icon: Star,            permission: 'VIEW_REVIEWS' },
    { name: 'Review Analytics', href: '/reviews/analytics',  icon: BarChart3,       permission: 'VIEW_REVIEWS' },
    { name: 'Business Claims',  href: '/business-claims',   icon: FileCheck,       permission: 'VIEW_CLAIMS' },
    { name: 'Notifications',    href: '/notifications',      icon: Bell,            permission: 'SEND_NOTIFICATIONS' },
    { name: 'Admin Users',      href: '/admin-users',        icon: ShieldCheck,     permission: 'MANAGE_ROLES' },
  ];

  // Only show nav items the user has permission to access
  const navigation = allNavItems.filter(item => hasPermission(item.permission));

  const isActive = (href) => {
    if (href === '/') return location.pathname === '/';
    if (href === '/reviews') return location.pathname === '/reviews';
    return location.pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 shadow-sm flex flex-col transform transition-transform duration-200 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <ShieldCheck size={16} className="text-white" />
            </div>
            <h1 className="text-lg font-bold text-gray-900">HashView</h1>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-400 hover:text-gray-600 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${
                  active
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Icon size={18} />
                <span className="flex-1">{item.name}</span>
                {active && <ChevronRight size={14} className="opacity-60" />}
              </Link>
            );
          })}
        </nav>

        {/* User info + Logout */}
        <div className="p-3 border-t border-gray-200">
          {/* User card */}
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-100 mb-2">
            <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {user?.name?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-gray-900 truncate">{user?.name || 'Admin'}</div>
              <div className="text-xs text-gray-500 truncate">{user?.email || ''}</div>
            </div>
          </div>
          {/* Role badge */}
          <div className="px-1 mb-2">
            <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${badge.className}`}>
              {badge.label}
            </span>
          </div>
          {/* Logout */}
          <button
            onClick={onLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </div>

      {/* ── Main Content ────────────────────────────────────────────────────── */}
      <div className={`transition-all duration-200 ${sidebarOpen ? 'lg:pl-64' : ''}`}>
        {/* Top Bar */}
        <div className="sticky top-0 z-40 flex items-center h-16 px-6 bg-white border-b border-gray-200 shadow-sm">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-gray-500 hover:text-gray-700 transition"
          >
            <Menu size={22} />
          </button>

          <div className="ml-auto flex items-center gap-3">
            <span className={`hidden sm:inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full ${badge.className}`}>
              {badge.label}
            </span>

            {/* Notification Bell */}
            <NotificationBell
              notifications={notifs.notifications}
              unreadCount={notifs.unreadCount}
              loading={notifs.loading}
              open={notifs.open}
              onToggle={notifs.toggleOpen}
              onClose={notifs.closeDropdown}
              onMarkRead={notifs.markAsRead}
              onMarkAllRead={notifs.markAllAsRead}
              onViewAll={() => navigate('/notifications')}
              accentColor="indigo"
            />

            <div className="flex items-center gap-2 text-sm">
              <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs font-bold">
                {user?.name?.charAt(0).toUpperCase() || 'A'}
              </div>
              <span className="hidden sm:block font-medium text-gray-700">{user?.name || 'Admin'}</span>
            </div>
          </div>
        </div>

        {/* Backup Warning Banner */}
        {backupStatus?.needsBackup && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mx-6 mt-6 rounded shadow-sm">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm text-yellow-700">
                  <strong>Warning:</strong> It has been {backupStatus.daysSinceLastBackup !== null ? `${backupStatus.daysSinceLastBackup} days` : 'more than 15 days'} since your last database backup. Regular backups are critical to prevent data loss.
                </p>
                <div className="mt-2">
                  <button
                    onClick={handleBackup}
                    disabled={isBackingUp}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-yellow-700 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50"
                  >
                    {isBackingUp ? (
                      <>
                        <Loader2 className="animate-spin -ml-0.5 mr-2 h-4 w-4" />
                        Backing up...
                      </>
                    ) : (
                      'Backup Now'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Page Content */}
        <main className="p-6 min-h-[calc(100vh-4rem)]">{children}</main>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default Layout;
