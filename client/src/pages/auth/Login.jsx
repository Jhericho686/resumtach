import React, { useState } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '../../contexts/AuthContext';
import logoImg from '../../assets/logo.png';
import { Mail, Lock, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [isSuccessAnimating, setIsSuccessAnimating] = useState(false);
  
  const { login, resetPassword, isAdmin, isApplicant } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    if (isResetMode) {
      const success = await resetPassword(email);
      if (success) {
        setIsResetMode(false);
        setPassword('');
      }
      setIsLoading(false);
    } else {
      // Just call login — AuthRoute in App.jsx watches auth state
      // and auto-redirects to /admin or /applicant once role is loaded
      const res = await login(email, password);
      if (res !== false) {
        // Trigger the expanding card animation just like Yann UI/UX
        setIsSuccessAnimating(true);
        sessionStorage.setItem('play_yann_dashboard_intro', 'true');
        await new Promise(r => setTimeout(r, 450));
      }
      setIsLoading(false);
    }
  };

  const handleFillDemo = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
  };


  return (
    <div className={`w-full max-w-md transition-all duration-300 ${isSuccessAnimating ? 'animate-yann-card-expand' : ''}`}>
      <div className="bg-white dark:bg-gray-800 shadow-2xl rounded-2xl p-8 border border-gray-100 dark:border-gray-700">
        <div className="text-center mb-8">
          <img src={logoImg} alt="ResuMatch Logo" className="w-16 h-16 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {isResetMode ? 'Reset Password' : 'Welcome to ResuMatch'}
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            {isResetMode 
              ? 'Enter your email to receive a password reset link.' 
              : 'Sign in to your account to continue.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="email"
                required
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white transition-shadow"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          {!isResetMode && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setIsResetMode(true)}
                  className="text-sm font-semibold text-primary-600 hover:text-primary-500 dark:text-primary-400"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  className="block w-full pl-10 pr-10 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white transition-shadow"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
          )}


          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-lg"
          >
            {isLoading ? (
              <Loader2 className="animate-spin h-5 w-5" />
            ) : (
              <>
                {isResetMode ? 'Send Reset Link' : 'Sign In'}
                {!isResetMode && <ArrowRight className="ml-2 h-4 w-4" />}
              </>
            )}
          </button>
        </form>
        
        {isResetMode ? (
          <div className="mt-6 text-center">
            <button
              onClick={() => setIsResetMode(false)}
              className="text-sm font-semibold text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
            >
              Back to Sign In
            </button>
          </div>
        ) : (
          <div className="mt-6">
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Don't have an account?{' '}
                <Link to="/register" className="font-bold text-primary-600 hover:text-primary-500 dark:text-primary-400 transition-colors">
                  Register as an Applicant
                </Link>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
