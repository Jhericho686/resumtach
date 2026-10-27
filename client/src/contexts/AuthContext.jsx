import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import api from '../services/api';
import { toast } from 'sonner';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Safety timeout to prevent white screen
    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 1200);

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        handleSessionChange(session);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        clearTimeout(safetyTimer);
        if (session) {
          handleSessionChange(session);
        } else {
          setUser(null);
          setLoading(false);
        }
      }
    );

    return () => {
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  const handleSessionChange = async (session) => {
    try {
      const supabaseUser = session.user;
      
      // Determine fallback info from Supabase metadata
      const rawName = supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || '';
      const displayParts = rawName.trim().split(' ');
      const fallbackFirstName = (displayParts[0] && !displayParts[0].includes('@')) ? displayParts[0] : 'User';
      const fallbackLastName = displayParts.slice(1).join(' ') || '';
      const emailLower = supabaseUser.email?.toLowerCase() || '';
      const metaRole = (supabaseUser.app_metadata?.role || supabaseUser.user_metadata?.role || '').toLowerCase();
      let fallbackRole = metaRole;
      if (!fallbackRole) {
        if (emailLower.includes('admin')) fallbackRole = 'admin';
        else if (emailLower.includes('staff') || emailLower.endsWith('@reedelsevier.com') || emailLower.includes('resumatch.com')) fallbackRole = 'staff';
        else fallbackRole = 'applicant';
      }

      let finalUser = {
        uid: supabaseUser.id,
        email: supabaseUser.email,
        firstName: fallbackFirstName,
        lastName: fallbackLastName,
        role: fallbackRole,
      };

      // Try to load profile from backend API
      try {
        const res = await api.get(`/users/${supabaseUser.id}`);
        const userProfile = res.data;
        
        // Only merge if it's a valid object (not an HTML string from a rewrite)
        if (userProfile && typeof userProfile === 'object' && !Array.isArray(userProfile)) {
          const dbFirstName = userProfile.firstName || userProfile.first_name;
          const cleanFirstName = (dbFirstName && !dbFirstName.includes('@')) ? dbFirstName : finalUser.firstName;
          const cleanLastName = (userProfile.lastName !== undefined && userProfile.lastName !== null && userProfile.lastName !== '')
            ? userProfile.lastName
            : ((userProfile.last_name !== undefined && userProfile.last_name !== null && userProfile.last_name !== '') ? userProfile.last_name : finalUser.lastName);

          finalUser = {
            ...finalUser,
            ...userProfile,
            firstName: cleanFirstName,
            lastName: cleanLastName,
            email: userProfile.email || finalUser.email || supabaseUser.email,
            phone: userProfile.phone || finalUser.phone || '',
            location: userProfile.location || finalUser.location || '',
            address: userProfile.location || userProfile.address || finalUser.address || '',
            skills: userProfile.skills || finalUser.skills || [],
            role: userProfile.role || finalUser.role,
          };
        }
      } catch (err) {
        // If backend responded with 404, try to auto-create the profile
        if (err.response?.status === 404) {
          try {
            await api.post('/users', {
              id: supabaseUser.id,
              first_name: finalUser.firstName,
              last_name: finalUser.lastName,
              email: finalUser.email,
              role: finalUser.role
            });
          } catch (_) {
            // Silent
          }
        }
      }

      setUser(finalUser);
    } catch (err) {
      console.warn('Session handling error:', err);
    } finally {
      setLoading(false);
    }
  };


  const login = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }
      
      toast.success('Login successful');
      return true;
    } catch (error) {
      console.error('Login error:', error);
      let msg = error.message || 'Invalid email or password';
      if (msg.toLowerCase().includes('email not confirmed')) {
        msg = 'Your email is not confirmed yet. Please verify your email or sign in again.';
      } else if (msg.toLowerCase().includes('invalid login credentials')) {
        msg = 'Invalid email or password. Please try again.';
      }
      toast.error(msg);
      return false;
    }
  };

  const register = async (email, password, userData) => {
    try {
      let firstName = '';
      let lastName = '';
      
      if (typeof userData === 'object' && userData !== null) {
        firstName = userData.firstName || '';
        lastName = userData.lastName || '';
      } else {
        firstName = userData || '';
      }
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: `${firstName} ${lastName}`.trim(),
          }
        }
      });
      
      if (error) throw error;
      
      toast.success('Registration successful. Welcome to ResuMatch!');
      return true;
    } catch (error) {
      console.error('Registration error:', error);
      let errorMessage = error.message || 'Registration failed. Please try again.';
      if (error.message && error.message.includes('already registered')) {
        errorMessage = 'This email is already registered.';
      }
      toast.error(errorMessage);
      return false;
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      toast.info('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to log out');
    }
  };

  const resetPassword = async (email) => {
    try {
      await supabase.auth.resetPasswordForEmail(email);
      toast.success('Password reset email sent (if the account exists)');
      return true;
    } catch (error) {
      console.error('Password reset error:', error);
      toast.error('Failed to send password reset email');
      return false;
    }
  };

  const normalizedRole = (user?.role || '').toLowerCase().trim();
  const isAdmin = normalizedRole === 'admin';
  const isStaff = normalizedRole === 'staff';
  const isHR = isAdmin || isStaff;
  const isApplicant = normalizedRole === 'applicant';

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    resetPassword,
    isAdmin,
    isStaff,
    isHR,
    isApplicant
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
