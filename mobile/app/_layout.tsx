import "../global.css";
import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack, useRouter, useSegments, Redirect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';
import { ClinicProvider } from '../src/contexts/ClinicContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

function RootLayoutNav() {
    const { session, isLoading, hasActiveSubscription, isTrialExpired, role } = useAuth();
    const segments = useSegments();
    const router = useRouter();

    useEffect(() => {
        console.log('ROOT_LAYOUT: Effect triggered');
        console.log('ROOT_LAYOUT: isLoading:', isLoading);
        console.log('ROOT_LAYOUT: Session user:', session?.user?.id);
        console.log('ROOT_LAYOUT: hasActiveSubscription:', hasActiveSubscription);
        console.log('ROOT_LAYOUT: isTrialExpired:', isTrialExpired);
        console.log('ROOT_LAYOUT: Segments:', segments);

        if (isLoading) return;

        const firstSegment = segments[0];

        // Auth routes that don't require login
        const publicRoutes = ['login', 'signup', 'forgot-password', 'reset-password'];
        const isPublicRoute = publicRoutes.includes(firstSegment as string);

        // Protected routes (tabs and other authenticated pages)
        const protectedRoutes = ['(tabs)', 'patient', 'settings', 'admin'];
        const isProtectedRoute = protectedRoutes.includes(firstSegment as string);

        // Routes that should be accessible even without subscription (to allow payment)
        const isSubscriptionRoute = segments.join('/') === 'settings/subscription';
        const isTrialExpiredRoute = firstSegment === 'trial-expired';

        console.log('ROOT_LAYOUT: isPublicRoute:', isPublicRoute);
        console.log('ROOT_LAYOUT: isSubscriptionRoute:', isSubscriptionRoute);
        console.log('ROOT_LAYOUT: isTrialExpiredRoute:', isTrialExpiredRoute);

        if (session) {
            // 1. Priority: Trial Expired - redirect to trial expired page
            if (isTrialExpired && !isTrialExpiredRoute && !isSubscriptionRoute) {
                console.log('ROOT_LAYOUT: REDIRECTING TO TRIAL-EXPIRED (Trial Expired)');
                router.replace('/trial-expired');
                return;
            }

            // 2. Priority: No subscription at all - redirect to subscription page
            if (!hasActiveSubscription && !isTrialExpired && !isSubscriptionRoute) {
                console.log('ROOT_LAYOUT: REDIRECTING TO SUBSCRIPTION (No Sub + Not on Sub Page)');
                router.replace('/settings/subscription');
                return;
            }

            // 3. Priority: Redirect from Public to Protected
            if (isPublicRoute) {
                console.log('ROOT_LAYOUT: REDIRECTING TO TABS (Public Route -> Tabs)');
                router.replace('/(tabs)');
            }
        } else if (isProtectedRoute || isTrialExpiredRoute) {
            console.log('ROOT_LAYOUT: REDIRECTING TO LOGIN (Protected Route -> Login)');
            router.replace('/login');
        }
    }, [session, isLoading, hasActiveSubscription, isTrialExpired, role, segments]);

    // Declarative Redirection for Paywall Enforcement
    const firstSegment = segments[0];
    const isSubscriptionRoute = segments.join('/') === 'settings/subscription';
    const isTrialExpiredRoute = firstSegment === 'trial-expired';

    // If logged in, trial expired, not on trial-expired or subscription page -> Redirect
    if (!isLoading && session && isTrialExpired && !isTrialExpiredRoute && !isSubscriptionRoute) {
        console.log('ROOT_LAYOUT: Blocking access, redirecting to trial-expired.');
        return <Redirect href="/trial-expired" />;
    }

    // If logged in, no subscription (and not trial expired), not on subscription page -> Redirect
    if (!isLoading && session && !hasActiveSubscription && !isTrialExpired && !isSubscriptionRoute) {
        console.log('ROOT_LAYOUT: Blocking access, redirecting to subscription.');
        return <Redirect href="/settings/subscription" />;
    }

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#b94a48" />
            </View>
        );
    }

    return (
        <>
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="secretary" options={{ presentation: 'card', animation: 'slide_from_right' }} />
                {/* Auth routes */}
                <Stack.Screen name="login" />
                <Stack.Screen name="signup" />
                <Stack.Screen name="forgot-password" />
                <Stack.Screen name="reset-password" />
                <Stack.Screen name="trial-expired" />
                <Stack.Screen name="settings" options={{ headerShown: false }} />
                <Stack.Screen name="admin" options={{ headerShown: false }} />
            </Stack>
            <StatusBar style="auto" />
        </>
    );
}

import { StripeProvider } from '@stripe/stripe-react-native';

export default function RootLayout() {
    const stripeKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <StripeProvider
                publishableKey={stripeKey}
                merchantIdentifier="merchant.com.smilecarehub" // Optional, for Apple Pay
            >
                <AuthProvider>
                    <ClinicProvider>
                        <RootLayoutNav />
                    </ClinicProvider>
                </AuthProvider>
            </StripeProvider>
        </GestureHandlerRootView>
    );
}
