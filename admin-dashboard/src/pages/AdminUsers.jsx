import React, { useState, useEffect, useCallback } from 'react';
import {
  UserPlus, Pencil, Trash2, ShieldCheck, ShieldOff,
  Eye, EyeOff, X, Check, Search, Info,
} from 'lucide-react';
import { adminApi } from '../api/adminApi';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';

// ─── Constants ────────────────────────────────────────────────────────────────
const ROLE_OPTIONS = [
  { value: 'admin',            label: 'Admin',            description: 'Full access to everything' },
  { value: 'BUSINESS_MANAGER', label: 'Business Manager', description: 'Create & edit businesses, manage coupons' },
  { value: 'VIEWER',           label: 'Viewer',           description: 'Read-only access' },
];

const PERMISSION_GROUPS = {
  'Dashboard':         ['VIEW_DASHBOARD'],
  'Users':             ['VIEW_USERS', 'CREATE_USER', 'EDIT_USER', 'DELETE_USER'],
  'Businesses':        ['VIEW_BUSINESS', 'CREATE_BUSINESS', 'EDIT_BUSINESS', 'DELETE_BUSINESS'],
  'Content':           ['VIEW_REVIEWS', 'MANAGE_REVIEWS', 'MANAGE_CATEGORIES'],
  'Coupons':           ['VIEW_COUPONS', 'MANAGE_COUPONS'],
  'Claims & Accounts': ['VIEW_CLAIMS', 'MANAGE_CLAIMS', 'SUSPEND_ACCOUNTS'],
  'System':            ['SEND_NOTIFICATIONS', 'MANAGE_ROLES', 'MANAGE_SUBSCRIPTIONS'],
};

const ALL_PERMISSIONS = Object.values(
  Object.fromEntries(
    Object.entries(PERMISSION_GROUPS).flatMap(([, perms]) => perms.map(p => [p, p]))
  )
);

const ROLE_BADGE = {
  admin:            'bg-primary-100 text-primary-700',
  BUSINESS_MANAGER: 'bg-green-100 text-green-700',
  VIEWER:           'bg-yellow-100 text-yellow-700',
};

