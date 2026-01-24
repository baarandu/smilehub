import { router } from 'expo-router';
import { IncomeTaxScreen } from '../../src/components/incomeTax';

export default function IncomeTaxRoute() {
    return <IncomeTaxScreen onBack={() => router.back()} />;
}
