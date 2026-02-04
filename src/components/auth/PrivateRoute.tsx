import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

const CACHE_KEY = 'auth_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

// Funções para gerenciar cache no sessionStorage
const getCache = () => {
    try {
        const cached = sessionStorage.getItem(CACHE_KEY);
        if (!cached) return null;
        const data = JSON.parse(cached);
        if (Date.now() - data.timestamp > CACHE_DURATION) {
            sessionStorage.removeItem(CACHE_KEY);
            return null;
        }
        return data;
    } catch {
        return null;
    }
};

const setCache = (isAllowed: boolean, isTrialExpired: boolean) => {
    try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({
            isAllowed,
            isTrialExpired,
            timestamp: Date.now(),
        }));
    } catch {
        // Ignora erros de storage
    }
};

const clearCache = () => {
    try {
        sessionStorage.removeItem(CACHE_KEY);
    } catch {
        // Ignora erros
    }
};

export function PrivateRoute() {
    const cachedData = getCache();

    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(!cachedData);
    const [isChecking, setIsChecking] = useState(!cachedData);
    const [isAllowed, setIsAllowed] = useState(cachedData?.isAllowed ?? false);
    const [isTrialExpired, setIsTrialExpired] = useState(cachedData?.isTrialExpired ?? false);
    const [initialCheckDone, setInitialCheckDone] = useState(!!cachedData);

    useEffect(() => {
        let mounted = true;

        const checkAccess = async (forceCheck = false) => {
            // Se tem cache válido e não é forçado, pula a verificação
            if (!forceCheck && initialCheckDone) {
                return;
            }

            const { data: { session: sessionData } } = await supabase.auth.getSession();

            if (!sessionData) {
                clearCache();
                if (mounted) {
                    setSession(null);
                    setLoading(false);
                    setIsChecking(false);
                }
                return;
            }

            if (mounted) setSession(sessionData);

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
                    setInitialCheckDone(true);
                    setCache(true, false);
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
                const { data: subscriptions } = await supabase
                    .from('subscriptions')
                    .select('status, plan_id, current_period_end')
                    .eq('clinic_id', clinicUser.clinic_id)
                    .in('status', ['active', 'trialing'])
                    .order('created_at', { ascending: false })
                    .limit(1);

                const subscription = subscriptions?.[0];

                if (subscription) {
                    if (subscription.status === 'active') {
                        finalAllowed = true;
                    } else if (subscription.status === 'trialing') {
                        const periodEnd = new Date(subscription.current_period_end);
                        if (periodEnd > new Date()) {
                            finalAllowed = true;
                        } else {
                            finalTrialExpired = true;
                        }
                    }
                }
            }

            if (mounted) {
                setIsAllowed(finalAllowed);
                setIsTrialExpired(finalTrialExpired);
                setLoading(false);
                setIsChecking(false);
                setInitialCheckDone(true);
                setCache(finalAllowed, finalTrialExpired);
            }
        };

        // Verifica sessão do Supabase primeiro (necessário para o session state)
        supabase.auth.getSession().then(({ data: { session: s } }) => {
            if (mounted) setSession(s);
            if (!s) {
                clearCache();
                setLoading(false);
                setIsChecking(false);
            }
        });

        // Se não tem cache, faz a verificação completa
        if (!initialCheckDone) {
            checkAccess();
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
            // Só reage a eventos de login/logout
            if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
                clearCache();
                if (mounted) {
                    setInitialCheckDone(false);
                    setLoading(true);
                    setIsChecking(true);
                    checkAccess(true);
                }
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, [initialCheckDone]);

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

    if (isTrialExpired && !isTrialExpiredPage && !isPlansPage) {
        return <Navigate to="/trial-expirado" replace />;
    }

    if (!isAllowed && !isPlansPage && !isTrialExpiredPage) {
        return <Navigate to="/planos" replace />;
    }

    return <Outlet />;
}
