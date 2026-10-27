import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X, Settings, Check } from 'lucide-react';

const CookieConsent = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState({
    essential: true, // Always true
    analytics: true,
    marketing: false
  });

  useEffect(() => {
    const consent = localStorage.getItem('cookieConsent');
    if (!consent) {
      // Small delay to ensure it doesn't flash immediately on load
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = () => {
    const allAccepted = { essential: true, analytics: true, marketing: true };
    localStorage.setItem('cookieConsent', JSON.stringify(allAccepted));
    setPreferences(allAccepted);
    setIsVisible(false);
    setShowSettings(false);
  };

  const handleSavePreferences = () => {
    localStorage.setItem('cookieConsent', JSON.stringify(preferences));
    setIsVisible(false);
    setShowSettings(false);
  };

  const handleRejectNonEssential = () => {
    const essentialOnly = { essential: true, analytics: false, marketing: false };
    localStorage.setItem('cookieConsent', JSON.stringify(essentialOnly));
    setPreferences(essentialOnly);
    setIsVisible(false);
    setShowSettings(false);
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Main Banner */}
      {!showSettings && (
        <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 sm:p-6 pb-safe pointer-events-none">
          <div className="max-w-5xl mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 pointer-events-auto flex flex-col md:flex-row items-center gap-6 transform transition-all duration-500 ease-out translate-y-0">
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">We value your privacy</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                We use cookies to enhance your browsing experience, serve personalized ads or content, and analyze our traffic. By clicking "Accept All", you consent to our use of cookies. Read our <Link to="/cookies" className="text-primary-600 dark:text-primary-400 hover:underline">Cookie Policy</Link>.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
              <button 
                onClick={() => setShowSettings(true)}
                className="px-6 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition-colors whitespace-nowrap"
              >
                Cookie Settings
              </button>
              <button 
                onClick={handleRejectNonEssential}
                className="px-6 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-colors whitespace-nowrap"
              >
                Reject All
              </button>
              <button 
                onClick={handleAcceptAll}
                className="px-6 py-2.5 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl shadow-sm transition-colors whitespace-nowrap"
              >
                Accept All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={() => setShowSettings(false)} />
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col relative z-10 border border-gray-200 dark:border-gray-700">
            
            <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <Settings className="text-primary-600 dark:text-primary-400" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Cookie Preferences</h2>
              </div>
              <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                When you visit any website, it may store or retrieve information on your browser, mostly in the form of cookies. This information might be about you, your preferences or your device and is mostly used to make the site work as you expect it to.
              </p>

              {/* Essential */}
              <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-200 dark:border-gray-600 flex justify-between items-start gap-4">
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    Strictly Necessary Cookies
                    <span className="text-[10px] uppercase tracking-wider bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full font-bold">Always Active</span>
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">These cookies are necessary for the website to function and cannot be switched off in our systems. They are usually only set in response to actions made by you.</p>
                </div>
                <div className="pt-1">
                  <div className="w-12 h-6 bg-primary-600 rounded-full flex items-center px-1 opacity-60 cursor-not-allowed">
                    <div className="w-4 h-4 bg-white rounded-full transform translate-x-6" />
                  </div>
                </div>
              </div>

              {/* Analytics */}
              <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-200 dark:border-gray-600 flex justify-between items-start gap-4">
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white">Performance & Analytics Cookies</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">These cookies allow us to count visits and traffic sources so we can measure and improve the performance of our site. All information these cookies collect is aggregated and therefore anonymous.</p>
                </div>
                <div className="pt-1">
                   <button 
                     onClick={() => setPreferences(prev => ({ ...prev, analytics: !prev.analytics }))}
                     className={`w-12 h-6 rounded-full flex items-center px-1 transition-colors ${preferences.analytics ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                   >
                     <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${preferences.analytics ? 'translate-x-6' : 'translate-x-0'}`} />
                   </button>
                </div>
              </div>

              {/* Marketing */}
              <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-200 dark:border-gray-600 flex justify-between items-start gap-4">
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white">Targeting & Advertising Cookies</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">These cookies may be set through our site by our advertising partners. They may be used by those companies to build a profile of your interests and show you relevant adverts on other sites.</p>
                </div>
                <div className="pt-1">
                   <button 
                     onClick={() => setPreferences(prev => ({ ...prev, marketing: !prev.marketing }))}
                     className={`w-12 h-6 rounded-full flex items-center px-1 transition-colors ${preferences.marketing ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                   >
                     <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${preferences.marketing ? 'translate-x-6' : 'translate-x-0'}`} />
                   </button>
                </div>
              </div>

            </div>

            <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 flex justify-end gap-3 rounded-b-2xl">
              <button 
                onClick={handleRejectNonEssential}
                className="px-6 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors"
              >
                Reject Non-Essential
              </button>
              <button 
                onClick={handleSavePreferences}
                className="px-6 py-2.5 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl shadow-sm transition-colors flex items-center gap-2"
              >
                <Check size={16} /> Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CookieConsent;
