import { useEffect } from 'react';
import { router } from 'expo-router';
import { IncomeTaxScreen } from '../../src/components/incomeTax';
import { useClinic } from '../../src/contexts/ClinicContext';

export default function IncomeTaxRoute() {
    const { isAdmin } = useClinic();

    // Apenas admin pode acessar esta página
    useEffect(() => {
        if (!isAdmin) {
            router.replace('/(tabs)');
        }
    }, [isAdmin]);

    if (!isAdmin) return null;

    return <IncomeTaxScreen onBack={() => router.back()} />;
}
