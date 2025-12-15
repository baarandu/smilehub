import "../global.css";
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';
// import { useEffect } from "react";

/*
function AuthRedirect() {
    const { session, isLoading } = useAuth();
    const segments = useSegments();
    const router = useRouter();

    useEffect(() => {
        if (isLoading) return;

        const inAuthGroup = ['login', 'signup', 'forgot-password'].includes(segments[0] as string);

        if (!session && !inAuthGroup) {
            router.replace('/login');
        } else if (session && inAuthGroup) {
            router.replace('/(tabs)');
        }
    }, [session, isLoading, segments]);

    return null;
}
*/

export default function RootLayout() {
    return (
        <AuthProvider>
            <Slot />
            {/* <AuthRedirect /> */}
            <StatusBar style="auto" />
        </AuthProvider >
    );
}

