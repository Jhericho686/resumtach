import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';
import { jobsService } from '../../services/firestore';

const JobCreate = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    department: '',
    description: '',
    requiredSkills: '',
    preferredSkills: '',
    requiredEducation: '',
    minExperience: 0,
    maxExperience: 5,
    certifications: '',
    employmentType: 'full-time',
    location: '',
    salaryMin: '',
    salaryMax: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Process comma separated lists into arrays
      const payload = {
        ...formData,
        requiredSkills: formData.requiredSkills.split(',').map(s => s.trim()).filter(Boolean),
        preferredSkills: formData.preferredSkills.split(',').map(s => s.trim()).filter(Boolean),
        certifications: formData.certifications.split(',').map(s => s.trim()).filter(Boolean),
        minExperience: Number(formData.minExperience),
        maxExperience: formData.maxExperience ? Number(formData.maxExperience) : null,
        salaryMin: formData.salaryMin ? Number(formData.salaryMin) : null,
        salaryMax: formData.salaryMax ? Number(formData.salaryMax) : null,
        status: 'active'
      };

      await jobsService.createJob(payload);
      toast.success('Job posted successfully');
      navigate('/admin/jobs');
    } catch (error) {
      console.error(error);
      toast.error('Failed to post job');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate('/admin/jobs')}
          className="p-2 bg-white border border-gray-200 rounded-full hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700"
        >
          <ArrowLeft size={20} className="text-gray-600 dark:text-gray-300" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Post New Job</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Define the job standard and requirements for AI evaluation.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card p-6 space-y-6">
          <h2 className="text-lg font-bold border-b pb-2 text-gray-900 dark:text-white dark:border-gray-700">Basic Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Job Title *</label>
              <input type="text" name="title" required value={formData.title} onChange={handleChange} className="input-field w-full p-2 border rounded" placeholder="e.g. Senior Software Engineer" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Department *</label>
              <input type="text" name="department" required value={formData.department} onChange={handleChange} className="input-field w-full p-2 border rounded" placeholder="e.g. Engineering" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Job Description *</label>
            <textarea name="description" required rows="4" value={formData.description} onChange={handleChange} className="input-field w-full p-2 border rounded" placeholder="Describe the role..."></textarea>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Employment Type *</label>
              <select name="employmentType" required value={formData.employmentType} onChange={handleChange} className="input-field w-full p-2 border rounded">
                <option value="full-time">Full Time</option>
                <option value="part-time">Part Time</option>
                <option value="contract">Contract</option>
                <option value="internship">Internship</option>
                <option value="temporary">Temporary</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location</label>
              <input type="text" name="location" value={formData.location} onChange={handleChange} className="input-field w-full p-2 border rounded" placeholder="e.g. Remote, New York, NY" />
            </div>
          </div>
        </div>

        <div className="card p-6 space-y-6">
          <h2 className="text-lg font-bold border-b pb-2 text-gray-900 dark:text-white dark:border-gray-700">AI Evaluation Standards</h2>
          <p className="text-sm text-gray-500 mb-4">These standards will be used by the AI to score applicant resumes.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Required Skills (Comma separated) *</label>
              <input type="text" name="requiredSkills" required value={formData.requiredSkills} onChange={handleChange} className="input-field w-full p-2 border rounded" placeholder="e.g. React, Node.js, SQL" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Preferred Skills (Comma separated)</label>
              <input type="text" name="preferredSkills" value={formData.preferredSkills} onChange={handleChange} className="input-field w-full p-2 border rounded" placeholder="e.g. AWS, Docker" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Required Education</label>
              <input type="text" name="requiredEducation" value={formData.requiredEducation} onChange={handleChange} className="input-field w-full p-2 border rounded" placeholder="e.g. Bachelor's in Computer Science" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Certifications (Comma separated)</label>
              <input type="text" name="certifications" value={formData.certifications} onChange={handleChange} className="input-field w-full p-2 border rounded" placeholder="e.g. AWS Certified, PMP" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Min Experience (Years)</label>
              <input type="number" name="minExperience" min="0" value={formData.minExperience} onChange={handleChange} className="input-field w-full p-2 border rounded" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Max Experience (Years)</label>
              <input type="number" name="maxExperience" min="0" value={formData.maxExperience} onChange={handleChange} className="input-field w-full p-2 border rounded" />
            </div>
          </div>
        </div>

        <div className="card p-6 space-y-6">
          <h2 className="text-lg font-bold border-b pb-2 text-gray-900 dark:text-white dark:border-gray-700">Compensation (Optional)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Minimum Salary (₱)</label>
              <input type="number" name="salaryMin" min="0" step="1000" value={formData.salaryMin} onChange={handleChange} className="input-field w-full p-2 border rounded" placeholder="e.g. 60000" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Maximum Salary (₱)</label>
              <input type="number" name="salaryMax" min="0" step="1000" value={formData.salaryMax} onChange={handleChange} className="input-field w-full p-2 border rounded" placeholder="e.g. 90000" />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate('/admin/jobs')} className="btn btn-secondary">Cancel</button>
          <button type="submit" disabled={loading} className="btn btn-primary flex items-center gap-2">
            <Save size={18} /> {loading ? 'Posting...' : 'Post Job Standard'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default JobCreate;
