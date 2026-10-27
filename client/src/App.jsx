import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { Toaster } from 'sonner';

// Contexts — NOTE: ThemeProvider and AuthProvider are mounted in main.jsx
import { useAuth } from './contexts/AuthContext';

// Layouts
import DashboardLayout from './layouts/DashboardLayout';
import PublicLayout from './layouts/PublicLayout';
import ApplicantLayout from './layouts/ApplicantLayout';

// Public Pages
import HomePage from './pages/public/HomePage';
import JobSearch from './pages/public/JobSearch';
import PublicJobDetail from './pages/public/PublicJobDetail';
import PrivacyPolicy from './pages/public/PrivacyPolicy';
import CookiePolicy from './pages/public/CookiePolicy';
import TermsOfUse from './pages/public/TermsOfUse';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Applicant Pages
import ApplicantDashboard from './pages/applicant/ApplicantDashboard';
import MyApplications from './pages/applicant/MyApplications';
import ApplicantProfile from './pages/applicant/ApplicantProfile';
import ResumeUpload from './pages/applicant/ResumeUpload';
import ResumeBuilder from './pages/applicant/ResumeBuilder';
import ResumeEditor from './pages/applicant/ResumeEditor';
import ResumeViewer from './pages/shared/ResumeViewer';
import ApplicationSubmit from './pages/applicant/ApplicationSubmit';

// Admin Pages
import Dashboard from './pages/admin/Dashboard';
import Applicants from './pages/admin/Applicants';
import ApplicantView from './pages/admin/ApplicantView';
import Jobs from './pages/admin/Jobs';
import JobCreate from './pages/admin/JobCreate';
import JobDetail from './pages/admin/JobDetail';
import ResumeUploadPage from './pages/admin/ResumeUploadPage';
import Reports from './pages/admin/Reports';
import Settings from './pages/admin/Settings';
import ActivityLogs from './pages/admin/ActivityLogs';
import UsersPage from './pages/admin/Users';

// Loading Component
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
  </div>
);

// Protected Route components
const AdminRoute = ({ children }) => {
  const { user, loading, isAdmin, isStaff } = useAuth();
  if (loading) return <LoadingSpinner />;
  const role = (user?.role || '').toLowerCase().trim();
  const hasAccess = isAdmin || isStaff || role === 'admin' || role === 'staff';
  if (!user || !hasAccess) return <Navigate to="/login" replace />;
  return children;
};

// Route strictly reserved for Admin HR (e.g. User Management, Activity Logs)
const AdminOnlyRoute = ({ children }) => {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!user || !isAdmin) return <Navigate to="/admin" replace />;
  return children;
};

const ApplicantRoute = ({ children }) => {
  const { user, loading, isApplicant } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!user || !isApplicant) return <Navigate to="/login" replace />;
  return children;
};

const AuthRoute = ({ children }) => {
  const { user, loading, isAdmin, isStaff, isApplicant } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (user) {
    const role = (user?.role || '').toLowerCase().trim();
    if (isAdmin || isStaff || role === 'admin' || role === 'staff') return <Navigate to="/admin" replace />;
    if (isApplicant || role === 'applicant') return <Navigate to="/applicant" replace />;
    return <Navigate to="/" replace />;
  }
  return children;
};

// Helper redirect to ensure any legacy notification links /applicants/:id open in the Admin layout
const ApplicantRedirect = () => {
  const { id } = useParams();
  return <Navigate to={`/admin/applicants/${id}`} replace />;
};

// Route wrapper that checks if current visitor is an applicant: if so, keep within applicant portal shell
const AdaptiveJobSearch = () => {
  const { user, isApplicant } = useAuth();
  const role = (user?.role || '').toLowerCase().trim();
  if (user && (isApplicant || role === 'applicant')) {
    return <Navigate to="/applicant/jobs" replace />;
  }
  return <JobSearch />;
};

const AdaptiveJobDetail = () => {
  const { id } = useParams();
  const { user, isApplicant } = useAuth();
  const role = (user?.role || '').toLowerCase().trim();
  if (user && (isApplicant || role === 'applicant')) {
    return <Navigate to={`/applicant/jobs/${id}`} replace />;
  }
  return <PublicJobDetail />;
};

function AppRoutes() {
  const { loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Routes>
      {/* Public Facing Portal Routes */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/jobs" element={<AdaptiveJobSearch />} />
        <Route path="/jobs/:id" element={<AdaptiveJobDetail />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/cookies" element={<CookiePolicy />} />
        <Route path="/terms" element={<TermsOfUse />} />
        
        {/* Auth Routes */}
        <Route path="/login" element={
          <AuthRoute>
            <div className="min-h-[80vh] flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-900">
              <Login />
            </div>
          </AuthRoute>
        } />
        <Route path="/register" element={
          <AuthRoute>
            <div className="min-h-[80vh] flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-900">
              <Register />
            </div>
          </AuthRoute>
        } />
      </Route>

      {/* Applicant Portal Routes */}
      <Route path="/applicant" element={<ApplicantRoute><ApplicantLayout /></ApplicantRoute>}>
        <Route index element={<ApplicantDashboard />} />
        <Route path="applications" element={<MyApplications />} />
        <Route path="profile" element={<ApplicantProfile />} />
        <Route path="jobs" element={<JobSearch />} />
        <Route path="jobs/:id" element={<PublicJobDetail />} />
        <Route path="resume/upload" element={<ResumeUpload />} />
        <Route path="resume/create" element={<ResumeBuilder />} />
        <Route path="apply/:jobId" element={<ApplicationSubmit />} />
      </Route>

      {/* Standalone Full-Screen Resume Editor & View-Only Tab Viewer */}
      <Route path="/resume/view" element={<ResumeViewer />} />
      <Route path="/applicant/resume/edit" element={<ApplicantRoute><ResumeEditor /></ApplicantRoute>} />
      <Route path="/admin/resume/edit" element={<AdminRoute><ResumeEditor /></AdminRoute>} />

      {/* Admin Dashboard Routes */}
      <Route path="/admin" element={<AdminRoute><DashboardLayout /></AdminRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="applicants" element={<Applicants />} />
        <Route path="applicants/:id" element={<ApplicantView />} />
        <Route path="jobs" element={<Jobs />} />
        <Route path="jobs/create" element={<JobCreate />} />
        <Route path="jobs/:id" element={<JobDetail />} />
        <Route path="jobs/:id/edit" element={<JobCreate />} />
        <Route path="upload" element={<ResumeUploadPage />} />
        <Route path="reports" element={<Reports />} />
        <Route path="users" element={<AdminOnlyRoute><UsersPage /></AdminOnlyRoute>} />
        <Route path="settings" element={<Settings />} />
        <Route path="activity" element={<ActivityLogs />} />
      </Route>

      {/* Direct alias for applicant view from notifications */}
      <Route path="/applicants/:id" element={<ApplicantRedirect />} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