const ROLE_LABEL = {
  admin: 'Admin',
  BUSINESS_MANAGER: 'Business Manager',
  VIEWER: 'Viewer',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-200">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X size={20} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

// Free checkbox list — no disabled state, fully controlled by admin
const PermissionCheckboxes = ({ selected, onChange }) => {
  const allSelected = ALL_PERMISSIONS.every(p => selected.includes(p));

  const toggleAll = () =>
    allSelected ? onChange([]) : onChange([...ALL_PERMISSIONS]);

  return (
    <div className="space-y-4">
      {/* Bulk actions */}
      <div className="flex items-center gap-3 pb-1">
        <button
          type="button"
          onClick={toggleAll}
          className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition ${
            allSelected
              ? 'bg-primary-50 border-primary-200 text-primary-700 hover:bg-primary-100'
              : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400 hover:text-gray-800'
          }`}
        >
          {allSelected ? 'Clear All' : 'Select All'}
        </button>
        <span className="text-xs text-gray-500">
          {selected.length} / {ALL_PERMISSIONS.length} selected
        </span>
      </div>

      {Object.entries(PERMISSION_GROUPS).map(([group, perms]) => (
        <div key={group}>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{group}</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {perms.map((perm) => {
              const isChecked = selected.includes(perm);
              return (
                <label
                  key={perm}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer border transition ${
                    isChecked
                      ? 'bg-green-50 border-green-200 text-green-800'
                      : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) =>
                      onChange(
                        e.target.checked
                          ? [...selected, perm]
                          : selected.filter((p) => p !== perm)
                      )
                    }
                    className="w-4 h-4 rounded accent-primary-600"
                  />
                  <span className="text-xs font-medium">{perm}</span>
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const AdminUsers = () => {
  const { user: currentUser, hasPermission } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState(null);

  // Modal state
  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState(null);
  const [permModal, setPermModal] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Form state
  const EMPTY_FORM = { name: '', email: '', password: '', adminRole: 'VIEWER', permissions: [] };
  const [form, setForm] = useState(EMPTY_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const usersRes = await adminApi.getAllAdminUsers();
      setUsers(usersRes.data.users || []);
    } catch (err) {
      showToast('Failed to load admin users', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Create User ─────────────────────────────────────────────────────────────
  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      await adminApi.createAdminUser(form);
      showToast(`User "${form.name}" created successfully`);
      setCreateModal(false);
      setForm(EMPTY_FORM);
      fetchData();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Update User ─────────────────────────────────────────────────────────────
  const handleUpdate = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      const payload = { name: form.name, adminRole: form.adminRole };
      if (form.password) payload.password = form.password;
      await adminApi.updateAdminUser(editModal._id, payload);
      showToast('User updated successfully');
      setEditModal(null);
      fetchData();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to update user');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Update Permissions ──────────────────────────────────────────────────────
  const [customPerms, setCustomPerms] = useState([]);
  const openPermModal = (u) => {
    setPermModal(u);
    setCustomPerms(u.permissions || []);
  };
  const handleUpdatePerms = async () => {
    setSubmitting(true);
    try {
      await adminApi.updateUserPermissions(permModal._id, customPerms);
      showToast('Permissions updated successfully');
      setPermModal(null);
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update permissions', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Toggle Status ───────────────────────────────────────────────────────────
  const handleToggleStatus = async (u) => {
    try {
      await adminApi.toggleAdminUserStatus(u._id, !u.isActive);
      showToast(`User ${u.isActive ? 'deactivated' : 'activated'} successfully`);
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update status', 'error');
    }
  };

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    try {
      await adminApi.deleteAdminUser(confirmDelete._id);
      showToast('User deleted successfully');
      setConfirmDelete(null);
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete user', 'error');
    }
  };

  const filtered = users.filter(u =>
    !searchTerm ||
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const canManage = hasPermission('MANAGE_ROLES');

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-xl text-sm font-medium border ${
          toast.type === 'error'
            ? 'bg-red-50 border-red-200 text-red-700'
            : 'bg-green-50 border-green-200 text-green-700'
        }`}>
          {toast.type === 'error' ? '⚠️' : '✅'} {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck size={28} className="text-primary-600" />
            Admin Users
          </h1>
          <p className="text-gray-600 mt-1">Manage roles and permissions for dashboard users</p>
        </div>
        {canManage && (
          <button
            onClick={() => { setForm(EMPTY_FORM); setFormError(''); setCreateModal(true); }}
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition whitespace-nowrap"
          >
            <UserPlus size={18} />
            Create Admin User
          </button>
        )}
      </div>

      {/* Permission notice */}
      {!canManage && (
        <div className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-xl text-sm">
          <Info size={18} className="flex-shrink-0" />
          You can view admin users but don't have permission to manage them.
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name or email..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full sm:w-80 border border-gray-300 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder-gray-400"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <ShieldCheck size={40} className="mx-auto mb-3 opacity-30" />
            <p>No admin users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">User</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Created</th>
                  {canManage && (
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(u => {
                  const isSelf = String(u._id) === String(currentUser?._id);
                  const roleKey = u.adminRole || u.role;
                  return (
                    <tr key={u._id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary-100 border border-primary-200 flex items-center justify-center text-primary-700 font-semibold text-sm flex-shrink-0">
                            {u.name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 text-sm flex items-center gap-2">
                              {u.name}
                              {isSelf && <span className="text-xs text-primary-600 font-normal">(you)</span>}
                            </div>
                            <div className="text-xs text-gray-500">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full ${ROLE_BADGE[roleKey] || ROLE_BADGE.admin}`}>
                          {ROLE_LABEL[roleKey] || roleKey}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                          u.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                          {u.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500">
                        {u.createdAt ? format(new Date(u.createdAt), 'MMM d, yyyy') : '—'}
                      </td>
                      {canManage && (
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => { setForm({ name: u.name, email: u.email, password: '', adminRole: u.adminRole || u.role, permissions: [] }); setFormError(''); setEditModal(u); }}
                              className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition"
                              title="Edit user"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              onClick={() => openPermModal(u)}
                              className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition"
                              title="Manage permissions"
                            >
                              <ShieldCheck size={15} />
                            </button>
                            {!isSelf && (
                              <button
                                onClick={() => handleToggleStatus(u)}
                                className={`p-1.5 rounded-lg transition ${u.isActive ? 'text-gray-500 hover:text-yellow-600 hover:bg-yellow-50' : 'text-gray-500 hover:text-green-600 hover:bg-green-50'}`}
                                title={u.isActive ? 'Deactivate' : 'Activate'}
                              >
                                {u.isActive ? <ShieldOff size={15} /> : <Check size={15} />}
                              </button>
                            )}
                            {!isSelf && (
                              <button
                                onClick={() => setConfirmDelete(u)}
                                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                title="Delete user"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Create Modal ─────────────────────────────────────────────────────── */}
      <Modal isOpen={createModal} onClose={() => setCreateModal(false)} title="Create Admin User">
        <form onSubmit={handleCreate} className="space-y-5">
          {formError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {formError}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name *</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 placeholder-gray-400"
                placeholder="John Doe"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email *</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 placeholder-gray-400"
                placeholder="user@hashview.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Password *</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                className="w-full border border-gray-300 rounded-xl px-4 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 placeholder-gray-400"
                placeholder="Minimum 8 characters"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Role *</label>
            <div className="space-y-2">
              {ROLE_OPTIONS.map(opt => (
                <label key={opt.value} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${form.adminRole === opt.value ? 'bg-primary-50 border-primary-300' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}>
                  <input type="radio" name="adminRole" value={opt.value} checked={form.adminRole === opt.value} onChange={e => setForm({ ...form, adminRole: e.target.value, permissions: [] })} className="mt-0.5 accent-primary-600" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">{opt.label}</div>
                    <div className="text-xs text-gray-500">{opt.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Permissions</label>
              <span className="text-xs text-gray-500">Select exactly what this user can access</span>
            </div>
            <PermissionCheckboxes selected={form.permissions} onChange={perms => setForm({ ...form, permissions: perms })} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setCreateModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition">Cancel</button>
            <button type="submit" disabled={submitting} className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-5 py-2 rounded-xl text-sm font-medium transition disabled:opacity-50">
              {submitting ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <UserPlus size={16} />}
              Create User
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Edit Modal ────────────────────────────────────────────────────────── */}
      <Modal isOpen={!!editModal} onClose={() => setEditModal(null)} title={`Edit: ${editModal?.name}`}>
        <form onSubmit={handleUpdate} className="space-y-5">
          {formError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{formError}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password <span className="text-gray-400 font-normal">(leave blank to keep current)</span></label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                className="w-full border border-gray-300 rounded-xl px-4 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 placeholder-gray-400"
                placeholder="New password..."
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Role</label>
            <div className="space-y-2">
              {ROLE_OPTIONS.map(opt => (
                <label key={opt.value} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${form.adminRole === opt.value ? 'bg-primary-50 border-primary-300' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}>
                  <input type="radio" name="editAdminRole" value={opt.value} checked={form.adminRole === opt.value} onChange={e => setForm({ ...form, adminRole: e.target.value })} className="mt-0.5 accent-primary-600" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">{opt.label}</div>
                    <div className="text-xs text-gray-500">{opt.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setEditModal(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition">Cancel</button>
            <button type="submit" disabled={submitting} className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-5 py-2 rounded-xl text-sm font-medium transition disabled:opacity-50">
              {submitting ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check size={16} />}
              Save Changes
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Permissions Modal ─────────────────────────────────────────────────── */}
      <Modal isOpen={!!permModal} onClose={() => setPermModal(null)} title={`Permissions: ${permModal?.name}`}>
        <div className="space-y-5">
          <p className="text-sm text-gray-600">Select exactly what this user can access.</p>
          <PermissionCheckboxes selected={customPerms} onChange={setCustomPerms} />
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setPermModal(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition">Cancel</button>
            <button onClick={handleUpdatePerms} disabled={submitting} className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-5 py-2 rounded-xl text-sm font-medium transition disabled:opacity-50">
              {submitting ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check size={16} />}
              Save Permissions
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Delete Confirm Modal ──────────────────────────────────────────────── */}
      <Modal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete Admin User">
        <div className="space-y-5">
          <p className="text-gray-600 text-sm">
            Are you sure you want to permanently delete <span className="font-semibold text-gray-900">{confirmDelete?.name}</span>?
            This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition">Cancel</button>
            <button onClick={handleDelete} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-xl text-sm font-medium transition">
              <Trash2 size={15} />
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminUsers;
