import "../global.css";
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../src/contexts/AuthContext';
import { ClinicProvider } from '../src/contexts/ClinicContext';

export default function RootLayout() {
    return (
        <AuthProvider>
            <ClinicProvider>
                <Slot />
                <StatusBar style="auto" />
            </ClinicProvider>
        </AuthProvider>
    );
}


