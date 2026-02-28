import { useEffect, useState, useRef } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';
import { checkTermsAccepted } from '@/services/terms';
import { TermsAcceptanceModal } from './TermsAcceptanceModal';

export function PrivateRoute() {
    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Add Super Admin and Subscription logic
    const [isChecking, setIsChecking] = useState(true);
    const [isAllowed, setIsAllowed] = useState(false);
    const [isTrialExpired, setIsTrialExpired] = useState(false);
    const [needsTermsAcceptance, setNeedsTermsAcceptance] = useState(false);

    // Track whether the initial auth check has completed.
    // After that, we NEVER show the loading spinner again — all subsequent
    // re-checks happen silently in the background so modals/forms stay mounted.
    const initialCheckDone = useRef(false);

    useEffect(() => {
        let mounted = true;

        const checkAccess = async () => {
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                if (mounted) {
                    setSession(null);
                    setLoading(false);
                    setIsChecking(false);
                    initialCheckDone.current = true;
                }
                return;
            }

            if (mounted) {
                setSession(session);
            }

            // 1. Parallel: Check Super Admin + Clinic User
            const [{ data: profile }, { data: clinicUser }] = await Promise.all([
                supabase
                    .from('profiles')
                    .select('is_super_admin')
                    .eq('id', session.user.id)
                    .single<{ is_super_admin: boolean | null }>(),
                supabase
                    .from('clinic_users')
                    .select('clinic_id, role')
                    .eq('user_id', session.user.id)
                    .single<{ clinic_id: string; role: string }>(),
            ]);

            if (profile && profile.is_super_admin) {
                if (mounted) {
                    setIsAllowed(true);
                    setIsTrialExpired(false);
                    setLoading(false);
                    setIsChecking(false);
                    initialCheckDone.current = true;
                }
                return;
            }

            // 2. Check Clinic Subscription (depends on clinicUser)

            if (clinicUser) {
                // Fetch subscription with current_period_end to check expiration
                const { data: subscriptions } = await supabase
                    .from('subscriptions')
                    .select('status, plan_id, current_period_end')
                    .eq('clinic_id', clinicUser.clinic_id)
                    .in('status', ['active', 'trialing'])
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .returns<{ status: string; plan_id: string; current_period_end: string }[]>();

                const subscription = subscriptions?.[0];

                if (subscription) {
                    // Check if subscription is active (not expired)
                    if (subscription.status === 'active') {
                        // Active paid subscription - allow access
                        if (mounted) {
                            setIsAllowed(true);
                            setIsTrialExpired(false);
                        }
                    } else if (subscription.status === 'trialing') {
                        // Trial - check if not expired
                        const periodEnd = new Date(subscription.current_period_end);
                        const now = new Date();

                        if (periodEnd > now) {
                            // Trial still valid
                            if (mounted) {
                                setIsAllowed(true);
                                setIsTrialExpired(false);
                            }
                        } else {
                            // Trial expired
                            if (mounted) {
                                setIsAllowed(false);
                                setIsTrialExpired(true);
                            }
                        }
                    }
                } else {
                    // No subscription found
                    if (mounted) {
                        setIsAllowed(false);
                        setIsTrialExpired(false);
                    }
                }

                // Check terms acceptance for allowed users
                if (mounted) {
                    const termsOk = await checkTermsAccepted();
                    if (!termsOk) {
                        setNeedsTermsAcceptance(true);
                    }

                    setLoading(false);
                    setIsChecking(false);
                    initialCheckDone.current = true;
                }
            } else {
                if (mounted) {
                    setIsAllowed(false);
                    setIsTrialExpired(false);
                    setLoading(false);
                    setIsChecking(false);
                    initialCheckDone.current = true;
                }
            }
        };

        checkAccess();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, _session) => {
            if (!mounted) return;

            // After the initial check is done, NEVER set loading/isChecking to true.
            // This prevents unmounting the component tree (and losing modals/forms)
            // when Supabase refreshes the token on tab switch.
            if (event === 'SIGNED_OUT') {
                // User explicitly signed out — clear session immediately
                setSession(null);
                return;
            }

            // For all other events (TOKEN_REFRESHED, SIGNED_IN, INITIAL_SESSION, etc.),
            // silently re-check access in the background without touching loading state.
            checkAccess();
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

    return (
        <>
            {needsTermsAcceptance && (
                <TermsAcceptanceModal
                    open={needsTermsAcceptance}
                    onAccepted={() => setNeedsTermsAcceptance(false)}
                />
            )}
            <Outlet />
        </>
    );
}
