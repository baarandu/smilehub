import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Users, Calendar, Bell, TrendingUp, ChevronRight, User, Key, MapPin, LogOut, X, Plus, Pencil, Trash2 } from 'lucide-react-native';
import { patientsService } from '../../src/services/patients';
import { appointmentsService } from '../../src/services/appointments';
import { consultationsService } from '../../src/services/consultations';
import { locationsService, type Location } from '../../src/services/locations';
import type { AppointmentWithPatient } from '../../src/types/database';

export default function Dashboard() {
    const [loading, setLoading] = useState(true);
    const [patientsCount, setPatientsCount] = useState(0);
    const [todayCount, setTodayCount] = useState(0);
    const [pendingReturns, setPendingReturns] = useState(0);
    const [todayAppointments, setTodayAppointments] = useState<AppointmentWithPatient[]>([]);

    // Profile & Locations modal state
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [showLocationsModal, setShowLocationsModal] = useState(false);
    const [locations, setLocations] = useState<Location[]>([]);
    const [editingLocation, setEditingLocation] = useState<Location | null>(null);
    const [locationForm, setLocationForm] = useState({ name: '', address: '' });
    const [showLocationForm, setShowLocationForm] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [patients, today, returns, appointments] = await Promise.all([
                patientsService.count(),
                appointmentsService.countToday(),
                consultationsService.countPendingReturns(),
                appointmentsService.getToday()
            ]);
            setPatientsCount(patients);
            setTodayCount(today);
            setPendingReturns(returns);
            setTodayAppointments(appointments);
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
                        className="flex-row items-center gap-2"
                        onPress={() => setShowProfileModal(true)}
                    >
                        <View>
                            <Text className="text-sm font-medium text-gray-900 text-right">Dr. Usuário</Text>
                            <Text className="text-xs text-gray-500 text-right">Dentista</Text>
                        </View>
                        <View className="w-10 h-10 bg-teal-600 rounded-full items-center justify-center">
                            <User size={20} color="#FFFFFF" />
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Stats Grid */}
                <View className="flex-row flex-wrap justify-between gap-y-4 mb-6">
                    <StatsCard
                        title="Pacientes"
                        value={patientsCount.toString()}
                        icon={<Users size={24} color="#0D9488" />}
                    />
                    <StatsCard
                        title="Consultas Hoje"
                        value={todayCount.toString()}
                        icon={<Calendar size={24} color="#0D9488" />}
                    />
                    <StatsCard
                        title="Retornos Pendentes"
                        value={pendingReturns.toString()}
                        icon={<Bell size={24} color="#F59E0B" />}
                    />
                    <StatsCard
                        title="Taxa de Retorno"
                        value="85%"
                        icon={<TrendingUp size={24} color="#0D9488" />}
                        trend="+ 5% vs mês anterior"
                        isPositive
                    />
                </View>

                {/* Agenda Section */}
                <View className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                    <View className="flex-row justify-between items-center mb-4">
                        <View className="flex-row items-center gap-2">
                            <Calendar size={20} color="#0D9488" />
                            <Text className="text-lg font-bold text-gray-900">Agenda de Hoje</Text>
                        </View>
                        <TouchableOpacity>
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
                            <Text className="text-xl font-bold text-gray-900">Dr. Usuário</Text>
                            <Text className="text-gray-500">Dentista</Text>
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

                        <TouchableOpacity className="flex-row items-center gap-4 p-4 bg-red-50 rounded-xl">
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
        </SafeAreaView>
    );
}

function StatsCard({ title, value, icon, trend, isPositive }: {
    title: string;
    value: string;
    icon: React.ReactNode;
    trend?: string;
    isPositive?: boolean;
}) {
    return (
        <View className="w-[48%] bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
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
        </View>
    );
}
