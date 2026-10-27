import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { 
  LayoutDashboard, Briefcase, User, FileText, 
  LogOut, Menu, Sun, Moon
} from 'lucide-react';
import logoImg from '../assets/logo.png';
import SignOutModal from '../components/common/SignOutModal';

const SidebarItem = ({ icon: Icon, label, to, active }) => (
  <Link
    to={to}
    className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
      active 
        ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300' 
        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
    }`}
  >
    <Icon size={20} className={active ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400'} />
    <span className="font-medium text-sm">{label}</span>
  </Link>
);

const ApplicantLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();

  const handleLogoutClick = () => setShowLogoutModal(true);
  const handleLogoutConfirm = () => { setShowLogoutModal(false); logout(); };
  const handleLogoutCancel = () => setShowLogoutModal(false);

  const navigation = [
    { name: 'Dashboard', to: '/applicant', icon: LayoutDashboard },
    { name: 'My Applications', to: '/applicant/applications', icon: Briefcase },
    { name: 'My Profile', to: '/applicant/profile', icon: User },
    { name: 'Search Jobs', to: '/applicant/jobs', icon: FileText },
  ];

  // Detect whether we should play the opening animation
  const shouldAnimate = typeof window !== 'undefined' && sessionStorage.getItem('play_yann_dashboard_intro') === 'true';

  useEffect(() => {
    if (shouldAnimate) {
      const timer = setTimeout(() => {
        sessionStorage.removeItem('play_yann_dashboard_intro');
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [shouldAnimate]);

  return (
    <>
    <div className="h-screen flex overflow-hidden bg-gray-50 dark:bg-gray-900">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border-r border-gray-200/80 dark:border-gray-700/80 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} ${shouldAnimate ? 'animate-yann-sidebar' : ''}`}>
        <div className="h-16 flex items-center px-4 border-b border-gray-200/80 dark:border-gray-700/80">
          <Link to="/" className="flex items-center gap-2 text-primary-600 dark:text-primary-400">
            <img src={logoImg} alt="ResuMatch" className="w-8 h-8 object-contain" />
            <span className="text-xl font-bold tracking-tight">Applicant Portal</span>
          </Link>
        </div>
        
        <div className="h-[calc(100vh-4rem)] flex flex-col justify-between p-4 overflow-y-auto">
          <nav className="space-y-1">
            {navigation.map((item) => (
              <SidebarItem 
                key={item.name}
                icon={item.icon}
                label={item.name}
                to={item.to}
                active={location.pathname === item.to || (item.to !== '/applicant' && item.to !== '/jobs' && location.pathname.startsWith(item.to))}
              />
            ))}
          </nav>

          <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="flex items-center px-3 py-2">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-700 dark:text-primary-300 font-bold">
                  {user?.firstName?.charAt(0) || 'U'}
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate w-32">{user?.firstName} {user?.lastName}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">Applicant</p>
              </div>
            </div>
            <button
              onClick={handleLogoutClick}
              className="mt-2 w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 rounded-md transition-colors"
            >
              <LogOut size={20} />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className={`h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border-b border-gray-200/80 dark:border-gray-700/80 ${shouldAnimate ? 'animate-yann-topbar' : ''}`}>
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <Menu size={24} />
          </button>
          
          <div className="flex-1 px-4 flex justify-end">
            <div className="ml-4 flex items-center gap-4 md:ml-6">
              <button
                onClick={toggleTheme}
                className="p-1 rounded-full text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none"
              >
                {isDark ? <Sun size={20} /> : <Moon size={20} />}
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className={`flex-1 overflow-y-auto bg-gray-50/50 dark:bg-gray-900/50 p-4 sm:p-6 lg:p-8 ${shouldAnimate ? 'animate-yann-content' : ''}`}>
          <Outlet />
        </main>
      </div>
    </div>

      <SignOutModal
        isOpen={showLogoutModal}
        onConfirm={handleLogoutConfirm}
        onCancel={handleLogoutCancel}
      />
    </>
  );
};

export default ApplicantLayout;
