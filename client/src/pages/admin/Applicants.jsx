import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import { Search, Filter, Download, Eye, Check, X, Mail, ArrowUpDown, Briefcase, ChevronDown } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

// Custom Filter Dropdown to completely avoid native OS browser styling inconsistencies in dark mode
const FilterDropdown = ({ icon: Icon, value, onChange, options, id }) => {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const currentOption = options.find(o => String(o.value) === String(value)) || options[0];

  return (
    <div className="relative inline-block text-left" ref={dropdownRef} id={id}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 px-3 py-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500/30"
      >
        {Icon && <Icon size={15} className="text-gray-400 flex-shrink-0" />}
        <span className="max-w-[180px] truncate">{currentOption?.label || 'Select'}</span>
        <ChevronDown size={14} className={`text-gray-400 transition-transform duration-150 flex-shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 sm:left-0 mt-1.5 w-64 max-h-72 overflow-y-auto rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl z-50 py-1 divide-y divide-gray-100 dark:divide-gray-700/60">
          {options.map((opt) => {
            const isSelected = String(opt.value) === String(value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`w-full text-left px-3.5 py-2.5 text-sm flex items-center justify-between transition-colors ${
                  isSelected
                    ? 'bg-primary-50 dark:bg-primary-900/40 text-primary-600 dark:text-primary-300 font-semibold'
                    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/80'
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && <Check size={14} className="text-primary-600 dark:text-primary-400 flex-shrink-0 ml-2" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Email Helpers ────────────────────────────────────────────────────────────
const openGmailApproval = (applicant) => {
  const name = `${applicant.firstName} ${applicant.lastName}`;
  const position = applicant.jobTitle || 'the position';
  const subject = encodeURIComponent(`Congratulations! Your Application for ${position} – Next Steps`);
  const body = encodeURIComponent(
    `Dear ${name},

We are pleased to inform you that after reviewing your application and resume, you have been selected to move forward in our hiring process for the position of ${position}.

Your qualifications and experience stood out among many applicants, and we are excited to learn more about you.

Our HR team will be reaching out shortly to schedule an interview. In the meantime, please feel free to reply to this email if you have any questions.

We look forward to speaking with you!

Best regards,
HR Recruitment Team`
  );
  window.open(`https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(applicant.email)}&su=${subject}&body=${body}`, '_blank');
};

const openGmailRejection = (applicant) => {
  const name = `${applicant.firstName} ${applicant.lastName}`;
  const position = applicant.jobTitle || 'the position';
  const subject = encodeURIComponent(`Your Application for ${position} – Update`);
  const body = encodeURIComponent(
    `Dear ${name},

Thank you for taking the time to apply for the ${position} position and for your interest in joining our team.

After careful consideration of all applications received, we regret to inform you that we will not be moving forward with your application at this time. This was a difficult decision, as we received many qualified applications.

We encourage you to apply for future openings that match your skills and experience. We will keep your profile on file for upcoming opportunities.

We wish you the very best in your job search and future endeavors.

Kind regards,
HR Recruitment Team`
  );
  window.open(`https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(applicant.email)}&su=${subject}&body=${body}`, '_blank');
};

const Applicants = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [applicants, setApplicants] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const normalizeStatus = (status) => {
    if (!status) return 'all';
    const s = String(status).toLowerCase();
    if (s === 'under_review') return 'pending';
    return s;
  };

  const [statusFilter, setStatusFilter] = useState(() => normalizeStatus(searchParams.get('status')));
  const [jobFilter, setJobFilter] = useState(searchParams.get('jobId') || searchParams.get('job') || 'all');
  const [sortBy, setSortBy] = useState('date');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  useEffect(() => {
    const statusParam = searchParams.get('status');
    if (statusParam) {
      setStatusFilter(normalizeStatus(statusParam));
    }
    const jobParam = searchParams.get('jobId') || searchParams.get('job');
    if (jobParam) {
      setJobFilter(jobParam);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchApplicants();
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const response = await api.get('/jobs');
      setJobs(response.data.jobs || []);
    } catch (e) {
      console.warn('Backend API getJobs warning:', e.message);
    }
  };

  const fetchApplicants = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const response = await api.get('/applicants', { params: { limit: 1000 } });
      setApplicants(response.data.applicants || []);
    } catch (error) {
      console.error('Failed to fetch applicants', error);
      const isAuthError = error.response?.status === 401;
      const msg = isAuthError 
        ? 'Session expired or unauthorized. Please sign out and sign in again.'
        : (error.response?.data?.message || 'Failed to load applicants from server.');
      setFetchError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const filteredApplicants = applicants
    .filter(app => {
      const searchLower = (searchTerm || '').toLowerCase();
      const firstName = (app.firstName || '').toLowerCase();
      const lastName = (app.lastName || '').toLowerCase();
      const email = (app.email || '').toLowerCase();
      const jobTitle = (app.jobTitle || '').toLowerCase();
      const department = (app.department || '').toLowerCase();

      const matchesSearch =
        firstName.includes(searchLower) ||
        lastName.includes(searchLower) ||
        email.includes(searchLower) ||
        jobTitle.includes(searchLower) ||
        department.includes(searchLower);

      const appStatus = (app.status || '').toLowerCase();
      const currentStatusFilter = (statusFilter || '').toLowerCase();
      const matchesStatus =
        currentStatusFilter === 'all' ||
        (currentStatusFilter === 'pending' || currentStatusFilter === 'under_review'
          ? (appStatus === 'pending' || appStatus === 'under_review')
          : appStatus === currentStatusFilter);
      const matchesJob = jobFilter === 'all' || String(app.jobId) === String(jobFilter);
      return matchesSearch && matchesStatus && matchesJob;
    })
    .sort((a, b) => {
      if (sortBy === 'alphabet') {
        const nameA = `${a.firstName || ''} ${a.lastName || ''}`.toLowerCase();
        const nameB = `${b.firstName || ''} ${b.lastName || ''}`.toLowerCase();
        return nameA.localeCompare(nameB);
      }
      if (sortBy === 'rank') {
        return (b.overallScore || 0) - (a.overallScore || 0);
      }
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

  const totalPages = Math.max(1, Math.ceil(filteredApplicants.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedApplicants = filteredApplicants.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  // Reset to page 1 whenever filters/sort change
  const handleSearchChange = (val) => { setSearchTerm(val); setCurrentPage(1); };
  const handleStatusChange = (val) => { 
    setStatusFilter(val); 
    setCurrentPage(1); 
    const newParams = new URLSearchParams(searchParams);
    if (val === 'all') newParams.delete('status');
    else newParams.set('status', val);
    setSearchParams(newParams);
  };
  const handleJobFilterChange = (val) => {
    setJobFilter(val);
    setCurrentPage(1);
    const newParams = new URLSearchParams(searchParams);
    if (val === 'all') newParams.delete('jobId');
    else newParams.set('jobId', val);
    setSearchParams(newParams);
  };
  const handleSortChange  = (val) => { setSortBy(val);      setCurrentPage(1); };

  const getPageNumbers = () => {
    const pages = [];
    const delta = 2;
    for (let i = Math.max(1, safePage - delta); i <= Math.min(totalPages, safePage + delta); i++) {
      pages.push(i);
    }
    return pages;
  };

  const handleExport = () => {
    if (filteredApplicants.length === 0) {
      toast.error('No applicants to export');
      return;
    }
    
    const headers = ['First Name', 'Last Name', 'Email', 'Position', 'Date Applied', 'Score', 'Status'];
    const csvContent = [
      headers.join(','),
      ...filteredApplicants.map(app => 
        [
          `"${app.firstName || ''}"`, 
          `"${app.lastName || ''}"`, 
          `"${app.email || ''}"`, 
          `"${app.jobTitle || ''}"`, 
          `"${app.createdAt ? new Date(app.createdAt).toLocaleDateString('en-US') : ''}"`, 
          `"${app.overallScore || 0}"`, 
          `"${app.status}"`
        ].join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'applicants_export.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Export downloaded successfully!');
  };

  const handleApprove = async (app) => {
    try {
      await api.patch(`/applicants/${app.id}/status`, { status: 'approved' });
      setApplicants(applicants.map(a => a.id === app.id ? { ...a, status: 'approved' } : a));
      toast.success(`${app.firstName} ${app.lastName} approved!`);
      openGmailApproval(app);
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleReject = async (app) => {
    try {
      await api.patch(`/applicants/${app.id}/status`, { status: 'rejected' });
      setApplicants(applicants.map(a => a.id === app.id ? { ...a, status: 'rejected' } : a));
      toast.success(`${app.firstName} ${app.lastName} rejected.`);
      openGmailRejection(app);
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      under_review: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
    };
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${styles[status]}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  const getScoreColor = (score) => {
    if (!score) return 'text-gray-500';
    if (score >= 80) return 'text-emerald-600 dark:text-emerald-400 font-bold';
    if (score >= 60) return 'text-green-600 dark:text-green-400 font-medium';
    if (score >= 50) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className="space-y-6 yann-stagger-1">
      <div className="flex justify-between items-center yann-stagger-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Applicants</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Review and manage candidate applications.</p>
        </div>
      </div>

      <div className="card yann-stagger-2">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-between gap-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="input-field pl-10 px-3 py-2 border w-full max-w-md rounded-md"
              placeholder="Search by name, email, or position..."
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {/* Job / Work Position Filter */}
            <FilterDropdown
              id="job-filter-select"
              icon={Briefcase}
              value={jobFilter}
              onChange={handleJobFilterChange}
              options={[
                { value: 'all', label: 'All Jobs / Positions' },
                ...jobs.map(j => ({
                  value: j.id,
                  label: `${j.title}${j.department ? ` (${j.department})` : ''}`
                }))
              ]}
            />

            {/* Status Filter */}
            <FilterDropdown
              id="status-filter-select"
              icon={Filter}
              value={statusFilter}
              onChange={handleStatusChange}
              options={[
                { value: 'all', label: 'All Statuses' },
                { value: 'pending', label: 'In Review / Pending' },
                { value: 'approved', label: 'Approved' },
                { value: 'rejected', label: 'Rejected' }
              ]}
            />

            {/* Sort By Dropdown */}
            <FilterDropdown
              id="sort-by-select"
              icon={ArrowUpDown}
              value={sortBy}
              onChange={handleSortChange}
              options={[
                { value: 'date', label: 'Date (Newest)' },
                { value: 'alphabet', label: 'Alphabet (A–Z)' },
                { value: 'rank', label: 'Rank (AI Score)' }
              ]}
            />

            <button onClick={handleExport} className="btn btn-secondary flex items-center gap-2 border bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 px-3 py-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm">
              <Download size={16} />
              <span>Export</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto yann-stagger-3">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Candidate</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Applied Position</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date Applied</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">AI Score</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                      <span>Loading applicants...</span>
                    </div>
                  </td>
                </tr>
              ) : fetchError ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center">
                    <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-3">{fetchError}</p>
                    <button 
                      onClick={fetchApplicants}
                      className="btn btn-primary text-xs px-4 py-2"
                    >
                      Retry Loading
                    </button>
                  </td>
                </tr>
              ) : paginatedApplicants.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    No applicants found matching your criteria.
                  </td>
                </tr>
              ) : (
                paginatedApplicants.map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold dark:bg-primary-900 dark:text-primary-300">
                            {(app.firstName || '?').charAt(0)}{(app.lastName || '').charAt(0)}
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            <Link to={`/admin/applicants/${app.id}`} className="hover:underline">{app.firstName} {app.lastName}</Link>
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{app.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white font-medium">{app.jobTitle}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{app.department}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {app.createdAt ? new Date(app.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex flex-col items-center justify-center">
                        <span className={`text-lg font-bold ${getScoreColor(app.overallScore)}`}>
                          {app.overallScore != null ? `${app.overallScore}%` : 'N/A'}
                        </span>
                        {app.isOverridden && (
                          <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300 dark:border-amber-700 px-1.5 py-0.5 rounded-full mt-0.5 inline-block" title="Score manually adjusted by HR">
                            HR Override
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(app.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        {/* View */}
                        <Link
                          to={`/admin/applicants/${app.id}`}
                          className="text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 p-1 bg-gray-100 dark:bg-gray-700 rounded transition-colors"
                          title="View Details"
                        >
                          <Eye size={18} />
                        </Link>

                        {/* Approve → opens Gmail with approval email */}
                        {app.status !== 'approved' && (
                          <button
                            onClick={() => handleApprove(app)}
                            className="flex items-center gap-1 px-2 py-1 bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:hover:bg-green-900/50 text-green-700 dark:text-green-400 rounded transition-colors text-xs font-semibold"
                            title={`Approve & email ${app.email}`}
                          >
                            <Check size={14} />
                            <Mail size={12} />
                          </button>
                        )}

                        {/* Reject → opens Gmail with rejection email */}
                        {app.status !== 'rejected' && (
                          <button
                            onClick={() => handleReject(app)}
                            className="flex items-center gap-1 px-2 py-1 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 rounded transition-colors text-xs font-semibold"
                            title={`Reject & email ${app.email}`}
                          >
                            <X size={14} />
                            <Mail size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {!loading && filteredApplicants.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Showing <span className="font-semibold text-gray-700 dark:text-gray-200">{(safePage - 1) * PAGE_SIZE + 1}</span>–<span className="font-semibold text-gray-700 dark:text-gray-200">{Math.min(safePage * PAGE_SIZE, filteredApplicants.length)}</span> of <span className="font-semibold text-gray-700 dark:text-gray-200">{filteredApplicants.length}</span> applicants
            </p>
            <div className="flex items-center gap-1">
              {/* Previous */}
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="px-3 py-1.5 text-sm rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ← Prev
              </button>

              {/* First page + ellipsis */}
              {safePage > 3 && (
                <>
                  <button onClick={() => setCurrentPage(1)} className="px-3 py-1.5 text-sm rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">1</button>
                  {safePage > 4 && <span className="px-1 text-gray-400">…</span>}
                </>
              )}

              {/* Page number buttons */}
              {getPageNumbers().map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                    page === safePage
                      ? 'bg-primary-600 border-primary-600 text-white font-semibold shadow'
                      : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {page}
                </button>
              ))}

              {/* Last page + ellipsis */}
              {safePage < totalPages - 2 && (
                <>
                  {safePage < totalPages - 3 && <span className="px-1 text-gray-400">…</span>}
                  <button onClick={() => setCurrentPage(totalPages)} className="px-3 py-1.5 text-sm rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">{totalPages}</button>
                </>
              )}

              {/* Next */}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="px-3 py-1.5 text-sm rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Applicants;


