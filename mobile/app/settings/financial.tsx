import { useEffect } from 'react';
import { router } from 'expo-router';
import FinancialSettingsScreen from '../../src/components/settings/FinancialSettingsScreen';
import { useClinic } from '../../src/contexts/ClinicContext';

export default function FinancialSettingsRoute() {
    const { isAdmin } = useClinic();

    // Apenas admin pode acessar esta página
    useEffect(() => {
        if (!isAdmin) {
            router.replace('/(tabs)');
        }
    }, [isAdmin]);

    if (!isAdmin) return null;

    return <FinancialSettingsScreen onBack={() => router.back()} />;
}
