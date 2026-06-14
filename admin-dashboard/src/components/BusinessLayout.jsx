import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingBag, UtensilsCrossed, BarChart3,
  BookOpen, Star, Tag, Receipt, CreditCard, Megaphone,
  LogOut, Menu, X, ChevronRight, Bell, Store, Settings,
} from 'lucide-react';
import { useBusinessAuth } from '../context/BusinessAuthContext';

const NAV = [
  { name: 'Overview',        href: '/business',                icon: LayoutDashboard },
  { name: 'Live Orders',     href: '/business/orders',         icon: ShoppingBag },
  { name: 'Kitchen View',    href: '/business/kitchen',        icon: UtensilsCrossed },
  { name: 'Order Analytics', href: '/business/order-analytics',icon: BarChart3 },
  { name: 'Menu',            href: '/business/menu',           icon: BookOpen },
  { name: 'Reviews',         href: '/business/reviews',        icon: Star },
  { name: 'Coupons',         href: '/business/coupons',        icon: Tag },
  { name: 'Tax Rules',       href: '/business/tax',            icon: Receipt },
  { name: 'Charges',         href: '/business/charges',        icon: CreditCard },
  { name: 'Updates',         href: '/business/updates',        icon: Megaphone },
  { name: 'Settings',        href: '/business/settings',       icon: Settings },
];

export default function BusinessLayout({ children }) {
  const [open, setOpen] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, business, logout } = useBusinessAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (href) => {
    if (href === '/business') return location.pathname === '/business';
    return location.pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-white border-r border-gray-200 shadow-sm transition-all duration-200 ${open ? 'w-64' : 'w-0 overflow-hidden'}`}>
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-5 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#6C47FF,#4C35B5)' }}>
              <Store size={16} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 leading-none">HashView</p>
              <p className="text-xs text-purple-600 font-semibold">Business Portal</p>
            </div>
          </div>
          <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 lg:hidden">
            <X size={18} />
          </button>
        </div>

        {/* Business info */}
        {business && (
          <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
            <div className="flex items-center gap-2.5 bg-purple-50 rounded-xl px-3 py-2.5">
              <div className="w-9 h-9 rounded-lg bg-purple-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                {business.name?.charAt(0) || 'B'}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{business.name}</p>
                <p className="text-xs text-purple-600 truncate capitalize">{business.status}</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${
                  active
                    ? 'text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
                style={active ? { background: 'linear-gradient(135deg,#6C47FF,#4C35B5)' } : {}}
              >
                <Icon size={18} />
                <span className="flex-1">{item.name}</span>
                {active && <ChevronRight size={14} className="opacity-60" />}
              </Link>
            );
          })}
        </nav>

        {/* User + Logout */}
        <div className="p-3 border-t border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 mb-2">
            <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-sm font-bold">
              {user?.name?.charAt(0)?.toUpperCase() || 'B'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-200 ${open ? 'lg:pl-64' : ''}`}>
        {/* Topbar */}
        <header className="sticky top-0 z-40 flex items-center h-16 px-6 bg-white border-b border-gray-200 shadow-sm flex-shrink-0">
          <button onClick={() => setOpen(!open)} className="text-gray-500 hover:text-gray-700 transition">
            <Menu size={22} />
          </button>
          <div className="ml-4">
            <h2 className="text-sm font-semibold text-gray-700">
              {NAV.find(n => isActive(n.href))?.name || 'Business Portal'}
            </h2>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 bg-purple-50 border border-purple-200 rounded-full px-3 py-1">
              <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
              <span className="text-xs font-semibold text-purple-700">Live</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs font-bold">
              {user?.name?.charAt(0)?.toUpperCase() || 'B'}
            </div>
          </div>
        </header>

        <main className="flex-1 p-6">{children}</main>
      </div>

      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setOpen(false)} />
      )}
    </div>
  );
}
