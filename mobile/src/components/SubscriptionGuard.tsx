import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Alert } from 'react-native';
import { subscriptionService } from '../services/subscription';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

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
                setAllowed(true); // If no specific feature limit to check, just pass (could check strictly for active status later)
                return;
            }

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return; // Auth guard should handle this

            // Check if user is super admin
            const { data: profile } = await supabase
                .from('profiles')
                .select('is_super_admin')
                .eq('id', user.id)
                .single();

            if (profile?.is_super_admin) {
                setAllowed(true);
                return;
            }

            const { data: clinicUser } = await supabase
                .from('clinic_users')
                .select('clinic_id')
                .eq('user_id', user.id)
                .single();

            if (!clinicUser) {
                setAllowed(false);
                return;
            }

            const result = await subscriptionService.checkLimit((clinicUser as any).clinic_id, feature, currentUsage || 0);
            setAllowed(result.allowed);

        } catch (error) {
            console.error('Subscription check failed:', error);
            setAllowed(false); // Default to block on error for safety
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        // Optional: Render nothing or a small spinner while checking
        return null;
    }

    if (allowed === false) {
        if (fallback) return <>{fallback}</>;
        // Default fallback: generic message
        return (
            <View className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                <Text className="text-orange-800 font-medium">Feature Limit Reached</Text>
                <Text className="text-orange-600 text-sm mt-1">Upgrade your plan to access this feature.</Text>
            </View>
        );
    }

    return <>{children}</>;
}
