import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Settings as Cog6ToothIcon, 
  Database as CircleStackIcon, 
  Sparkles as SparklesIcon, 
  Bell as BellIcon, 
  Shield as ShieldCheckIcon,
  CheckCircle as CheckCircleIcon
} from 'lucide-react';
import { toast } from 'sonner';

const Settings = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('general');
  const [saved, setSaved] = useState(false);

  // Settings state
  const [generalSettings, setGeneralSettings] = useState({
    companyName: 'ResuMatch Organization',
    contactEmail: user?.email || 'admin@resumatch.com',
    defaultJobType: 'Full-Time',
    autoArchiveDays: 90
  });

  const [aiSettings, setAiSettings] = useState({
    minMatchThreshold: 65,
    enableAutoTagging: true,
    skillWeight: 40,
    experienceWeight: 35,
    educationWeight: 25,
    aiModel: 'Llama-3-70b (Groq AI)'
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailOnNewApplication: true,
    emailOnHighMatch: true,
    dailyDigest: false,
    systemAlerts: true
  });

  const handleSave = (e) => {
    e.preventDefault();
    setSaved(true);
    toast.success('Settings updated successfully!');
    setTimeout(() => setSaved(false), 3000);
  };

  const tabs = [
    { id: 'general', name: 'General', icon: Cog6ToothIcon },
    { id: 'ai', name: 'AI & Matching Engine', icon: SparklesIcon },
    { id: 'firebase', name: 'Firebase & Database', icon: CircleStackIcon },
    { id: 'notifications', name: 'Notifications', icon: BellIcon },
    { id: 'security', name: 'Security & Auth', icon: ShieldCheckIcon },
  ];

  return (
    <div className="space-y-6 yann-stagger-1">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage your ATS configurations, AI matching parameters, and database connections.
          </p>
        </div>
        <button
          onClick={handleSave}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 transition-colors"
        >
          {saved && <CheckCircleIcon className="w-5 h-5 mr-2" />}
          Save Changes
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8 overflow-x-auto" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isCurrent = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  isCurrent
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <Icon className="w-5 h-5" />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* General Settings */}
      {activeTab === 'general' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Organization & Portal Profile</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Organization Name
              </label>
              <input
                type="text"
                value={generalSettings.companyName}
                onChange={(e) => setGeneralSettings({ ...generalSettings, companyName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Primary Contact Email
              </label>
              <input
                type="email"
                value={generalSettings.contactEmail}
                onChange={(e) => setGeneralSettings({ ...generalSettings, contactEmail: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Default Employment Type
              </label>
              <select
                value={generalSettings.defaultJobType}
                onChange={(e) => setGeneralSettings({ ...generalSettings, defaultJobType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              >
                <option>Full-Time</option>
                <option>Part-Time</option>
                <option>Contract</option>
                <option>Internship</option>
                <option>Remote</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Auto-Archive Inactive Jobs (Days)
              </label>
              <input
                type="number"
                value={generalSettings.autoArchiveDays}
                onChange={(e) => setGeneralSettings({ ...generalSettings, autoArchiveDays: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
        </div>
      )}

      {/* AI Matching Engine Settings */}
      {activeTab === 'ai' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">AI Matching Algorithm Parameters</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Configure how resumes are scored and matched against job requirements.
              </p>
            </div>
            <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold rounded-full">
              Groq Llama 3 Active
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-gray-700 dark:text-gray-300">Minimum Match Threshold to Flag as Top Candidate</span>
                <span className="font-bold text-primary-600">{aiSettings.minMatchThreshold}%</span>
              </div>
              <input
                type="range"
                min="40"
                max="95"
                value={aiSettings.minMatchThreshold}
                onChange={(e) => setAiSettings({ ...aiSettings, minMatchThreshold: Number(e.target.value) })}
                className="w-full accent-primary-600"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-100 dark:border-gray-700">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Skills Match Weight ({aiSettings.skillWeight}%)
                </label>
                <input
                  type="range"
                  min="10"
                  max="70"
                  value={aiSettings.skillWeight}
                  onChange={(e) => setAiSettings({ ...aiSettings, skillWeight: Number(e.target.value) })}
                  className="w-full accent-primary-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Experience Weight ({aiSettings.experienceWeight}%)
                </label>
                <input
                  type="range"
                  min="10"
                  max="70"
                  value={aiSettings.experienceWeight}
                  onChange={(e) => setAiSettings({ ...aiSettings, experienceWeight: Number(e.target.value) })}
                  className="w-full accent-primary-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Education Weight ({aiSettings.educationWeight}%)
                </label>
                <input
                  type="range"
                  min="10"
                  max="70"
                  value={aiSettings.educationWeight}
                  onChange={(e) => setAiSettings({ ...aiSettings, educationWeight: Number(e.target.value) })}
                  className="w-full accent-primary-600"
                />
              </div>
            </div>

            {/* Recommendation Tiers Rubric Display */}
            <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Hiring Recommendation Tiers</h3>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                  <span className="font-bold text-emerald-700 dark:text-emerald-300 block text-sm">80 - 100%</span>
                  <span className="font-semibold text-emerald-800 dark:text-emerald-200 uppercase">Strongly Recommend</span>
                  <p className="text-emerald-600 dark:text-emerald-400 mt-1">Exceptional match meeting all core and required qualifications.</p>
                </div>
                <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800">
                  <span className="font-bold text-green-700 dark:text-green-300 block text-sm">60 - 79%</span>
                  <span className="font-semibold text-green-800 dark:text-green-200 uppercase">Recommend</span>
                  <p className="text-green-600 dark:text-green-400 mt-1">Solid candidate meeting required competencies and skills.</p>
                </div>
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
                  <span className="font-bold text-amber-700 dark:text-amber-300 block text-sm">50 - 59%</span>
                  <span className="font-semibold text-amber-800 dark:text-amber-200 uppercase">Consider</span>
                  <p className="text-amber-600 dark:text-amber-400 mt-1">Borderline candidate with minor skill gaps or transferable skills.</p>
                </div>
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800">
                  <span className="font-bold text-red-700 dark:text-red-300 block text-sm">0 - 49%</span>
                  <span className="font-semibold text-red-800 dark:text-red-200 uppercase">Not Recommended</span>
                  <p className="text-red-600 dark:text-red-400 mt-1">Unqualified candidate lacking critical skills or stack alignment.</p>
                </div>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-gray-100 dark:border-gray-700">
              <div>
                <p className="font-medium text-gray-900 dark:text-white text-sm">Automatic Skill Extraction</p>
                <p className="text-xs text-gray-500">Automatically parse skills from uploaded resumes and tag applicants.</p>
              </div>
              <input
                type="checkbox"
                checked={aiSettings.enableAutoTagging}
                onChange={(e) => setAiSettings({ ...aiSettings, enableAutoTagging: e.target.checked })}
                className="h-5 w-5 text-primary-600 rounded border-gray-300 dark:border-gray-600 focus:ring-primary-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Firebase & Database Connection */}
      {activeTab === 'firebase' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Firebase Project Connection</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Connected Firebase services: Authentication, Cloud Firestore, Cloud Storage, and Google Analytics.
              </p>
            </div>
            <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-full text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Connected
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase">Project ID</p>
              <p className="text-sm font-mono font-bold text-gray-900 dark:text-white mt-1">resumatch-c463c</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase">Auth Domain</p>
              <p className="text-sm font-mono font-bold text-gray-900 dark:text-white mt-1">resumatch-c463c.firebaseapp.com</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase">Storage Bucket</p>
              <p className="text-sm font-mono font-bold text-gray-900 dark:text-white mt-1">resumatch-c463c.firebasestorage.app</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase">Analytics Measurement ID</p>
              <p className="text-sm font-mono font-bold text-gray-900 dark:text-white mt-1">G-W535KS2XTJ</p>
            </div>
          </div>

          <div className="p-4 border border-blue-200 bg-blue-50/50 dark:bg-blue-900/20 dark:border-blue-800 rounded-lg text-sm text-blue-800 dark:text-blue-300">
            <p className="font-semibold mb-1">Firestore Collections Used:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li><code className="font-mono font-semibold">users</code>: User accounts with roles (admin, applicant) and profile info</li>
              <li><code className="font-mono font-semibold">jobs</code>: Job listings, requirements, status, and metadata</li>
              <li><code className="font-mono font-semibold">applications</code>: Job applications, match score, resume URL, applicant ID</li>
              <li><code className="font-mono font-semibold">activity_logs</code>: Admin actions, application events, and audit trail</li>
            </ul>
          </div>
        </div>
      )}

      {/* Notifications */}
      {activeTab === 'notifications' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Email & System Notifications</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-white text-sm">New Application Alert</p>
                <p className="text-xs text-gray-500">Send notification whenever an applicant submits an application.</p>
              </div>
              <input
                type="checkbox"
                checked={notificationSettings.emailOnNewApplication}
                onChange={(e) => setNotificationSettings({ ...notificationSettings, emailOnNewApplication: e.target.checked })}
                className="h-5 w-5 text-primary-600 rounded border-gray-300 dark:border-gray-600"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-white text-sm">High AI Match Notification</p>
                <p className="text-xs text-gray-500">Alert admin immediately when an applicant scores 80%+ match.</p>
              </div>
              <input
                type="checkbox"
                checked={notificationSettings.emailOnHighMatch}
                onChange={(e) => setNotificationSettings({ ...notificationSettings, emailOnHighMatch: e.target.checked })}
                className="h-5 w-5 text-primary-600 rounded border-gray-300 dark:border-gray-600"
              />
            </div>
          </div>
        </div>
      )}

      {/* Security */}
      {activeTab === 'security' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Security & Roles</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            ResuMatch ATS operates on a strict 2-tier role model: <strong>Admin</strong> (full management & ATS control) and <strong>Applicant</strong> (job search, resume builder, and applications tracking).
          </p>
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-800 dark:text-amber-300">
            <p className="font-semibold">Role-Based Access Enforcement:</p>
            <p className="text-xs mt-1">HR Staff role has been removed. All administrative management is centralized in the Admin console secured by Firebase Authentication and Firestore Security Rules.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
