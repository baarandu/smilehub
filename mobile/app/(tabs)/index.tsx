import { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Users, Calendar, Bell, FileText, ChevronRight, User, AlertTriangle, Gift, Clock, Menu } from 'lucide-react-native';
import { TeamManagementModal } from '../../src/components/TeamManagementModal';
import { patientsService } from '../../src/services/patients';
import { appointmentsService } from '../../src/services/appointments';
import { consultationsService } from '../../src/services/consultations';
import { alertsService, type Alert as PatientAlert } from '../../src/services/alerts';
import { budgetsService } from '../../src/services/budgets';
import { PendingBudgetsModal } from '../../src/components/dashboard/PendingBudgetsModal';
import { ProfileModal } from '../../src/components/dashboard/ProfileModal';
import { LocationsModal } from '../../src/components/dashboard/LocationsModal';
import { PendingReturnsModal } from '../../src/components/dashboard/PendingReturnsModal';
import type { ReturnAlert } from '../../src/types/database';
import { locationsService, type Location } from '../../src/services/locations';
import { remindersService, type Reminder } from '../../src/services/reminders';
import { profileService } from '../../src/services/profile';
import { getPendingReturns, markProcedureCompleted, type PendingReturn } from '../../src/services/pendingReturns';
import { useAuth } from '../../src/contexts/AuthContext';
import { supabase } from '../../src/lib/supabase';

