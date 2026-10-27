import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import api from '../services/api';
import { notificationsService } from '../services/firestore';
import { 
  LayoutDashboard, Briefcase, Users, FileUp, 
  Settings, PieChart, Activity, FileText,
  LogOut, Menu, X, Sun, Moon, Bell, UserCog
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

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const { user, logout, isAdmin } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();

  const fetchNotifications = async () => {
    try {
      const list = await notificationsService.getNotifications(user?.uid);
      setNotifications(list || []);
      setUnreadCount((list || []).filter(n => !n.is_read && !n.isRead).length);
    } catch (e) {
      console.error('Failed to fetch notifications', e);
    }
  };

  useEffect(() => {
    if (user?.uid) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 10000);
      return () => clearInterval(interval);
    }
  }, [user?.uid]);

  const markAllRead = async () => {
    try {
      if (user?.uid) {
        await notificationsService.markAllRead(user.uid);
        fetchNotifications();
      }
    } catch (e) {
      console.error('Failed to mark notifications read', e);
    }
  };

  const handleLogoutClick = () => setShowLogoutModal(true);
  const handleLogoutConfirm = () => { setShowLogoutModal(false); logout(); };
  const handleLogoutCancel = () => setShowLogoutModal(false);

  const navigation = [
    { name: 'Dashboard', to: '/admin', icon: LayoutDashboard },
    { name: 'Jobs', to: '/admin/jobs', icon: Briefcase },
    { name: 'Applicants', to: '/admin/applicants', icon: Users },
    { name: 'Upload Resume', to: '/admin/upload', icon: FileUp },
    { name: 'Reports', to: '/admin/reports', icon: FileText },
  ];

  navigation.push({ name: 'Activity Logs', to: '/admin/activity', icon: Activity });

  if (isAdmin) {
    navigation.push({ name: 'Staff Management', to: '/admin/users', icon: UserCog });
  }

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
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} ${shouldAnimate ? 'animate-yann-sidebar' : ''}`}>
        <div className="h-16 flex items-center px-4 border-b border-gray-200 dark:border-gray-700">
          <Link to="/admin" className="flex items-center gap-2 text-primary-600 dark:text-primary-400">
            <img src={logoImg} alt="Reed Elsevier" className="w-8 h-8 object-contain" />
            <span className="text-xl font-bold tracking-tight">Reed Elsevier</span>
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
                active={location.pathname === item.to || (item.to !== '/' && item.to !== '/admin' && location.pathname.startsWith(item.to))}
              />
            ))}
          </nav>

          <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="flex items-center px-3 py-2">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-700 dark:text-primary-300 font-bold">
                  {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate w-32">{user?.firstName} {user?.lastName}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user?.role}</p>
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
        <header className={`h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 ${shouldAnimate ? 'animate-yann-topbar' : ''}`}>
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <Menu size={24} />
          </button>
          
          <div className="flex-1 px-4 flex justify-between">
            <div className="flex-1 flex">
              {/* Search placeholder */}
            </div>
            <div className="ml-4 flex items-center gap-4 md:ml-6">
              <button
                onClick={toggleTheme}
                className="p-1 rounded-full text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none"
              >
                {isDark ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(p => !p)}
                  className="p-1 rounded-full text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none relative"
                >
                  <span className="sr-only">View notifications</span>
                  <Bell size={20} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white animate-pulse">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/60">
                      <div className="flex items-center gap-2">
                        <Bell size={18} className="text-primary-600 dark:text-primary-400" />
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white">Notifications</h3>
                        {unreadCount > 0 && (
                          <span className="px-2 py-0.5 text-xs font-semibold bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300 rounded-full">
                            {unreadCount} new
                          </span>
                        )}
                      </div>
                      {unreadCount > 0 && (
                        <button onClick={markAllRead} className="text-xs font-medium text-primary-600 hover:underline dark:text-primary-400">
                          Mark all read
                        </button>
                      )}
                    </div>

                    <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-sm text-gray-400">No notifications yet</div>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                              !n.is_read && !n.isRead ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                    n.type === 'success' ? 'bg-green-500' : n.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                                  }`} />
                                  <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{n.title}</p>
                                </div>
                                <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">{n.message}</p>
                                {n.link && (
                                  <Link
                                    to={n.link.startsWith('/applicants/') ? `/admin${n.link}` : n.link}
                                    onClick={() => setShowNotifications(false)}
                                    className="inline-block mt-2 text-xs font-semibold text-primary-600 hover:underline dark:text-primary-400"
                                  >
                                    View Details →
                                  </Link>
                                )}
                              </div>
                              <span className="text-[10px] text-gray-400 flex-shrink-0">
                                {n.createdAt || n.created_at ? new Date(n.createdAt || n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className={`flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8 ${shouldAnimate ? 'animate-yann-content' : ''}`}>
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

export default DashboardLayout;
