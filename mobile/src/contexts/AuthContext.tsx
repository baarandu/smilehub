import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { View, ActivityIndicator, Alert } from 'react-native';
import { subscriptionService } from '../services/subscription';

type AuthContextType = {
    session: Session | null;
    user: User | null;
    isLoading: boolean;
    role: string | null;
    hasActiveSubscription: boolean;
    isTrialExpired: boolean;
    trialDaysLeft: number | null;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string, name?: string, accountType?: 'solo' | 'clinic', clinicName?: string, gender?: 'male' | 'female') => Promise<void>;
    signOut: () => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
    refreshSubscription: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    isLoading: true,
    role: null,
    hasActiveSubscription: false,
    isTrialExpired: false,
    trialDaysLeft: null,
    signIn: async () => { },
    signUp: async () => { },
    signOut: async () => { },
    resetPassword: async () => { },
    refreshSubscription: async () => { },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [role, setRole] = useState<string | null>(null);
    const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
    const [isTrialExpired, setIsTrialExpired] = useState(false);
    const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);

    const checkSubscription = async (userId: string) => {
        console.log('AUTH_CONTEXT: checkSubscription for user:', userId);
        try {
            // First check if user is super admin
            const { data: profile } = await supabase
                .from('profiles')
                .select('is_super_admin')
                .eq('id', userId)
                .single() as { data: { is_super_admin: boolean } | null, error: any };

            if (profile?.is_super_admin) {
                console.log('AUTH_CONTEXT: checkSubscription - User is SUPER ADMIN. Bypassing checks.');
                setRole('owner'); // Super admin acts as owner
                setHasActiveSubscription(true);
                setIsTrialExpired(false);
                setTrialDaysLeft(null);
                setIsLoading(false);
                return;
            }

            const { data: clinicUser } = await supabase
                .from('clinic_users')
                .select('clinic_id, role')
                .eq('user_id', userId)
                .single();

            if (clinicUser) {
                console.log('AUTH_CONTEXT: checkSubscription - clinicUser found:', clinicUser);
                setRole((clinicUser as any).role);
                const subStatus = await subscriptionService.getCurrentSubscription((clinicUser as any).clinic_id);
                console.log('AUTH_CONTEXT: checkSubscription - subStatus:', subStatus);
                // Consider active if active or trialing (and not expired)
                const isActive = subStatus.isActive || subStatus.isTrialing;
                console.log('AUTH_CONTEXT: checkSubscription - isActive:', isActive);
                console.log('AUTH_CONTEXT: checkSubscription - isTrialExpired:', subStatus.isTrialExpired);
                console.log('AUTH_CONTEXT: checkSubscription - trialDaysLeft:', subStatus.trialDaysLeft);
                setHasActiveSubscription(isActive);
                setIsTrialExpired(subStatus.isTrialExpired);
                setTrialDaysLeft(subStatus.trialDaysLeft);
            } else {
                console.log('AUTH_CONTEXT: checkSubscription - NO clinicUser found');
                setRole(null);
                setHasActiveSubscription(false);
                setIsTrialExpired(false);
                setTrialDaysLeft(null);
            }
        } catch (error) {
            console.error('Error checking subscription:', error);
            setHasActiveSubscription(false);
        }
    };

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                checkSubscription(session.user.id).then(() => setIsLoading(false));
            } else {
                setIsLoading(false);
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                // Determine if we need to show loading during auth state change
                // Usually better to keep loading state if we are fetching extra data
                // But for seamless nav, maybe not. Let's keep it simple.
                await checkSubscription(session.user.id);
            } else {
                setRole(null);
                setHasActiveSubscription(false);
            }
            setIsLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const signIn = async (email: string, password: string) => {
        setIsLoading(true);
        try {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            // State update will trigger via onAuthStateChange
        } catch (error: any) {
            console.error(error);
            Alert.alert('Erro no Login', error.message || 'Falha ao entrar.');
            setIsLoading(false); // Manually stop loading on error since auth change might not fire
            throw error;
        }
    };

    const signUp = async (
        email: string,
        password: string,
        name?: string,
        accountType: 'solo' | 'clinic' = 'solo',
        clinicName?: string,
        gender?: 'male' | 'female'
    ) => {
        setIsLoading(true);
        try {
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: name,
                        account_type: accountType,
                        clinic_name: clinicName,
                        gender: gender,
                    }
                }
            });
            if (error) throw error;
            Alert.alert('Cadastro Concluído', 'Sua conta foi criada com sucesso!');
        } catch (error: any) {
            console.error(error);
            Alert.alert('Erro no Cadastro', error.message || 'Falha ao cadastrar.');
            setIsLoading(false);
            throw error;
        }
    };

    const signOut = async () => {
        setIsLoading(true);
        try {
            await supabase.auth.signOut();
            setRole(null);
            setHasActiveSubscription(false);
            setIsTrialExpired(false);
            setTrialDaysLeft(null);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const resetPassword = async (email: string) => {
        setIsLoading(true);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: 'organizaodonto://reset-password',
            });
            if (error) throw error;
            Alert.alert('Email Enviado', 'Verifique sua caixa de entrada para redefinir a senha.');
        } catch (error: any) {
            console.error(error);
            Alert.alert('Erro', error.message || 'Não foi possível enviar o email de recuperação.');
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const refreshSubscription = async () => {
        if (session?.user) {
            await checkSubscription(session.user.id);
        }
    };

    return (
        <AuthContext.Provider value={{ session, user, isLoading, role, hasActiveSubscription, isTrialExpired, trialDaysLeft, signIn, signUp, signOut, resetPassword, refreshSubscription }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