export default function Dashboard() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [patientsCount, setPatientsCount] = useState(0);
    const [activeReminders, setActiveReminders] = useState(0);
    const [todayCount, setTodayCount] = useState(0);
    const [pendingReturns, setPendingReturns] = useState(0);
    const [todayAppointments, setTodayAppointments] = useState<any[]>([]);
    const [pendingBudgetsCount, setPendingBudgetsCount] = useState(0);
    const [recentAlerts, setRecentAlerts] = useState<any[]>([]);

    // Profile & Settings
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [displayName, setDisplayName] = useState('');
    const [clinicName, setClinicName] = useState('');
    const [isAdmin, setIsAdmin] = useState(false);
    const [showTeamModal, setShowTeamModal] = useState(false);

    // Locations
    const [locations, setLocations] = useState<Location[]>([]);
    const [showLocationsModal, setShowLocationsModal] = useState(false);
    const [showLocationForm, setShowLocationForm] = useState(false);
    const [locationForm, setLocationForm] = useState({ name: '', address: '' });
    const [editingLocation, setEditingLocation] = useState<Location | null>(null);

    // Pending Returns Modal
    const [showPendingReturnsModal, setShowPendingReturnsModal] = useState(false);
    const [pendingReturnsList, setPendingReturnsList] = useState<PendingReturn[]>([]);
    const [loadingPendingReturns, setLoadingPendingReturns] = useState(false);

    // Pending Budgets Modal
    const [showPendingBudgetsModal, setShowPendingBudgetsModal] = useState(false);
    const [pendingBudgetsList, setPendingBudgetsList] = useState<{ budgetId: string; patientId: string; patientName: string; date: string; tooth: any; totalBudgetValue: number }[]>([]);
    const [loadingPendingBudgets, setLoadingPendingBudgets] = useState(false);

    const { session, signOut } = useAuth();

    useEffect(() => {
        if (session?.user) loadProfile();
    }, [session]);

    useFocusEffect(
        useCallback(() => {
            if (session?.user) {
                loadData();
                loadProfile();
            }
        }, [session])
    );

    const loadProfile = async () => {
        try {
            if (!session?.user) return;
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();

            // Prepare profile data, preferring DB but falling back to session metadata
            const p = (profile || {}) as any;
            const fullName = p.full_name || session.user.user_metadata?.full_name || null;
            const userGender = p.gender || session.user.user_metadata?.gender || null;
            const userRole = p.role || 'viewer';

            // Create display name with Dr./Dra. prefix (same logic as web)
            if (fullName) {
                const prefix = userGender === 'female' ? 'Dra.' : 'Dr.';
                setDisplayName(`${prefix} ${fullName}`);
            } else {
                setDisplayName('Usuário');
            }

            setIsAdmin(userRole === 'admin' || userRole === 'owner');
            const clinicInfo = await profileService.getClinicInfo();
            setClinicName(clinicInfo.clinicName || 'Minha Clínica');
        } catch (e) { console.error(e); }
    };

    const handleLogout = async () => {
        try {
            await signOut();
            router.replace('/login');
        } catch (error) {
            console.error(error);
        }
    };

    const loadData = async () => {
        try {
            setLoading(true);
            const [patients, today, returnsCount, appointments, scheduled, birthdays, procedures, budgetsCount, remindersCount, activeRemindersList] = await Promise.all([
                patientsService.count(),
                appointmentsService.countToday(),
                consultationsService.countPendingReturns(),
                appointmentsService.getToday(),
                consultationsService.getReturnAlerts(),
                alertsService.getBirthdayAlerts(),
                alertsService.getProcedureReminders(),
                budgetsService.getPendingCount(),
                remindersService.getActiveCount(),
                remindersService.getActive()
            ]);
            setPatientsCount(patients);
            setActiveReminders(remindersCount);
            setTodayCount(today);
            setPendingReturns(returnsCount);
            setTodayAppointments(appointments);
            setPendingBudgetsCount(budgetsCount);

            const combined: any[] = [
                ...birthdays,
                ...procedures,
                ...scheduled.map(s => ({ ...s, type: 'scheduled' })),
                ...((activeRemindersList || []) as Reminder[]).map(r => ({ ...r, type: 'reminder' }))
            ];
            setRecentAlerts(combined.slice(0, 6));
        } catch (error: any) {
            console.error('Error loading data:', error);
            if (error?.message?.includes('User not authenticated') || error?.message?.includes('JWT expired')) {
                Alert.alert('Sessão Expirada', 'Sua sessão expirou. Por favor, faça login novamente.', [{ text: 'OK', onPress: () => handleLogout() }]);
            }
        } finally {
            setLoading(false);
        }
    };

    const loadLocations = async () => {
        try {
            const data = await locationsService.getAll();
            setLocations(data);
        } catch (error) {
            console.error('Error loading locations:', error);
        }
    };

    const handleAddLocation = () => {
        setLocationForm({ name: '', address: '' });
        setEditingLocation(null);
        setShowLocationForm(true);
    };

    const handleEditLocation = (location: Location) => {
        setLocationForm({ name: location.name, address: location.address || '' });
        setEditingLocation(location);
        setShowLocationForm(true);
    };

    const handleDeleteLocation = (location: Location) => {
        Alert.alert('Excluir Local', `Tem certeza que deseja excluir "${location.name}"?`, [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Excluir', style: 'destructive', onPress: async () => {
                    try {
                        await locationsService.delete(location.id);
                        loadLocations();
                    } catch (error) {
                        Alert.alert('Erro', 'Não foi possível excluir o local');
                    }
                }
            }
        ]);
    };

    const handleSaveLocation = async () => {
        if (!locationForm.name.trim()) {
            Alert.alert('Erro', 'Nome é obrigatório');
            return;
        }
        try {
            if (editingLocation) {
                await locationsService.update(editingLocation.id, { name: locationForm.name, address: locationForm.address || null });
            } else {
                await locationsService.create({ name: locationForm.name, address: locationForm.address || null });
            }
            setShowLocationForm(false);
            loadLocations();
        } catch (error) {
            Alert.alert('Erro', 'Não foi possível salvar o local');
        }
    };

    const openLocationsModal = () => {
        setShowProfileModal(false);
        loadLocations();
        setShowLocationsModal(true);
    };

    const handleMarkProcedureCompleted = async (procedureId: string) => {
        try {
            await markProcedureCompleted(procedureId);
            setPendingReturnsList(prev => prev.filter(p => p.procedure.id !== procedureId));
            setPendingReturns(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Error marking completed:', error);
        }
    };

    if (loading) {
        return (
            <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
                <ActivityIndicator size="large" color="#0D9488" />
                <Text className="text-gray-500 mt-4">Carregando...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            <ScrollView
                className="px-4 py-6"
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={async () => { setRefreshing(true); await loadData(); setRefreshing(false); }}
                        colors={['#0D9488']}
                        tintColor="#0D9488"
                    />
                }
            >
                {/* Header */}
                <View className="flex-row items-start justify-between mb-6">
                    <View className="flex-1">
                        <Text className="text-2xl font-bold text-gray-900">Dashboard</Text>
                        <Text className="text-gray-500 mt-1">Bem-vinda de volta! Aqui está o resumo do dia.</Text>
                    </View>
                    <TouchableOpacity className="w-10 h-10 bg-white border border-gray-200 rounded-full items-center justify-center" onPress={() => setShowProfileModal(true)}>
                        <Menu size={24} color="#374151" />
                    </TouchableOpacity>
                </View>

                {/* Stats Grid */}
                <View className="flex-row flex-wrap justify-between gap-y-4 mb-6">
                    <StatsCard title="Lembretes Ativos" value={activeReminders.toString()} icon={<Bell size={24} color="#0D9488" />} onPress={() => router.push('/alerts')} />
                    <StatsCard title="Consultas Hoje" value={todayCount.toString()} icon={<Calendar size={24} color="#0D9488" />} onPress={() => router.push('/agenda?date=today')} />
                    <StatsCard title="Retornos Pendentes" value={pendingReturns.toString()} icon={<AlertTriangle size={24} color="#F59E0B" />} onPress={async () => {
                        setShowPendingReturnsModal(true);
                        setLoadingPendingReturns(true);
                        try { setPendingReturnsList(await getPendingReturns()); } catch (e) { console.error(e); } finally { setLoadingPendingReturns(false); }
                    }} />
                    <StatsCard title="Orçamentos Pendentes" value={pendingBudgetsCount.toString()} icon={<FileText size={24} color="#0D9488" />} onPress={async () => {
                        setShowPendingBudgetsModal(true);
                        setLoadingPendingBudgets(true);
                        try { setPendingBudgetsList(await budgetsService.getAllPending()); } catch (e) { console.error(e); } finally { setLoadingPendingBudgets(false); }
                    }} />
                </View>

                {/* Agenda Section */}
                <View className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-8">
                    <View className="flex-row justify-between items-center mb-4">
                        <View className="flex-row items-center gap-2">
                            <Calendar size={20} color="#0D9488" />
                            <Text className="text-lg font-bold text-gray-900">Agenda de Hoje</Text>
                        </View>
                        <TouchableOpacity onPress={() => router.push('/agenda')}>
                            <Text className="text-teal-600 font-medium">Ver agenda</Text>
                        </TouchableOpacity>
                    </View>
                    <Text className="text-gray-500 mb-4">{todayAppointments.length} consultas</Text>
                    {todayAppointments.length === 0 ? (
                        <View className="py-8 items-center">
                            <Calendar size={40} color="#D1D5DB" />
                            <Text className="text-gray-400 mt-2">Nenhuma consulta hoje</Text>
                        </View>
                    ) : (
                        <View className="gap-3">
                            {todayAppointments.map((apt) => (
                                <View key={apt.id} className="flex-row items-center justify-between p-3 bg-gray-50 rounded-xl">
                                    <View className="flex-row items-center gap-3">
                                        <View className="w-10 h-10 bg-teal-100 rounded-full items-center justify-center">
                                            <Users size={20} color="#0D9488" />
                                        </View>
                                        <View>
                                            <Text className="font-semibold text-gray-900">{apt.patients?.name}</Text>
                                            <Text className="text-teal-700 font-bold">{apt.time?.slice(0, 5)}</Text>
                                            {apt.notes && <Text className="text-xs text-gray-500">{apt.notes}</Text>}
                                        </View>
                                    </View>
                                    <ChevronRight size={20} color="#9CA3AF" />
                                </View>
                            ))}
                        </View>
                    )}
                </View>

                {/* Recent Alerts Section */}
                <View className="mb-6">
                    <View className="flex-row justify-between items-center mb-4">
                        <View className="flex-row items-center gap-2">
                            <Bell size={20} color="#F59E0B" />
                            <Text className="text-lg font-bold text-gray-900">Alertas Recentes</Text>
                        </View>
                        <TouchableOpacity onPress={() => router.push('/alerts')}>
                            <Text className="text-teal-600 font-medium">Ver todos</Text>
                        </TouchableOpacity>
                    </View>
                    {recentAlerts.length === 0 ? (
                        <View className="bg-white p-6 rounded-2xl border border-gray-100 items-center">
                            <Bell size={32} color="#D1D5DB" />
                            <Text className="text-gray-400 mt-2">Nenhum alerta recente</Text>
                        </View>
                    ) : (
                        <View className="gap-3">
                            {recentAlerts.map((alert: any, index) => {
                                let icon = <Bell size={20} color="#6B7280" />;
                                let color = "bg-gray-50";
                                let title = "";
                                let subtitle = "";

                                if (alert.type === 'birthday') { icon = <Gift size={20} color="#EC4899" />; color = "bg-pink-50"; title = `Aniversário de ${alert.patient.name}`; subtitle = "Hoje"; }
                                else if (alert.type === 'procedure_return') { icon = <Clock size={20} color="#F59E0B" />; color = "bg-amber-50"; title = `Retorno: ${alert.patient.name}`; subtitle = `${alert.daysSince} dias sem vir`; }
                                else if (alert.type === 'scheduled') { icon = <AlertTriangle size={20} color="#0D9488" />; color = "bg-teal-50"; title = `Retorno Agendado: ${alert.patient_name}`; subtitle = `Sugerido: ${new Date(alert.suggested_return_date).toLocaleDateString()}`; }
                                else if (alert.type === 'reminder') { icon = <Bell size={20} color="#0D9488" />; color = "bg-teal-50"; title = alert.title; subtitle = alert.description || 'Lembrete'; }

                                return (
                                    <TouchableOpacity key={index} className="flex-row items-center p-3 rounded-xl border border-gray-100 bg-white" onPress={() => router.push('/alerts')}>
                                        <View className={`p-2 rounded-full mr-3 ${color}`}>{icon}</View>
                                        <View className="flex-1">
                                            <Text className="font-semibold text-gray-900">{title}</Text>
                                            <Text className="text-gray-500 text-xs">{subtitle}</Text>
                                        </View>
                                        <ChevronRight size={16} color="#9CA3AF" />
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    )}
                </View>
                <View className="h-6" />
            </ScrollView>

            {/* Modals */}
            <ProfileModal
                visible={showProfileModal}
                onClose={() => setShowProfileModal(false)}
                displayName={displayName}
                clinicName={clinicName}
                isAdmin={isAdmin}
                onLogout={handleLogout}
                onOpenLocations={openLocationsModal}
                onOpenTeam={() => { setShowProfileModal(false); setShowTeamModal(true); }}
            />

            <LocationsModal
                visible={showLocationsModal}
                onClose={() => setShowLocationsModal(false)}
                locations={locations}
                showForm={showLocationForm}
                setShowForm={setShowLocationForm}
                form={locationForm}
                setForm={setLocationForm}
                editingLocation={editingLocation}
                onAdd={handleAddLocation}
                onEdit={handleEditLocation}
                onDelete={handleDeleteLocation}
                onSave={handleSaveLocation}
            />

            <TeamManagementModal visible={showTeamModal} onClose={() => setShowTeamModal(false)} />

            <PendingBudgetsModal visible={showPendingBudgetsModal} onClose={() => setShowPendingBudgetsModal(false)} budgets={pendingBudgetsList} loading={loadingPendingBudgets} />

            <PendingReturnsModal
                visible={showPendingReturnsModal}
                onClose={() => setShowPendingReturnsModal(false)}
                returns={pendingReturnsList}
                loading={loadingPendingReturns}
                onMarkCompleted={handleMarkProcedureCompleted}
            />
        </SafeAreaView>
    );
}

function StatsCard({ title, value, icon, trend, isPositive, onPress }: { title: string; value: string; icon: React.ReactNode; trend?: string; isPositive?: boolean; onPress?: () => void; }) {
    return (
        <TouchableOpacity onPress={onPress} activeOpacity={onPress ? 0.7 : 1} className="w-[48%] bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <View className="flex-row justify-between items-start mb-2">
                <Text className="text-gray-600 text-sm font-medium flex-1">{title}</Text>
                <View className="bg-teal-50 p-2 rounded-lg">{icon}</View>
            </View>
            <Text className="text-3xl font-bold text-gray-900 mb-1">{value}</Text>
            {trend && <Text className={`text-xs ${isPositive ? 'text-green-600' : 'text-red-500'}`}>{trend}</Text>}
        </TouchableOpacity>
    );
}
