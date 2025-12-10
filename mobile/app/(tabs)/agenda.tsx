import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, Users, ChevronLeft, ChevronRight, Clock } from 'lucide-react-native';
import { appointmentsService } from '../../src/services/appointments';
import type { AppointmentWithPatient } from '../../src/types/database';

export default function Agenda() {
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [appointments, setAppointments] = useState<AppointmentWithPatient[]>([]);

    useEffect(() => {
        loadAppointments();
    }, [selectedDate]);

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

    const goToPrevDay = () => {
        const prev = new Date(selectedDate);
        prev.setDate(prev.getDate() - 1);
        setSelectedDate(prev);
    };

    const goToNextDay = () => {
        const next = new Date(selectedDate);
        next.setDate(next.getDate() + 1);
        setSelectedDate(next);
    };

    const goToToday = () => {
        setSelectedDate(new Date());
    };

    const formatDate = (date: Date) => {
        const options: Intl.DateTimeFormatOptions = { 
            weekday: 'long', 
            day: 'numeric', 
            month: 'long' 
        };
        return date.toLocaleDateString('pt-BR', options);
    };

    const isToday = selectedDate.toDateString() === new Date().toDateString();

    const statusConfig: Record<string, { label: string; bgColor: string; textColor: string }> = {
        scheduled: { label: 'Agendado', bgColor: 'bg-teal-100', textColor: 'text-teal-700' },
        confirmed: { label: 'Confirmado', bgColor: 'bg-green-100', textColor: 'text-green-700' },
        completed: { label: 'Compareceu', bgColor: 'bg-blue-100', textColor: 'text-blue-700' },
        cancelled: { label: 'Cancelado', bgColor: 'bg-red-100', textColor: 'text-red-700' },
    };

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            <ScrollView className="px-4 py-6">
                {/* Header */}
                <View className="mb-6">
                    <Text className="text-2xl font-bold text-gray-900">Agenda</Text>
                    <Text className="text-gray-500 mt-1">Consultas agendadas</Text>
                </View>

                {/* Date Selector */}
                <View className="bg-white rounded-xl p-4 border border-gray-100 mb-6">
                    <View className="flex-row items-center justify-between">
                        <TouchableOpacity onPress={goToPrevDay} className="p-2">
                            <ChevronLeft size={24} color="#0D9488" />
                        </TouchableOpacity>
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
                        <TouchableOpacity onPress={goToNextDay} className="p-2">
                            <ChevronRight size={24} color="#0D9488" />
                        </TouchableOpacity>
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
                                            {apt.notes && (
                                                <Text className="text-gray-500 text-sm mt-1">{apt.notes}</Text>
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
        </SafeAreaView>
    );
}
