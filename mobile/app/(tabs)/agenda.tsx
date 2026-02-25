import { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, Pressable, RefreshControl, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Calendar, Plus, MapPin, X, Settings } from 'lucide-react-native';
import { appointmentsService } from '../../src/services/appointments';
import { getPatients, createPatientFromForm } from '../../src/services/patients';
import { locationsService, type Location } from '../../src/services/locations';
import { CalendarGrid, NewAppointmentModal } from '../../src/components/agenda';
import { ScheduleSettingsModal } from '../../src/components/agenda/ScheduleSettingsModal';
import type { AppointmentWithPatient, Patient, PatientFormData } from '../../src/types/database';

export default function Agenda() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [calendarMonth, setCalendarMonth] = useState(new Date());
    const [appointments, setAppointments] = useState<AppointmentWithPatient[]>([]);
    const [datesWithAppointments, setDatesWithAppointments] = useState<string[]>([]);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [showStatusPicker, setShowStatusPicker] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithPatient | null>(null);
    const [editingAppointment, setEditingAppointment] = useState<AppointmentWithPatient | null>(null);
    const [showScheduleSettings, setShowScheduleSettings] = useState(false);

    // Patient creation flow
    const [showPatientModal, setShowPatientModal] = useState(false);
    const [preSelectedPatient, setPreSelectedPatient] = useState<Patient | null>(null);
    const [patientForm, setPatientForm] = useState({ name: '', phone: '' });
    const [savingPatient, setSavingPatient] = useState(false);

    useEffect(() => {
        loadAppointments();
    }, [selectedDate]);

    useEffect(() => {
        loadMonthDates();
    }, [calendarMonth]);

    useEffect(() => {
        loadPatients();
        loadLocations();
    }, []);

    // Recarrega pacientes quando a tela recebe foco (ex: volta de outra aba)
    useFocusEffect(
        useCallback(() => {
            loadPatients();
        }, [])
    );

    useEffect(() => {
        if (params.date === 'today') {
            goToToday();
            // Optional: reset param to avoid stuck state if they navigate away and back without param?
            // But usually nice to stay.
            router.setParams({ date: '' }); // Clear it so subsequent clicks re-trigger if logic depends on change, or just leaves it.
        }
    }, [params.date]);

    const loadAppointments = async () => {
        try {
            setLoading(true);
            const dateStr = selectedDate.toISOString().split('T')[0];
            const data = await appointmentsService.getByDate(dateStr);
            setAppointments(data);
        } catch (error) {
            console.error('Error loading appointments:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadMonthDates = async () => {
        try {
            const year = calendarMonth.getFullYear();
            const month = calendarMonth.getMonth();
            const startDate = new Date(year, month, 1).toISOString().split('T')[0];
            const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

            const dates = await appointmentsService.getDatesWithAppointments(startDate, endDate);
            setDatesWithAppointments(dates);
        } catch (error) {
            console.error('Error loading month dates:', error);
        }
    };

    const loadPatients = async () => {
        try {
            const data = await getPatients();
            setPatients(data);
        } catch (error) {
            console.error('Error loading patients:', error);
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

    const goToPrevMonth = () => {
        const prev = new Date(calendarMonth);
        prev.setMonth(prev.getMonth() - 1);
        setCalendarMonth(prev);
    };

    const goToNextMonth = () => {
        const next = new Date(calendarMonth);
        next.setMonth(next.getMonth() + 1);
        setCalendarMonth(next);
    };

    const goToToday = () => {
        const today = new Date();
        setSelectedDate(today);
        setCalendarMonth(today);
    };

    const formatDate = (date: Date) => {
        const options: Intl.DateTimeFormatOptions = {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
        };
        return date.toLocaleDateString('pt-BR', options);
    };

    const handleCreateAppointment = async (appointment: {
        patientId: string;
        time: string;
        location: string;
        notes: string;
        procedure?: string;
    }) => {
        // Check for time conflict
        const timeConflict = appointments.find(
            apt => apt.time?.slice(0, 5) === appointment.time.slice(0, 5)
        );
        if (timeConflict) {
            Alert.alert(
                'Horário Ocupado',
                `Já existe uma consulta agendada às ${appointment.time.slice(0, 5)} com ${timeConflict.patients?.name || 'outro paciente'}`
            );
            return;
        }

        try {
            console.log('=== INICIANDO CRIAÇÃO DE AGENDAMENTO ===');
            console.log('Appointment data:', appointment);
            const dateStr = selectedDate.toISOString().split('T')[0];
            console.log('Date string:', dateStr);

            const result = await appointmentsService.create({
                patient_id: appointment.patientId,
                date: dateStr,
                time: appointment.time,
                status: 'scheduled',
                location: appointment.location || null,
                notes: appointment.notes || null,
                procedure_name: appointment.procedure || null,
            });

            console.log('=== AGENDAMENTO CRIADO COM SUCESSO ===');
            console.log('Result:', result);

            setShowModal(false);
            setEditingAppointment(null);
            loadAppointments();
            loadMonthDates();
            Alert.alert('Sucesso', 'Consulta agendada com sucesso!');
        } catch (error: any) {
            console.error('=== ERRO AO CRIAR AGENDAMENTO ===');
            console.error('Error type:', typeof error);
            console.error('Error object:', error);
            console.error('Error message:', error?.message);
            console.error('Error code:', error?.code);
            console.error('Error details:', error?.details);
            console.error('Error hint:', error?.hint);
            console.error('Full error:', JSON.stringify(error, null, 2));

            let errorMessage = 'Não foi possível agendar a consulta';
            if (error?.message) {
                errorMessage = error.message;
            } else if (error?.details) {
                errorMessage = `Erro: ${error.details}`;
            } else if (typeof error === 'string') {
                errorMessage = error;
            } else if (error?.toString && typeof error.toString === 'function') {
                errorMessage = error.toString();
            } else {
                errorMessage = `Erro desconhecido: ${JSON.stringify(error)}`;
            }

            console.log('Mensagem de erro que será exibida:', errorMessage);
            Alert.alert('Erro', errorMessage);
        }
    };

    const handleUpdateAppointment = async (id: string, updates: any) => {
        // Check for time conflict (exclude current appointment)
        if (updates.time) {
            const timeConflict = appointments.find(
                apt => apt.id !== id && apt.time?.slice(0, 5) === updates.time.slice(0, 5)
            );
            if (timeConflict) {
                Alert.alert(
                    'Horário Ocupado',
                    `Já existe uma consulta agendada às ${updates.time.slice(0, 5)} com ${timeConflict.patients?.name || 'outro paciente'}`
                );
                return;
            }
        }

        try {
            await appointmentsService.update(id, updates);
            setShowModal(false);
            setEditingAppointment(null);
            loadAppointments();
            Alert.alert('Sucesso', 'Agendamento atualizado com sucesso!');
        } catch (error) {
            console.error('Error updating appointment:', error);
            Alert.alert('Erro', 'Não foi possível atualizar o agendamento');
        }
    };

    const handleDeleteAppointment = async (id: string) => {
        try {
            await appointmentsService.delete(id);
            setShowModal(false);
            setEditingAppointment(null);
            loadAppointments();
            loadMonthDates();
            Alert.alert('Sucesso', 'Agendamento excluído com sucesso!');
        } catch (error) {
            console.error('Error deleting appointment:', error);
            Alert.alert('Erro', 'Não foi possível excluir o agendamento');
        }
    };

    const isToday = selectedDate.toDateString() === new Date().toDateString();

    const statusConfig: Record<string, { label: string; bgColor: string; textColor: string }> = {
        scheduled: { label: 'Agendado', bgColor: 'bg-[#fee2e2]', textColor: 'text-[#8b3634]' },
        confirmed: { label: 'Confirmado', bgColor: 'bg-green-100', textColor: 'text-green-700' },
        completed: { label: 'Compareceu', bgColor: 'bg-blue-100', textColor: 'text-blue-700' },
        no_show: { label: 'Não Compareceu', bgColor: 'bg-orange-100', textColor: 'text-orange-700' },
        cancelled: { label: 'Cancelado', bgColor: 'bg-[#fee2e2]', textColor: 'text-[#8b3634]' },
        rescheduled: { label: 'Remarcado', bgColor: 'bg-purple-100', textColor: 'text-purple-700' },
    };

    const statusOptions: { value: AppointmentWithPatient['status']; label: string }[] = [
        { value: 'scheduled', label: 'Agendado' },
        { value: 'confirmed', label: 'Confirmado' },
        { value: 'completed', label: 'Compareceu' },
        { value: 'cancelled', label: 'Cancelado' },
    ];

    const handleStatusPress = (appointment: AppointmentWithPatient) => {
        setSelectedAppointment(appointment);
        setShowStatusPicker(true);
    };

    const handleStatusChange = async (newStatus: AppointmentWithPatient['status']) => {
        if (!selectedAppointment) return;

        try {
            await appointmentsService.update(selectedAppointment.id, { status: newStatus });
            setShowStatusPicker(false);
            setSelectedAppointment(null);
            await loadAppointments();
        } catch (error) {
            console.error('Error updating status:', error);
            Alert.alert('Erro', 'Não foi possível atualizar o status');
        }
    };

    // Patient creation flow handlers
    const handleRequestCreatePatient = (prefillName: string) => {
        console.log('handleRequestCreatePatient called with:', prefillName);
        // Close appointment modal first (React Native can have issues with stacked modals)
        setShowModal(false);
        // Then open patient creation modal
        setPatientForm({ name: prefillName, phone: '' });
        setTimeout(() => {
            setShowPatientModal(true);
        }, 300); // Small delay to allow animation
    };

    const formatPhone = (value: string) => {
        const numbers = value.replace(/\D/g, '');
        if (numbers.length <= 11) {
            return numbers
                .replace(/(\d{2})(\d)/, '($1) $2')
                .replace(/(\d{5})(\d)/, '$1-$2');
        }
        return value;
    };

    const handleSavePatient = async () => {
        if (!patientForm.name || !patientForm.phone) {
            Alert.alert('Erro', 'Nome e telefone são obrigatórios');
            return;
        }
        try {
            setSavingPatient(true);
            const newPatient = await createPatientFromForm({
                name: patientForm.name,
                phone: patientForm.phone,
            } as PatientFormData);

            // Refresh patients list
            await loadPatients();

            // Pre-select the new patient and close patient modal
            setPreSelectedPatient(newPatient);
            setShowPatientModal(false);
            setPatientForm({ name: '', phone: '' });

            // Reopen appointment modal with pre-selected patient
            setTimeout(() => {
                setShowModal(true);
            }, 300);

            Alert.alert('Sucesso', `Paciente "${newPatient.name}" cadastrado! Complete o agendamento.`);
        } catch (error) {
            console.error('Error creating patient:', error);
            Alert.alert('Erro', 'Não foi possível cadastrar o paciente');
        } finally {
            setSavingPatient(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            <ScrollView
                className="px-4 py-6"
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={async () => {
                            setRefreshing(true);
                            await Promise.all([loadAppointments(), loadMonthDates()]);
                            setRefreshing(false);
                        }}
                        colors={['#b94a48']}
                        tintColor="#b94a48"
                    />
                }
            >
                {/* Header */}
                <View className="flex-row items-center justify-between mb-6">
                    <View>
                        <Text className="text-2xl font-bold text-gray-900">Agenda</Text>
                        <Text className="text-gray-500 mt-1">Consultas agendadas</Text>
                    </View>
                    <View className="flex-row items-center gap-3">
                        <TouchableOpacity
                            onPress={() => setShowScheduleSettings(true)}
                            className="bg-gray-100 w-10 h-10 rounded-full items-center justify-center"
                        >
                            <Settings size={20} color="#6B7280" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => {
                                loadLocations();
                                setEditingAppointment(null);
                                setShowModal(true);
                            }}
                            className="bg-[#a03f3d] w-12 h-12 rounded-full items-center justify-center shadow-lg"
                        >
                            <Plus size={24} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Calendar */}
                <CalendarGrid
                    calendarMonth={calendarMonth}
                    selectedDate={selectedDate}
                    datesWithAppointments={datesWithAppointments}
                    onSelectDate={(date) => {
                        setSelectedDate(date);
                    }}
                    onDayDoubleClick={(date) => {
                        setSelectedDate(date);
                        setEditingAppointment(null);
                        setShowModal(true);
                    }}
                    onPrevMonth={goToPrevMonth}
                    onNextMonth={goToNextMonth}
                    onGoToToday={goToToday}
                />

                {/* Selected Date Display */}
                <View className="bg-white rounded-xl p-4 border border-gray-100 mb-4">
                    <View className="items-center">
                        <Text className="text-lg font-bold text-gray-900 capitalize">
                            {formatDate(selectedDate)}
                        </Text>
                        {!isToday && (
                            <TouchableOpacity onPress={goToToday}>
                                <Text className="text-[#a03f3d] text-sm mt-1">Ir para hoje</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Appointments */}
                {loading ? (
                    <View className="py-12 items-center">
                        <ActivityIndicator size="large" color="#b94a48" />
                    </View>
                ) : appointments.length === 0 ? (
                    <View className="bg-white rounded-xl p-12 items-center">
                        <Calendar size={48} color="#D1D5DB" />
                        <Text className="text-gray-400 mt-4">Nenhuma consulta neste dia</Text>
                    </View>
                ) : (
                    <View className="gap-3">
                        {appointments.map((apt) => {
                            const status = statusConfig[apt.status] || statusConfig.scheduled;
                            return (
                                <TouchableOpacity
                                    key={apt.id}
                                    className="bg-white rounded-xl p-4 border border-gray-100"
                                    activeOpacity={0.7}
                                    onPress={() => {
                                        setEditingAppointment(apt);
                                        setShowModal(true);
                                    }}
                                >
                                    <View className="flex-row items-center gap-4">
                                        <View className="items-center justify-center">
                                            <Text className="text-2xl font-bold text-[#a03f3d]">
                                                {apt.time?.slice(0, 5)}
                                            </Text>
                                        </View>
                                        <View className="flex-1">
                                            <View className="flex-row items-center gap-2">
                                                <Text className="font-semibold text-gray-900">
                                                    {apt.patients?.name}
                                                </Text>
                                                <TouchableOpacity
                                                    onPress={(e) => {
                                                        e.stopPropagation();
                                                        handleStatusPress(apt);
                                                    }}
                                                    className={`px-2 py-0.5 rounded-full ${status.bgColor}`}
                                                >
                                                    <Text className={`text-xs font-medium ${status.textColor}`}>
                                                        {status.label}
                                                    </Text>
                                                </TouchableOpacity>
                                            </View>
                                            {apt.procedure_name && (
                                                <Text className="text-gray-700 font-medium text-sm mt-1">
                                                    {apt.procedure_name}
                                                </Text>
                                            )}
                                            {apt.location && (
                                                <View className="flex-row items-center gap-1 mt-1">
                                                    <MapPin size={12} color="#6B7280" />
                                                    <Text className="text-gray-500 text-sm">{apt.location}</Text>
                                                </View>
                                            )}
                                            {apt.notes && (
                                                <Text className="text-gray-400 text-sm mt-1">{apt.notes}</Text>
                                            )}
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}

                <View className="h-6" />
            </ScrollView>

            {/* New Appointment Modal */}
            <NewAppointmentModal
                visible={showModal}
                selectedDate={selectedDate}
                patients={patients}
                locations={locations}
                onClose={() => {
                    setShowModal(false);
                    setEditingAppointment(null);
                    setPreSelectedPatient(null);
                }}
                onCreateAppointment={handleCreateAppointment}
                appointmentToEdit={editingAppointment}
                onUpdate={handleUpdateAppointment}
                onDelete={handleDeleteAppointment}
                onRequestCreatePatient={handleRequestCreatePatient}
                preSelectedPatient={preSelectedPatient}
            />

            {/* Status Picker Modal */}
            <Modal
                visible={showStatusPicker}
                transparent
                animationType="fade"
                onRequestClose={() => setShowStatusPicker(false)}
            >
                <Pressable
                    className="flex-1 bg-black/50 justify-end"
                    onPress={() => setShowStatusPicker(false)}
                >
                    <Pressable className="bg-white rounded-t-3xl" onPress={(e) => e.stopPropagation()}>
                        <View className="p-4 border-b border-gray-100">
                            <View className="w-12 h-1 bg-gray-300 rounded-full self-center mb-4" />
                            <Text className="text-lg font-semibold text-gray-900 text-center">
                                Alterar Status
                            </Text>
                            {selectedAppointment && (
                                <Text className="text-gray-500 text-center mt-1">
                                    {selectedAppointment.patients?.name}
                                </Text>
                            )}
                        </View>
                        <View className="p-4">
                            {statusOptions.map((option) => {
                                const config = statusConfig[option.value];
                                const isSelected = selectedAppointment?.status === option.value;
                                return (
                                    <TouchableOpacity
                                        key={option.value}
                                        onPress={() => handleStatusChange(option.value)}
                                        className={`flex-row items-center p-4 rounded-xl mb-2 ${isSelected ? 'bg-gray-100' : 'bg-gray-50'}`}
                                    >
                                        <View className={`w-3 h-3 rounded-full mr-3 ${config.bgColor.replace('100', '500')}`} />
                                        <Text className={`flex-1 font-medium ${isSelected ? 'text-[#a03f3d]' : 'text-gray-700'}`}>
                                            {option.label}
                                        </Text>
                                        {isSelected && (
                                            <Text className="text-[#a03f3d]">✓</Text>
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                        <TouchableOpacity
                            onPress={() => setShowStatusPicker(false)}
                            className="p-4 border-t border-gray-100"
                        >
                            <Text className="text-center text-gray-500 font-medium">Cancelar</Text>
                        </TouchableOpacity>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Inline Patient Creation Modal */}
            <Modal visible={showPatientModal} animationType="slide" presentationStyle="pageSheet">
                <SafeAreaView className="flex-1 bg-white">
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        className="flex-1"
                    >
                        <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-100">
                            <TouchableOpacity onPress={() => {
                                setShowPatientModal(false);
                                setPatientForm({ name: '', phone: '' });
                            }}>
                                <X size={24} color="#6B7280" />
                            </TouchableOpacity>
                            <Text className="text-lg font-semibold text-gray-900">Cadastrar Paciente</Text>
                            <TouchableOpacity onPress={handleSavePatient} disabled={savingPatient}>
                                <Text className={`font-semibold ${savingPatient ? 'text-gray-400' : 'text-[#b94a48]'}`}>
                                    {savingPatient ? 'Salvando...' : 'Salvar'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView className="flex-1 px-4 py-6">
                            <View className="bg-[#fef2f2] border border-[#fecaca] rounded-xl p-4 mb-6">
                                <Text className="text-[#8b3634] text-sm">
                                    Cadastro rápido de paciente. Você poderá completar o perfil depois.
                                </Text>
                            </View>

                            <View className="mb-4">
                                <Text className="text-sm font-medium text-gray-700 mb-2">Nome completo *</Text>
                                <TextInput
                                    className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                                    placeholder="Nome do paciente"
                                    placeholderTextColor="#9CA3AF"
                                    value={patientForm.name}
                                    onChangeText={(text) => setPatientForm({ ...patientForm, name: text })}
                                    autoFocus
                                />
                            </View>

                            <View className="mb-6">
                                <Text className="text-sm font-medium text-gray-700 mb-2">Telefone *</Text>
                                <TextInput
                                    className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                                    placeholder="(11) 99999-9999"
                                    placeholderTextColor="#9CA3AF"
                                    keyboardType="phone-pad"
                                    value={patientForm.phone}
                                    onChangeText={(text) => setPatientForm({ ...patientForm, phone: formatPhone(text) })}
                                />
                            </View>
                        </ScrollView>
                    </KeyboardAvoidingView>
                </SafeAreaView>
            </Modal>
            <ScheduleSettingsModal visible={showScheduleSettings} onClose={() => setShowScheduleSettings(false)} />
        </SafeAreaView>
    );
}
