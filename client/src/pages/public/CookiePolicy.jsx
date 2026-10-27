import React from 'react';
import { Link } from 'react-router-dom';

const CookiePolicy = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 md:p-12">
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white mb-6">Cookie Policy</h1>
        
        <div className="prose dark:prose-invert max-w-none text-gray-600 dark:text-gray-300 space-y-6">
          <p>
            This Cookie Policy explains how ResuMatch uses cookies and similar technologies to recognize you when you visit our website. It explains what these technologies are and why we use them, as well as your rights to control our use of them.
          </p>

          <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-4">What are cookies?</h2>
          <p>
            Cookies are small data files that are placed on your computer or mobile device when you visit a website. Cookies are widely used by website owners in order to make their websites work, or to work more efficiently, as well as to provide reporting information.
          </p>

          <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-4">Why do we use cookies?</h2>
          <p>We use first and third-party cookies for several reasons. Some cookies are required for technical reasons in order for our Website to operate, and we refer to these as "essential" or "strictly necessary" cookies. Other cookies also enable us to track and target the interests of our users to enhance the experience on our Website.</p>

          <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-4">Types of cookies we use</h2>
          
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-200 dark:border-gray-600">
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">Essential Cookies</h3>
              <p className="text-sm">These cookies are strictly necessary to provide you with services available through our Website and to use some of its features, such as access to secure areas. Because these cookies are strictly necessary to deliver the Website, you cannot refuse them without impacting how our Website functions.</p>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-200 dark:border-gray-600">
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">Performance and Functionality Cookies</h3>
              <p className="text-sm">These cookies are used to enhance the performance and functionality of our Website but are non-essential to their use. However, without these cookies, certain functionality may become unavailable.</p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-200 dark:border-gray-600">
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">Analytics and Customization Cookies</h3>
              <p className="text-sm">These cookies collect information that is used either in aggregate form to help us understand how our Website is being used or how effective our marketing campaigns are, or to help us customize our Website for you.</p>
            </div>
          </div>

          <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-4">How can I control cookies?</h2>
          <p>
            You have the right to decide whether to accept or reject cookies. You can exercise your cookie preferences by clicking on the appropriate opt-out links provided in our Cookie Consent banner or settings modal.
          </p>
          <p>
            You can set or amend your web browser controls to accept or refuse cookies. If you choose to reject cookies, you may still use our website though your access to some functionality and areas of our website may be restricted.
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

export default CookiePolicy;
