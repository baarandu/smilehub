import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';
import { SecureStorageAdapter } from './secureStorage';

// Environment variables - MUST be configured in .env file
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Validate environment variables are set
if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
        'Missing Supabase environment variables. ' +
        'Please ensure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are set in your .env file.'
    );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: SecureStorageAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});

// Listener global para tratar erros de refresh token inválido
// Quando o token é inválido, faz logout automático ao invés de ficar em loop
supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'TOKEN_REFRESHED' && !session) {
        // Token refresh falhou - limpar sessão
        supabase.auth.signOut();
    }
});

// Interceptar erros de auth para tratar refresh token inválido
const originalGetSession = supabase.auth.getSession.bind(supabase.auth);
(supabase.auth as any).getSession = async () => {
    try {
        const result = await originalGetSession();
        return result;
    } catch (error: any) {
        if (error?.message?.includes('Refresh Token') ||
            error?.code === 'refresh_token_not_found') {
            // Refresh token inválido - fazer logout silencioso
            await supabase.auth.signOut();
            return { data: { session: null }, error: null };
        }
        throw error;
    }
};

const originalGetUser = supabase.auth.getUser.bind(supabase.auth);
(supabase.auth as any).getUser = async () => {
    try {
        const result = await originalGetUser();
        return result;
    } catch (error: any) {
        if (error?.message?.includes('Refresh Token') ||
            error?.code === 'refresh_token_not_found') {
            // Refresh token inválido - fazer logout silencioso
            await supabase.auth.signOut();
            return { data: { user: null }, error: null };
        }
        throw error;
    }
};






