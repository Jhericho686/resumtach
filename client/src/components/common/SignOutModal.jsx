import React from 'react';
import { LogOut } from 'lucide-react';

/**
 * SignOutModal
 * 
 * Consistent confirmation modal used across all layouts (Applicant, Admin, and Public)
 * before logging out of an account.
 */
const SignOutModal = ({ isOpen, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onCancel}
      />
      
      {/* Dialog */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-sm mx-auto flex flex-col items-center gap-4 z-10 border border-gray-100 dark:border-gray-700">
        <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
          <LogOut size={28} className="text-red-600 dark:text-red-400" />
        </div>
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Sign Out?</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center leading-relaxed">
          Are you sure you want to log out of your account?
        </p>
        <div className="flex gap-3 w-full mt-2">
          <button
            id="logout-cancel-btn"
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
          >
            No, Stay
          </button>
          <button
            id="logout-confirm-btn"
            type="button"
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white text-sm font-semibold transition-all shadow-md cursor-pointer"
          >
            Yes, Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};

export default SignOutModal;
