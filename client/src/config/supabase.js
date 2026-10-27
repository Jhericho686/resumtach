import { createClient } from '@supabase/supabase-js';

let supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://moiylbzxksrgosndhnmy.supabase.co';

// Auto-correct any typo in environment variable string from Vercel
if (supabaseUrl.includes('moeylbzxksrgosndhnmy')) {
  supabaseUrl = supabaseUrl.replace('moeylbzxksrgosndhnmy', 'moiylbzxksrgosndhnmy');
}

const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vaXlsYnp4a3NyZ29zbmRobm15Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1MzQ2MDYsImV4cCI6MjEwNTExMDYwNn0.jx1vn7keNZnux129wljo4F9v5DhTeyByMy3sp7bAa3w';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
