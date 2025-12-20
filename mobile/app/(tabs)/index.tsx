import { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput, Alert, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Users, Calendar, Bell, FileText, ChevronRight, User, Key, MapPin, LogOut, X, Plus, Pencil, Trash2, Gift, Clock, AlertTriangle, Users2, CheckCircle } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
import { TeamManagementModal } from '../../src/components/TeamManagementModal';
import { patientsService } from '../../src/services/patients';
import { appointmentsService } from '../../src/services/appointments';
import { consultationsService } from '../../src/services/consultations';
import { alertsService, type Alert as PatientAlert } from '../../src/services/alerts';
import { budgetsService } from '../../src/services/budgets';
import type { ReturnAlert, BudgetWithItems } from '../../src/types/database';
import { locationsService, type Location } from '../../src/services/locations';
import { remindersService } from '../../src/services/reminders';
import { getPendingReturns, markProcedureCompleted, type PendingReturn } from '../../src/services/pendingReturns';
import * as Linking from 'expo-linking';

// ... (existing helper types)
import { useAuth } from '../../src/contexts/AuthContext';
import { supabase } from '../../src/lib/supabase';

export default function Dashboard() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
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

    // Auth & Profile Loading
    const { session, signOut } = useAuth();

    useEffect(() => {
        if (session?.user) {
            loadProfile();
        }
    }, [session]);

    useFocusEffect(
        useCallback(() => {
            if (session?.user) {
                loadData();
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

            if (profile) {
                const p = profile as any;
                setDisplayName(p.full_name || 'Usuário');
                setClinicName(p.clinic_name || 'Minha Clínica');
                setIsAdmin(p.role === 'admin' || p.role === 'owner');
            }
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


    // ...
    const loadData = async () => {
        try {
            setLoading(true);
            const [patients, today, returnsCount, appointments, scheduled, birthdays, procedures, budgetsCount, remindersCount] = await Promise.all([
                patientsService.count(),
                appointmentsService.countToday(),
                consultationsService.countPendingReturns(),
                appointmentsService.getToday(),
                consultationsService.getReturnAlerts(),
                alertsService.getBirthdayAlerts(),
                alertsService.getProcedureReminders(),
                budgetsService.getPendingCount(),
                remindersService.getActiveCount()
            ]);
            setPatientsCount(patients);
            setActiveReminders(remindersCount);
            setTodayCount(today);
            setPendingReturns(returnsCount);
            setTodayAppointments(appointments);
            setPendingBudgetsCount(budgetsCount);
            // ...

            // ...
            // ...
            setTodayCount(today);
            setPendingReturns(returnsCount);
            setTodayAppointments(appointments);
            setPendingBudgetsCount(budgetsCount);

            // Combine and process alerts
            const combined: any[] = [
                ...birthdays,
                ...procedures,
                ...scheduled.map(s => ({ ...s, type: 'scheduled' }))
            ];

            // Prioritize: Birthdays > Procedures > Scheduled (soonest)
            // Just a simple mix for "Recentes" - essentially "Urgent"
            const limited = combined.slice(0, 6);
            setRecentAlerts(limited);
        } catch (error: any) {
            console.error('Error loading data:', {
                message: error?.message,
                code: error?.code,
                details: error?.details,
                hint: error?.hint,
            });
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
        Alert.alert(
            'Excluir Local',
            `Tem certeza que deseja excluir "${location.name}"?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Excluir',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await locationsService.delete(location.id);
                            loadLocations();
                        } catch (error) {
                            Alert.alert('Erro', 'Não foi possível excluir o local');
                        }
                    },
                },
            ]
        );
    };

    const handleSaveLocation = async () => {
        if (!locationForm.name.trim()) {
            Alert.alert('Erro', 'Nome é obrigatório');
            return;
        }

        try {
            if (editingLocation) {
                await locationsService.update(editingLocation.id, {
                    name: locationForm.name,
                    address: locationForm.address || null,
                });
            } else {
                await locationsService.create({
                    name: locationForm.name,
                    address: locationForm.address || null,
                });
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
            <ScrollView className="px-4 py-6">
                {/* Header */}
                <View className="flex-row items-start justify-between mb-6">
                    <View className="flex-1">
                        <Text className="text-2xl font-bold text-gray-900">Dashboard</Text>
                        <Text className="text-gray-500 mt-1">
                            Bem-vinda de volta! Aqui está o resumo do dia.
                        </Text>
                    </View>
                    <TouchableOpacity
                        className="w-10 h-10 bg-teal-600 rounded-full items-center justify-center"
                        onPress={() => setShowProfileModal(true)}
                    >
                        <User size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>

                {/* Stats Grid */}
                <View className="flex-row flex-wrap justify-between gap-y-4 mb-6">
                    <StatsCard
                        title="Lembretes Ativos"
                        value={activeReminders.toString()}
                        icon={<Bell size={24} color="#0D9488" />}
                        onPress={() => router.push('/alerts')}
                    />
                    <StatsCard
                        title="Consultas Hoje"
                        value={todayCount.toString()}
                        icon={<Calendar size={24} color="#0D9488" />}
                        onPress={() => router.push('/agenda?date=today')}
                    />
                    <StatsCard
                        title="Retornos Pendentes"
                        value={pendingReturns.toString()}
                        icon={<AlertTriangle size={24} color="#F59E0B" />}
                        onPress={async () => {
                            setShowPendingReturnsModal(true);
                            setLoadingPendingReturns(true);
                            try {
                                const data = await getPendingReturns();
                                setPendingReturnsList(data);
                            } catch (error) {
                                console.error('Error loading pending returns:', error);
                            } finally {
                                setLoadingPendingReturns(false);
                            }
                        }}
                    />
                    <StatsCard
                        title="Orçamentos Pendentes"
                        value={pendingBudgetsCount.toString()}
                        icon={<FileText size={24} color="#0D9488" />}
                        onPress={() => router.push('/patients')}
                    />
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
                                            {apt.notes && (
                                                <Text className="text-xs text-gray-500">{apt.notes}</Text>
                                            )}
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

                                if (alert.type === 'birthday') {
                                    icon = <Gift size={20} color="#EC4899" />;
                                    color = "bg-pink-50";
                                    title = `Aniversário de ${alert.patient.name}`;
                                    subtitle = "Hoje";
                                } else if (alert.type === 'procedure_return') {
                                    icon = <Clock size={20} color="#F59E0B" />;
                                    color = "bg-amber-50";
                                    title = `Retorno: ${alert.patient.name}`;
                                    subtitle = `${alert.daysSince} dias sem vir`;
                                } else if (alert.type === 'scheduled') {
                                    icon = <AlertTriangle size={20} color="#0D9488" />;
                                    color = "bg-teal-50";
                                    title = `Retorno Agendado: ${alert.patient_name}`;
                                    subtitle = `Sugerido: ${new Date(alert.suggested_return_date).toLocaleDateString()}`;
                                }

                                return (
                                    <TouchableOpacity
                                        key={index} // Alerts might not have unique IDs across types safely, index is okay here for display
                                        className={`flex-row items-center p-3 rounded-xl border border-gray-100 bg-white`}
                                        onPress={() => router.push('/alerts')}
                                    >
                                        <View className={`p-2 rounded-full mr-3 ${color}`}>
                                            {icon}
                                        </View>
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

            {/* Profile Modal */}
            <Modal visible={showProfileModal} animationType="fade" transparent>
                <TouchableOpacity
                    className="flex-1 bg-black/50 justify-end"
                    activeOpacity={1}
                    onPress={() => setShowProfileModal(false)}
                >
                    <View className="bg-white rounded-t-3xl p-6">
                        <View className="items-center mb-6">
                            <View className="w-16 h-16 bg-teal-600 rounded-full items-center justify-center mb-3">
                                <User size={32} color="#FFFFFF" />
                            </View>
                            <Text className="text-xl font-bold text-gray-900">{displayName || 'Usuário'}</Text>
                            <Text className="text-gray-500">{clinicName || 'Minha Clínica'}</Text>
                        </View>

                        <TouchableOpacity className="flex-row items-center gap-4 p-4 bg-gray-50 rounded-xl mb-3">
                            <Key size={20} color="#6B7280" />
                            <Text className="text-gray-700 font-medium">Alterar Senha</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            className="flex-row items-center gap-4 p-4 bg-gray-50 rounded-xl mb-3"
                            onPress={openLocationsModal}
                        >
                            <MapPin size={20} color="#6B7280" />
                            <Text className="text-gray-700 font-medium">Gerenciar Locais</Text>
                        </TouchableOpacity>

                        {isAdmin && (
                            <TouchableOpacity
                                className="flex-row items-center gap-4 p-4 bg-gray-50 rounded-xl mb-3"
                                onPress={() => {
                                    setShowProfileModal(false);
                                    setShowTeamModal(true);
                                }}
                            >
                                <Users2 size={20} color="#6B7280" />
                                <Text className="text-gray-700 font-medium">Gerenciar Equipe</Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            className="flex-row items-center gap-4 p-4 bg-red-50 rounded-xl"
                            onPress={handleLogout}
                        >
                            <LogOut size={20} color="#EF4444" />
                            <Text className="text-red-600 font-medium">Sair</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            className="mt-4 p-4"
                            onPress={() => setShowProfileModal(false)}
                        >
                            <Text className="text-center text-gray-500">Fechar</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Locations Modal */}
            <Modal visible={showLocationsModal} animationType="slide" presentationStyle="pageSheet">
                <SafeAreaView className="flex-1 bg-gray-50">
                    <View className="flex-row items-center justify-between px-4 py-4 bg-white border-b border-gray-100">
                        <TouchableOpacity onPress={() => setShowLocationsModal(false)}>
                            <X size={24} color="#6B7280" />
                        </TouchableOpacity>
                        <Text className="text-lg font-semibold text-gray-900">Locais de Atendimento</Text>
                        <View className="w-6" />
                    </View>

                    {showLocationForm ? (
                        <ScrollView className="flex-1 px-4 py-4">
                            <View className="mb-4">
                                <Text className="text-sm font-medium text-gray-700 mb-2">Nome do Local *</Text>
                                <TextInput
                                    className="bg-white border border-gray-200 rounded-xl p-4 text-gray-900"
                                    placeholder="Ex: Consultório 1"
                                    value={locationForm.name}
                                    onChangeText={(text) => setLocationForm({ ...locationForm, name: text })}
                                />
                            </View>
                            <View className="mb-6">
                                <Text className="text-sm font-medium text-gray-700 mb-2">Endereço / Descrição</Text>
                                <TextInput
                                    className="bg-white border border-gray-200 rounded-xl p-4 text-gray-900"
                                    placeholder="Ex: Sala 101, 1º andar"
                                    value={locationForm.address}
                                    onChangeText={(text) => setLocationForm({ ...locationForm, address: text })}
                                />
                            </View>
                            <View className="flex-row gap-3">
                                <TouchableOpacity
                                    onPress={() => setShowLocationForm(false)}
                                    className="flex-1 bg-gray-100 py-4 rounded-xl"
                                >
                                    <Text className="text-gray-700 font-semibold text-center">Cancelar</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={handleSaveLocation}
                                    className="flex-1 bg-teal-600 py-4 rounded-xl"
                                >
                                    <Text className="text-white font-semibold text-center">
                                        {editingLocation ? 'Salvar' : 'Adicionar'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    ) : (
                        <ScrollView className="flex-1 px-4 py-4">
                            <TouchableOpacity
                                onPress={handleAddLocation}
                                className="bg-teal-600 py-4 rounded-xl flex-row items-center justify-center gap-2 mb-4"
                            >
                                <Plus size={20} color="#FFFFFF" />
                                <Text className="text-white font-semibold">Adicionar Local</Text>
                            </TouchableOpacity>

                            {locations.length === 0 ? (
                                <View className="py-12 items-center">
                                    <MapPin size={48} color="#D1D5DB" />
                                    <Text className="text-gray-400 mt-4">Nenhum local cadastrado</Text>
                                </View>
                            ) : (
                                <View className="gap-3">
                                    {locations.map((location) => (
                                        <View key={location.id} className="bg-white p-4 rounded-xl border border-gray-100 flex-row items-center justify-between">
                                            <View className="flex-1">
                                                <Text className="font-semibold text-gray-900">{location.name}</Text>
                                                {location.address && (
                                                    <Text className="text-gray-500 text-sm">{location.address}</Text>
                                                )}
                                            </View>
                                            <View className="flex-row gap-2">
                                                <TouchableOpacity
                                                    onPress={() => handleEditLocation(location)}
                                                    className="bg-gray-100 p-2 rounded-lg"
                                                >
                                                    <Pencil size={18} color="#6B7280" />
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    onPress={() => handleDeleteLocation(location)}
                                                    className="bg-red-50 p-2 rounded-lg"
                                                >
                                                    <Trash2 size={18} color="#EF4444" />
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </ScrollView>
                    )}
                </SafeAreaView>
            </Modal>

            {/* Team Management Modal */}
            <TeamManagementModal
                visible={showTeamModal}
                onClose={() => setShowTeamModal(false)}
            />

            {/* Pending Returns Modal */}
            <Modal visible={showPendingReturnsModal} animationType="slide" presentationStyle="pageSheet">
                <SafeAreaView className="flex-1 bg-gray-50">
                    <View className="flex-row items-center justify-between px-4 py-4 bg-white border-b border-gray-100">
                        <TouchableOpacity onPress={() => setShowPendingReturnsModal(false)}>
                            <X size={24} color="#6B7280" />
                        </TouchableOpacity>
                        <Text className="text-lg font-semibold text-gray-900">
                            Retornos Pendentes ({pendingReturnsList.length})
                        </Text>
                        <View style={{ width: 24 }} />
                    </View>

                    {loadingPendingReturns ? (
                        <View className="flex-1 items-center justify-center">
                            <ActivityIndicator size="large" color="#0D9488" />
                        </View>
                    ) : pendingReturnsList.length === 0 ? (
                        <View className="flex-1 items-center justify-center p-8">
                            <AlertTriangle size={48} color="#D1D5DB" />
                            <Text className="text-gray-400 mt-4 text-center">
                                Nenhum tratamento com retorno pendente
                            </Text>
                        </View>
                    ) : (
                        <ScrollView className="flex-1 p-4">
                            {pendingReturnsList.map((item) => (
                                <View
                                    key={item.procedure.id}
                                    className="bg-white p-4 rounded-xl border border-gray-100 mb-3"
                                >
                                    <View className="flex-row items-start justify-between mb-2">
                                        <View className="flex-1">
                                            <Text className="font-semibold text-gray-900 text-base">
                                                {item.patient?.name}
                                            </Text>
                                            <Text className="text-sm text-gray-600 mt-1">
                                                {item.procedure.description}
                                            </Text>
                                        </View>
                                        <View className="bg-amber-100 px-2 py-1 rounded-full">
                                            <Text className="text-xs font-medium text-amber-700">
                                                {item.daysSinceUpdate} dias
                                            </Text>
                                        </View>
                                    </View>

                                    <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-gray-100">
                                        <View className="flex-row gap-2">
                                            {item.patient?.phone && (
                                                <TouchableOpacity
                                                    onPress={() => {
                                                        const phone = item.patient.phone.replace(/\D/g, '');
                                                        const message = encodeURIComponent(`Olá ${item.patient.name}, tudo bem? Estamos entrando em contato sobre seu tratamento.`);
                                                        Linking.openURL(`https://wa.me/55${phone}?text=${message}`);
                                                    }}
                                                    className="bg-green-50 px-3 py-2 rounded-lg flex-row items-center gap-1"
                                                >
                                                    <Svg width={14} height={14} viewBox="0 0 24 24" fill="#15803D">
                                                        <Path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                                    </Svg>
                                                    <Text className="text-green-700 font-medium text-sm">Mensagem</Text>
                                                </TouchableOpacity>
                                            )}
                                            <TouchableOpacity
                                                onPress={() => {
                                                    setShowPendingReturnsModal(false);
                                                    router.push('/agenda');
                                                }}
                                                className="bg-teal-50 px-3 py-2 rounded-lg flex-row items-center gap-1"
                                            >
                                                <Calendar size={14} color="#0D9488" />
                                                <Text className="text-teal-700 font-medium text-sm">Agendar</Text>
                                            </TouchableOpacity>
                                        </View>
                                        <TouchableOpacity
                                            onPress={async () => {
                                                try {
                                                    await markProcedureCompleted(item.procedure.id);
                                                    setPendingReturnsList(prev => prev.filter(p => p.procedure.id !== item.procedure.id));
                                                    setPendingReturns(prev => Math.max(0, prev - 1));
                                                } catch (error) {
                                                    console.error('Error marking completed:', error);
                                                }
                                            }}
                                            className="bg-green-600 px-3 py-2 rounded-lg flex-row items-center gap-1"
                                        >
                                            <CheckCircle size={14} color="#FFFFFF" />
                                            <Text className="text-white font-medium text-sm">Marcar OK</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))}
                        </ScrollView>
                    )}
                </SafeAreaView>
            </Modal>

        </SafeAreaView>
    );
}

function StatsCard({ title, value, icon, trend, isPositive, onPress }: {
    title: string;
    value: string;
    icon: React.ReactNode;
    trend?: string;
    isPositive?: boolean;
    onPress?: () => void;
}) {
    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={onPress ? 0.7 : 1}
            className="w-[48%] bg-white p-4 rounded-2xl shadow-sm border border-gray-100"
        >
            <View className="flex-row justify-between items-start mb-2">
                <Text className="text-gray-600 text-sm font-medium flex-1">{title}</Text>
                <View className="bg-teal-50 p-2 rounded-lg">
                    {icon}
                </View>
            </View>
            <Text className="text-3xl font-bold text-gray-900 mb-1">{value}</Text>
            {trend && (
                <Text className={`text-xs ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
                    {trend}
                </Text>
            )}
        </TouchableOpacity>
    );
}
