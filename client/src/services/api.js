import axios from 'axios';
import { supabase } from '../config/supabase';

const api = axios.create({
  baseURL: import.meta.env.MODE === 'production' 
    ? 'https://resumatchvc3.onrender.com/api'
    : 'http://localhost:5000/api',
});

// Intercept requests to add Supabase Auth Bearer Token with proactive refresh
api.interceptors.request.use(async (config) => {
  try {
    let { data: { session } } = await supabase.auth.getSession();
    
    // Proactively refresh if token expires in less than 60 seconds
    if (session?.expires_at && (session.expires_at * 1000 < Date.now() + 60000)) {
      try {
        const { data: refreshData, error: refreshErr } = await supabase.auth.refreshSession();
        if (!refreshErr && refreshData?.session) {
          session = refreshData.session;
        }
      } catch (e) {
        console.warn('Proactive token refresh error:', e.message);
      }
    }

    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
    return config;
  } catch (error) {
    return Promise.reject(error);
  }
}, (error) => {
  return Promise.reject(error);
});

import { toast } from 'sonner';

let lastAuthToastTime = 0;

api.interceptors.response.use((response) => {
  return response;
}, async (error) => {
  const originalRequest = error.config;
  
  // If 401 received and not already retried, attempt to refresh session and retry once
  if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
    originalRequest._retry = true;
    try {
      const { data: refreshData, error: refreshErr } = await supabase.auth.refreshSession();
      if (!refreshErr && refreshData?.session?.access_token) {
        originalRequest.headers.Authorization = `Bearer ${refreshData.session.access_token}`;
        return api(originalRequest);
      }
    } catch (e) {
      console.warn('Token refresh on 401 failed:', e.message);
    }
    console.warn('API returned 401 Unauthorized:', error.config?.url);
    
    // Alert the user that session has expired if it hasn't alerted recently
    const now = Date.now();
    if (now - lastAuthToastTime > 15000) {
      lastAuthToastTime = now;
      toast.error('Session expired. Please sign out and sign in again.');
    }
  }
  
  return Promise.reject(error);
});

export default api;
