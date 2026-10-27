import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { jobsService } from '../../services/firestore';
import { MapPin, Briefcase, Clock, Building, ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const PublicJobDetail = () => {
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const searchPath = location.pathname.startsWith('/applicant') ? '/applicant/jobs' : '/jobs';

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const jobData = await jobsService.getJob(id);
        if (jobData && jobData.status === 'active') {
          setJob(jobData);
        } else {
          setJob(null); // Not found or not active
        }
      } catch (error) {
        console.error("Error fetching job:", error);
      }
      setLoading(false);
    };

    fetchJob();
    window.scrollTo(0, 0);
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="animate-spin h-10 w-10 text-primary-600" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Job Not Found</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6">The job you are looking for does not exist or has been closed.</p>
        <Link to={searchPath} className="px-6 py-2 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700">
          Browse Jobs
        </Link>
      </div>
    );
  }

  const handleApplyClick = () => {
    if (!user) {
      navigate('/login');
    } else {
      navigate(`/applicant/apply/${id}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <Link to={searchPath} className="inline-flex items-center text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium mb-6 transition-colors">
          <ArrowLeft size={18} className="mr-2" /> Back to Search
        </Link>

        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          {/* Header Section */}
          <div className="p-8 md:p-10 border-b border-gray-100 dark:border-gray-700">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
              <div>
                <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white mb-4">{job.title}</h1>
                <div className="flex flex-wrap gap-4 text-sm md:text-base text-gray-600 dark:text-gray-300">
                  <div className="flex items-center gap-1.5"><Building size={18} className="text-gray-400" /> <span className="font-medium text-gray-900 dark:text-white">{job.company || 'ResuMatch Enterprise'}</span></div>
                  <div className="flex items-center gap-1.5"><MapPin size={18} className="text-gray-400" /> {job.location || 'Remote'}</div>
                  <div className="flex items-center gap-1.5 capitalize"><Briefcase size={18} className="text-gray-400" /> {job.employmentType?.replace('-', ' ')}</div>
                  {(job.salaryMin || job.salaryMax || job.salary_min || job.salary_max) && (
                    <div className="flex items-center gap-1 font-medium text-gray-700 dark:text-gray-300">
                      <span className="font-bold text-primary-600 dark:text-primary-400">₱</span>
                      <span>
                        {(job.salaryMin || job.salary_min) && (job.salaryMax || job.salary_max)
                          ? `${Number(job.salaryMin || job.salary_min).toLocaleString()} – ${Number(job.salaryMax || job.salary_max).toLocaleString()}`
                          : (job.salaryMin || job.salary_min)
                            ? `${Number(job.salaryMin || job.salary_min).toLocaleString()}+`
                            : `Up to ${Number(job.salaryMax || job.salary_max).toLocaleString()}`
                        }
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5"><Clock size={18} className="text-gray-400" /> {job.createdAt || job.created_at ? `Posted ${new Date(job.createdAt || job.created_at).toLocaleDateString()}` : 'Recently Posted'}</div>
                </div>
              </div>
              
              <div className="flex-shrink-0 w-full md:w-auto">
                <button 
                  onClick={handleApplyClick}
                  className="w-full md:w-auto px-8 py-3.5 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl shadow-md transition-all hover:shadow-lg text-lg"
                >
                  Apply Now
                </button>
              </div>
            </div>
          </div>

          {/* Content Section */}
          <div className="p-8 md:p-10 grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 space-y-8">
              <section>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">About the Job</h3>
                <div className="prose dark:prose-invert max-w-none text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                  {job.description}
                </div>
              </section>

              {job.responsibilities && (
                 <section>
                   <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Responsibilities</h3>
                   <div className="prose dark:prose-invert max-w-none text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                     {job.responsibilities}
                   </div>
                 </section>
              )}

              {job.qualifications && (
                 <section>
                   <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Qualifications</h3>
                   <div className="prose dark:prose-invert max-w-none text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                     {job.qualifications}
                   </div>
                 </section>
              )}
            </div>

            {/* Sidebar Details */}
            <div className="space-y-6">
              <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-2xl border border-gray-100 dark:border-gray-700">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Job Overview</h3>
                <ul className="space-y-4">
                  <li>
                    <span className="block text-sm text-gray-500 dark:text-gray-400">Department</span>
                    <span className="font-medium text-gray-900 dark:text-white">{job.department}</span>
                  </li>
                  <li>
                    <span className="block text-sm text-gray-500 dark:text-gray-400">Experience Required</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {(job.minExperience ?? job.min_experience) != null || (job.maxExperience ?? job.max_experience) != null
                        ? `${job.minExperience ?? job.min_experience ?? 0} – ${job.maxExperience ?? job.max_experience ?? `${(job.minExperience ?? job.min_experience ?? 0) + 2}`} Years`
                        : 'Not Specified'}
                    </span>
                  </li>
                  <li>
                    <span className="block text-sm text-gray-500 dark:text-gray-400">Education Level</span>
                    <span className="font-medium text-gray-900 dark:text-white">{job.requiredEducation || 'Degree Preferred'}</span>
                  </li>
                  {job.workArrangement && (
                     <li>
                       <span className="block text-sm text-gray-500 dark:text-gray-400">Work Setup</span>
                       <span className="font-medium text-gray-900 dark:text-white">{job.workArrangement}</span>
                     </li>
                  )}
                  {job.applicationDeadline && (
                    <li>
                      <span className="block text-sm text-gray-500 dark:text-gray-400">Deadline</span>
                      <span className="font-medium text-red-600">{new Date(job.applicationDeadline).toLocaleDateString()}</span>
                    </li>
                  )}
                </ul>
              </div>

              {job.requiredSkills && job.requiredSkills.length > 0 && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Required Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {job.requiredSkills.map((skill, index) => (
                      <span key={index} className="px-3 py-1.5 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 rounded-lg text-sm font-medium">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {job.preferredSkills && job.preferredSkills.length > 0 && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Preferred Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {job.preferredSkills.map((skill, index) => (
                      <span key={index} className="px-3 py-1.5 bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Bottom Apply Bar */}
          <div className="p-8 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30 text-center">
             <p className="text-gray-600 dark:text-gray-400 mb-4">Ready to take the next step in your career?</p>
             <button 
                  onClick={handleApplyClick}
                  className="px-10 py-3.5 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl shadow-md transition-all text-lg"
                >
                  Apply for this Position
              </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicJobDetail;
