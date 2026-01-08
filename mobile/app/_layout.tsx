import "../global.css";
import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';
import { ClinicProvider } from '../src/contexts/ClinicContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

function RootLayoutNav() {
    const { session, isLoading } = useAuth();
    const segments = useSegments();
    const router = useRouter();

    useEffect(() => {
        if (isLoading) return;

        const firstSegment = segments[0];

        // Auth routes that don't require login
        const publicRoutes = ['login', 'signup', 'forgot-password', 'reset-password'];
        const isPublicRoute = publicRoutes.includes(firstSegment as string);

        // Protected routes (tabs and other authenticated pages)
        const protectedRoutes = ['(tabs)', 'patient', 'settings'];
        const isProtectedRoute = protectedRoutes.includes(firstSegment as string);

        if (session && isPublicRoute) {
            // User is signed in but on public route, redirect to tabs
            router.replace('/(tabs)');
        } else if (!session && isProtectedRoute) {
            // User is not signed in but trying to access protected route
            router.replace('/login');
        }
    }, [session, isLoading, segments]);

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
            </Stack>
            <StatusBar style="auto" />
        </>
    );
}

export default function RootLayout() {
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <AuthProvider>
                <ClinicProvider>
                    <RootLayoutNav />
                </ClinicProvider>
            </AuthProvider>
        </GestureHandlerRootView>
    );
}
