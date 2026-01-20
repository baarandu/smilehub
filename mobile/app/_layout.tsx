import "../global.css";
import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';
import { ClinicProvider } from '../src/contexts/ClinicContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

function RootLayoutNav() {
    const { session, isLoading, hasActiveSubscription, role } = useAuth();
    const segments = useSegments();
    const router = useRouter();

    useEffect(() => {
        console.log('ROOT_LAYOUT: Effect triggered');
        console.log('ROOT_LAYOUT: isLoading:', isLoading);
        console.log('ROOT_LAYOUT: Session user:', session?.user?.id);
        console.log('ROOT_LAYOUT: hasActiveSubscription:', hasActiveSubscription);
        console.log('ROOT_LAYOUT: Segments:', segments);

        if (isLoading) return;

        const firstSegment = segments[0];

        // Auth routes that don't require login
        const publicRoutes = ['login', 'signup', 'forgot-password', 'reset-password'];
        const isPublicRoute = publicRoutes.includes(firstSegment as string);

        // Protected routes (tabs and other authenticated pages)
        const protectedRoutes = ['(tabs)', 'patient', 'settings'];
        const isProtectedRoute = protectedRoutes.includes(firstSegment as string);

        // Routes that should be accessible even without subscription (to allow payment)
        // const subscriptionRoutes = ['settings'];
        // const isSubscriptionRoute = firstSegment === 'settings' && segments.length > 1 && (segments as string[])[1] === 'subscription';

        // Better check for subscription route to avoid casting issues
        const isSubscriptionRoute = segments.join('/') === 'settings/subscription';
        console.log('ROOT_LAYOUT: isPublicRoute:', isPublicRoute);
        console.log('ROOT_LAYOUT: isSubscriptionRoute:', isSubscriptionRoute);

        if (session) {
            // 1. Priority: Enforce Subscription
            // User has NO subscription, and is NOT on subscription page -> Force Subscription
            if (!hasActiveSubscription && !isSubscriptionRoute) {
                console.log('ROOT_LAYOUT: REDIRECTING TO SUBSCRIPTION (No Sub + Not on Sub Page)');
                router.replace('/settings/subscription');
                return;
            }

            // 2. Priority: Redirect from Public to Protected
            if (isPublicRoute) {
                console.log('ROOT_LAYOUT: REDIRECTING TO TABS (Public Route -> Tabs)');
                // User is signed in but on public route, redirect to tabs
                router.replace('/(tabs)');
            }
        } else if (isProtectedRoute) {
            console.log('ROOT_LAYOUT: REDIRECTING TO LOGIN (Protected Route -> Login)');
            // User is not signed in but trying to access protected route
            router.replace('/login');
        }
    }, [session, isLoading, hasActiveSubscription, role, segments]);

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#0D9488" />
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
                <Stack.Screen name="settings" options={{ headerShown: false }} />
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
