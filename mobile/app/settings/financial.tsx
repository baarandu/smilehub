import { router } from 'expo-router';
import FinancialSettingsScreen from '../../src/components/settings/FinancialSettingsScreen';

export default function FinancialSettingsRoute() {
    return <FinancialSettingsScreen onBack={() => router.back()} />;
}
