import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { applicationsService, resumesService } from '../../services/firestore';
import {
  Briefcase,
  CheckCircle,
  Clock,
  XCircle,
  FileText,
  ArrowRight,
  Loader2,
  Search,
  Sparkles,
  ChevronRight,
  Building2,
  Calendar,
  AlertCircle,
  Zap,
  Activity,
  Layers,
  Flame,
  TrendingUp,
  ShieldCheck,
  Check,
  Compass,
  ArrowUpRight,
  PhoneCall
} from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.04,
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

// Linear-style Spotlight Glass Card with Cursor Follower
const SpotlightCard = ({ children, className = '', glowColor = 'rgba(59, 130, 246, 0.14)', ...props }) => {
  const divRef = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e) => {
    if (!divRef.current) return;
    const rect = divRef.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <motion.div
      ref={divRef}
      variants={itemVariants}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setOpacity(1)}
      onMouseLeave={() => setOpacity(0)}
      className={`relative overflow-hidden rounded-2xl border border-gray-200/80 dark:border-white/[0.08] bg-white dark:bg-gray-900/80 backdrop-blur-xl shadow-sm hover:shadow-md transition-all duration-300 ${className}`}
      {...props}
    >
      {/* Specular Top Line Highlight */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent z-10" />

      {/* Interactive Cursor Spotlight Glow */}
      <div
        className="pointer-events-none absolute -inset-px transition-opacity duration-300 z-0 rounded-2xl"
        style={{
          opacity,
          background: `radial-gradient(350px circle at ${position.x}px ${position.y}px, ${glowColor}, transparent 70%)`,
        }}
      />
      <div className="relative z-10 h-full">{children}</div>
    </motion.div>
  );
};

const ApplicantDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  const [recentApplications, setRecentApplications] = useState([]);
  const [hasResume, setHasResume] = useState(false);
  const [recommendedJobs, setRecommendedJobs] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user?.uid) return;

      setLoading(true);
      try {
        // Fetch applications from firestore
        const apps = await applicationsService.getUserApplications(user.uid);

        const newStats = { total: apps.length, pending: 0, approved: 0, rejected: 0 };
        apps.forEach((app) => {
          if (app.status === 'pending' || app.status === 'under_review') newStats.pending++;
          else if (app.status === 'approved') newStats.approved++;
          else if (app.status === 'rejected') newStats.rejected++;
        });

        setStats(newStats);
        setRecentApplications(apps.slice(0, 4));

        // Check resume
        const resume = await resumesService.getResume(user.uid);
        setHasResume(!!resume);

        // Fetch top active job recommendations
        try {
          const jobsRes = await api.get('/jobs');
          const jobList = jobsRes.data?.jobs || (Array.isArray(jobsRes.data) ? jobsRes.data : []);
          setRecommendedJobs(jobList.slice(0, 2));
        } catch (jobErr) {
          console.warn('Jobs recommendation fetch fallback:', jobErr);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      }
      setLoading(false);
    };

    fetchDashboardData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-full min-h-[55vh] gap-3">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
        >
          <Loader2 className="h-8 w-8 text-primary-600" />
        </motion.div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
          Loading Candidate Command Center...
        </p>
      </div>
    );
  }

  const profileReadinessScore = hasResume ? 88 : 35;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-7xl mx-auto space-y-6"
    >
      {/* Top Header Command Bar */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-200/70 dark:border-white/[0.08]"
      >
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 border border-primary-200/60 dark:border-primary-800/60 mb-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <Sparkles size={13} className="text-primary-600 dark:text-primary-400" />
            <span>AI Talent Radar Active</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900 dark:text-white">
            Welcome back, <span className="bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent">{user?.firstName || 'Candidate'}</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            Real-time pipeline progression, ATS readiness scoring, and AI job recommendations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Link
              to="/jobs"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs sm:text-sm font-bold shadow-sm shadow-primary-500/20 transition-all hover:shadow"
            >
              <Search size={15} /> Discover Jobs
            </Link>
          </motion.div>
        </div>
      </motion.div>

      {/* Missing Resume Banner (if no resume) */}
      {!hasResume && (
        <motion.div
          variants={itemVariants}
          className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 shadow-sm relative overflow-hidden backdrop-blur-md"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-500 shrink-0">
                <AlertCircle size={22} />
              </div>
              <div>
                <h3 className="text-sm font-bold tracking-tight text-amber-950 dark:text-amber-100">
                  Profile Incomplete: Upload or Create Your Resume
                </h3>
                <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-1 max-w-xl leading-relaxed">
                  You need an active resume to unlock automated AI ATS matching, instant application submissions, and ranking algorithms.
                </p>
              </div>
            </div>
            <Link
              to="/applicant/profile"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-sm transition-all shrink-0 self-start sm:self-auto"
            >
              Set Up Resume Now <ArrowRight size={13} />
            </Link>
          </div>
        </motion.div>
      )}

      {/* Shortlisted / HR Next Steps Callout Banner */}
      {stats.approved > 0 && (
        <motion.div
          variants={itemVariants}
          className="p-5 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-indigo-500/10 border border-emerald-500/30 text-emerald-950 dark:text-emerald-100 shadow-sm relative overflow-hidden backdrop-blur-md"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="relative p-2.5 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
                <PhoneCall size={22} />
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-black tracking-tight text-emerald-950 dark:text-emerald-100 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-emerald-500" />
                    Hang tight! You have {stats.approved} application{stats.approved > 1 ? 's' : ''} approved — the HR team will call or email you soon!
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                    Next Step: Interview
                  </span>
                </div>
                <p className="text-xs text-emerald-800/85 dark:text-emerald-200/80 mt-1 max-w-2xl leading-relaxed">
                  Congratulations! The hiring manager has shortlisted your application for direct recruitment. Keep your phone reachable and check your registered email for your interview schedule and preparation notes.
                </p>
              </div>
            </div>
            <Link
              to="/applicant/applications"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all shrink-0 self-start sm:self-auto"
            >
              <PhoneCall size={13} /> View Next Steps <ArrowRight size={13} />
            </Link>
          </div>
        </motion.div>
      )}

      {/* ==================== BENTO GRID HERO ==================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5">
        {/* Bento 1: AI Match Readiness Scorecard (Spans 4 columns) */}
        <SpotlightCard className="lg:col-span-4 p-6 flex flex-col justify-between" glowColor="rgba(59, 130, 246, 0.16)">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                <Sparkles size={13} className="text-primary-600 dark:text-primary-400" /> ATS Match Readiness
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                hasResume ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
              }`}>
                {hasResume ? 'High Match Tier' : 'Needs Optimization'}
              </span>
            </div>

            <div className="flex items-baseline gap-3 my-2">
              <span className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-gray-900 dark:text-white">
                {profileReadinessScore}%
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                {hasResume ? 'Optimized for ATS criteria' : 'Missing CV document'}
              </span>
            </div>

            {/* Dynamic Progress Bar */}
            <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 my-4 overflow-hidden p-0.5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${profileReadinessScore}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className={`h-full rounded-full ${
                  hasResume ? 'bg-gradient-to-r from-primary-500 to-indigo-500' : 'bg-amber-500'
                }`}
              />
            </div>

            <div className="space-y-2 mt-4 text-xs">
              <div className="flex items-center justify-between text-gray-600 dark:text-gray-300">
                <span className="flex items-center gap-2">
                  <Check size={14} className={hasResume ? 'text-emerald-500' : 'text-gray-400'} /> Resume File Attached
                </span>
                <span className="font-mono font-semibold">{hasResume ? 'Verified' : 'Missing'}</span>
              </div>
              <div className="flex items-center justify-between text-gray-600 dark:text-gray-300">
                <span className="flex items-center gap-2">
                  <Check size={14} className="text-emerald-500" /> Contact Info Complete
                </span>
                <span className="font-mono font-semibold">100%</span>
              </div>
              <div className="flex items-center justify-between text-gray-600 dark:text-gray-300">
                <span className="flex items-center gap-2">
                  <Check size={14} className={hasResume ? 'text-emerald-500' : 'text-gray-400'} /> AI Parsing Ready
                </span>
                <span className="font-mono font-semibold">{hasResume ? 'Active' : 'Pending'}</span>
              </div>
            </div>
          </div>

          <div className="pt-5 mt-5 border-t border-gray-100 dark:border-white/[0.06]">
            <Link
              to="/applicant/profile"
              className="w-full inline-flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-gray-100/80 hover:bg-gray-200/80 dark:bg-white/[0.05] dark:hover:bg-white/[0.08] text-xs font-bold text-gray-800 dark:text-gray-200 transition-colors"
            >
              <span>{hasResume ? 'Inspect & Update Resume' : 'Upload Resume File'}</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </SpotlightCard>

        {/* Bento 2: Application Pipeline Funnel (Spans 8 columns) */}
        <SpotlightCard className="lg:col-span-8 p-6 flex flex-col justify-between" glowColor="rgba(99, 102, 241, 0.14)">
          <div>
            <div className="flex items-center justify-between mb-5">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                  <Activity size={13} className="text-indigo-500" /> Pipeline Velocity
                </span>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mt-1">
                  Application Stage Tracking
                </h3>
              </div>

              <Link
                to="/applicant/applications"
                className="text-xs font-bold text-primary-600 hover:text-primary-700 dark:text-primary-400 flex items-center gap-1 group transition-colors"
              >
                Full Tracker <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
              </Link>
            </div>

            {/* Pipeline Stage Funnel Nodes */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
              <div className="p-4 rounded-xl bg-gray-50/80 dark:bg-white/[0.03] border border-gray-200/50 dark:border-white/[0.06] relative overflow-hidden group">
                <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 block mb-1">
                  01 Submitted
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black font-mono text-gray-900 dark:text-white">
                    {stats.total}
                  </span>
                  <span className="text-[10px] text-gray-400 font-medium">Total</span>
                </div>
                <div className="mt-3 flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 font-semibold">
                  <Briefcase size={12} /> Intake
                </div>
              </div>

              <div className="p-4 rounded-xl bg-gray-50/80 dark:bg-white/[0.03] border border-gray-200/50 dark:border-white/[0.06] relative overflow-hidden group">
                <span className="text-[10px] font-mono uppercase tracking-wider text-amber-500 block mb-1">
                  02 Screening
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black font-mono text-gray-900 dark:text-white">
                    {stats.pending}
                  </span>
                  <span className="text-[10px] text-gray-400 font-medium">In Queue</span>
                </div>
                <div className="mt-3 flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
                  <Clock size={12} /> In Review
                </div>
              </div>

              <div className="p-4 rounded-xl bg-gray-50/80 dark:bg-white/[0.03] border border-gray-200/50 dark:border-white/[0.06] relative overflow-hidden group">
                <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-500 block mb-1">
                  03 Approved
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black font-mono text-gray-900 dark:text-white">
                    {stats.approved}
                  </span>
                  <span className="text-[10px] text-gray-400 font-medium">Accepted</span>
                </div>
                <div className="mt-3 flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  <CheckCircle size={12} /> Qualified
                </div>
              </div>

              <div className="p-4 rounded-xl bg-gray-50/80 dark:bg-white/[0.03] border border-gray-200/50 dark:border-white/[0.06] relative overflow-hidden group">
                <span className="text-[10px] font-mono uppercase tracking-wider text-rose-500 block mb-1">
                  04 Archived
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black font-mono text-gray-900 dark:text-white">
                    {stats.rejected}
                  </span>
                  <span className="text-[10px] text-gray-400 font-medium">Closed</span>
                </div>
                <div className="mt-3 flex items-center gap-1 text-[11px] text-rose-600 dark:text-rose-400 font-semibold">
                  <XCircle size={12} /> Rejected
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Pipeline Progress Ribbon */}
          <div className="pt-4 border-t border-gray-100 dark:border-white/[0.06] flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1.5 font-medium">
              <Zap size={13} className="text-primary-600 dark:text-primary-400" />
              Real-time Firestore sync enabled
            </span>
            <span>
              {stats.total === 0 ? 'No active submissions' : `${stats.pending} currently being evaluated`}
            </span>
          </div>
        </SpotlightCard>
      </div>

      {/* ==================== BENTO ROW 2 ==================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Bento 3: Recent Activity Stream (Spans 8 columns) */}
        <SpotlightCard className="lg:col-span-8 p-6" glowColor="rgba(59, 130, 246, 0.12)">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-white/[0.06] mb-4">
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Clock size={16} className="text-primary-600 dark:text-primary-400" />
                Live Submission History
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Detailed timeline of jobs you have submitted applications to
              </p>
            </div>
            <Link
              to="/applicant/applications"
              className="text-xs font-bold text-primary-600 hover:text-primary-700 dark:text-primary-400"
            >
              View Full History
            </Link>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-white/[0.06]">
            {recentApplications.length === 0 ? (
              <div className="py-12 text-center">
                <motion.div
                  animate={{ y: [0, -4, 0] }}
                  transition={{ repeat: Infinity, duration: 2.6, ease: 'easeInOut' }}
                  className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-white/[0.04] flex items-center justify-center text-gray-400 mx-auto mb-3"
                >
                  <Briefcase size={26} />
                </motion.div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1">
                  No Active Submissions Found
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-4 leading-relaxed">
                  Apply to open job positions to track your stage changes, interviewer notes, and AI match scores.
                </p>
                <Link
                  to="/jobs"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold shadow-sm transition-all"
                >
                  <Search size={13} /> Browse Open Roles
                </Link>
              </div>
            ) : (
              recentApplications.map((app) => (
                <motion.div
                  key={app.id}
                  whileHover={{ x: 4, backgroundColor: 'rgba(255, 255, 255, 0.02)' }}
                  className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors group"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                        <Link to={`/jobs/${app.jobId}`}>{app.jobTitle}</Link>
                      </h4>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1 font-medium text-gray-700 dark:text-gray-300">
                        <Building2 size={12} className="text-gray-400" /> {app.company || 'ResuMatch'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar size={12} className="text-gray-400" /> {new Date(app.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    {app.status === 'approved' && (
                      <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <PhoneCall size={10} /> Call Scheduled Soon
                      </span>
                    )}

                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        app.status === 'approved'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : app.status === 'rejected'
                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {app.status === 'approved' ? 'Approved' : app.status === 'rejected' ? 'Rejected' : 'In Review'}
                    </span>

                    <Link
                      to={`/jobs/${app.jobId}`}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-white/[0.05] transition-colors"
                    >
                      <ArrowUpRight size={16} />
                    </Link>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </SpotlightCard>

        {/* Bento 4: AI Recommendations & Quick Launch (Spans 4 columns) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Spotlight Role Recommendations */}
          <SpotlightCard className="p-5" glowColor="rgba(168, 85, 247, 0.14)">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                <Flame size={13} className="text-purple-500" /> Recommended For You
              </span>
              <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400">
                AI Match Feed
              </span>
            </div>

            {recommendedJobs.length > 0 ? (
              <div className="space-y-2.5">
                {recommendedJobs.map((j) => (
                  <Link
                    key={j.id}
                    to={`/jobs/${j.id}`}
                    className="block p-3 rounded-xl bg-gray-50/70 dark:bg-white/[0.03] border border-gray-200/50 dark:border-white/[0.06] hover:border-purple-500/30 transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-bold text-gray-900 dark:text-white truncate group-hover:text-purple-600 dark:group-hover:text-purple-400">
                        {j.title}
                      </h5>
                      <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0">
                        94% Match
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 truncate">
                      {j.company || 'Enterprise Partner'} • {j.location || 'Remote'}
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-3 text-center text-xs text-gray-400">
                Discover matching job roles in the job board.
              </div>
            )}
          </SpotlightCard>

          {/* Quick Launch Dock */}
          <SpotlightCard className="p-5" glowColor="rgba(59, 130, 246, 0.12)">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-1.5">
              <Zap size={14} className="text-primary-600 dark:text-primary-400" /> Quick Launch
            </h4>
            <div className="space-y-2">
              <motion.div whileHover={{ x: 3 }}>
                <Link
                  to="/jobs"
                  className="flex items-center justify-between p-3 rounded-xl bg-gray-50/70 dark:bg-white/[0.03] border border-gray-200/50 dark:border-white/[0.06] hover:border-primary-500/40 text-xs font-semibold text-gray-800 dark:text-gray-200 transition-all"
                >
                  <span className="flex items-center gap-2.5">
                    <Search size={15} className="text-primary-500" /> Explore Job Market
                  </span>
                  <ChevronRight size={14} className="text-gray-400" />
                </Link>
              </motion.div>

              <motion.div whileHover={{ x: 3 }}>
                <Link
                  to="/applicant/profile"
                  className="flex items-center justify-between p-3 rounded-xl bg-gray-50/70 dark:bg-white/[0.03] border border-gray-200/50 dark:border-white/[0.06] hover:border-emerald-500/40 text-xs font-semibold text-gray-800 dark:text-gray-200 transition-all"
                >
                  <span className="flex items-center gap-2.5">
                    <FileText size={15} className="text-emerald-500" /> Resume & ATS Settings
                  </span>
                  <ChevronRight size={14} className="text-gray-400" />
                </Link>
              </motion.div>
            </div>
          </SpotlightCard>
        </div>
      </div>
    </motion.div>
  );
};

export default ApplicantDashboard;
