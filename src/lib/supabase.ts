import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

// Use environment variables with fallback to hardcoded values (for backwards compatibility)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://pakusdbmpgrfhjouiniz.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBha3VzZGJtcGdyZmhqb3Vpbml6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzOTU4MjAsImV4cCI6MjA4MDk3MTgyMH0.MuNMCwKub9HLBUkWD6F58xzYYh-fE_Til4C1OpFbg6Y';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
    },
});


