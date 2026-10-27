import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { applicationsService } from '../../services/firestore';
import {
  Clock,
  Briefcase,
  Search,
  Filter,
  Loader2,
  FileText,
  ChevronRight,
  Building2,
  Calendar,
  CheckCircle2,
  XCircle,
  Activity,
  PhoneCall,
  Sparkles,
  Mail,
  Check,
  AlertCircle,
  ArrowRight
} from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      damping: 24,
      stiffness: 350,
    },
  },
};

const MyApplications = () => {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const fetchApplications = async () => {
      if (!user?.uid) return;
      setLoading(true);
      try {
        const apps = await applicationsService.getUserApplications(user.uid);
        setApplications(apps);
      } catch (error) {
        console.error('Error fetching applications:', error);
      }
      setLoading(false);
    };

    fetchApplications();
  }, [user]);

  const filteredApps = applications.filter((app) => {
    if (filter === 'all') return true;
    if (filter === 'pending') return app.status === 'pending' || app.status === 'under_review';
    return app.status === filter;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
            <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400" />
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60">
            <XCircle size={13} className="text-rose-600 dark:text-rose-400" />
            Rejected
          </span>
        );
      case 'pending':
      case 'under_review':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60">
            <Clock size={13} className="text-amber-600 dark:text-amber-400" />
            In Review
          </span>
        );
    }
  };

  const statusCounts = {
    all: applications.length,
    pending: applications.filter((a) => a.status === 'pending' || a.status === 'under_review').length,
    approved: applications.filter((a) => a.status === 'approved').length,
    rejected: applications.filter((a) => a.status === 'rejected').length,
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-7xl mx-auto space-y-6"
    >
      {/* Header */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-100 dark:border-gray-800"
      >
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 border border-primary-200/60 dark:border-primary-800/60 mb-2">
            <Briefcase size={13} className="text-primary-600 dark:text-primary-400" />
            <span>Application Tracker</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900 dark:text-white">
            My Applications
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Monitor submission status, evaluation stages, and hiring progress.
          </p>
        </div>

        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <Link
            to="/jobs"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs sm:text-sm font-bold shadow-sm shadow-primary-500/20 transition-all hover:shadow"
          >
            <Search size={15} /> Find More Jobs
          </Link>
        </motion.div>
      </motion.div>

      {/* Main Container */}
      <motion.div
        variants={itemVariants}
        className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden"
      >
        {/* Filter Segmented Bar */}
        <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-700/80 bg-gray-50/50 dark:bg-gray-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <Filter size={16} className="text-gray-400 shrink-0 ml-1" />
            <div className="flex gap-1.5 p-1 rounded-xl bg-gray-100/80 dark:bg-gray-700/60 border border-gray-200/50 dark:border-gray-600/50">
              {[
                { id: 'all', label: 'All' },
                { id: 'pending', label: 'In Review' },
                { id: 'approved', label: 'Approved' },
                { id: 'rejected', label: 'Rejected' },
              ].map((tab) => {
                const isActive = filter === tab.id;
                const count = statusCounts[tab.id];

                return (
                  <motion.button
                    key={tab.id}
                    onClick={() => setFilter(tab.id)}
                    whileTap={{ scale: 0.96 }}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer relative ${
                      isActive
                        ? 'bg-white dark:bg-gray-800 text-primary-600 dark:text-primary-400 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono ${
                        isActive
                          ? 'bg-primary-50 dark:bg-primary-950/50 text-primary-600 dark:text-primary-400'
                          : 'bg-gray-200/60 dark:bg-gray-600/60 text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {count}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400 px-1 font-medium">
            Showing <strong className="text-gray-900 dark:text-white">{filteredApps.length}</strong>{' '}
            {filteredApps.length === 1 ? 'application' : 'applications'}
          </div>
        </div>

        {/* List Content */}
        {loading ? (
          <div className="flex flex-col justify-center items-center py-24 gap-3">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
            >
              <Loader2 className="h-8 w-8 text-primary-600" />
            </motion.div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-widest">
              Loading Applications...
            </p>
          </div>
        ) : filteredApps.length === 0 ? (
          <div className="py-20 text-center px-4">
            <motion.div
              animate={{ y: [0, -4, 0] }}
              transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-700/60 mb-4 text-gray-400"
            >
              <FileText size={28} />
            </motion.div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1.5">
              {filter === 'all'
                ? 'No applications submitted yet'
                : `No applications found with status "${filter}"`}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto leading-relaxed">
              {filter === 'all'
                ? "You haven't applied to any job positions yet. Discover open roles and apply directly."
                : 'Try switching to another filter tab to view other applications.'}
            </p>
            {filter !== 'all' ? (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setFilter('all')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-primary-600 hover:text-primary-700 bg-primary-50 dark:bg-primary-950/40 border border-primary-200 dark:border-primary-800/50 transition-colors cursor-pointer"
              >
                Reset Filter
              </motion.button>
            ) : (
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="inline-block">
                <Link
                  to="/jobs"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 shadow-sm transition-all"
                >
                  <Search size={14} /> Browse Jobs
                </Link>
              </motion.div>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
            <AnimatePresence mode="popLayout">
              {filteredApps.map((app) => (
                <motion.div
                  key={app.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                  whileHover={{ x: 4, backgroundColor: 'rgba(255, 255, 255, 0.02)' }}
                  className="p-5 sm:p-6 hover:bg-gray-50/70 dark:hover:bg-gray-700/30 transition-colors group cursor-pointer"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-primary-50 dark:bg-primary-950/50 border border-primary-100 dark:border-primary-900/40 flex items-center justify-center text-primary-600 dark:text-primary-400 shrink-0 mt-0.5 transition-transform group-hover:scale-105">
                        <Briefcase size={22} />
                      </div>

                      <div className="space-y-1.5 flex-1 min-w-0">
                        <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                          <Link to={`/jobs/${app.jobId}`}>{app.jobTitle}</Link>
                        </h3>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-400">
                          <span className="flex items-center gap-1.5 font-medium text-gray-700 dark:text-gray-300">
                            <Building2 size={13} className="text-gray-400" />
                            {app.company || 'ResuMatch Enterprise'}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Calendar size={13} className="text-gray-400" />
                            Applied on {new Date(app.createdAt).toLocaleDateString()}
                          </span>
                          {app.resumeName && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[11px] font-mono">
                              <FileText size={11} /> {app.resumeName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:flex-col md:items-end gap-3 shrink-0">
                      {getStatusBadge(app.status)}

                      <Link
                        to={`/jobs/${app.jobId}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-primary-600 hover:text-primary-700 dark:text-primary-400 transition-colors"
                      >
                        View Job Details{' '}
                        <ChevronRight
                          size={14}
                          className="transition-transform group-hover:translate-x-1"
                        />
                      </Link>
                    </div>
                  </div>

                  {/* Stage Progress & Next Steps Tracker */}
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700/60 space-y-3">
                    {/* Visual 4-Step Stepper */}
                    <div className="hidden sm:flex items-center justify-between text-xs font-medium px-2">
                      {/* Step 1: Submitted */}
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold">
                          <Check size={12} />
                        </div>
                        <span className="text-gray-900 dark:text-gray-200 font-bold">Submitted</span>
                      </div>

                      <div className={`flex-1 h-0.5 mx-3 ${app.status === 'rejected' ? 'bg-gray-200 dark:bg-gray-700' : 'bg-emerald-500/80'}`} />

                      {/* Step 2: HR Screening */}
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          app.status === 'pending' || app.status === 'under_review'
                            ? 'bg-amber-500 text-white ring-4 ring-amber-500/20 animate-pulse'
                            : app.status === 'approved'
                            ? 'bg-emerald-500 text-white'
                            : 'bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                        }`}>
                          {app.status === 'approved' ? <Check size={12} /> : '2'}
                        </div>
                        <span className={app.status === 'pending' || app.status === 'under_review' ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-gray-600 dark:text-gray-400'}>
                          HR Screening
                        </span>
                      </div>

                      <div className={`flex-1 h-0.5 mx-3 ${app.status === 'approved' ? 'bg-emerald-500/80' : 'bg-gray-200 dark:bg-gray-700'}`} />

                      {/* Step 3: Shortlisted */}
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          app.status === 'approved'
                            ? 'bg-emerald-500 text-white ring-4 ring-emerald-500/20'
                            : app.status === 'rejected'
                            ? 'bg-rose-500 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                        }`}>
                          {app.status === 'approved' ? <Check size={12} /> : app.status === 'rejected' ? <XCircle size={12} /> : '3'}
                        </div>
                        <span className={app.status === 'approved' ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-gray-600 dark:text-gray-400'}>
                          Shortlisted
                        </span>
                      </div>

                      <div className={`flex-1 h-0.5 mx-3 ${app.status === 'approved' ? 'bg-emerald-500/80' : 'bg-gray-200 dark:bg-gray-700'}`} />

                      {/* Step 4: HR Interview Call */}
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          app.status === 'approved'
                            ? 'bg-indigo-600 text-white ring-4 ring-indigo-500/30 animate-pulse'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                        }`}>
                          <PhoneCall size={11} />
                        </div>
                        <span className={app.status === 'approved' ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-gray-400'}>
                          HR Call
                        </span>
                      </div>
                    </div>

                    {/* Next Steps Message Banner */}
                    {app.status === 'approved' ? (
                      <div className="p-3.5 sm:p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/5 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                        <div className="flex items-start gap-3">
                          <div className="relative mt-0.5 shrink-0">
                            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                              <PhoneCall size={18} />
                            </div>
                            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                            </span>
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-xs sm:text-sm font-black text-emerald-950 dark:text-emerald-100 flex items-center gap-1.5">
                                <Sparkles size={14} className="text-emerald-500" />
                                Hang tight! The HR team will call or email you soon
                              </h4>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                                Next Step Ready
                              </span>
                            </div>
                            <p className="text-xs text-emerald-800/90 dark:text-emerald-200/80 mt-1 leading-relaxed">
                              Great news! Your qualifications have been accepted by the hiring manager. The HR team is scheduling initial interviews. Please keep your phone reachable and check your registered email inbox regularly.
                            </p>
                          </div>
                        </div>

                        <div className="flex sm:flex-col items-center sm:items-end gap-1 shrink-0 text-[11px] font-mono text-emerald-700 dark:text-emerald-300 bg-white/60 dark:bg-black/20 px-3 py-1.5 rounded-lg border border-emerald-500/20 self-start sm:self-center">
                          <span className="flex items-center gap-1.5 font-bold">
                            <PhoneCall size={12} /> Expected Call Soon
                          </span>
                          <span className="text-[10px] text-gray-500 dark:text-gray-400">
                            Keep line active
                          </span>
                        </div>
                      </div>
                    ) : app.status === 'rejected' ? (
                      <div className="p-3 sm:p-3.5 rounded-xl bg-gray-100/70 dark:bg-gray-800/60 border border-gray-200/60 dark:border-gray-700 flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 flex items-center justify-center shrink-0 mt-0.5">
                          <XCircle size={16} />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-gray-800 dark:text-gray-300">
                            Evaluation Concluded for this Opening
                          </h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                            Thank you for your application. This position has progressed with another candidate, but your profile remains in our talent network for future matching openings.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 sm:p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                            <Clock size={16} />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-amber-950 dark:text-amber-200">
                              HR Screening in Progress
                            </h4>
                            <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-0.5 leading-relaxed">
                              Your resume is currently in the recruitment queue. If your background matches the position requirements, HR will reach out with an interview invitation.
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono text-amber-700 dark:text-amber-400 shrink-0 self-start sm:self-center font-medium bg-amber-500/10 px-2 py-1 rounded-md">
                          Est. 2-4 business days
                        </span>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default MyApplications;
