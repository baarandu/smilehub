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
                .single();

            if (profile?.is_super_admin) {
                if (mounted) {
                    setIsAllowed(true);
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
                .single();

            if (clinicUser) {
                // We need to import subscriptionService dynamically to avoid circular deps if any
                // But since we are in components, services should be fine.
                // Assuming subscriptionService is available or we do a raw query.
                // Let's do raw query for safety and speed here.
                const { data: subscription } = await supabase
                    .from('subscriptions')
                    .select('status, plan_id')
                    .eq('clinic_id', clinicUser.clinic_id)
                    .in('status', ['active', 'trialing'])
                    .in('status', ['active', 'trialing'])
                    .limit(1);

                const hasActiveSubscription = subscription && subscription.length > 0;

                if (mounted) {
                    setIsAllowed(hasActiveSubscription);
                    setLoading(false);
                    setIsChecking(false);
                }
            } else {
                if (mounted) {
                    setIsAllowed(false);
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

    if (loading || isChecking) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
            </div>
        );
    }

    if (!session) {
        return <Navigate to="/login" replace />;
    }

    // Use useLocation to ensure re-render on route change
    const location = useLocation();
    const isPlansPage = location.pathname.startsWith('/planos');

    if (!isAllowed && !isPlansPage) {
        return <Navigate to="/planos" replace />;
    }

    return <Outlet />;
}
