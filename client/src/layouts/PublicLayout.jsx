import React, { useState } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import logoImg from '../assets/logo.png';
import CookieConsent from '../components/common/CookieConsent';
import SignOutModal from '../components/common/SignOutModal';
import { Briefcase, Search, User, Menu, X } from 'lucide-react';

const PublicLayout = () => {
  const { user, isApplicant, isAdmin, isStaff, isHR, logout } = useAuth();
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 font-sans text-gray-900 dark:text-gray-100">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center">
              <Link to="/" className="flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
                <img className="h-8 w-auto" src={logoImg} alt="ResuMatch Logo" />
                <span className="font-bold text-xl tracking-tight text-primary-600 dark:text-primary-400">ResuMatch</span>
              </Link>
            </div>
            
            {/* Nav Links (Desktop) */}
            <nav className="hidden md:flex space-x-8">
              <Link to="/" className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium">Home</Link>
              <Link to="/jobs" className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium">Find Jobs</Link>
            </nav>

            {/* Auth Buttons (Desktop) */}
            <div className="hidden md:flex items-center space-x-4">
              {user ? (
                <>
                  {(isAdmin || isStaff || user?.role === 'admin' || user?.role === 'staff') ? (
                    <Link to="/admin" className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium">
                      Admin Panel
                    </Link>
                  ) : (
                    <Link to="/applicant" className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1">
                      <User size={18} /> Dashboard
                    </Link>
                  )}
                  <button 
                    type="button"
                    onClick={() => setShowLogoutModal(true)} 
                    className="bg-gray-100 text-gray-700 hover:bg-gray-200 px-4 py-2 rounded-lg text-sm font-semibold transition-colors dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 cursor-pointer"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="text-gray-600 hover:text-primary-600 font-medium text-sm transition-colors dark:text-gray-300 dark:hover:text-primary-400">Sign In</Link>
                  <Link to="/register" className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm">Sign Up</Link>
                </>
              )}
            </div>

            {/* Mobile Hamburger Toggle */}
            <div className="flex items-center md:hidden">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(prev => !prev)}
                className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700 focus:outline-none"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 pt-3 pb-5 space-y-3 shadow-lg">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              Home
            </Link>
            <Link
              to="/jobs"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              Find Jobs
            </Link>
            <div className="pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
              {user ? (
                <>
                  {(isAdmin || isStaff || user?.role === 'admin' || user?.role === 'staff') ? (
                    <Link
                      to="/admin"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-3 py-2 rounded-md text-base font-medium text-primary-600 dark:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      Admin Panel
                    </Link>
                  ) : (
                    <Link
                      to="/applicant"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-3 py-2 rounded-md text-base font-medium text-primary-600 dark:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      Dashboard
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setShowLogoutModal(true);
                    }}
                    className="w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <div className="flex flex-col gap-2 pt-1">
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center py-2 px-4 rounded-lg font-medium text-sm text-gray-700 border border-gray-300 dark:text-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center py-2 px-4 rounded-lg font-semibold text-sm bg-primary-600 hover:bg-primary-700 text-white shadow-sm"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 w-full">
        <Outlet />
      </main>

      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-auto">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="md:flex md:items-center md:justify-between">
            <div className="flex justify-center space-x-6 md:order-2">
              <Link to="/privacy" className="text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">Privacy Policy</Link>
              <Link to="/terms" className="text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">Terms of Use</Link>
              <Link to="/cookies" className="text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">Cookie Policy</Link>
            </div>
            <div className="mt-8 md:mt-0 md:order-1">
              <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                &copy; {new Date().getFullYear()} ResuMatch. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
      
      <CookieConsent />

      <SignOutModal
        isOpen={showLogoutModal}
        onConfirm={() => {
          setShowLogoutModal(false);
          logout();
          navigate('/');
        }}
        onCancel={() => setShowLogoutModal(false)}
      />
    </div>
  );
};

export default PublicLayout;
