import React from 'react';
import { Link } from 'react-router-dom';

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 md:p-12">
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white mb-6">Privacy Policy</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Last Updated: September 9, 2026</p>
        
        <div className="prose dark:prose-invert max-w-none text-gray-600 dark:text-gray-300 space-y-6">
          <p>
            At ResuMatch ("we", "our", or "us"), we respect your privacy and are committed to protecting your personal data. This privacy policy will inform you as to how we look after your personal data when you visit our website (regardless of where you visit it from) and tell you about your privacy rights and how the law protects you.
          </p>

          <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-4">1. Important Information and Who We Are</h2>
          <p>
            This privacy policy aims to give you information on how ResuMatch collects and processes your personal data through your use of this website, including any data you may provide through this website when you sign up for an account, upload a resume, or apply for a job.
          </p>

          <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-4">2. The Data We Collect About You</h2>
          <p>We may collect, use, store and transfer different kinds of personal data about you which we have grouped together as follows:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Identity Data:</strong> includes first name, last name, username or similar identifier, and title.</li>
            <li><strong>Contact Data:</strong> includes email address and telephone numbers.</li>
            <li><strong>Professional Data:</strong> includes resumes, CVs, employment history, education, skills, and qualifications you submit.</li>
            <li><strong>Technical Data:</strong> includes internet protocol (IP) address, your login data, browser type and version, time zone setting and location, browser plug-in types and versions, operating system and platform, and other technology on the devices you use to access this website.</li>
            <li><strong>Profile Data:</strong> includes your username and password, applications made by you, your interests, preferences, feedback and survey responses.</li>
          </ul>

          <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-4">3. How We Use Your Personal Data</h2>
          <p>We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>To register you as a new applicant or user.</li>
            <li>To process your job applications and evaluate your suitability for roles.</li>
            <li>To manage our relationship with you.</li>
            <li>To use data analytics and AI matching to improve our website, services, marketing, customer relationships and experiences.</li>
          </ul>
          
          <div className="bg-primary-50 dark:bg-primary-900/30 p-6 rounded-xl border border-primary-100 dark:border-primary-800 mt-6">
            <h3 className="font-bold text-primary-900 dark:text-primary-100 mb-2">Notice regarding AI Processing</h3>
            <p className="text-sm text-primary-800 dark:text-primary-200">
              Your resume data is processed by our proprietary AI matching engine to extract relevant skills, experience, and qualifications to match you with suitable job opportunities. The AI provides a recommendation, but <strong>final hiring decisions are always made by a human administrator</strong>.
            </p>
          </div>

          <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-4">4. Data Security</h2>
          <p>
            We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used or accessed in an unauthorized way, altered or disclosed. Your resume and personal information are stored securely using private Cloud Storage with strict access controls. Only authorized administrators can view your complete profile and resume.
          </p>

          <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-4">5. Your Legal Rights</h2>
          <p>Under certain circumstances, you have rights under data protection laws in relation to your personal data, including the right to:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Request access to your personal data.</li>
            <li>Request correction of your personal data.</li>
            <li>Request erasure of your personal data.</li>
            <li>Object to processing of your personal data.</li>
            <li>Request restriction of processing your personal data.</li>
          </ul>

          <p className="mt-8">
            If you have any questions about this privacy policy or our privacy practices, please contact us.
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

export default PrivacyPolicy;
