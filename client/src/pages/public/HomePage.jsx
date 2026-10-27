import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, MapPin, Briefcase, Star, ArrowRight } from 'lucide-react';
import JobSearchAutocomplete from '../../components/forms/JobSearchAutocomplete';

const HomePage = () => {
  const [keyword, setKeyword] = useState('');
  const [location, setLocation] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (keyword) params.append('q', keyword);
    if (location) params.append('location', location);
    navigate(`/jobs?${params.toString()}`);
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem-4rem)]">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary-700 to-primary-900 pt-20 pb-24 px-4 sm:px-6 lg:px-8 text-white relative">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10 overflow-hidden pointer-events-none">
           <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
             <defs>
               <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                 <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1"/>
               </pattern>
             </defs>
             <rect width="100%" height="100%" fill="url(#grid)" />
           </svg>
        </div>

        <div className="max-w-5xl mx-auto relative z-10 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6">
            Find Your Next Dream Job
          </h1>
          <p className="text-xl md:text-2xl font-light text-primary-100 mb-10 max-w-3xl mx-auto">
            Our AI-powered platform matches your unique skills with the perfect career opportunities.
          </p>

          {/* Search Bar Container */}
          <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl shadow-2xl p-2.5 md:p-3 max-w-4xl mx-auto border border-white/20 dark:border-gray-700 relative z-30">
            <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-2 md:gap-3 items-stretch md:items-center">
              <div className="flex-1 relative flex items-center">
                <JobSearchAutocomplete
                  value={keyword}
                  onChange={setKeyword}
                  onSelect={setKeyword}
                  placeholder="Job title, keywords, or company"
                  inputClassName="w-full pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-700/60 focus:bg-white dark:focus:bg-gray-700 focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 dark:text-white placeholder:text-gray-400 text-sm md:text-base outline-none transition"
                  onSubmit={handleSearch}
                />
              </div>
              <div className="hidden md:block w-px bg-gray-200 dark:bg-gray-700 h-8 self-center"></div>
              <div className="flex-1 relative flex items-center">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10" size={20} />
                <input 
                  type="text" 
                  placeholder="City, province, or region" 
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-700/60 focus:bg-white dark:focus:bg-gray-700 focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 dark:text-white placeholder:text-gray-400 text-sm md:text-base outline-none transition"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(e); }}
                />
              </div>
              <button 
                type="submit"
                className="bg-primary-600 hover:bg-primary-700 active:scale-95 text-white font-semibold py-3.5 px-8 rounded-xl transition-all shadow-md hover:shadow-lg whitespace-nowrap flex items-center justify-center gap-2 cursor-pointer text-sm md:text-base"
              >
                <Search size={18} />
                <span>Search Jobs</span>
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Featured Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-900 flex-1">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Why use ResuMatch?</h2>
            <p className="mt-4 text-lg text-gray-500 dark:text-gray-400">Our intelligent ATS makes applying easier and more effective.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 text-center">
              <div className="w-14 h-14 bg-primary-100 dark:bg-primary-900/50 rounded-full flex items-center justify-center mx-auto mb-6 text-primary-600 dark:text-primary-400">
                <Briefcase size={28} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Smart Matching</h3>
              <p className="text-gray-600 dark:text-gray-400">Our AI analyzes your resume and matches you with roles that perfectly fit your experience and skills.</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 text-center">
              <div className="w-14 h-14 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600 dark:text-green-400">
                <Star size={28} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Resume Builder</h3>
              <p className="text-gray-600 dark:text-gray-400">Don't have a resume? Create a professional, ATS-friendly resume directly on our platform in minutes.</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 text-center">
              <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-600 dark:text-blue-400">
                <Search size={28} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Transparent Process</h3>
              <p className="text-gray-600 dark:text-gray-400">Track your application status in real-time. Know exactly where you stand in the recruitment process.</p>
            </div>
          </div>
          
          <div className="mt-16 text-center">
            <Link to="/jobs" className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-transparent text-base font-medium rounded-xl text-primary-700 bg-primary-50 hover:bg-primary-100 dark:text-primary-300 dark:bg-primary-900/30 dark:hover:bg-primary-900/50 transition-colors">
              Browse All Jobs <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
