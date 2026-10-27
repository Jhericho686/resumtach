import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useLocation } from 'react-router-dom';
import { jobsService } from '../../services/firestore';
import { Search, MapPin, Briefcase, Filter, Loader2, Clock } from 'lucide-react';
import JobSearchAutocomplete from '../../components/forms/JobSearchAutocomplete';

const JobCard = ({ job }) => {
  const location = useLocation();
  const baseJobPath = location.pathname.startsWith('/applicant') ? '/applicant/jobs' : '/jobs';

  return (
  <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
    <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
      <div className="flex-1">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{job.title}</h3>
        <p className="text-primary-600 dark:text-primary-400 font-medium mb-3">{job.department || 'General'}</p>
        
        <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
          {(job.location || job.location_name) && (
            <div className="flex items-center gap-1"><MapPin size={16} /> {job.location || job.location_name}</div>
          )}
          {(job.employmentType || job.employment_type) && (
            <div className="flex items-center gap-1 capitalize"><Briefcase size={16} /> {(job.employmentType || job.employment_type).replace('-', ' ')}</div>
          )}
          {(job.salaryMin || job.salary_min || job.salaryMax || job.salary_max) && (
            <div className="flex items-center gap-1 font-medium text-gray-700 dark:text-gray-300">
              <span className="font-bold text-primary-600 dark:text-primary-400">₱</span>
              <span>
                {(job.salaryMin || job.salary_min) && (job.salaryMax || job.salary_max)
                  ? `${Number(job.salaryMin || job.salary_min).toLocaleString()} - ${Number(job.salaryMax || job.salary_max).toLocaleString()}`
                  : (job.salaryMin || job.salary_min)
                    ? `${Number(job.salaryMin || job.salary_min).toLocaleString()}+`
                    : `Up to ${Number(job.salaryMax || job.salary_max).toLocaleString()}`
                }
              </span>
            </div>
          )}
        </div>

        <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-2 mb-4">
          {job.description}
        </p>

        {job.requiredSkills && job.requiredSkills.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {job.requiredSkills.slice(0, 4).map((skill, index) => (
              <span key={index} className="px-2.5 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg text-xs font-medium">
                {skill}
              </span>
            ))}
            {job.requiredSkills.length > 4 && (
              <span className="px-2.5 py-1 bg-gray-50 dark:bg-gray-800 text-gray-500 rounded-lg text-xs font-medium">
                +{job.requiredSkills.length - 4} more
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col items-end justify-between gap-4">
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <Clock size={14} /> 
          {job.createdAt ? new Date(job.createdAt).toLocaleDateString() : 'Recent'}
        </div>
        <Link 
          to={`${baseJobPath}/${job.id}`}
          className="w-full md:w-auto px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl text-center transition-colors shadow-sm"
        >
          View Details
        </Link>
      </div>
    </div>
  </div>
  );
};

const JobSearch = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [jobs, setJobs] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loadingDepts, setLoadingDepts] = useState(true);
  const [loading, setLoading] = useState(true);
  const [totalJobs, setTotalJobs] = useState(0);
  
  // Filters state - sync with URL parameters
  const [keyword, setKeyword] = useState(searchParams.get('q') || '');
  const [location, setLocation] = useState(searchParams.get('location') || '');
  const [employmentType, setEmploymentType] = useState(searchParams.get('type') || '');
  const [department, setDepartment] = useState(searchParams.get('dept') || '');

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [lastDoc, setLastDoc] = useState(null);

  // Sync state whenever searchParams changes
  useEffect(() => {
    setKeyword(searchParams.get('q') || '');
    setLocation(searchParams.get('location') || '');
    setEmploymentType(searchParams.get('type') || '');
    setDepartment(searchParams.get('dept') || '');
  }, [searchParams]);

  // Fetch departments dynamically from posted active jobs
  useEffect(() => {
    let isMounted = true;
    const fetchDepartments = async () => {
      try {
        setLoadingDepts(true);
        const depts = await jobsService.getDepartments();
        if (isMounted && Array.isArray(depts)) {
          setDepartments(depts);
        }
      } catch (err) {
        console.error("Error fetching departments:", err);
      } finally {
        if (isMounted) setLoadingDepts(false);
      }
    };
    fetchDepartments();
    return () => { isMounted = false; };
  }, []);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const currentType = searchParams.get('type') || '';
      const currentDept = searchParams.get('dept') || '';
      const currentKw = searchParams.get('q') || '';
      const currentLoc = searchParams.get('location') || '';

      const filters = {};
      if (currentType) filters.employmentType = currentType;
      if (currentDept) filters.department = currentDept;
      if (currentKw) filters.search = currentKw;
      
      const result = await jobsService.getPublicJobs(filters, pageSize, page > 1 ? lastDoc : null);
      
      // Dual-layer defensive filtering to guarantee 100% accurate results
      let filteredJobs = result.jobs || [];

      if (currentType) {
        const normSelectedType = currentType.toLowerCase().replace(/[\s_]+/g, '-');
        filteredJobs = filteredJobs.filter(j => {
          const t = (j.employmentType || j.employment_type || '').toLowerCase().replace(/[\s_]+/g, '-');
          return t === normSelectedType;
        });
      }

      if (currentDept) {
        const normSelectedDept = currentDept.toLowerCase().trim();
        filteredJobs = filteredJobs.filter(j => {
          const d = (j.department || '').toLowerCase().trim();
          return d === normSelectedDept;
        });
      }

      if (currentKw) {
        const lowerKw = currentKw.toLowerCase().trim();
        filteredJobs = filteredJobs.filter(j => 
          (j.title && j.title.toLowerCase().includes(lowerKw)) || 
          (j.department && j.department.toLowerCase().includes(lowerKw)) ||
          (j.company && j.company.toLowerCase().includes(lowerKw)) ||
          (j.description && j.description.toLowerCase().includes(lowerKw))
        );
      }
      if (currentLoc) {
        const lowerLoc = currentLoc.toLowerCase();
        filteredJobs = filteredJobs.filter(j => 
          (j.location && j.location.toLowerCase().includes(lowerLoc)) || 
          (j.location_name && j.location_name.toLowerCase().includes(lowerLoc))
        );
      }

      setJobs(filteredJobs);
      setTotalJobs(filteredJobs.length);
      setLastDoc(result.lastDoc);
    } catch (error) {
      console.error("Error fetching jobs:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchJobs();
    window.scrollTo(0, 0);
  }, [searchParams, page]); // Re-fetch when params or page change

  const handleSearch = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const params = new URLSearchParams(searchParams);
    if (keyword) params.set('q', keyword); else params.delete('q');
    if (location) params.set('location', location); else params.delete('location');
    if (employmentType) params.set('type', employmentType); else params.delete('type');
    if (department) params.set('dept', department); else params.delete('dept');
    setSearchParams(params);
    setPage(1); // Reset to first page
  };

  const handleSelectKeyword = (selectedTitle) => {
    setKeyword(selectedTitle);
    const params = new URLSearchParams(searchParams);
    if (selectedTitle) params.set('q', selectedTitle); else params.delete('q');
    if (location) params.set('location', location); else params.delete('location');
    setSearchParams(params);
    setPage(1);
  };

  const handleKeywordChange = (newVal) => {
    setKeyword(newVal);
    if (!newVal || newVal.trim() === '') {
      const params = new URLSearchParams(searchParams);
      params.delete('q');
      setSearchParams(params);
      setPage(1);
    }
  };

  const handleFilterChange = (type, value) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(type, value);
    } else {
      params.delete(type);
    }
    if (type === 'type') setEmploymentType(value);
    if (type === 'dept') setDepartment(value);
    setSearchParams(params);
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-12">
      {/* Search Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
            <JobSearchAutocomplete
                value={keyword}
                onChange={handleKeywordChange}
                onSelect={handleSelectKeyword}
                placeholder="Job title, keywords..."
                inputClassName="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400"
                onSubmit={handleSearch}
              />
            <div className="flex-1 relative">
              <MapPin className="absolute left-4 top-3.5 text-gray-400" size={20} />
              <input 
                type="text" 
                placeholder="City, region..." 
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 dark:text-white"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
            <button type="submit" className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 px-8 rounded-xl transition-colors shadow-sm whitespace-nowrap">
              Search
            </button>
          </form>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Filters Sidebar */}
          <div className="w-full lg:w-64 flex-shrink-0 space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-4">
                <Filter size={18} className="text-gray-500" />
                <h3 className="font-bold text-gray-900 dark:text-white">Filters</h3>
              </div>
              
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Job Type</h4>
                  <div className="space-y-2">
                    {['full-time', 'part-time', 'contract', 'internship'].map(type => {
                      const activeType = searchParams.get('type') || employmentType;
                      const normCurrent = (activeType || '').toLowerCase().replace(/[\s_]+/g, '-');
                      const normType = type.toLowerCase().replace(/[\s_]+/g, '-');
                      const isSelected = normCurrent === normType;
                      
                      return (
                        <label 
                          key={type} 
                          className={`flex items-center gap-3 cursor-pointer p-2.5 rounded-xl border transition-all select-none ${
                            isSelected 
                              ? 'bg-blue-50 border-blue-300 dark:bg-blue-950/40 dark:border-blue-700 shadow-sm' 
                              : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-700/50'
                          }`}
                        >
                          <input 
                            type="radio" 
                            name="jobType" 
                            className="sr-only"
                            checked={isSelected}
                            onChange={() => handleFilterChange('type', isSelected ? '' : type)}
                          />
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                            isSelected 
                              ? 'border-blue-600 bg-blue-600 ring-4 ring-blue-500/20 shadow-sm' 
                              : 'border-gray-400 dark:border-gray-500 bg-white dark:bg-gray-700 hover:border-blue-500'
                          }`}>
                            {isSelected && <div className="w-2 h-2 rounded-full bg-white shadow-sm" />}
                          </div>
                          <span className={`text-sm capitalize transition-colors ${
                            isSelected 
                              ? 'font-bold text-blue-700 dark:text-blue-300' 
                              : 'text-gray-700 dark:text-gray-300'
                          }`}>
                            {type.replace('-', ' ')}
                          </span>
                        </label>
                      );
                    })}
                    {(searchParams.get('type') || employmentType) && (
                      <button 
                        type="button"
                        onClick={() => handleFilterChange('type', '')}
                        className="mt-2 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                      >
                        ✕ Clear Job Type Filter
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Department</h4>
                  <div className="space-y-2">
                    {loadingDepts ? (
                      <div className="py-2 text-xs text-gray-400">Loading departments...</div>
                    ) : departments.length === 0 ? (
                      <div className="py-2 text-xs text-gray-400">No departments found</div>
                    ) : (
                      departments.map(dept => {
                        const activeDept = searchParams.get('dept') || department;
                        const isSelected = (activeDept || '').toLowerCase().trim() === dept.toLowerCase().trim();
                        
                        return (
                          <label 
                            key={dept} 
                            className={`flex items-center gap-3 cursor-pointer p-2.5 rounded-xl border transition-all select-none ${
                              isSelected 
                                ? 'bg-blue-50 border-blue-300 dark:bg-blue-950/40 dark:border-blue-700 shadow-sm' 
                                : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-700/50'
                            }`}
                          >
                            <input 
                              type="radio" 
                              name="department" 
                              className="sr-only"
                              checked={isSelected}
                              onChange={() => handleFilterChange('dept', isSelected ? '' : dept)}
                            />
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                              isSelected 
                                ? 'border-blue-600 bg-blue-600 ring-4 ring-blue-500/20 shadow-sm' 
                                : 'border-gray-400 dark:border-gray-500 bg-white dark:bg-gray-700 hover:border-blue-500'
                            }`}>
                              {isSelected && <div className="w-2 h-2 rounded-full bg-white shadow-sm" />}
                            </div>
                            <span className={`text-sm transition-colors ${
                              isSelected 
                                ? 'font-bold text-blue-700 dark:text-blue-300' 
                                : 'text-gray-700 dark:text-gray-300'
                            }`}>
                              {dept}
                            </span>
                          </label>
                        );
                      })
                    )}
                    {(searchParams.get('dept') || department) && (
                      <button 
                        type="button"
                        onClick={() => handleFilterChange('dept', '')}
                        className="mt-2 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                      >
                        ✕ Clear Department Filter
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Job Results */}
          <div className="flex-1">
            <div className="mb-6 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {loading ? 'Searching...' : `${jobs.length} Jobs Found`}
              </h2>
            </div>

            {loading ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="animate-spin h-8 w-8 text-primary-600" />
              </div>
            ) : jobs.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center border border-gray-100 dark:border-gray-700">
                <Briefcase className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No jobs found</h3>
                <p className="text-gray-500 dark:text-gray-400">Try adjusting your search or filters to find what you're looking for.</p>
                <button 
                  onClick={() => {
                    setKeyword(''); setLocation(''); setEmploymentType(''); setDepartment('');
                    setSearchParams(new URLSearchParams());
                  }}
                  className="mt-6 px-4 py-2 text-primary-600 font-medium hover:bg-primary-50 rounded-lg transition-colors"
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {jobs.map(job => (
                  <JobCard key={job.id} job={job} />
                ))}

                {/* Pagination Controls */}
                <div className="mt-8 flex justify-center items-center gap-2">
                   <button 
                     disabled={page === 1}
                     onClick={() => setPage(p => Math.max(1, p - 1))}
                     className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 text-gray-700 dark:text-gray-300"
                   >
                     Previous
                   </button>
                   <span className="text-sm text-gray-600 dark:text-gray-400">Page {page}</span>
                   <button 
                     disabled={jobs.length < pageSize}
                     onClick={() => setPage(p => p + 1)}
                     className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 text-gray-700 dark:text-gray-300"
                   >
                     Next
                   </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default JobSearch;
