import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Calendar, ChevronLeft, ChevronRight, Plus, X, MapPin, ChevronDown } from 'lucide-react-native';
import { appointmentsService } from '../../src/services/appointments';
import { getPatients } from '../../src/services/patients';
import { locationsService, type Location } from '../../src/services/locations';
import type { AppointmentWithPatient, Patient } from '../../src/types/database';

const DAYS_OF_WEEK = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function Agenda() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [calendarMonth, setCalendarMonth] = useState(new Date());
    const [appointments, setAppointments] = useState<AppointmentWithPatient[]>([]);
    const [datesWithAppointments, setDatesWithAppointments] = useState<string[]>([]);
    const [patients, setPatients] = useState<Patient[]>([]);
    
    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [patientSearch, setPatientSearch] = useState('');
    const [locations, setLocations] = useState<Location[]>([]);
    const [showLocationPicker, setShowLocationPicker] = useState(false);
    const [newAppointment, setNewAppointment] = useState({
        patientId: '',
        patientName: '',
        time: '',
        location: '',
        notes: '',
    });

    // Filter patients based on search
    const filteredPatients = patientSearch.length > 0
        ? patients.filter(p => 
            p.name.toLowerCase().includes(patientSearch.toLowerCase())
          )
        : [];

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
            console.log('Locations loaded:', data);
            setLocations(data);
        } catch (error) {
            console.error('Error loading locations:', error);
            // Don't show alert, just log - table might not exist yet
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

    const formatTimeInput = (text: string) => {
        const numbers = text.replace(/\D/g, '');
        if (numbers.length <= 2) return numbers;
        return `${numbers.slice(0, 2)}:${numbers.slice(2, 4)}`;
    };

    const handleCreateAppointment = async () => {
        if (!newAppointment.patientId) {
            Alert.alert('Erro', 'Selecione um paciente');
            return;
        }
        if (!newAppointment.time || newAppointment.time.length < 5) {
            Alert.alert('Erro', 'Informe um horário válido (HH:MM)');
            return;
        }

        try {
            const dateStr = selectedDate.toISOString().split('T')[0];
            await appointmentsService.create({
                patient_id: newAppointment.patientId,
                date: dateStr,
                time: newAppointment.time,
                status: 'scheduled',
                location: newAppointment.location || null,
                notes: newAppointment.notes || null,
            });

            setShowModal(false);
            setNewAppointment({ patientId: '', patientName: '', time: '', location: '', notes: '' });
            setPatientSearch('');
            loadAppointments();
            loadMonthDates();
            Alert.alert('Sucesso', 'Consulta agendada com sucesso!');
        } catch (error) {
            console.error('Error creating appointment:', error);
            Alert.alert('Erro', 'Não foi possível agendar a consulta');
        }
    };

    const isToday = selectedDate.toDateString() === new Date().toDateString();
    const isCurrentMonth = calendarMonth.getMonth() === new Date().getMonth() && 
                           calendarMonth.getFullYear() === new Date().getFullYear();

    const getCalendarDays = () => {
        const year = calendarMonth.getFullYear();
        const month = calendarMonth.getMonth();
        
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        
        const days: (Date | null)[] = [];
        
        const startDayOfWeek = firstDay.getDay();
        for (let i = 0; i < startDayOfWeek; i++) {
            days.push(null);
        }
        
        for (let day = 1; day <= lastDay.getDate(); day++) {
            days.push(new Date(year, month, day));
        }
        
        return days;
    };

    const hasAppointment = (date: Date) => {
        const dateStr = date.toISOString().split('T')[0];
        return datesWithAppointments.includes(dateStr);
    };

    const isSelectedDate = (date: Date) => {
        return date.toDateString() === selectedDate.toDateString();
    };

    const isTodayDate = (date: Date) => {
        return date.toDateString() === new Date().toDateString();
    };

    const statusConfig: Record<string, { label: string; bgColor: string; textColor: string }> = {
        scheduled: { label: 'Agendado', bgColor: 'bg-teal-100', textColor: 'text-teal-700' },
        confirmed: { label: 'Confirmado', bgColor: 'bg-green-100', textColor: 'text-green-700' },
        completed: { label: 'Compareceu', bgColor: 'bg-blue-100', textColor: 'text-blue-700' },
        cancelled: { label: 'Cancelado', bgColor: 'bg-red-100', textColor: 'text-red-700' },
    };

    const calendarDays = getCalendarDays();

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
                <View className="bg-white rounded-xl p-4 border border-gray-100 mb-4">
                    {/* Month Navigation */}
                    <View className="flex-row items-center justify-between mb-4">
                        <TouchableOpacity onPress={goToPrevMonth} className="p-2">
                            <ChevronLeft size={24} color="#0D9488" />
                        </TouchableOpacity>
                        <View className="items-center">
                            <Text className="text-lg font-bold text-gray-900">
                                {MONTHS[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}
                            </Text>
                            {!isCurrentMonth && (
                                <TouchableOpacity onPress={goToToday}>
                                    <Text className="text-teal-600 text-sm mt-1">Ir para hoje</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                        <TouchableOpacity onPress={goToNextMonth} className="p-2">
                            <ChevronRight size={24} color="#0D9488" />
                        </TouchableOpacity>
                    </View>

                    {/* Days of Week */}
                    <View className="flex-row mb-2">
                        {DAYS_OF_WEEK.map((day) => (
                            <View key={day} className="flex-1 items-center">
                                <Text className="text-xs text-gray-400 font-medium">{day}</Text>
                            </View>
                        ))}
                    </View>

                    {/* Calendar Grid */}
                    <View className="flex-row flex-wrap">
                        {calendarDays.map((date, index) => (
                            <View key={index} className="w-[14.28%] aspect-square p-0.5">
                                {date ? (
                                    <TouchableOpacity
                                        onPress={() => setSelectedDate(date)}
                                        className={`flex-1 items-center justify-center rounded-lg relative ${
                                            isSelectedDate(date)
                                                ? 'bg-teal-600'
                                                : isTodayDate(date)
                                                ? 'bg-teal-100'
                                                : ''
                                        }`}
                                    >
                                        <Text
                                            className={`text-sm font-medium ${
                                                isSelectedDate(date)
                                                    ? 'text-white'
                                                    : isTodayDate(date)
                                                    ? 'text-teal-700'
                                                    : 'text-gray-700'
                                            }`}
                                        >
                                            {date.getDate()}
                                        </Text>
                                        {hasAppointment(date) && (
                                            <View
                                                className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${
                                                    isSelectedDate(date) ? 'bg-white' : 'bg-green-500'
                                                }`}
                                            />
                                        )}
                                    </TouchableOpacity>
                                ) : (
                                    <View className="flex-1" />
                                )}
                            </View>
                        ))}
                    </View>
                </View>

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
                                                <View className={`px-2 py-0.5 rounded-full ${status.bgColor}`}>
                                                    <Text className={`text-xs font-medium ${status.textColor}`}>
                                                        {status.label}
                                                    </Text>
                                                </View>
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
            <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
                <SafeAreaView className="flex-1 bg-gray-50">
                    {/* Header */}
                    <View className="flex-row items-center justify-between px-4 py-4 bg-white border-b border-gray-100">
                        <TouchableOpacity onPress={() => {
                            setShowModal(false);
                            setPatientSearch('');
                        }}>
                            <X size={24} color="#6B7280" />
                        </TouchableOpacity>
                        <Text className="text-lg font-semibold text-gray-900">Novo Agendamento</Text>
                        <View className="w-6" />
                    </View>

                    <ScrollView className="flex-1 px-4 py-6">
                        {/* Selected Date Info */}
                        <View className="bg-teal-50 rounded-xl p-4 mb-6">
                            <Text className="text-teal-700 font-medium text-center capitalize">
                                {formatDate(selectedDate)}
                            </Text>
                        </View>

                        {/* Patient Search */}
                        <View className="mb-4">
                            <Text className="text-sm font-medium text-gray-700 mb-2">Paciente *</Text>
                            {newAppointment.patientId ? (
                                <View className="bg-teal-50 border border-teal-200 rounded-xl p-4 flex-row items-center justify-between">
                                    <Text className="text-teal-800 font-medium">{newAppointment.patientName}</Text>
                                    <TouchableOpacity
                                        onPress={() => {
                                            setNewAppointment({ ...newAppointment, patientId: '', patientName: '' });
                                            setPatientSearch('');
                                        }}
                                    >
                                        <X size={20} color="#0D9488" />
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <View>
                                    <TextInput
                                        className="bg-white border border-gray-200 rounded-xl p-4 text-gray-900"
                                        placeholder="Digite o nome do paciente..."
                                        value={patientSearch}
                                        onChangeText={setPatientSearch}
                                        autoCapitalize="words"
                                    />
                                    {filteredPatients.length > 0 && (
                                        <View className="bg-white border border-gray-200 rounded-xl mt-2 overflow-hidden">
                                            {filteredPatients.slice(0, 5).map((patient, index) => (
                                                <TouchableOpacity
                                                    key={patient.id}
                                                    onPress={() => {
                                                        setNewAppointment({
                                                            ...newAppointment,
                                                            patientId: patient.id,
                                                            patientName: patient.name,
                                                        });
                                                        setPatientSearch('');
                                                    }}
                                                    className={`p-4 ${index > 0 ? 'border-t border-gray-100' : ''}`}
                                                >
                                                    <Text className="font-medium text-gray-900">{patient.name}</Text>
                                                    {patient.phone && (
                                                        <Text className="text-gray-500 text-sm">{patient.phone}</Text>
                                                    )}
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    )}
                                    {patientSearch.length > 0 && filteredPatients.length === 0 && (
                                        <View className="bg-gray-50 rounded-xl mt-2 p-4">
                                            <Text className="text-gray-500 text-center">Nenhum paciente encontrado</Text>
                                        </View>
                                    )}
                                </View>
                            )}
                        </View>

                        {/* Time Input */}
                        <View className="mb-4">
                            <Text className="text-sm font-medium text-gray-700 mb-2">Horário *</Text>
                            <TextInput
                                className="bg-white border border-gray-200 rounded-xl p-4 text-gray-900"
                                placeholder="HH:MM"
                                value={newAppointment.time}
                                onChangeText={(text) => setNewAppointment({ ...newAppointment, time: formatTimeInput(text) })}
                                keyboardType="numeric"
                                maxLength={5}
                            />
                        </View>

                        {/* Location Picker */}
                        <View className="mb-4">
                            <Text className="text-sm font-medium text-gray-700 mb-2">Local de Atendimento</Text>
                            {!showLocationPicker ? (
                                <TouchableOpacity
                                    onPress={() => {
                                        loadLocations();
                                        setShowLocationPicker(true);
                                    }}
                                    className="bg-white border border-gray-200 rounded-xl p-4 flex-row items-center justify-between"
                                >
                                    <Text className={newAppointment.location ? 'text-gray-900' : 'text-gray-400'}>
                                        {newAppointment.location || 'Selecione o local'}
                                    </Text>
                                    <ChevronDown size={20} color="#6B7280" />
                                </TouchableOpacity>
                            ) : (
                                <View className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                                    {/* Header */}
                                    <View className="flex-row items-center justify-between p-3 border-b border-gray-100 bg-gray-50">
                                        <Text className="font-medium text-gray-700">Selecione o local</Text>
                                        <TouchableOpacity onPress={() => setShowLocationPicker(false)}>
                                            <X size={20} color="#6B7280" />
                                        </TouchableOpacity>
                                    </View>
                                    
                                    {/* Options */}
                                    <TouchableOpacity
                                        onPress={() => {
                                            setNewAppointment({ ...newAppointment, location: '' });
                                            setShowLocationPicker(false);
                                        }}
                                        className="p-3 border-b border-gray-100"
                                    >
                                        <Text className="text-gray-500">Nenhum local</Text>
                                    </TouchableOpacity>

                                    {locations.length === 0 ? (
                                        <View className="p-4 items-center">
                                            <Text className="text-gray-400 text-sm">Nenhum local cadastrado</Text>
                                        </View>
                                    ) : (
                                        locations.map((location, index) => (
                                            <TouchableOpacity
                                                key={location.id}
                                                onPress={() => {
                                                    setNewAppointment({ ...newAppointment, location: location.name });
                                                    setShowLocationPicker(false);
                                                }}
                                                className={`p-3 ${index < locations.length - 1 ? 'border-b border-gray-100' : ''} ${
                                                    newAppointment.location === location.name ? 'bg-teal-50' : ''
                                                }`}
                                            >
                                                <Text className={`font-medium ${newAppointment.location === location.name ? 'text-teal-700' : 'text-gray-900'}`}>
                                                    {location.name}
                                                </Text>
                                                {location.address && (
                                                    <Text className="text-gray-500 text-sm">{location.address}</Text>
                                                )}
                                            </TouchableOpacity>
                                        ))
                                    )}
                                </View>
                            )}
                        </View>

                        {/* Notes Input */}
                        <View className="mb-6">
                            <Text className="text-sm font-medium text-gray-700 mb-2">Observações</Text>
                            <TextInput
                                className="bg-white border border-gray-200 rounded-xl p-4 text-gray-900"
                                placeholder="Ex: Consulta de rotina"
                                value={newAppointment.notes}
                                onChangeText={(text) => setNewAppointment({ ...newAppointment, notes: text })}
                                multiline
                                numberOfLines={3}
                            />
                        </View>

                        {/* Actions */}
                        <View className="flex-row gap-3">
                            <TouchableOpacity
                                onPress={() => {
                                    setShowModal(false);
                                    setPatientSearch('');
                                }}
                                className="flex-1 bg-gray-100 py-4 rounded-xl"
                            >
                                <Text className="text-gray-700 font-semibold text-center">Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleCreateAppointment}
                                className="flex-1 bg-teal-600 py-4 rounded-xl"
                            >
                                <Text className="text-white font-semibold text-center">Agendar</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </SafeAreaView>
            </Modal>

        </SafeAreaView>
    );
}
