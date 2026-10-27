import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { usersService, resumesService } from '../../services/firestore';
import { openResumeUrl } from '../../services/storage';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  FileText,
  Upload,
  Edit2,
  Loader2,
  Save,
  X,
  ExternalLink,
  CheckCircle,
  Plus,
  Award,
  Tag,
  Eye,
  Sparkles,
  ShieldCheck,
  Check,
  Zap,
  Clock,
  ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';

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

// Linear-Style Spotlight Glass Card
const SpotlightCard = ({ children, className = '', glowColor = 'rgba(59, 130, 246, 0.12)', ...props }) => {
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
      {/* Specular Top Line */}
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

/* ── Edit Skills Modal (with Framer Motion) ── */
const EditSkillsModal = ({ initialSkills = [], onSave, onClose }) => {
  const [skills, setSkills] = useState([...initialSkills]);
  const [input, setInput] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const addSkill = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    if (skills.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      toast.warning('Skill already added');
      return;
    }
    setSkills((prev) => [...prev, trimmed]);
    setInput('');
    inputRef.current?.focus();
  };

  const removeSkill = (skill) => {
    setSkills((prev) => prev.filter((s) => s !== skill));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSkill();
    }
    if (e.key === 'Escape') onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-white/[0.1] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700/80 bg-gray-50/50 dark:bg-gray-800/60">
          <div className="flex items-center gap-2">
            <Award size={18} className="text-primary-600 dark:text-primary-400" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Edit Skills Matrix</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
              Add New Competency or Skill
            </label>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g. React, TypeScript, Product Design"
                className="flex-1 px-3.5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 dark:text-white text-sm outline-none transition"
              />
              <button
                type="button"
                onClick={addSkill}
                className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                Add
              </button>
            </div>
            <p className="text-[11px] text-gray-400 mt-1">Press Enter or click Add to append to list</p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-2">
              Active Skills ({skills.length})
            </label>
            {skills.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-500 italic py-2">
                No skills configured yet. Add competencies to boost ATS matching score.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1">
                {skills.map((skill, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary-50 dark:bg-primary-950/60 border border-primary-200 dark:border-primary-800 text-primary-800 dark:text-primary-300 rounded-lg text-xs font-semibold"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeSkill(skill)}
                      className="hover:text-red-500 transition-colors ml-0.5 cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-relaxed bg-gray-50 dark:bg-white/[0.02] p-3 rounded-xl border border-gray-100 dark:border-white/[0.05]">
            💡 Professional Tip: Adding 5+ industry-recognized skills significantly boosts your automated AI match score across active job postings.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 p-4 border-t border-gray-100 dark:border-gray-700/80 bg-gray-50/50 dark:bg-gray-800/60">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(skills)}
            className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            Save Skills Matrix
          </button>
        </div>
      </motion.div>
    </div>
  );
};

/* ── Main ApplicantProfile Component ── */
const ApplicantProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [resume, setResume] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingSkills, setSavingSkills] = useState(false);
  const [showSkillsModal, setShowSkillsModal] = useState(false);

  // Edit mode states
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    location: '',
    title: '',
    summary: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.uid) return;
      try {
        let userData = null;
        let resumeData = null;

        try {
          userData = await usersService.getUser(user.uid);
        } catch (e) {
          console.warn('Could not fetch user document:', e.message);
        }

        try {
          resumeData = await resumesService.getResume(user.uid);
        } catch (e) {
          console.warn('Could not fetch resume document:', e.message);
        }

        const fallbackName = user.displayName || user.email?.split('@')[0] || '';
        const nameParts = fallbackName.split(' ');

        let safeSkills = [];
        if (Array.isArray(userData?.skills)) {
          safeSkills = userData.skills;
        } else if (typeof userData?.skills === 'string') {
          try {
            safeSkills = JSON.parse(userData.skills);
          } catch (_) {
            safeSkills = userData.skills ? [userData.skills] : [];
          }
        }

        const rawFirst = userData?.firstName || userData?.first_name || user.firstName || '';
        const cleanFirst =
          rawFirst && !rawFirst.includes('@')
            ? rawFirst
            : user.firstName && !user.firstName.includes('@')
            ? user.firstName
            : nameParts[0] && !nameParts[0].includes('@')
            ? nameParts[0]
            : 'Candidate';
        const cleanLast =
          userData?.lastName !== undefined && userData?.lastName !== null && userData?.lastName !== ''
            ? userData.lastName
            : userData?.last_name !== undefined && userData?.last_name !== null && userData?.last_name !== ''
            ? userData.last_name
            : user.lastName || nameParts.slice(1).join(' ') || '';

        const mergedUser = {
          firstName: cleanFirst,
          lastName: cleanLast,
          phone: userData?.phone || user.phone || '',
          location: userData?.location || user.location || '',
          title: userData?.title || user.title || '',
          summary: userData?.summary || user.summary || '',
          email: userData?.email || user.email || '',
          skills: safeSkills,
        };

        setProfile(mergedUser);
        setEditForm({
          firstName: mergedUser.firstName,
          lastName: mergedUser.lastName,
          phone: mergedUser.phone,
          location: mergedUser.location,
          title: mergedUser.title,
          summary: mergedUser.summary,
        });
        setResume(resumeData);
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await usersService.updateUser(user.uid, editForm);
      setProfile((prev) => ({ ...prev, ...editForm }));
      setIsEditing(false);
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    }
    setSaving(false);
  };

  const handleSaveSkills = async (newSkills) => {
    setSavingSkills(true);
    try {
      await usersService.updateUser(user.uid, { skills: newSkills });
      setProfile((prev) => ({ ...prev, skills: newSkills }));
      setShowSkillsModal(false);
      toast.success('Skills updated successfully');
    } catch (error) {
      console.error('Error updating skills:', error);
      toast.error('Failed to save skills');
    }
    setSavingSkills(false);
  };

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
          Loading Candidate Dossier...
        </p>
      </div>
    );
  }

  // Calculate profile completeness score
  let completenessScore = 30; // base account
  if (profile?.firstName && profile?.lastName) completenessScore += 20;
  if (profile?.title) completenessScore += 15;
  if (profile?.phone && profile?.location) completenessScore += 15;
  if (profile?.summary) completenessScore += 10;
  if (profile?.skills?.length >= 3) completenessScore += 10;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-6xl mx-auto space-y-6 animate-page-enter"
    >
      {/* Top Header */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-200/70 dark:border-white/[0.08]"
      >
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 border border-primary-200/60 dark:border-primary-800/60 mb-2">
            <User size={13} className="text-primary-600 dark:text-primary-400" />
            <span>Candidate Identity Profile</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900 dark:text-white">
            My Profile & Credentials
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage your personal contact details, verified skills matrix, and attached resume blueprint.
          </p>
        </div>

        {!isEditing && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200/80 dark:border-white/[0.1] rounded-xl text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/[0.05] transition-all shadow-sm cursor-pointer"
          >
            <Edit2 size={15} /> Edit Profile Details
          </motion.button>
        )}
      </motion.div>

      {/* Main Grid: Left Column (Personal Info + Skills) & Right Column (Resume Deck) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Identity Spotlight Hero Card */}
          <SpotlightCard className="p-6 sm:p-7" glowColor="rgba(59, 130, 246, 0.14)">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-white/[0.06] mb-6">
              <div className="flex items-center gap-2">
                <User size={16} className="text-primary-600 dark:text-primary-400" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white">
                  Personal Information
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-gray-400">Profile Health:</span>
                <span className="text-xs font-mono font-bold text-primary-600 dark:text-primary-400">
                  {completenessScore}%
                </span>
              </div>
            </div>

            {isEditing ? (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                      First Name *
                    </label>
                    <input
                      type="text"
                      value={editForm.firstName}
                      onChange={(e) => setEditForm((p) => ({ ...p, firstName: e.target.value }))}
                      className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-800 text-sm dark:text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      value={editForm.lastName}
                      onChange={(e) => setEditForm((p) => ({ ...p, lastName: e.target.value }))}
                      className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-800 text-sm dark:text-white outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                    Account Email
                  </label>
                  <input
                    type="email"
                    value={profile?.email || user.email}
                    disabled
                    className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-xl text-gray-400 text-sm cursor-not-allowed font-mono"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Managed via authentication provider</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={editForm.phone}
                      onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))}
                      className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-800 text-sm dark:text-white outline-none"
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                      Current Location
                    </label>
                    <input
                      type="text"
                      value={editForm.location}
                      onChange={(e) => setEditForm((p) => ({ ...p, location: e.target.value }))}
                      className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-800 text-sm dark:text-white outline-none"
                      placeholder="e.g. San Francisco, CA"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                    Professional Headline / Title
                  </label>
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-800 text-sm dark:text-white outline-none"
                    placeholder="e.g. Senior Frontend Engineer • React & TypeScript"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                    Executive Career Summary
                  </label>
                  <textarea
                    rows={4}
                    value={editForm.summary}
                    onChange={(e) => setEditForm((p) => ({ ...p, summary: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-800 text-sm dark:text-white outline-none resize-none leading-relaxed"
                    placeholder="Briefly describe your background, strengths, and target roles..."
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setEditForm({
                        firstName: profile?.firstName || '',
                        lastName: profile?.lastName || '',
                        phone: profile?.phone || '',
                        location: profile?.location || '',
                        title: profile?.title || '',
                        summary: profile?.summary || '',
                      });
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <Loader2 size={14} className="animate-spin" /> Saving Changes...
                      </>
                    ) : (
                      <>
                        <Save size={14} /> Save Profile Details
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Profile Identity Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-600 to-indigo-600 text-white font-black text-2xl flex items-center justify-center shadow-lg shadow-primary-500/20 shrink-0">
                      {profile?.firstName?.charAt(0)?.toUpperCase() || 'C'}
                      {profile?.lastName?.charAt(0)?.toUpperCase() || ''}
                    </div>
                    <span
                      title="Active Candidate Status"
                      className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white dark:border-gray-900 flex items-center justify-center shadow-sm"
                    >
                      <Check size={11} className="text-white stroke-[3]" />
                    </span>
                  </div>

                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                        {profile?.firstName} {profile?.lastName}
                      </h3>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        Open to Work
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-primary-600 dark:text-primary-400">
                      {profile?.title || 'No professional title specified'}
                    </p>
                  </div>
                </div>

                {/* Contact Pills Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-gray-100 dark:border-white/[0.06]">
                  <div className="p-3 rounded-xl bg-gray-50/70 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.05]">
                    <span className="text-[11px] uppercase font-semibold tracking-wider text-gray-400 block mb-0.5">
                      Email Address
                    </span>
                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate block">
                      {profile?.email || user.email}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-gray-50/70 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.05]">
                    <span className="text-[11px] uppercase font-semibold tracking-wider text-gray-400 block mb-0.5">
                      Phone Number
                    </span>
                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate block">
                      {profile?.phone || 'Not provided'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-gray-50/70 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.05]">
                    <span className="text-[11px] uppercase font-semibold tracking-wider text-gray-400 block mb-0.5">
                      Location
                    </span>
                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate block">
                      {profile?.location || 'Remote / Unset'}
                    </span>
                  </div>
                </div>

                {/* Summary Section */}
                <div className="pt-4 border-t border-gray-100 dark:border-white/[0.06]">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                    Professional Summary
                  </h4>
                  <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap bg-gray-50/50 dark:bg-white/[0.02] p-4 rounded-xl border border-gray-100 dark:border-white/[0.05]">
                    {profile?.summary ||
                      'Add an executive career summary to give recruiters a clear overview of your strengths, specialties, and experience.'}
                  </p>
                </div>
              </div>
            )}
          </SpotlightCard>

          {/* Skills Matrix Spotlight Card */}
          <SpotlightCard className="p-6 sm:p-7" glowColor="rgba(168, 85, 247, 0.14)">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-white/[0.06] mb-5">
              <div className="flex items-center gap-2">
                <Award size={18} className="text-purple-500" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white">
                  Verified Skills Matrix
                </h3>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 font-semibold">
                  {profile?.skills?.length ?? 0} Skills
                </span>
                <button
                  type="button"
                  onClick={() => setShowSkillsModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors cursor-pointer"
                >
                  {(profile?.skills?.length ?? 0) === 0 ? (
                    <>
                      <Plus size={13} /> Add Skills
                    </>
                  ) : (
                    <>
                      <Edit2 size={13} /> Manage Skills
                    </>
                  )}
                </button>
              </div>
            </div>

            {(profile?.skills?.length ?? 0) === 0 ? (
              <div className="py-8 text-center">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-500 flex items-center justify-center mx-auto mb-3">
                  <Tag size={20} />
                </div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1">
                  No Core Competencies Listed
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-4">
                  Add technical and professional skills so our AI scoring engine can pair you with relevant job requirements.
                </p>
                <button
                  type="button"
                  onClick={() => setShowSkillsModal(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-primary-600 hover:bg-primary-700 text-white shadow-sm transition-all cursor-pointer"
                >
                  <Plus size={13} /> Configure Skills
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((skill, i) => (
                    <motion.span
                      key={i}
                      whileHover={{ y: -2 }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-white/[0.04] border border-gray-200/70 dark:border-white/[0.08] hover:border-purple-500/40 text-gray-800 dark:text-gray-200 rounded-xl text-xs font-semibold shadow-2xs transition-all cursor-default"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                      {skill}
                    </motion.span>
                  ))}
                </div>

                <div className="pt-3 border-t border-gray-100 dark:border-white/[0.05] flex items-center justify-between text-[11px] text-gray-400">
                  <span>ATS Keyword Match Tier</span>
                  <span className="font-semibold text-emerald-500">
                    {(profile?.skills?.length ?? 0) >= 5 ? 'Strong Coverage' : 'Add 5+ for Maximum Visibility'}
                  </span>
                </div>
              </div>
            )}
          </SpotlightCard>
        </div>

        {/* Right Column (4 cols) - Resume Command Deck */}
        <div className="lg:col-span-4 space-y-6">
          <SpotlightCard className="p-6" glowColor="rgba(16, 185, 129, 0.14)">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-white/[0.06] mb-4">
              <div className="flex items-center gap-2">
                <FileText size={17} className="text-emerald-500" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white">
                  Resume Blueprint
                </h3>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                resume ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
              }`}>
                {resume ? 'Active' : 'Missing'}
              </span>
            </div>

            {resume ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
                      <FileText size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-emerald-950 dark:text-emerald-200 truncate" title={resume.fileName || resume.file_name}>
                        {resume.fileName || resume.file_name || 'Primary_Resume.pdf'}
                      </h4>
                      <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 mt-0.5">
                        Synchronized: {(() => {
                          const raw = resume.updatedAt || resume.updated_at || resume.createdAt || resume.created_at;
                          const d = raw ? new Date(raw) : null;
                          return d && !isNaN(d.getTime()) ? d.toLocaleDateString() : 'Active';
                        })()}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                    <Link
                      to="/applicant/resume/edit"
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all shadow-sm text-xs font-bold"
                    >
                      <Edit2 size={14} /> Edit in Word Editor
                    </Link>
                  </motion.div>

                  <button
                    type="button"
                    onClick={() =>
                      openResumeUrl(
                        resume.storageUrl || resume.storage_url || resume.filePath || resume.file_path,
                        resume.fileName || resume.file_name
                      )
                    }
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-gray-100 dark:bg-white/[0.04] hover:bg-gray-200 dark:hover:bg-white/[0.08] text-gray-800 dark:text-gray-200 border border-gray-200/50 dark:border-white/[0.06] rounded-xl transition-all text-xs font-bold cursor-pointer"
                  >
                    <ExternalLink size={14} /> View Original Document
                  </button>

                  <Link
                    to="/applicant/resume/upload"
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-primary-50 dark:bg-primary-950/40 hover:bg-primary-100 dark:hover:bg-primary-900/50 text-primary-700 dark:text-primary-300 rounded-xl transition-colors text-xs font-bold"
                  >
                    <Upload size={14} /> Upload New Version
                  </Link>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center mx-auto">
                  <FileText size={22} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">No Resume Active</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs mx-auto">
                    Upload your CV or build one with our interactive editor.
                  </p>
                </div>

                <div className="space-y-2 pt-2">
                  <Link
                    to="/applicant/resume/upload"
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-primary-600 hover:bg-primary-700 text-white rounded-xl shadow-sm text-xs font-bold transition-all"
                  >
                    <Upload size={14} /> Upload Resume File
                  </Link>
                  <Link
                    to="/applicant/resume/create"
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/[0.1] text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold hover:bg-gray-50 dark:hover:bg-white/[0.05] transition-colors"
                  >
                    <Edit2 size={14} /> Build with AI Editor
                  </Link>
                </div>
              </div>
            )}
          </SpotlightCard>

          {/* Pro Tip Card */}
          <SpotlightCard className="p-5" glowColor="rgba(245, 158, 11, 0.12)">
            <div className="flex items-center gap-2 text-amber-500 mb-2">
              <Zap size={16} />
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">
                ATS Matching Advice
              </h4>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              ResuMatch’s scoring algorithm scans both your <strong>Skills Matrix</strong> and your <strong>Resume Document</strong> text. Keeping both updated yields up to a 40% higher shortlist rate.
            </p>
          </SpotlightCard>
        </div>
      </div>

      {/* Skills Modal Render */}
      <AnimatePresence>
        {showSkillsModal && (
          <EditSkillsModal
            initialSkills={profile?.skills || []}
            onSave={handleSaveSkills}
            onClose={() => setShowSkillsModal(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ApplicantProfile;
