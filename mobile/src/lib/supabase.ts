import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const supabaseUrl = 'https://pakusdbmpgrfhjouiniz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBha3VzZGJtcGdyZmhqb3Vpbml6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzOTU4MjAsImV4cCI6MjA4MDk3MTgyMH0.MuNMCwKub9HLBUkWD6F58xzYYh-fE_Til4C1OpFbg6Y';

import AsyncStorage from '@react-native-async-storage/async-storage';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});


