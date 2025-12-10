import { Tabs } from 'expo-router';
import { LayoutDashboard, Users, Calendar, Bell, Package, DollarSign } from 'lucide-react-native';

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: '#0D9488',
                tabBarInactiveTintColor: '#9CA3AF',
                headerShown: false,
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Dashboard',
                    tabBarIcon: ({ color }) => <LayoutDashboard size={22} color={color} />,
                }}
            />
            <Tabs.Screen
                name="patients"
                options={{
                    title: 'Pacientes',
                    tabBarIcon: ({ color }) => <Users size={22} color={color} />,
                }}
            />
            <Tabs.Screen
                name="agenda"
                options={{
                    title: 'Agenda',
                    tabBarIcon: ({ color }) => <Calendar size={22} color={color} />,
                }}
            />
            <Tabs.Screen
                name="materials"
                options={{
                    title: 'Materiais',
                    tabBarIcon: ({ color }) => <Package size={22} color={color} />,
                }}
            />
            <Tabs.Screen
                name="financial"
                options={{
                    title: 'Financeiro',
                    tabBarIcon: ({ color }) => <DollarSign size={22} color={color} />,
                }}
            />
            <Tabs.Screen
                name="alerts"
                options={{
                    title: 'Alertas',
                    tabBarIcon: ({ color }) => <Bell size={22} color={color} />,
                }}
            />
        </Tabs>
    );
}
