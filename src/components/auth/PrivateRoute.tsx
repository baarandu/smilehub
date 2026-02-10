import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

export function PrivateRoute() {
    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Add Super Admin and Subscription logic
    const [isChecking, setIsChecking] = useState(true);
    const [isAllowed, setIsAllowed] = useState(false);
    const [isTrialExpired, setIsTrialExpired] = useState(false);

    useEffect(() => {
        let mounted = true;

        const checkAccess = async () => {
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                if (mounted) {
                    setSession(null);
                    setLoading(false);
                    setIsChecking(false);
                }
                return;
            }

            setSession(session);

            // 1. Check Super Admin
            const { data: profile } = await supabase
                .from('profiles')
                .select('is_super_admin')
                .eq('id', session.user.id)
                .single<{ is_super_admin: boolean | null }>();

            if (profile && profile.is_super_admin) {
                if (mounted) {
                    setIsAllowed(true);
                    setIsTrialExpired(false);
                    setLoading(false);
                    setIsChecking(false);
                }
                return;
            }

            // 2. Check Clinic Subscription
            const { data: clinicUser } = await supabase
                .from('clinic_users')
                .select('clinic_id, role')
                .eq('user_id', session.user.id)
                .single<{ clinic_id: string; role: string }>();

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

                if (mounted) {
                    setLoading(false);
                    setIsChecking(false);
                }
            } else {
                if (mounted) {
                    setIsAllowed(false);
                    setIsTrialExpired(false);
                    setLoading(false);
                    setIsChecking(false);
                }
            }
        };

        checkAccess();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (mounted) {
                setLoading(true); // Reset loading on auth change to re-verify
                checkAccess();
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
