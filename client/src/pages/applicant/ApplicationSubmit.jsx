import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { applicationsService } from '../../services/firestore';
import {
  Briefcase,
  Building,
  MapPin,
  FileText,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  Loader2,
  Upload,
  Edit2,
  ShieldCheck,
  Sparkles,
  Zap,
  ChevronRight,
  UserCheck
} from 'lucide-react';
import { toast } from 'sonner';
import CaptchaWidget from '../../components/common/CaptchaWidget';

const ApplicationSubmit = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [job, setJob] = useState(null);
  const [resume, setResume] = useState(null);
  const [hasApplied, setHasApplied] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isCaptchaVerified, setIsCaptchaVerified] = useState(false);
  const [captchaError, setCaptchaError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.uid || !jobId) return;
      
      try {
        // Fetch job details
        const jobRes = await api.get(`/jobs/${jobId}`);
        const jobData = jobRes.data;
        if (!jobData || jobData.status !== 'active') {
          toast.error('This job is no longer available.');
          navigate('/jobs');
          return;
        }
        setJob(jobData);

        // Check if already applied
        const alreadyApplied = await applicationsService.hasApplied(user.uid, jobId);
        setHasApplied(alreadyApplied);

        // Fetch resume
        const resumeRes = await api.get(`/resumes/my`);
        setResume(resumeRes.data);
        
      } catch (error) {
        console.error('Error fetching application data:', error);
        toast.error('Failed to load application details.');
      }
      setLoading(false);
    };

    fetchData();
  }, [user, jobId, navigate]);

  const handleSubmit = async () => {
    if (!resume) {
      toast.error('You must have a resume to apply.');
      return;
    }

    if (!isCaptchaVerified) {
      setCaptchaError('Please verify that you are not a robot before submitting.');
      return;
    }
    setCaptchaError('');

    setSubmitting(true);
    try {
      const appRes = await api.post('/applicants', {
        jobId: jobId,
        firstName: user?.firstName || user?.first_name || '',
        lastName: user?.lastName || user?.last_name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        address: user?.address || user?.location || '',
        resumeFile: resume.file_path || resume.storage_url || resume.file_name
      });
      
      const applicationId = appRes.data.id;
      setSuccess(true);
      toast.success('Application submitted! AI is analyzing your resume...');

      // Trigger AI scoring in the background
      const resumeDownloadUrl = resume.storage_url || resume.file_path;
      if (resumeDownloadUrl) {
        try {
          await api.post('/resumes/score-url', {
            resumeUrl: resumeDownloadUrl,
            resumeFileName: resume.file_name || 'resume.pdf',
            jobDescription: job.description || '',
            jobTitle: job.title || '',
            requiredSkills: job.required_skills || [],
            preferredSkills: job.preferred_skills || [],
            requiredEducation: job.required_education || '',
            minExperience: job.min_experience || 0,
            maxExperience: job.max_experience || null,
            certifications: job.certifications || [],
            applicantId: applicationId
          });
          console.log('AI scoring initiated for applicant', applicationId);
        } catch (scoreErr) {
          console.error('AI scoring error (non-blocking):', scoreErr.message);
        }
      }
      
    } catch (error) {
      console.error('Error submitting application:', error);
      const msg = error.response?.data?.message || error.message || 'Failed to submit application. Please try again.';
      toast.error(msg);
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-gray-50 dark:bg-gray-900 transition-colors gap-3">
        <Loader2 className="animate-spin h-9 w-9 text-primary-600" />
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">Loading Application Portal...</p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4">
        <div className="rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/80 p-8 sm:p-12 text-center shadow-lg">
          <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
            <CheckCircle size={38} strokeWidth={2.5} />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 mb-4">
            <Sparkles size={12} /> Application Confirmed
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-3">
            Application Submitted!
          </h2>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mb-8 max-w-lg mx-auto leading-relaxed">
            You have successfully applied for the <strong className="text-gray-900 dark:text-white">{job?.title}</strong> position at {job?.company || 'ResuMatch'}. Our AI is currently parsing your credentials.
          </p>
          <div className="flex flex-col sm:flex-row gap-3.5 justify-center">
            <Link 
              to="/applicant/applications"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-sm shadow-sm transition-all hover:shadow"
            >
              Track Application Status <ChevronRight size={16} />
            </Link>
            <Link 
              to="/jobs"
              className="inline-flex items-center justify-center px-6 py-3 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-xl font-bold text-sm transition-colors"
            >
              Browse More Jobs
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (hasApplied) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4">
        <div className="rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/80 p-8 sm:p-12 text-center shadow-lg">
          <div className="w-20 h-20 bg-primary-500/10 text-primary-600 dark:text-primary-400 border border-primary-500/30 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
            <Briefcase size={38} strokeWidth={2.2} />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-primary-50 dark:bg-primary-950/50 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-800 mb-4">
            <UserCheck size={12} /> Prior Submission Detected
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-3">
            You've Already Applied!
          </h2>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mb-8 max-w-md mx-auto leading-relaxed">
            Your application for <strong className="text-gray-900 dark:text-white">{job?.title}</strong> has already been received. Check your tracker for status updates.
          </p>
          <div className="flex justify-center">
            <Link 
              to="/applicant/applications"
              className="inline-flex items-center gap-2 px-7 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-sm shadow-sm transition-all"
            >
              Go to My Applications <ChevronRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6 sm:py-10 px-4 sm:px-6 space-y-6">
      {/* Top Navigation & Status */}
      <div className="flex items-center justify-between">
        <Link 
          to={`/jobs/${jobId}`} 
          className="inline-flex items-center text-xs sm:text-sm font-semibold text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 transition-colors"
        >
          <ArrowLeft size={16} className="mr-1.5" /> Back to Job Details
        </Link>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary-50 dark:bg-primary-950/50 text-primary-600 dark:text-primary-400 border border-primary-200/60 dark:border-primary-800/60">
          <Zap size={13} /> Final Step
        </span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
          Review & Submit Application
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
          Verify your applicant profile and attached resume before dispatching to the hiring team.
        </p>
      </div>

      {/* Target Job Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700/80 shadow-sm p-6 sm:p-7">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary-50 dark:bg-primary-950/50 border border-primary-100 dark:border-primary-900/40 flex items-center justify-center text-primary-600 dark:text-primary-400 shrink-0">
            <Briefcase size={22} />
          </div>
          <div className="space-y-1 flex-1 min-w-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Position Target</span>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
              {job?.title}
            </h2>
            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-gray-600 dark:text-gray-400">
              <span className="flex items-center gap-1.5 font-medium text-gray-800 dark:text-gray-200">
                <Building size={14} className="text-gray-400" /> {job?.company || 'ResuMatch'}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin size={14} className="text-gray-400" /> {job?.location || 'Remote'}
              </span>
              {job?.employment_type && (
                <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium">
                  {job.employment_type}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Applicant Identity Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700/80 shadow-sm p-6 sm:p-7">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-700 mb-5">
          <div className="flex items-center gap-2">
            <UserCheck size={18} className="text-primary-600 dark:text-primary-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white">
              Applicant Profile
            </h3>
          </div>
          <Link 
            to="/applicant/profile" 
            className="inline-flex items-center gap-1 text-xs font-bold text-primary-600 hover:text-primary-700 dark:text-primary-400 transition-colors"
          >
            <Edit2 size={12} /> Edit Profile
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-gray-50/70 dark:bg-gray-700/30 border border-gray-100 dark:border-gray-700/60">
            <span className="text-gray-400 block font-medium mb-0.5">Full Name</span>
            <span className="text-sm font-bold text-gray-900 dark:text-white">
              {user?.firstName} {user?.lastName}
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-gray-50/70 dark:bg-gray-700/30 border border-gray-100 dark:border-gray-700/60">
            <span className="text-gray-400 block font-medium mb-0.5">Email Address</span>
            <span className="text-sm font-bold text-gray-900 dark:text-white truncate block">
              {user?.email}
            </span>
          </div>
          {user?.phone && (
            <div className="p-3.5 rounded-xl bg-gray-50/70 dark:bg-gray-700/30 border border-gray-100 dark:border-gray-700/60">
              <span className="text-gray-400 block font-medium mb-0.5">Contact Phone</span>
              <span className="text-sm font-bold text-gray-900 dark:text-white">
                {user?.phone}
              </span>
            </div>
          )}
          {user?.address && (
            <div className="p-3.5 rounded-xl bg-gray-50/70 dark:bg-gray-700/30 border border-gray-100 dark:border-gray-700/60">
              <span className="text-gray-400 block font-medium mb-0.5">Location</span>
              <span className="text-sm font-bold text-gray-900 dark:text-white">
                {user?.address}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Resume Section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700/80 shadow-sm p-6 sm:p-7">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-700 mb-5">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-primary-600 dark:text-primary-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white">
              Attached Resume
            </h3>
          </div>
          {resume && (
            <Link 
              to="/applicant/profile" 
              className="text-xs font-bold text-primary-600 hover:text-primary-700 dark:text-primary-400 transition-colors"
            >
              Change Resume
            </Link>
          )}
        </div>

        {resume ? (
          <div className="p-4 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                <FileText size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-emerald-950 dark:text-emerald-200 truncate">
                  {resume.file_name || resume.fileName || 'Primary_Resume.pdf'}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">Ready for AI Scoring & Evaluation</span>
                </div>
              </div>
            </div>
            <div className="shrink-0">
              <CheckCircle size={22} className="text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
        ) : (
          <div className="p-6 rounded-xl bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 text-center">
            <AlertTriangle className="mx-auto text-amber-500 mb-2" size={30} />
            <h4 className="text-base font-bold text-amber-900 dark:text-amber-200 mb-1">No Resume Found</h4>
            <p className="text-xs text-amber-700 dark:text-amber-300 mb-5 max-w-sm mx-auto">
              An active resume is required to apply so our AI engine can score your profile against the role.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link 
                to="/applicant/resume/upload"
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
              >
                <Upload size={14} /> Upload Resume
              </Link>
              <Link 
                to="/applicant/resume/create"
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                <Edit2 size={14} /> Build Resume
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Security & Verification Widget */}
      {resume && (
        <div className="p-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">
              <ShieldCheck size={16} className="text-primary-600 dark:text-primary-400" />
              Human & Integrity Verification
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Complete the security verification below before submitting your application.
            </p>
          </div>

          <div className="shrink-0">
            <CaptchaWidget 
              onVerify={(val) => {
                setIsCaptchaVerified(val);
                setCaptchaError('');
              }}
              isVerified={isCaptchaVerified}
              error={captchaError}
            />
          </div>
        </div>
      )}

      {/* Submission Actions */}
      <div className="flex items-center justify-end gap-3.5 pt-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          disabled={submitting}
          className="px-5 py-2.5 text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-xl transition-all cursor-pointer disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!resume || submitting}
          className="inline-flex items-center gap-2 px-7 py-3 text-xs sm:text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-xl shadow-sm transition-all hover:shadow hover:-translate-y-0.5 active:translate-y-0 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
        >
          {submitting ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Submitting Application...
            </>
          ) : (
            <>
              Submit Application <Sparkles size={15} />
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ApplicationSubmit;
