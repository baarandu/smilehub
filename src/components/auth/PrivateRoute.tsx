import { useEffect, useState, useRef } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

// Cache global para evitar loading ao voltar de outra aba
let cachedAuthState: {
    session: any;
    isAllowed: boolean;
    isTrialExpired: boolean;
    timestamp: number;
} | null = null;

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

export function PrivateRoute() {
    // Usa cache se disponível e não expirado
    const hasValidCache = cachedAuthState && (Date.now() - cachedAuthState.timestamp < CACHE_DURATION);

    const [session, setSession] = useState<any>(hasValidCache ? cachedAuthState.session : null);
    const [loading, setLoading] = useState(!hasValidCache);

    // Add Super Admin and Subscription logic
    const [isChecking, setIsChecking] = useState(!hasValidCache);
    const [isAllowed, setIsAllowed] = useState(hasValidCache ? cachedAuthState.isAllowed : false);
    const [isTrialExpired, setIsTrialExpired] = useState(hasValidCache ? cachedAuthState.isTrialExpired : false);

    const hasInitialized = useRef(hasValidCache);

    // Função para salvar no cache
    const saveToCache = (sessionData: any, allowed: boolean, trialExpired: boolean) => {
        cachedAuthState = {
            session: sessionData,
            isAllowed: allowed,
            isTrialExpired: trialExpired,
            timestamp: Date.now(),
        };
    };

    useEffect(() => {
        // Se já tem cache válido, não precisa verificar novamente
        if (hasInitialized.current) {
            return;
        }

        let mounted = true;

        const checkAccess = async () => {
            const { data: { session: sessionData } } = await supabase.auth.getSession();

            if (!sessionData) {
                cachedAuthState = null; // Limpa cache se não tem sessão
                if (mounted) {
                    setSession(null);
                    setLoading(false);
                    setIsChecking(false);
                }
                return;
            }

            setSession(sessionData);

            // 1. Check Super Admin
            const { data: profile } = await supabase
                .from('profiles')
                .select('is_super_admin')
                .eq('id', sessionData.user.id)
                .single();

            if (profile?.is_super_admin) {
                if (mounted) {
                    setIsAllowed(true);
                    setIsTrialExpired(false);
                    setLoading(false);
                    setIsChecking(false);
                    saveToCache(sessionData, true, false);
                    hasInitialized.current = true;
                }
                return;
            }

            // 2. Check Clinic Subscription
            const { data: clinicUser } = await supabase
                .from('clinic_users')
                .select('clinic_id, role')
                .eq('user_id', sessionData.user.id)
                .single();

            let finalAllowed = false;
            let finalTrialExpired = false;

            if (clinicUser) {
                // Fetch subscription with current_period_end to check expiration
                const { data: subscriptions } = await supabase
                    .from('subscriptions')
                    .select('status, plan_id, current_period_end')
                    .eq('clinic_id', clinicUser.clinic_id)
                    .in('status', ['active', 'trialing'])
                    .order('created_at', { ascending: false })
                    .limit(1);

                const subscription = subscriptions?.[0];

                if (subscription) {
                    // Check if subscription is active (not expired)
                    if (subscription.status === 'active') {
                        // Active paid subscription - allow access
                        finalAllowed = true;
                        finalTrialExpired = false;
                    } else if (subscription.status === 'trialing') {
                        // Trial - check if not expired
                        const periodEnd = new Date(subscription.current_period_end);
                        const now = new Date();

                        if (periodEnd > now) {
                            // Trial still valid
                            finalAllowed = true;
                            finalTrialExpired = false;
                        } else {
                            // Trial expired
                            finalAllowed = false;
                            finalTrialExpired = true;
                        }
                    }
                }

                if (mounted) {
                    setIsAllowed(finalAllowed);
                    setIsTrialExpired(finalTrialExpired);
                    setLoading(false);
                    setIsChecking(false);
                    saveToCache(sessionData, finalAllowed, finalTrialExpired);
                    hasInitialized.current = true;
                }
            } else {
                if (mounted) {
                    setIsAllowed(false);
                    setIsTrialExpired(false);
                    setLoading(false);
                    setIsChecking(false);
                    saveToCache(sessionData, false, false);
                    hasInitialized.current = true;
                }
            }
        };

        checkAccess();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
            // Só reage a eventos de login/logout, não a refresh de token
            // Isso evita que a página "recarregue" quando o usuário muda de aba
            if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
                cachedAuthState = null; // Limpa cache em login/logout
                hasInitialized.current = false;
                if (mounted) {
                    setLoading(true);
                    setIsChecking(true);
                    checkAccess();
                }
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    // Use useLocation to ensure re-render on route change
    const location = useLocation();

    if (loading || isChecking) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#a03f3d]" />
            </div>
        );
    }

    if (!session) {
        return <Navigate to="/login" replace />;
    }

    const isPlansPage = location.pathname.startsWith('/planos');
    const isTrialExpiredPage = location.pathname === '/trial-expirado';

    // Trial expired - redirect to trial expired page
    if (isTrialExpired && !isTrialExpiredPage && !isPlansPage) {
        return <Navigate to="/trial-expirado" replace />;
    }

    // No subscription - redirect to plans
    if (!isAllowed && !isPlansPage && !isTrialExpiredPage) {
        return <Navigate to="/planos" replace />;
    }

    return <Outlet />;
}
