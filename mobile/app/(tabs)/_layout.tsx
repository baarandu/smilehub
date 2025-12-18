import { useState, useCallback, useEffect } from 'react';
import { Tabs, useFocusEffect } from 'expo-router';
import { DeviceEventEmitter } from 'react-native';
import { LayoutDashboard, Users, Calendar, Bell, Package, DollarSign } from 'lucide-react-native';
import { remindersService } from '../../src/services/reminders';

export default function TabLayout() {
    const [activeReminders, setActiveReminders] = useState(0);

    useFocusEffect(
        useCallback(() => {
            loadRemindersCount();
        }, [])
    );

    useEffect(() => {
        const subscription = DeviceEventEmitter.addListener('reminderUpdated', () => {
            loadRemindersCount();
        });
        return () => subscription.remove();
    }, []);

    const loadRemindersCount = async () => {
        try {
            const count = await remindersService.getActiveCount();
            setActiveReminders(count);
        } catch (error) {
            console.error(error);
        }
    };
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
                    tabBarBadge: activeReminders > 0 ? activeReminders : undefined,
                    tabBarBadgeStyle: { backgroundColor: '#EF4444', color: 'white', fontSize: 10, minWidth: 16 },
                }}
            />
        </Tabs>
    );
}
