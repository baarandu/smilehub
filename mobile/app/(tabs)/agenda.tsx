import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Calendar, Plus, MapPin } from 'lucide-react-native';
import { appointmentsService } from '../../src/services/appointments';
import { getPatients } from '../../src/services/patients';
import { locationsService, type Location } from '../../src/services/locations';
import { CalendarGrid, NewAppointmentModal } from '../../src/components/agenda';
import type { AppointmentWithPatient, Patient } from '../../src/types/database';

export default function Agenda() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [calendarMonth, setCalendarMonth] = useState(new Date());
    const [appointments, setAppointments] = useState<AppointmentWithPatient[]>([]);
    const [datesWithAppointments, setDatesWithAppointments] = useState<string[]>([]);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [showStatusPicker, setShowStatusPicker] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithPatient | null>(null);

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
    }) => {
        try {
            const dateStr = selectedDate.toISOString().split('T')[0];
            await appointmentsService.create({
                patient_id: appointment.patientId,
                date: dateStr,
                time: appointment.time,
                status: 'scheduled',
                location: appointment.location || null,
                notes: appointment.notes || null,
            });

            setShowModal(false);
            loadAppointments();
            loadMonthDates();
            Alert.alert('Sucesso', 'Consulta agendada com sucesso!');
        } catch (error) {
            console.error('Error creating appointment:', error);
            Alert.alert('Erro', 'Não foi possível agendar a consulta');
        }
    };

    const isToday = selectedDate.toDateString() === new Date().toDateString();

    const statusConfig: Record<string, { label: string; bgColor: string; textColor: string }> = {
        scheduled: { label: 'Agendado', bgColor: 'bg-teal-100', textColor: 'text-teal-700' },
        confirmed: { label: 'Confirmado', bgColor: 'bg-green-100', textColor: 'text-green-700' },
        completed: { label: 'Compareceu', bgColor: 'bg-blue-100', textColor: 'text-blue-700' },
        no_show: { label: 'Não Compareceu', bgColor: 'bg-orange-100', textColor: 'text-orange-700' },
        cancelled: { label: 'Cancelado', bgColor: 'bg-red-100', textColor: 'text-red-700' },
        rescheduled: { label: 'Remarcado', bgColor: 'bg-purple-100', textColor: 'text-purple-700' },
    };

    const statusOptions = [
        { value: 'scheduled', label: 'Agendado' },
        { value: 'confirmed', label: 'Confirmado' },
        { value: 'completed', label: 'Compareceu' },
        { value: 'no_show', label: 'Não Compareceu' },
        { value: 'cancelled', label: 'Cancelado' },
        { value: 'rescheduled', label: 'Remarcado' },
    ];

    const handleStatusPress = (appointment: AppointmentWithPatient) => {
        setSelectedAppointment(appointment);
        setShowStatusPicker(true);
    };

    const handleStatusChange = async (newStatus: string) => {
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

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            <ScrollView className="px-4 py-6">
                {/* Header */}
                <View className="flex-row items-center justify-between mb-6">
                    <View>
                        <Text className="text-2xl font-bold text-gray-900">Agenda</Text>
                        <Text className="text-gray-500 mt-1">Consultas agendadas</Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => {
                            loadLocations();
                            setShowModal(true);
                        }}
                        className="bg-teal-600 w-12 h-12 rounded-full items-center justify-center shadow-lg"
                    >
                        <Plus size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>

                {/* Calendar */}
                <CalendarGrid
                    calendarMonth={calendarMonth}
                    selectedDate={selectedDate}
                    datesWithAppointments={datesWithAppointments}
                    onSelectDate={setSelectedDate}
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
                                <Text className="text-teal-600 text-sm mt-1">Ir para hoje</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Appointments */}
                {loading ? (
                    <View className="py-12 items-center">
                        <ActivityIndicator size="large" color="#0D9488" />
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
                                    onPress={() => router.push(`/patient/${apt.patient_id}`)}
                                >
                                    <View className="flex-row items-center gap-4">
                                        <View className="items-center justify-center">
                                            <Text className="text-2xl font-bold text-teal-600">
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
                onClose={() => setShowModal(false)}
                onCreateAppointment={handleCreateAppointment}
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
                                        <Text className={`flex-1 font-medium ${isSelected ? 'text-teal-600' : 'text-gray-700'}`}>
                                            {option.label}
                                        </Text>
                                        {isSelected && (
                                            <Text className="text-teal-600">✓</Text>
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
        </SafeAreaView>
    );
}
