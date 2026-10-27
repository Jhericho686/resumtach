import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import logoImg from '../../assets/logo.png';
import { Mail, Lock, User, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import CaptchaWidget from '../../components/common/CaptchaWidget';
import { capitalizeFirstLetter } from '../../utils/formatters';

const Register = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCaptchaVerified, setIsCaptchaVerified] = useState(false);
  const [captchaError, setCaptchaError] = useState('');
  
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    if (!isCaptchaVerified) {
      setCaptchaError('Please complete the verification below.');
      toast.error('Please verify that you are human before registering.');
      return;
    }
    setCaptchaError('');

    const formattedFirstName = capitalizeFirstLetter(firstName.trim());
    const formattedLastName = capitalizeFirstLetter(lastName.trim());

    setIsLoading(true);
    const success = await register(email, password, { firstName: formattedFirstName, lastName: formattedLastName, role: 'applicant' });
    setIsLoading(false);
    if (success) {
      navigate('/applicant');
    }
  };

  return (
    <div className="w-full max-w-md my-8">
      <div className="bg-white dark:bg-gray-800 shadow-2xl rounded-2xl p-8 border border-gray-100 dark:border-gray-700">
        <div className="text-center mb-8">
          <img src={logoImg} alt="ResuMatch Logo" className="w-16 h-16 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Create an Account
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            Sign up as an applicant to build & optimize your resume.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                First Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  required
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white transition-shadow"
                  placeholder="John"
                  value={firstName}
                  onChange={(e) => setFirstName(capitalizeFirstLetter(e.target.value))}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Last Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  required
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white transition-shadow"
                  placeholder="Doe"
                  value={lastName}
                  onChange={(e) => setLastName(capitalizeFirstLetter(e.target.value))}
                />
              </div>
            </div>
          </div>

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

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Password
            </label>
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

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Confirm Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type={showConfirmPassword ? "text" : "password"}
                required
                className="block w-full pl-10 pr-10 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white transition-shadow"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none"
                title={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* reCAPTCHA Robot Verification */}
          <div className="py-1">
            <CaptchaWidget 
              onVerify={(val) => {
                setIsCaptchaVerified(val);
                setCaptchaError('');
              }} 
              isVerified={isCaptchaVerified}
              error={captchaError}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-lg mt-6"
          >
            {isLoading ? (
              <Loader2 className="animate-spin h-5 w-5" />
            ) : (
              <>
                Create Account
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </button>
        </form>
        
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-primary-600 hover:text-primary-500 dark:text-primary-400 transition-colors">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
