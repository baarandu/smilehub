import { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { PendingReturnsModal } from '../../src/components/dashboard/PendingReturnsModal';
import type { ReturnAlert } from '../../src/types/database';
import { remindersService, type Reminder } from '../../src/services/reminders';
import { profileService } from '../../src/services/profile';
import { getPendingReturns, markProcedureCompleted, type PendingReturn } from '../../src/services/pendingReturns';
import { useAuth } from '../../src/contexts/AuthContext';
import { useClinic } from '../../src/contexts/ClinicContext';
import { supabase } from '../../src/lib/supabase';
import { TrialBanner } from '../../src/components/TrialBanner';

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
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [showTeamModal, setShowTeamModal] = useState(false);

    // Pending Returns Modal
    const [showPendingReturnsModal, setShowPendingReturnsModal] = useState(false);
    const [pendingReturnsList, setPendingReturnsList] = useState<PendingReturn[]>([]);
    const [loadingPendingReturns, setLoadingPendingReturns] = useState(false);

    // Pending Budgets Modal
    const [showPendingBudgetsModal, setShowPendingBudgetsModal] = useState(false);
    const [pendingBudgetsList, setPendingBudgetsList] = useState<{ budgetId: string; patientId: string; patientName: string; date: string; tooth: any; totalBudgetValue: number }[]>([]);
    const [loadingPendingBudgets, setLoadingPendingBudgets] = useState(false);

    const { session, signOut } = useAuth();
    const { role: clinicRole, clinicId, isAdmin: clinicIsAdmin, isDentist: clinicIsDentist } = useClinic();

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

            setIsAdmin(clinicIsAdmin || userRole === 'admin' || userRole === 'owner');
            setIsSuperAdmin(!!p.is_super_admin);
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

    const handleMarkProcedureCompleted = async (procedureId: string) => {
        try {
            await markProcedureCompleted(procedureId);
            setPendingReturnsList(prev => prev.filter(p => p.procedure.id !== procedureId));
            setPendingReturns(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Error marking completed:', error);
        }
    };

    const insets = useSafeAreaInsets();

    if (loading) {
        return (
            <View className="flex-1 bg-gray-50 items-center justify-center">
                <ActivityIndicator size="large" color="#b94a48" />
                <Text className="text-gray-500 mt-4">Carregando...</Text>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-gray-50">
            <ScrollView
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={async () => { setRefreshing(true); await loadData(); setRefreshing(false); }}
                        colors={['#b94a48']}
                        tintColor="#b94a48"
                    />
                }
            >
                {/* Green Header */}
                <View
                    style={{ paddingTop: insets.top + 20, paddingBottom: 32 }}
                    className="bg-[#a03f3d] px-6 rounded-b-[32px] mb-6 shadow-md"
                >
                    <View className="flex-row items-center justify-between">
                        <View className="flex-1 mr-4">
                            <View className="flex-row items-center gap-3">
                                <View className="bg-white/20 p-1.5 rounded-xl">
                                    <Image
                                        source={require('../../assets/logo-login.png')}
                                        className="w-8 h-8"
                                        resizeMode="contain"
                                    />
                                </View>
                                <Text className="text-2xl font-bold text-white">Painel de Controle</Text>
                            </View>
                            <Text className="text-[#fef2f2] mt-1 text-sm opacity-90">Bem-vinda de volta! Aqui está o resumo do dia.</Text>
                        </View>
                        <TouchableOpacity
                            className="w-10 h-10 bg-white/20 rounded-full items-center justify-center border border-white/30"
                            onPress={() => setShowProfileModal(true)}
                        >
                            <Menu size={20} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Trial Banner */}
                <TrialBanner />

                {/* Content Container */}
                <View className="px-4 pb-8">
                    {/* Stats Grid */}
                    <View className="flex-row flex-wrap justify-between gap-y-4 mb-6">
                        <StatsCard title="Lembretes Ativos" value={activeReminders.toString()} icon={<Bell size={24} color="#b94a48" />} onPress={() => router.push('/alerts')} />
                        <StatsCard title="Consultas Hoje" value={todayCount.toString()} icon={<Calendar size={24} color="#b94a48" />} onPress={() => router.push('/agenda?date=today')} />
                        <StatsCard title="Retornos Pendentes" value={pendingReturns.toString()} icon={<AlertTriangle size={24} color="#F59E0B" />} onPress={async () => {
                            setShowPendingReturnsModal(true);
                            setLoadingPendingReturns(true);
                            try { setPendingReturnsList(await getPendingReturns()); } catch (e) { console.error(e); } finally { setLoadingPendingReturns(false); }
                        }} />
                        <StatsCard title="Orçamentos Pendentes" value={pendingBudgetsCount.toString()} icon={<FileText size={24} color="#b94a48" />} onPress={async () => {
                            setShowPendingBudgetsModal(true);
                            setLoadingPendingBudgets(true);
                            try { setPendingBudgetsList(await budgetsService.getAllPending()); } catch (e) { console.error(e); } finally { setLoadingPendingBudgets(false); }
                        }} />
                    </View>

                    {/* Agenda Section */}
                    <View className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-8">
                        <View className="flex-row justify-between items-center mb-4">
                            <View className="flex-row items-center gap-2">
                                <Calendar size={20} color="#b94a48" />
                                <Text className="text-lg font-bold text-gray-900">Agenda de Hoje</Text>
                            </View>
                            <TouchableOpacity onPress={() => router.push('/agenda')}>
                                <Text className="text-[#a03f3d] font-medium">Ver agenda</Text>
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
                                            <View className="w-10 h-10 bg-[#fee2e2] rounded-full items-center justify-center">
                                                <Users size={20} color="#b94a48" />
                                            </View>
                                            <View>
                                                <Text className="font-semibold text-gray-900">{apt.patients?.name}</Text>
                                                <Text className="text-[#8b3634] font-bold">{apt.time?.slice(0, 5)}</Text>
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
                                <Text className="text-[#a03f3d] font-medium">Ver todos</Text>
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
                                    else if (alert.type === 'scheduled') { icon = <AlertTriangle size={20} color="#b94a48" />; color = "bg-[#fef2f2]"; title = `Retorno Agendado: ${alert.patient_name}`; subtitle = `Sugerido: ${new Date(alert.suggested_return_date).toLocaleDateString()}`; }
                                    else if (alert.type === 'reminder') { icon = <Bell size={20} color="#b94a48" />; color = "bg-[#fef2f2]"; title = alert.title; subtitle = alert.description || 'Lembrete'; }

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
                </View>
            </ScrollView>

            {/* Modals */}
            <ProfileModal
                visible={showProfileModal}
                onClose={() => setShowProfileModal(false)}
                displayName={displayName}
                clinicName={clinicName}
                clinicId={clinicId || undefined}
                isAdmin={isAdmin}
                isDentist={clinicIsDentist}
                isSuperAdmin={isSuperAdmin}
                userEmail={session?.user?.email || ''}
                userRole={clinicRole || ''}
                onLogout={handleLogout}
                onOpenTeam={() => { setShowProfileModal(false); setShowTeamModal(true); }}
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
        </View>
    );
}

function StatsCard({ title, value, icon, trend, isPositive, onPress }: { title: string; value: string; icon: React.ReactNode; trend?: string; isPositive?: boolean; onPress?: () => void; }) {
    return (
        <TouchableOpacity onPress={onPress} activeOpacity={onPress ? 0.7 : 1} className="w-[48%] bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <View className="flex-row justify-between items-start mb-2">
                <Text className="text-gray-600 text-sm font-medium flex-1">{title}</Text>
                <View className="bg-[#fef2f2] p-2 rounded-lg">{icon}</View>
            </View>
            <Text className="text-3xl font-bold text-gray-900 mb-1">{value}</Text>
            {trend && <Text className={`text-xs ${isPositive ? 'text-green-600' : 'text-[#b94a48]'}`}>{trend}</Text>}
        </TouchableOpacity>
    );
}
