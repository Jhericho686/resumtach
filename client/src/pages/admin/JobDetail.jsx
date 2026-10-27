import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import { jobsService, applicationsService } from '../../services/firestore';
import { toast } from 'sonner';
import {
  ArrowLeft, Briefcase, MapPin, Clock, DollarSign,
  GraduationCap, Users, Award, CheckCircle, Tag, Eye,
  Pencil, Trash2, X, Save, AlertTriangle
} from 'lucide-react';

const Badge = ({ children, color = 'gray' }) => {
  const colors = {
    gray: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    green: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    red: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[color]}`}>
      {children}
    </span>
  );
};

const statusColor = { active: 'green', closed: 'gray', archived: 'yellow', draft: 'blue' };

const getScoreColor = (score) => {
  if (!score) return 'text-gray-400';
  if (score >= 80) return 'text-emerald-600 dark:text-emerald-400 font-bold';
  if (score >= 60) return 'text-green-600 dark:text-green-400 font-medium';
  if (score >= 50) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
};

const applicantStatusColor = {
  pending: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  under_review: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

// ── Edit Modal ────────────────────────────────────────────────────────────────
const EditJobModal = ({ job, onClose, onSaved }) => {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: job.title || '',
    department: job.department || '',
    description: job.description || '',
    requiredSkills: Array.isArray(job.requiredSkills) ? job.requiredSkills.join(', ') : '',
    preferredSkills: Array.isArray(job.preferredSkills) ? job.preferredSkills.join(', ') : '',
    requiredEducation: job.required_education || '',
    minExperience: job.min_experience ?? 0,
    maxExperience: job.max_experience ?? '',
    certifications: Array.isArray(job.certifications) ? job.certifications.join(', ') : '',
    employmentType: job.employment_type || 'full-time',
    location: job.location || '',
    salaryMin: job.salary_min || '',
    salaryMax: job.salary_max || '',
    status: job.status || 'active',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...form,
        requiredSkills: form.requiredSkills.split(',').map(s => s.trim()).filter(Boolean),
        preferredSkills: form.preferredSkills.split(',').map(s => s.trim()).filter(Boolean),
        certifications: form.certifications.split(',').map(s => s.trim()).filter(Boolean),
        minExperience: Number(form.minExperience),
        maxExperience: form.maxExperience ? Number(form.maxExperience) : null,
        salaryMin: form.salaryMin ? Number(form.salaryMin) : null,
        salaryMax: form.salaryMax ? Number(form.salaryMax) : null,
      };
      await jobsService.updateJob(job.id, payload);
      toast.success('Job updated successfully');
      onSaved(payload);
    } catch (err) {
      toast.error('Failed to update job');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = 'w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500';
  const labelCls = 'block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Pencil size={18} className="text-primary-500" /> Edit Job Posting
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Job Title *</label>
              <input type="text" name="title" required value={form.title} onChange={handleChange} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Department *</label>
              <input type="text" name="department" required value={form.department} onChange={handleChange} className={inputCls} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Job Description *</label>
            <textarea name="description" required rows={4} value={form.description} onChange={handleChange} className={inputCls} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Employment Type</label>
              <select name="employmentType" value={form.employmentType} onChange={handleChange} className={inputCls}>
                <option value="full-time">Full Time</option>
                <option value="part-time">Part Time</option>
                <option value="contract">Contract</option>
                <option value="internship">Internship</option>
                <option value="temporary">Temporary</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <select name="status" value={form.status} onChange={handleChange} className={inputCls}>
                <option value="active">Active</option>
                <option value="closed">Closed</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Location</label>
              <input type="text" name="location" value={form.location} onChange={handleChange} className={inputCls} />
            </div>
          </div>

          {/* AI Standards */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">AI Evaluation Standards</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Required Skills (comma separated)</label>
                <input type="text" name="requiredSkills" value={form.requiredSkills} onChange={handleChange} className={inputCls} placeholder="e.g. React, Node.js, SQL" />
              </div>
              <div>
                <label className={labelCls}>Preferred Skills (comma separated)</label>
                <input type="text" name="preferredSkills" value={form.preferredSkills} onChange={handleChange} className={inputCls} placeholder="e.g. AWS, Docker" />
              </div>
              <div>
                <label className={labelCls}>Required Education</label>
                <input type="text" name="requiredEducation" value={form.requiredEducation} onChange={handleChange} className={inputCls} placeholder="e.g. Bachelor's in CS" />
              </div>
              <div>
                <label className={labelCls}>Certifications (comma separated)</label>
                <input type="text" name="certifications" value={form.certifications} onChange={handleChange} className={inputCls} placeholder="e.g. AWS Certified, PMP" />
              </div>
              <div>
                <label className={labelCls}>Min Experience (Years)</label>
                <input type="number" name="minExperience" min="0" value={form.minExperience} onChange={handleChange} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Max Experience (Years)</label>
                <input type="number" name="maxExperience" min="0" value={form.maxExperience} onChange={handleChange} className={inputCls} />
              </div>
            </div>
          </div>

          {/* Salary */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Compensation (Optional)</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Min Salary (₱)</label>
                <input type="number" name="salaryMin" min="0" step="1000" value={form.salaryMin} onChange={handleChange} className={inputCls} placeholder="e.g. 30000" />
              </div>
              <div>
                <label className={labelCls}>Max Salary (₱)</label>
                <input type="number" name="salaryMax" min="0" step="1000" value={form.salaryMax} onChange={handleChange} className={inputCls} placeholder="e.g. 60000" />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 rounded-lg flex items-center gap-2 transition-colors">
              <Save size={15} /> {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Delete Confirm Modal ──────────────────────────────────────────────────────
const DeleteConfirmModal = ({ job, onClose, onDeleted }) => {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      await jobsService.deleteJob(job.id);
      toast.success('Job deleted successfully');
      onDeleted();
    } catch (err) {
      toast.error('Failed to delete job');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="h-14 w-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <AlertTriangle size={28} className="text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Delete Job Posting?</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              You are about to delete <span className="font-semibold text-gray-900 dark:text-white">"{job.title}"</span>.
              This will also permanently delete all applicants and their data. This action cannot be undone.
            </p>
          </div>
          <div className="flex gap-3 w-full">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors">
              Cancel
            </button>
            <button onClick={handleDelete} disabled={loading} className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg flex items-center justify-center gap-2 transition-colors">
              <Trash2 size={15} /> {loading ? 'Deleting...' : 'Yes, Delete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const JobDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const jobData = await jobsService.getJob(id);
        if (!jobData) {
          toast.error('Job not found');
          navigate('/admin/jobs');
          return;
        }
        setJob(jobData);
        try {
          const appResult = await applicationsService.getApplications({ jobId: id }, 100);
          setApplicants(appResult.applications || []);
        } catch {
          setApplicants([]);
        }
      } catch (error) {
        toast.error('Failed to load job details');
        navigate('/admin/jobs');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!job) return null;

  const skills = Array.isArray(job.requiredSkills) ? job.requiredSkills : [];
  const preferred = Array.isArray(job.preferredSkills) ? job.preferredSkills : [];
  const certs = Array.isArray(job.certifications) ? job.certifications : [];

  return (
    <div className="space-y-6 max-w-5xl mx-auto yann-stagger-1">
      {/* Modals */}
      {showEdit && (
        <EditJobModal
          job={job}
          onClose={() => setShowEdit(false)}
          onSaved={(updated) => { setJob(prev => ({ ...prev, ...updated })); setShowEdit(false); }}
        />
      )}
      {showDelete && (
        <DeleteConfirmModal
          job={job}
          onClose={() => setShowDelete(false)}
          onDeleted={() => navigate('/admin/jobs')}
        />
      )}

      {/* Back button */}
      <button
        onClick={() => navigate('/admin/jobs')}
        className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Job Openings
      </button>

      {/* Header Card */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{job.title}</h1>
              <Badge color={statusColor[job.status] || 'gray'}>{job.status}</Badge>
            </div>
            <p className="mt-1 text-primary-600 dark:text-primary-400 font-medium">{job.department}</p>
          </div>

          {/* Right side: applicant count + action buttons */}
          <div className="flex items-center gap-2 flex-wrap self-start">
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-2">
              <Users size={16} />
              <span><span className="font-semibold text-gray-900 dark:text-white">{job.applicantCount ?? job.applicant_count ?? 0}</span> applicants</span>
            </div>

            {/* Edit Button */}
            <button
              id="edit-job-btn"
              onClick={() => setShowEdit(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors shadow-sm"
            >
              <Pencil size={15} /> Edit
            </button>

            {/* Delete Button */}
            <button
              id="delete-job-btn"
              onClick={() => setShowDelete(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors shadow-sm"
            >
              <Trash2 size={15} /> Delete
            </button>
          </div>
        </div>

        {/* Meta row */}
        <div className="mt-5 flex flex-wrap gap-4">
          {(job.employmentType || job.employment_type) && (
            <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
              <Briefcase size={15} />
              <span className="capitalize">{(job.employmentType || job.employment_type).replace('-', ' ')}</span>
            </div>
          )}
          {job.location && (
            <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
              <MapPin size={15} />
              <span>{job.location}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
            <Clock size={15} />
            <span>{job.minExperience ?? job.min_experience ?? 0}–{job.maxExperience ?? job.max_experience ?? 'N/A'} years experience</span>
          </div>
          {(job.salaryMin || job.salary_min || job.salaryMax || job.salary_max) && (
            <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
              <span className="font-bold text-primary-600 dark:text-primary-400">₱</span>
              <span>
                {(job.salaryMin || job.salary_min) ? `${Number(job.salaryMin || job.salary_min).toLocaleString()}` : ''}
                {(job.salaryMin || job.salary_min) && (job.salaryMax || job.salary_max) ? ' – ' : ''}
                {(job.salaryMax || job.salary_max) ? `${Number(job.salaryMax || job.salary_max).toLocaleString()}` : ''}
              </span>
            </div>
          )}
          {(job.requiredEducation || job.required_education) && (
            <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
              <GraduationCap size={15} />
              <span>{job.requiredEducation || job.required_education}</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — Description + Applicants */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Job Description</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line leading-relaxed">
              {job.description}
            </p>
          </div>

          {/* Applicants table */}
          <div className="card">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Applicants
                <span className="ml-2 text-xs font-normal text-gray-400">({applicants.length})</span>
              </h2>
            </div>
            {applicants.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-gray-400">
                No applicants for this position yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800/50">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Candidate</th>
                      <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">AI Score</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                      <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"></th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {applicants.map(app => (
                      <tr key={app.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-700 dark:text-primary-300 text-xs font-bold flex-shrink-0">
                              {app.firstName?.charAt(0)}{app.lastName?.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">{app.firstName} {app.lastName}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{app.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-center">
                          <span className={`text-sm ${getScoreColor(app.overallScore)}`}>
                            {app.overallScore ? `${app.overallScore}%` : 'N/A'}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${applicantStatusColor[app.status] || applicantStatusColor.pending}`}>
                            {(app.status || 'pending').replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <Link
                            to={`/admin/applicants/${app.id}`}
                            className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
                          >
                            <Eye size={14} /> View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right — Skills sidebar */}
        <div className="space-y-4">
          {skills.length > 0 && (
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle size={16} className="text-primary-600 dark:text-primary-400" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Required Skills</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {skills.map((s, i) => <Badge key={i} color="blue">{s}</Badge>)}
              </div>
            </div>
          )}

          {preferred.length > 0 && (
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-3">
                <Tag size={16} className="text-primary-600 dark:text-primary-400" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Preferred Skills</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {preferred.map((s, i) => <Badge key={i} color="gray">{s}</Badge>)}
              </div>
            </div>
          )}

          {certs.length > 0 && (
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-3">
                <Award size={16} className="text-yellow-500" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Certifications</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {certs.map((c, i) => <Badge key={i} color="yellow">{c}</Badge>)}
              </div>
            </div>
          )}

          {(job.creator_first_name || job.creator_last_name) && (
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Posted By</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {job.creator_first_name} {job.creator_last_name}
              </p>
              {job.created_at && (
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(job.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobDetail;
