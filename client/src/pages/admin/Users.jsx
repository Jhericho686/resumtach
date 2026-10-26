import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import {
  UserPlus, Trash2, Shield, User, Mail, Key, Eye, EyeOff,
  Search, RefreshCw, CheckCircle, XCircle, AlertTriangle
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { capitalizeFirstLetter } from '../../utils/formatters';

const ROLES = ['staff', 'admin'];

const RoleBadge = ({ role }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
    role === 'admin'
      ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
      : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
  }`}>
    {role === 'admin' ? <Shield size={10} /> : <User size={10} />}
    {role.charAt(0).toUpperCase() + role.slice(1)}
  </span>
);

const StatusBadge = ({ isActive }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
    isActive
      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
      : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
  }`}>
    {isActive ? <CheckCircle size={10} /> : <XCircle size={10} />}
    {isActive ? 'Active' : 'Inactive'}
  </span>
);

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [statusToggleTarget, setStatusToggleTarget] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [roleFilter, setRoleFilter] = useState('all');

  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', password: '', role: 'staff'
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = { search, limit: 100, staffOnly: true };
      if (roleFilter !== 'all') {
        params.role = roleFilter;
      }
      const res = await api.get('/users', { params });
      setUsers(res.data.users || []);
    } catch (err) {
      toast.error('Failed to load HR staff members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, [search, roleFilter]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.firstName || !form.lastName || !form.email || !form.password) {
      toast.error('All fields are required');
      return;
    }
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    const formattedFirstName = capitalizeFirstLetter(form.firstName.trim());
    const formattedLastName = capitalizeFirstLetter(form.lastName.trim());

    setSubmitting(true);
    try {
      await api.post('/auth/register', {
        ...form,
        firstName: formattedFirstName,
        lastName: formattedLastName
      });
      toast.success(`${formattedFirstName} ${formattedLastName} has been added to the HR team!`);
      setShowModal(false);
      setForm({ firstName: '', lastName: '', email: '', password: '', role: 'staff' });
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/users/${deleteTarget.id}`);
      toast.success(`${deleteTarget.firstName} ${deleteTarget.lastName} has been removed from staff`);
      setDeleteTarget(null);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete user');
    }
  };

  const handleToggleActive = async () => {
    if (!statusToggleTarget) return;
    const u = statusToggleTarget;
    try {
      await api.put(`/users/${u.id}`, {
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        role: u.role,
        isActive: !u.isActive,
      });
      toast.success(`Staff member ${u.firstName} ${u.lastName} has been ${u.isActive ? 'deactivated' : 'activated'}`);
      setStatusToggleTarget(null);
      fetchUsers();
    } catch (err) {
      toast.error('Failed to update staff status');
    }
  };

  return (
    <div className="space-y-6 yann-stagger-1">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Staff Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Manage HR staff members, recruiters, and team access permissions
          </p>
        </div>
        <button
          id="add-staff-btn"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
        >
          <UserPlus size={16} /> Add Staff Member
        </button>
      </div>

      {/* Search + Role Filters + Refresh */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            id="user-search"
            type="text"
            placeholder="Search staff by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-700/50 p-1 rounded-xl">
          {[
            { id: 'all', label: 'All Staff' },
            { id: 'staff', label: 'HR Staff' },
            { id: 'admin', label: 'Admin HR' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setRoleFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                roleFilter === tab.id
                  ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          onClick={fetchUsers}
          className="p-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-500 hover:text-indigo-600 transition-colors self-end sm:self-auto"
          title="Refresh staff list"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <User size={40} className="mb-2 opacity-30" />
            <p>No staff members found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Member</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden sm:table-cell">Email</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Role</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">Status</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">Last Login</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {users.map((u) => {
                  const isSelf = currentUser && (u.id === currentUser.id || u.email === currentUser.email);
                  return (
                    <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                            {u.firstName?.charAt(0)}{u.lastName?.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                              {u.firstName} {u.lastName}
                              {isSelf && (
                                <span className="ml-2 text-xs text-indigo-500 font-normal">(you)</span>
                              )}
                            </p>
                            <p className="text-xs text-gray-400 sm:hidden">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-sm text-gray-600 dark:text-gray-300 hidden sm:table-cell">{u.email}</td>
                      <td className="py-3.5 px-4"><RoleBadge role={u.role} /></td>
                      <td className="py-3.5 px-4 hidden md:table-cell"><StatusBadge isActive={u.isActive} /></td>
                      <td className="py-3.5 px-4 text-xs text-gray-400 dark:text-gray-500 hidden lg:table-cell">
                        {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-end gap-2">
                          {/* Toggle active */}
                          {!isSelf && (
                            <button
                              onClick={() => setStatusToggleTarget(u)}
                              title={u.isActive ? 'Deactivate' : 'Activate'}
                              className={`p-1.5 rounded-lg text-xs transition-colors ${
                                u.isActive
                                  ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                                  : 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                              }`}
                            >
                              {u.isActive ? <XCircle size={16} /> : <CheckCircle size={16} />}
                            </button>
                          )}
                          {/* Delete */}
                          {!isSelf && (
                            <button
                              onClick={() => setDeleteTarget(u)}
                              title="Remove from team"
                              className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Add Staff Member</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Create a new HR team account</p>
              </div>
              <button onClick={() => setShowModal(false)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500">
                <XCircle size={18} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">First Name *</label>
                  <input
                    id="new-user-firstname"
                    type="text"
                    value={form.firstName}
                    onChange={e => setForm(f => ({ ...f, firstName: capitalizeFirstLetter(e.target.value) }))}
                    placeholder="John"
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">Last Name *</label>
                  <input
                    id="new-user-lastname"
                    type="text"
                    value={form.lastName}
                    onChange={e => setForm(f => ({ ...f, lastName: capitalizeFirstLetter(e.target.value) }))}
                    placeholder="Smith"
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">
                  <Mail size={12} className="inline mr-1" /> Email Address *
                </label>
                <input
                  id="new-user-email"
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="john.smith@company.com"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">
                  <Key size={12} className="inline mr-1" /> Password *
                </label>
                <div className="relative">
                  <input
                    id="new-user-password"
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="Min. 6 characters"
                    className="w-full px-3 py-2 pr-10 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                  <button type="button" onClick={() => setShowPassword(p => !p)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">
                  <Shield size={12} className="inline mr-1" /> Role *
                </label>
                <select
                  id="new-user-role"
                  value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  {ROLES.map(r => (
                    <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  Cancel
                </button>
                <button
                  id="submit-create-user"
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  {submitting ? <RefreshCw size={14} className="animate-spin" /> : <UserPlus size={14} />}
                  {submitting ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={24} className="text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Remove Staff Member?</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              This will permanently delete <span className="font-semibold text-gray-800 dark:text-gray-200">{deleteTarget.firstName} {deleteTarget.lastName}</span>'s account. This action cannot be undone.
            </p>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                Cancel
              </button>
              <button
                id="confirm-delete-user"
                onClick={handleDelete}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
                <Trash2 size={14} /> Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deactivate/Activate Confirmation Modal */}
      {statusToggleTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 ${
              statusToggleTarget.isActive
                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
            }`}>
              <AlertTriangle size={24} />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {statusToggleTarget.isActive ? 'Deactivate Account?' : 'Activate Account?'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Are you sure you want to {statusToggleTarget.isActive ? 'deactivate' : 'activate'}{' '}
              <span className="font-semibold text-gray-800 dark:text-gray-200">
                {statusToggleTarget.firstName} {statusToggleTarget.lastName}
              </span>?
              {statusToggleTarget.isActive && ' They will not be able to log in until reactivated.'}
            </p>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setStatusToggleTarget(null)}
                className="flex-1 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                No, Cancel
              </button>
              <button
                id="confirm-toggle-status-user"
                onClick={handleToggleActive}
                className={`flex-1 py-2.5 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
                  statusToggleTarget.isActive
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {statusToggleTarget.isActive ? 'Yes, Deactivate' : 'Yes, Activate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
