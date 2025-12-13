import "../global.css";
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';
import { useEffect } from "react";
import { View } from "react-native";

function AppLayout() {
    const { session, isLoading } = useAuth();
    const segments = useSegments();
    const router = useRouter();

    useEffect(() => {
        if (isLoading) return;

        const inAuthGroup = ['login', 'signup', 'forgot-password'].includes(segments[0] as string);

        if (!session && !inAuthGroup) {
            // Redirect to login if accessing protected route without session
            router.replace('/login');
        } else if (session && inAuthGroup) {
            // Redirect to home if accessing auth route with session
            router.replace('/(tabs)');
        }
    }, [session, isLoading, segments]);

    // Although AuthProvider handles loading UI, we keep this rendering pure
    return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
    return (
        <AuthProvider>
            <AppLayout />
            <StatusBar style="auto" />
        </AuthProvider>
    );
}
