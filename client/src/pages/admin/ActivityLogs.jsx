import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Activity, User, ChevronLeft, ChevronRight, Search, Filter, AlertCircle, RefreshCw, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';

const actionColors = {
  'User Login': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  'Resume Uploaded': 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  'Applicant Approved': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  'Applicant Rejected': 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  'Applicant Rescored': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  'Applicant Under Review': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  'Applicant Status Reset': 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  'Job Created': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  'Job Updated': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  'Job Deleted': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  'Job Archived': 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
  'User Created': 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  'User Updated': 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
  'User Deleted': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  'Password Reset': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  'Score Overridden': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
};

export default function ActivityLogs() {
  const { logout } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});

  const fetchLogs = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await api.get('/activity-logs', { 
        params: { 
          search, 
          role: roleFilter || undefined,
          page, 
          limit: 20 
        } 
      });
      setLogs(res.data.logs || []);
      setPagination(res.data.pagination || {});
    } catch (e) {
      console.error('Failed to load activity logs', e);
      const isAuth = e.response?.status === 401;
      const msg = isAuth 
        ? 'Your session has expired or is unauthorized. Please sign out and sign in again.'
        : (e.response?.data?.message || 'Failed to load activity logs from server.');
      setFetchError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, [search, roleFilter, page]);

  return (
    <div className="space-y-6 yann-stagger-1">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Activity Logs</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Audit trail of actions performed by Admin and Staff</p>
        </div>

        {/* Role Filters */}
        <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl self-start sm:self-auto border border-gray-200 dark:border-gray-700">
          <button
            onClick={() => { setRoleFilter(''); setPage(1); }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              roleFilter === ''
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-xs'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900'
            }`}
          >
            All Activity
          </button>
          <button
            onClick={() => { setRoleFilter('staff'); setPage(1); }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              roleFilter === 'staff'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900'
            }`}
          >
            Staff Actions
          </button>
          <button
            onClick={() => { setRoleFilter('admin'); setPage(1); }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              roleFilter === 'admin'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900'
            }`}
          >
            Admin Actions
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by user, action, applicant name..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 shadow-2xs"
        />
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        ) : fetchError ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center mb-3">
              <AlertCircle size={24} />
            </div>
            <p className="text-base font-semibold text-gray-900 dark:text-white mb-1">Failed to load activity logs</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mb-4">{fetchError}</p>
            <div className="flex gap-3">
              <button
                onClick={fetchLogs}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <RefreshCw size={15} />
                Retry
              </button>
              {fetchError.toLowerCase().includes('session') && (
                <button
                  onClick={logout}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
                >
                  <LogOut size={15} />
                  Sign In Again
                </button>
              )}
            </div>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <Activity size={40} className="mb-2 opacity-30" />
            <p>No activity logs found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">User & Role</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Action & Details</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Entity</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">IP Address</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                  {logs.map(log => (
                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                            log.userRole === 'admin'
                              ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                              : log.userRole === 'staff'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                          }`}>
                            {log.user?.charAt(0) || 'S'}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">{log.user || 'System'}</span>
                              {log.userRole && (
                                <span className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded ${
                                  log.userRole === 'admin'
                                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                                    : log.userRole === 'staff'
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                                }`}>
                                  {log.userRole}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${actionColors[log.action] || 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>
                            {log.action}
                          </span>
                          {log.details?.name && (
                            <span className="text-xs text-gray-600 dark:text-gray-300">
                              Applicant: <span className="font-medium text-gray-900 dark:text-white">{log.details.name}</span>
                              {log.details.score != null ? ` (${Math.round(log.details.score)}%)` : ''}
                            </span>
                          )}
                          {log.details?.title && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              Job: <span className="font-medium text-gray-700 dark:text-gray-300">{log.details.title}</span>
                            </span>
                          )}
                          {log.details?.email && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              Target: <span className="font-medium text-gray-700 dark:text-gray-300">{log.details.email}</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-gray-500 dark:text-gray-400 hidden md:table-cell">
                        {log.entityType && <span className="capitalize">{log.entityType}</span>}
                        {log.entityId && <span className="text-gray-300 dark:text-gray-600"> #{log.entityId}</span>}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-gray-400 dark:text-gray-500 font-mono hidden lg:table-cell">
                        {log.ipAddress || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Page {pagination.page} of {pagination.totalPages} · {pagination.total} total
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <ChevronLeft size={14} />
                  </button>
                  <button onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={page === pagination.totalPages}
                    className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
