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
  Activity
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
