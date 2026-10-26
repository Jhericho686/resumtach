import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { generateGmailComposeUrl, getApprovalEmailBody, getRejectionEmailBody } from '../../utils/gmailCompose';
import { openResumeUrl } from '../../services/storage';
import { toast } from 'sonner';
import { 
  User, Mail, Phone, MapPin, Download, CheckCircle, XCircle, 
  ArrowLeft, FileText, BrainCircuit, GraduationCap, Briefcase, Award, Eye, HelpCircle,
  Sliders, RotateCcw, ShieldAlert, X, Edit3, History, ChevronDown, ChevronUp, Clock
} from 'lucide-react';

const ApplicantView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [applicant, setApplicant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedHistoryId, setExpandedHistoryId] = useState(null);

  // Manual rating override modal state
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideScoreVal, setOverrideScoreVal] = useState(75);
  const [overrideRecommendation, setOverrideRecommendation] = useState('recommend');
  const [overrideReason, setOverrideReason] = useState('');
  const [submittingOverride, setSubmittingOverride] = useState(false);

  const fetchApplicant = async () => {
    try {
      let data = null;
      try {
        const response = await api.get(`/applicants/${id}`);
        data = response.data;
      } catch (e) {
        console.warn('Backend API getApplicant warning:', e.message);
      }

      if (data) {
        setApplicant(data);
      } else {
        toast.error('Applicant not found');
        navigate('/admin/applicants');
      }
    } catch (error) {
      console.error('Failed to load applicant details:', error);
      toast.error('Failed to load applicant details');
      navigate('/admin/applicants');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplicant();
  }, [id, navigate]);

  const handleViewResume = () => {
    try {
      const fileUrl = applicant.resume_file || applicant.resumeFile || applicant.resumeUrl || applicant.storageUrl || applicant.fileUrl;
      if (!fileUrl) {
        toast.error('Resume file is not available for this candidate.');
        return;
      }
      
      const fileName = `${applicant.first_name || applicant.firstName || 'Candidate'}_Resume.pdf`;
      openResumeUrl(fileUrl, fileName, id);
    } catch (error) {
      console.error('Error opening resume:', error);
      toast.error('Failed to open resume viewer');
    }
  };

  const handleStatusUpdate = async (status) => {
    try {
      await api.patch(`/applicants/${id}/status`, { status });
      setApplicant({ ...applicant, status });
      toast.success(`Status updated to ${status.replace('_', ' ')}`);

      // Gmail integration
      if (status === 'approved') {
        const subject = `Application Status - ResuMatch Recruitment (${applicant.jobTitle})`;
        const body = getApprovalEmailBody(`${applicant.firstName} ${applicant.lastName}`, applicant.jobTitle);
        const url = generateGmailComposeUrl(applicant.email, subject, body);
        window.open(url, '_blank');
      } else if (status === 'rejected') {
        const subject = `Application Update - ResuMatch Recruitment (${applicant.jobTitle})`;
        const body = getRejectionEmailBody(`${applicant.firstName} ${applicant.lastName}`, applicant.jobTitle);
        const url = generateGmailComposeUrl(applicant.email, subject, body);
        window.open(url, '_blank');
      }
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleRescore = async () => {
    const loadingToast = toast.loading('Initiating AI Rescore...');
    try {
      const response = await api.post(`/resumes/${id}/rescore`);
      toast.dismiss(loadingToast);
      
      if (response.data && response.data.score) {
        const raw = response.data.score;
        const normalizedScore = {
          ...raw,
          overallScore: raw.overallScore ?? raw.overall_score,
          skillsScore: raw.skillsScore ?? raw.skills_score,
          experienceScore: raw.experienceScore ?? raw.experience_score,
          educationScore: raw.educationScore ?? raw.education_score,
          certificationScore: raw.certificationScore ?? raw.certification_score,
          projectsScore: raw.projectsScore ?? raw.projects_score,
          matchedSkills: raw.matchedSkills ?? raw.matched_skills,
          missingSkills: raw.missingSkills ?? raw.missing_skills,
          strengths: raw.strengths,
          weaknesses: raw.weaknesses,
          confidenceLevel: raw.confidenceLevel ?? raw.confidence_level,
          hiringRecommendation: raw.hiringRecommendation ?? raw.hiring_recommendation,
          aiSummary: raw.aiSummary ?? raw.ai_summary,
          aiExplanation: raw.aiExplanation ?? raw.ai_explanation,
          aiModel: raw.aiModel ?? raw.ai_model,
          tailoredQuestions: raw.tailoredQuestions ?? raw.tailored_questions,
        };
        setApplicant(prev => ({ 
          ...prev, 
          score: normalizedScore,
          rescoreHistory: response.data.rescoreHistory || prev.rescoreHistory
        }));
        toast.success('AI Rescoring completed successfully!');
      } else {
        toast.error('Rescoring completed but no score returned.');
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      const msg = error.response?.data?.message || 'Failed to rescore applicant';
      toast.error(msg);
    }
  };

  const handleOpenOverrideModal = () => {
    const currentOverall = score?.overallScore ?? 75;
    const currentRec = score?.hiringRecommendation ?? 'recommend';
    setOverrideScoreVal(score?.isOverridden && score?.manualScore != null ? score.manualScore : (overallScore ?? currentOverall));
    setOverrideRecommendation(score?.isOverridden && score?.hiringRecommendation ? score.hiringRecommendation : currentRec);
    setOverrideReason(score?.overrideReason || '');
    setShowOverrideModal(true);
  };

  const handleSaveOverride = async (e) => {
    e.preventDefault();
    const numScore = parseFloat(overrideScoreVal);
    if (isNaN(numScore) || numScore < 0 || numScore > 100) {
      toast.error('Please enter a valid rating between 0 and 100.');
      return;
    }
    if (!overrideReason.trim()) {
      toast.error('Please provide a reason for the manual rating override.');
      return;
    }

    setSubmittingOverride(true);
    try {
      await api.post(`/applicants/${id}/override-score`, {
        manualScore: numScore,
        manualRecommendation: overrideRecommendation,
        reason: overrideReason.trim()
      });
      toast.success('Rating override applied successfully!');
      setShowOverrideModal(false);
      await fetchApplicant();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save rating override';
      toast.error(msg);
    } finally {
      setSubmittingOverride(false);
    }
  };

  const handleResetOverride = async () => {
    if (!window.confirm('Are you sure you want to revert to the original AI calculated score?')) return;
    const loadingToast = toast.loading('Reverting to AI score...');
    try {
      await api.delete(`/applicants/${id}/override-score`);
      toast.dismiss(loadingToast);
      toast.success('Reverted to AI score.');
      await fetchApplicant();
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error(err.response?.data?.message || 'Failed to revert override');
    }
  };

  const getScoreColor = (score) => {
    if (!score) return 'text-gray-500';
    if (score >= 80) return 'text-emerald-600 dark:text-emerald-400 font-bold';
    if (score >= 60) return 'text-green-600 dark:text-green-400 font-medium';
    if (score >= 50) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  const ScoreBar = ({ label, score }) => (
    <div className="mb-4">
      <div className="flex justify-between mb-1">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
        <span className={`text-sm font-bold ${score != null ? getScoreColor(score) : 'text-gray-500'}`}>{score != null ? `${score}%` : 'N/A'}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
        <div 
          className={`h-2.5 rounded-full ${
            score == null ? 'bg-gray-400' :
            score >= 80 ? 'bg-emerald-500' : 
            score >= 60 ? 'bg-green-500' : 
            score >= 50 ? 'bg-amber-500' : 'bg-red-500'
          }`} 
          style={{ width: `${score != null ? score : 0}%` }}
        ></div>
      </div>
    </div>
  );

  if (loading || !applicant) return <div className="p-8 text-center text-gray-500">Loading applicant details...</div>;

  const score = applicant.score;
  const isOverridden = Boolean(score?.isOverridden);
  const overallScore = score?.overallScore ?? score?.overall_score;
  const aiScore = score?.aiScore;
  const skillsScore = score?.skillsScore ?? score?.skills_score;
  const experienceScore = score?.experienceScore ?? score?.experience_score;
  const educationScore = score?.educationScore ?? score?.education_score;
  const hiringRecommendation = score?.hiringRecommendation ?? score?.hiring_recommendation;
  const aiSummary = score?.aiSummary ?? score?.ai_summary;
  const aiExplanation = score?.aiExplanation ?? score?.ai_explanation;
  const aiModel = score?.aiModel ?? score?.ai_model;
  const tailoredQuestions = score?.tailoredQuestions ?? score?.tailored_questions;

  return (
    <div className="space-y-6 yann-stagger-1">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/applicants')}
            className="p-2 bg-white border border-gray-200 rounded-full hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700"
          >
            <ArrowLeft size={20} className="text-gray-600 dark:text-gray-300" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {applicant.firstName} {applicant.lastName}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1 font-medium">
              Applied for: <span className="text-primary-600 dark:text-primary-400">{applicant.jobTitle}</span> ({applicant.department})
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={handleRescore}
            className="btn bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2"
          >
            <BrainCircuit size={18} /> Rescore AI
          </button>
          <button 
            onClick={handleOpenOverrideModal}
            className="btn bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-2 shadow-sm"
          >
            <Sliders size={18} /> {isOverridden ? 'Edit Override' : 'Override Score'}
          </button>
          {isOverridden && (
            <button 
              onClick={handleResetOverride}
              className="btn bg-gray-600 hover:bg-gray-700 text-white flex items-center gap-2"
              title="Revert back to AI score"
            >
              <RotateCcw size={18} /> Revert
            </button>
          )}
          {applicant.status !== 'approved' && (
            <button 
              onClick={() => handleStatusUpdate('approved')}
              className="btn bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
            >
              <CheckCircle size={18} /> Approve & Email
            </button>
          )}
          {applicant.status !== 'rejected' && (
            <button 
              onClick={() => handleStatusUpdate('rejected')}
              className="btn bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
            >
              <XCircle size={18} /> Reject & Email
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: AI Evaluation & Actions */}
        <div className="space-y-6">
          {/* AI Score Card */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <BrainCircuit className="text-purple-500" /> AI Evaluation
              </h2>
            </div>

            {isOverridden && (
              <div className="mb-5 p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg">
                <div className="flex items-center justify-between text-xs font-bold text-amber-800 dark:text-amber-300">
                  <span className="flex items-center gap-1.5">
                    <ShieldAlert size={15} className="text-amber-600 dark:text-amber-400" />
                    HR Manual Override Active
                  </span>
                  <span className="text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-900/60 px-2 py-0.5 rounded text-[11px] font-mono">
                    AI Score: {aiScore != null ? `${aiScore}%` : 'N/A'}
                  </span>
                </div>
                {score?.overrideReason && (
                  <p className="mt-2 text-xs text-gray-700 dark:text-gray-300 italic bg-white/70 dark:bg-gray-800/80 p-2.5 rounded border border-amber-100 dark:border-amber-900/40">
                    "{score.overrideReason}"
                  </p>
                )}
                <div className="mt-2 text-[11px] text-gray-500 dark:text-gray-400 flex items-center justify-between">
                  <span>By: {score?.overriddenBy || 'HR Admin'}</span>
                  {score?.overriddenAt && <span>{new Date(score.overriddenAt).toLocaleDateString()}</span>}
                </div>
              </div>
            )}

            <div className="flex flex-col items-center justify-center mb-8">
              <div className="relative">
                <svg className="w-32 h-32 transform -rotate-90">
                  <circle className="text-gray-200 dark:text-gray-700" strokeWidth="10" stroke="currentColor" fill="transparent" r="58" cx="64" cy="64" />
                  <circle 
                    className={
                      overallScore >= 80 ? "text-emerald-500" :
                      overallScore >= 60 ? "text-green-500" :
                      overallScore >= 50 ? "text-amber-500" : "text-red-500"
                    }
                    strokeWidth="10" 
                    strokeDasharray={364.4} 
                    strokeDashoffset={364.4 - (364.4 * (overallScore || 0)) / 100}
                    strokeLinecap="round" 
                    stroke="currentColor" 
                    fill="transparent" 
                    r="58" cx="64" cy="64" 
                  />
                </svg>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                  <span className="text-3xl font-black text-gray-900 dark:text-white">
                    {overallScore != null ? overallScore : 'N/A'}
                  </span>
                </div>
              </div>
              <span className={`mt-3 font-bold ${overallScore != null ? getScoreColor(overallScore) : 'text-gray-500'}`}>
                {overallScore != null && hiringRecommendation ? hiringRecommendation.replace(/_/g, ' ').toUpperCase() : 'NOT SCORED'}
              </span>
            </div>

            <div className="space-y-1">
              <ScoreBar label="Skills Match" score={skillsScore} />
              <ScoreBar label="Experience" score={experienceScore} />
              <ScoreBar label="Education" score={educationScore} />
            </div>

            {aiSummary && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-100 dark:bg-gray-700/30 dark:border-gray-700">
                <p className="text-sm text-gray-700 dark:text-gray-300 italic mb-3">
                  "{aiSummary}"
                </p>
                {aiExplanation && (
                  <>
                    <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-2 pt-3 border-t border-gray-200 dark:border-gray-600">
                      Reasoning
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {aiExplanation}
                    </p>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Contact Info */}
          <div className="card p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 border-b border-gray-100 dark:border-gray-700 pb-2">Contact Info</h2>
            <div className="flex items-start gap-3 text-gray-700 dark:text-gray-300">
              <Mail size={18} className="text-gray-400 flex-shrink-0 mt-0.5" />
              <a href={`mailto:${applicant.email}`} className="hover:text-primary-600 break-words w-full">{applicant.email}</a>
            </div>
            {applicant.phone && (
              <div className="flex items-start gap-3 text-gray-700 dark:text-gray-300">
                <Phone size={18} className="text-gray-400 flex-shrink-0 mt-0.5" />
                <a href={`tel:${applicant.phone}`} className="hover:text-primary-600 break-words">{applicant.phone}</a>
              </div>
            )}
            {applicant.address && (
              <div className="flex items-start gap-3 text-gray-700 dark:text-gray-300">
                <MapPin size={18} className="text-gray-400 flex-shrink-0 mt-0.5" />
                <span className="break-words">{applicant.address}</span>
              </div>
            )}
            
            <div className="mt-4 space-y-2">
              <button 
                onClick={handleViewResume}
                className="w-full btn btn-secondary flex justify-center items-center gap-2"
              >
                <Eye size={18} /> View Resume
              </button>
              <button
                onClick={() => navigate(`/admin/resume/edit?applicantId=${id}`)}
                className="w-full btn bg-indigo-600 hover:bg-indigo-700 text-white flex justify-center items-center gap-2"
              >
                <FileText size={18} /> Open in Word Editor
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: AI Explanation & Extracted Data */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Explainable AI Box */}
          <div className="card p-6 border-l-4 border-l-primary-500">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">AI Score Explanation</h2>
            <div className="prose dark:prose-invert max-w-none text-sm text-gray-600 dark:text-gray-300">
              {aiExplanation ? (
                <div className="whitespace-pre-wrap">{aiExplanation}</div>
              ) : (
                <p className="italic text-gray-500">AI explanation not available for this candidate.</p>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-100 dark:border-green-900/30">
                <h4 className="font-semibold text-green-800 dark:text-green-400 mb-2 flex items-center gap-2"><CheckCircle size={16}/> Strengths</h4>
                <ul className="list-disc pl-5 text-sm text-green-700 dark:text-green-300 space-y-1">
                  {applicant.score?.strengths?.map((s, i) => <li key={i}>{s}</li>) || <li>No specific strengths identified</li>}
                </ul>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-100 dark:border-red-900/30">
                <h4 className="font-semibold text-red-800 dark:text-red-400 mb-2 flex items-center gap-2"><XCircle size={16}/> Weaknesses</h4>
                <ul className="list-disc pl-5 text-sm text-red-700 dark:text-red-300 space-y-1">
                  {applicant.score?.weaknesses?.map((w, i) => <li key={i}>{w}</li>) || <li>No significant weaknesses identified</li>}
                </ul>
              </div>
            </div>

            {/* AI Tailored Interview Questions */}
            {tailoredQuestions && tailoredQuestions.length > 0 && (
              <div className="mt-6 bg-indigo-50/70 dark:bg-indigo-950/30 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
                <h4 className="font-bold text-indigo-900 dark:text-indigo-300 mb-2 flex items-center gap-2 text-sm">
                  <HelpCircle size={18} className="text-indigo-600 dark:text-indigo-400" />
                  AI-Suggested Interview Questions for Candidate
                </h4>
                <ul className="space-y-2 mt-2">
                  {tailoredQuestions.map((q, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-indigo-950 dark:text-indigo-200">
                      <span className="font-bold text-indigo-600 dark:text-indigo-400 flex-shrink-0">{idx + 1}.</span>
                      <span>{q}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Parsed Information */}
          <div className="card p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6 border-b border-gray-100 dark:border-gray-700 pb-2">Extracted Qualifications</h2>
            
            <div className="space-y-8">
              {/* Skills */}
              <div>
                <h3 className="text-md font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2 mb-3">
                  <Award size={18} className="text-primary-500" /> Skills & Tools
                </h3>
                <div className="flex flex-wrap gap-2">
                  {applicant.skills?.map((skill, i) => {
                    const isMatched = applicant.score?.matchedSkills?.includes(skill);
                    return (
                      <span key={i} className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        isMatched 
                          ? 'bg-green-100 text-green-800 border border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800/50' 
                          : 'bg-gray-100 text-gray-700 border border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
                      }`}>
                        {skill} {isMatched && '✓'}
                      </span>
                    )
                  })}
                </div>
              </div>

              {/* Experience */}
              {applicant.experience && applicant.experience.length > 0 && (
                <div>
                  <h3 className="text-md font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2 mb-4">
                    <Briefcase size={18} className="text-primary-500" /> Experience
                  </h3>
                  <div className="space-y-4">
                    {applicant.experience.map((exp, i) => (
                      <div key={i} className="relative pl-6 border-l-2 border-gray-200 dark:border-gray-700 pb-4 last:pb-0">
                        <div className="absolute w-3 h-3 bg-primary-500 rounded-full -left-[7px] top-1.5 ring-4 ring-white dark:ring-gray-800"></div>
                        <h4 className="font-bold text-gray-900 dark:text-white">{exp.title}</h4>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-sm font-medium text-primary-600 dark:text-primary-400">{exp.company}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{exp.duration}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Education */}
              {applicant.education && applicant.education.length > 0 && (
                <div>
                  <h3 className="text-md font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2 mb-4">
                    <GraduationCap size={18} className="text-primary-500" /> Education
                  </h3>
                  <div className="space-y-4">
                    {applicant.education
                      .filter(edu => edu?.degree && edu.degree.trim().length > 2 && !['me', 'be', 'it', 'as'].includes(edu.degree.toLowerCase().trim()))
                      .map((edu, i) => (
                      <div key={i} className="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
                        <div>
                          <h4 className="font-bold text-gray-900 dark:text-white">{edu.degree}</h4>
                          <span className="text-sm text-gray-600 dark:text-gray-400">{edu.institution}</span>
                        </div>
                        {edu.year && <span className="mt-2 sm:mt-0 text-sm font-medium text-gray-500">{edu.year}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Rescore & Evaluation History */}
          <div className="card p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6 border-b border-gray-100 dark:border-gray-700 pb-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <History size={20} className="text-indigo-600 dark:text-indigo-400" />
                  Rescore & Evaluation History
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Audit trail of AI evaluations, scoring recalibrations, and model revisions
                </p>
              </div>
              <span className="self-start sm:self-center px-2.5 py-1 text-xs font-semibold rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800">
                {(applicant.rescoreHistory?.length || 0)} {applicant.rescoreHistory?.length === 1 ? 'Record' : 'Records'}
              </span>
            </div>

            {(!applicant.rescoreHistory || applicant.rescoreHistory.length === 0) ? (
              <div className="text-center py-8 px-4 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                <Clock className="mx-auto h-8 w-8 text-gray-400 mb-2 opacity-60" />
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">No previous rescores logged</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-md mx-auto">
                  Click the <strong className="text-primary-600 dark:text-primary-400">Rescore AI</strong> button in the top action bar to rerun evaluation and create an audit log entry.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {applicant.rescoreHistory.map((item, idx) => {
                  const isCurrent = idx === 0;
                  const prevItem = applicant.rescoreHistory[idx + 1];
                  const delta = prevItem ? (item.overallScore - prevItem.overallScore).toFixed(1) : null;
                  const isExpanded = expandedHistoryId === item.id;
                  
                  return (
                    <div 
                      key={item.id || idx}
                      className={`border rounded-xl p-4 transition-all ${
                        isCurrent 
                          ? 'border-indigo-200 bg-indigo-50/20 dark:border-indigo-900/50 dark:bg-indigo-950/10' 
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                            isCurrent
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                          }`}>
                            #{applicant.rescoreHistory.length - idx}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm text-gray-900 dark:text-white">
                                {item.triggerType === 'rescore' ? 'AI Rescore' : item.triggerType === 'manual_override' ? 'Manual Override' : 'Initial Evaluation'}
                              </span>
                              {isCurrent && (
                                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
                                  Current
                                </span>
                              )}
                              <span className="text-xs text-gray-400">•</span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {new Date(item.createdAt).toLocaleString(undefined, { 
                                  month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' 
                                })}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              Rescore by: <span className="font-semibold text-gray-800 dark:text-gray-200">{(item.scorerName && !item.scorerName.toLowerCase().includes('system')) ? item.scorerName : 'Admin HR'}</span>
                            </p>
                          </div>
                        </div>

                        {/* Overall score + Recommendation */}
                        <div className="flex items-center gap-3 self-end sm:self-center">
                          {delta !== null && (
                            <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-md ${
                              Number(delta) > 0 
                                ? 'text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-300' 
                                : Number(delta) < 0 
                                ? 'text-red-700 bg-red-50 dark:bg-red-900/30 dark:text-red-300' 
                                : 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-300'
                            }`}>
                              {Number(delta) > 0 ? `+${delta}%` : `${delta}%`}
                            </span>
                          )}

                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                            item.hiringRecommendation === 'strongly_recommend' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' :
                            item.hiringRecommendation === 'recommend' ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' :
                            item.hiringRecommendation === 'consider' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' :
                            'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                          }`}>
                            {(item.hiringRecommendation || 'consider').replace('_', ' ')}
                          </span>

                          <span className="text-lg font-extrabold text-gray-900 dark:text-white">
                            {Number(item.overallScore).toFixed(1)}%
                          </span>

                          <button
                            onClick={() => setExpandedHistoryId(isExpanded ? null : item.id)}
                            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-md"
                            title={isExpanded ? 'Hide details' : 'Show details'}
                          >
                            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                          </button>
                        </div>
                      </div>

                      {/* Subscores bar */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700/60 text-xs">
                        <div className="bg-gray-50 dark:bg-gray-900/30 p-2 rounded-lg">
                          <span className="text-gray-500 dark:text-gray-400 block">Skills</span>
                          <span className="font-bold text-gray-800 dark:text-gray-200">{Number(item.skillsScore || 0).toFixed(0)}%</span>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-900/30 p-2 rounded-lg">
                          <span className="text-gray-500 dark:text-gray-400 block">Experience</span>
                          <span className="font-bold text-gray-800 dark:text-gray-200">{Number(item.experienceScore || 0).toFixed(0)}%</span>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-900/30 p-2 rounded-lg">
                          <span className="text-gray-500 dark:text-gray-400 block">Education</span>
                          <span className="font-bold text-gray-800 dark:text-gray-200">{Number(item.educationScore || 0).toFixed(0)}%</span>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-900/30 p-2 rounded-lg">
                          <span className="text-gray-500 dark:text-gray-400 block">Projects</span>
                          <span className="font-bold text-gray-800 dark:text-gray-200">{Number(item.projectsScore || 0).toFixed(0)}%</span>
                        </div>
                      </div>

                      {/* Expandable details */}
                      {isExpanded && (
                        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 space-y-3 text-xs animate-in fade-in duration-150">
                          {item.aiExplanation && (
                            <div>
                              <span className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">AI Explanation:</span>
                              <p className="text-gray-600 dark:text-gray-400 leading-relaxed bg-gray-50 dark:bg-gray-900/40 p-3 rounded-lg">
                                {item.aiExplanation}
                              </p>
                            </div>
                          )}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {item.strengths && item.strengths.length > 0 && (
                              <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-lg">
                                <span className="font-semibold text-emerald-800 dark:text-emerald-300 block mb-1.5 flex items-center gap-1">
                                  <CheckCircle size={14} /> Strengths
                                </span>
                                <ul className="space-y-1 text-emerald-900 dark:text-emerald-200">
                                  {item.strengths.map((s, si) => (
                                    <li key={si}>• {s}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {item.weaknesses && item.weaknesses.length > 0 && (
                              <div className="p-3 bg-red-50/50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-lg">
                                <span className="font-semibold text-red-800 dark:text-red-300 block mb-1.5 flex items-center gap-1">
                                  <XCircle size={14} /> Weaknesses
                                </span>
                                <ul className="space-y-1 text-red-900 dark:text-red-200">
                                  {item.weaknesses.map((w, wi) => (
                                    <li key={wi}>• {w}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Manual Rating Override Modal */}
      {showOverrideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-lg p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-3">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Sliders className="text-amber-500" /> Manual Score Override
              </h3>
              <button 
                onClick={() => setShowOverrideModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-md"
              >
                <X size={20} />
              </button>
            </div>

            <div className="text-sm text-gray-600 dark:text-gray-300 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-lg p-3">
              Override the AI-generated evaluation for <strong>{applicant.firstName} {applicant.lastName}</strong>. 
              The original AI score ({score?.aiScore ?? overallScore ?? 'N/A'}%) is archived for full transparency.
            </div>

            <form onSubmit={handleSaveOverride} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Manual Rating (0 – 100%)
                </label>
                <div className="flex items-center gap-3">
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={overrideScoreVal} 
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setOverrideScoreVal(val);
                      if (val >= 80) setOverrideRecommendation('strongly_recommend');
                      else if (val >= 60) setOverrideRecommendation('recommend');
                      else if (val >= 50) setOverrideRecommendation('consider');
                      else setOverrideRecommendation('not_recommended');
                    }}
                    className="w-full accent-amber-500 h-2 bg-gray-200 rounded-lg cursor-pointer dark:bg-gray-700"
                  />
                  <div className="w-20">
                    <input 
                      type="number" 
                      min="0" 
                      max="100" 
                      value={overrideScoreVal} 
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setOverrideScoreVal(val);
                        if (val >= 80) setOverrideRecommendation('strongly_recommend');
                        else if (val >= 60) setOverrideRecommendation('recommend');
                        else if (val >= 50) setOverrideRecommendation('consider');
                        else setOverrideRecommendation('not_recommended');
                      }}
                      className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-bold text-center"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Hiring Recommendation
                </label>
                <select 
                  value={overrideRecommendation} 
                  onChange={(e) => setOverrideRecommendation(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="strongly_recommend">STRONGLY RECOMMEND (80-100%)</option>
                  <option value="recommend">RECOMMEND (60-79%)</option>
                  <option value="consider">CONSIDER (50-59%)</option>
                  <option value="not_recommended">NOT RECOMMENDED (0-49%)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Reason for Override <span className="text-red-500">*</span>
                </label>
                <textarea 
                  rows="3"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="e.g., Demonstrated high proficiency during technical interview; non-standard resume missed by automatic parser."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 text-sm"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                <button 
                  type="button" 
                  onClick={() => setShowOverrideModal(false)}
                  className="btn btn-secondary px-4 py-2 border rounded-md"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submittingOverride}
                  className="btn bg-amber-600 hover:bg-amber-700 text-white font-semibold px-5 py-2 rounded-md disabled:opacity-50"
                >
                  {submittingOverride ? 'Saving...' : 'Apply Rating Override'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApplicantView;
