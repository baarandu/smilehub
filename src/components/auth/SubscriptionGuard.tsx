import React, { useEffect, useState } from 'react';
import { subscriptionService } from '../../services/subscription';
import { supabase } from '../../lib/supabase';

interface SubscriptionGuardProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
    feature?: 'max_users' | 'max_patients' | 'max_locations';
    currentUsage?: number;
}

export function SubscriptionGuard({ children, fallback, feature, currentUsage }: SubscriptionGuardProps) {
    const [allowed, setAllowed] = useState<boolean | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkPermission();
    }, [feature, currentUsage]);

    const checkPermission = async () => {
        try {
            if (!feature) {
                setAllowed(true);
                return;
            }

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: clinicUser } = await supabase
                .from('clinic_users')
                .select('clinic_id')
                .eq('user_id', user.id)
                .single<{ clinic_id: string }>();

            if (!clinicUser) {
                setAllowed(false);
                return;
            }

            const result = await subscriptionService.checkLimit(clinicUser.clinic_id, feature, currentUsage || 0);
            setAllowed(result.allowed);

        } catch (error) {
            console.error('Subscription check failed:', error);
            setAllowed(false);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return null;

    if (allowed === false) {
        if (fallback) return <>{fallback}</>;
        return (
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                <h3 className="text-orange-800 font-medium">Limite Atingido</h3>
                <p className="text-orange-600 text-sm mt-1">Faça upgrade do seu plano para liberar este recurso.</p>
            </div>
        );
    }

    return <>{children}</>;
}
