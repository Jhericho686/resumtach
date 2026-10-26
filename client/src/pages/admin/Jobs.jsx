import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Search, Filter, Briefcase, MapPin, Clock, Plus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Jobs = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const result = await api.get('/jobs?status=active');
      setJobs(result.data.jobs || []);
    } catch (error) {
      console.error('Failed to fetch jobs', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      closed: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
      archived: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      draft: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
    };
    const cls = statusConfig[status] || statusConfig.draft;
    return <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${cls} capitalize`}>{status}</span>;
  };

  if (loading) return <div>Loading jobs...</div>;

  return (
    <div className="space-y-6 yann-stagger-1">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Job Openings</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage recruitment positions and track applicants.</p>
        </div>
        <button onClick={() => navigate('/admin/jobs/create')} className="btn btn-primary flex items-center gap-2">
          <Plus size={16} />
          <span>Post New Job</span>
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="input-field pl-10 px-3 py-2 border w-full"
            placeholder="Search jobs by title or department..."
          />
        </div>
        <button className="btn btn-secondary flex items-center gap-2">
          <Filter size={16} />
          <span>Filters</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {jobs.map((job) => (
          <div key={job.id} className="card p-6 flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{job.title}</h3>
                <p className="text-sm text-primary-600 dark:text-primary-400 font-medium">{job.department}</p>
              </div>
              {getStatusBadge(job.status)}
            </div>
            
            <div className="space-y-2 mb-6 flex-1">
              <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                <Briefcase size={16} className="mr-2" />
                <span className="capitalize">{(job.employmentType || job.employment_type || 'full-time').replace('-', ' ')}</span>
              </div>
              <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                <MapPin size={16} className="mr-2" />
                <span>{job.location || 'Not specified'}</span>
              </div>
              <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                <Clock size={16} className="mr-2" />
                <span>{job.minExperience ?? job.min_experience ?? 0}-{job.maxExperience ?? job.max_experience ?? 'N/A'} years</span>
              </div>
            </div>
            
            <div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                <span className="font-semibold text-gray-900 dark:text-white">{job.applicantCount ?? job.applicant_count ?? 0}</span> applicants
              </div>
              <button 
                onClick={() => navigate(`/admin/jobs/${job.id}`)}
                className="text-sm font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400"
              >
                View Details
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Jobs;
