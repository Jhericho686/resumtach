import React from 'react';
import { Link } from 'react-router-dom';

const TermsOfUse = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 md:p-12">
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white mb-6">Terms of Use</h1>
        
        <div className="prose dark:prose-invert max-w-none text-gray-600 dark:text-gray-300 space-y-6">
          <p>
            Welcome to ResuMatch. These Terms of Use govern your access to and use of our Applicant Tracking System, website, and services. By accessing or using our services, you agree to be bound by these Terms.
          </p>

          <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-4">1. Acceptance of Terms</h2>
          <p>
            By creating an account, submitting an application, or using any part of the ResuMatch platform, you agree to comply with and be bound by these Terms. If you do not agree to these Terms, you may not access or use the services.
          </p>

          <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-4">2. Account Registration</h2>
          <p>
            To use certain features of the service, you must register for an account. You agree to provide accurate, current, and complete information during the registration process and to update such information to keep it accurate, current, and complete. You are responsible for safeguarding your password and for all activities that occur under your account.
          </p>

          <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-4">3. Prohibited Conduct</h2>
          <p>You agree not to engage in any of the following prohibited activities:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Uploading files that contain viruses, trojan horses, worms, logic bombs, or other material that is malicious or technologically harmful.</li>
            <li>Attempting to gain unauthorized access to, interfere with, damage, or disrupt any parts of the platform, the server on which the platform is stored, or any server, computer, or database connected to the platform.</li>
            <li>Submitting false, inaccurate, or misleading information in your profile or job applications.</li>
            <li>Using the service for any illegal or unauthorized purpose.</li>
          </ul>

          <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-4">4. Intellectual Property</h2>
          <p>
            The service and its original content, features, and functionality are and will remain the exclusive property of ResuMatch and its licensors. Our trademarks and trade dress may not be used in connection with any product or service without the prior written consent of ResuMatch.
          </p>
          <p>
            You retain all rights in, and are solely responsible for, the User Content (such as resumes and profile data) you post to ResuMatch.
          </p>

          <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-4">5. Disclaimer of Warranties</h2>
          <p>
            Your use of the service is at your sole risk. The service is provided on an "AS IS" and "AS AVAILABLE" basis. ResuMatch expressly disclaims all warranties of any kind, whether express or implied.
          </p>

          <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-4">6. Limitation of Liability</h2>
          <p>
            In no event shall ResuMatch, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the service.
          </p>
        </div>
        
        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700 text-center">
          <Link to="/" className="text-primary-600 dark:text-primary-400 font-medium hover:underline">
            Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default TermsOfUse;
