import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Linking, Modal, TextInput, Alert as RNAlert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Bell, Phone, MessageCircle, Clock, AlertTriangle, CheckCircle, Gift, Calendar, Settings } from 'lucide-react-native';
import { consultationsService } from '../../src/services/consultations';
import { alertsService, Alert } from '../../src/services/alerts';
import { appointmentsService } from '../../src/services/appointments';
import type { ReturnAlert, AppointmentWithPatient } from '../../src/types/database';

export default function Alerts() {
    const [loading, setLoading] = useState(true);
    const [scheduledAlerts, setScheduledAlerts] = useState<ReturnAlert[]>([]);
    const [birthdayAlerts, setBirthdayAlerts] = useState<Alert[]>([]);
    const [procedureAlerts, setProcedureAlerts] = useState<Alert[]>([]);
    const [tomorrowAppointments, setTomorrowAppointments] = useState<AppointmentWithPatient[]>([]);

    // Templates State
    const [showTemplatesModal, setShowTemplatesModal] = useState(false);
    const [birthdayTemplate, setBirthdayTemplate] = useState('');
    const [returnTemplate, setReturnTemplate] = useState('');
    const [confirmationTemplate, setConfirmationTemplate] = useState('');

    const DEFAULT_BIRTHDAY_MSG = `Parabéns {name}! 🎉\n\nNós do Smile Care Hub desejamos a você um feliz aniversário, muita saúde e alegria!\n\nConte sempre conosco para cuidar do seu sorriso.`;
    const DEFAULT_RETURN_MSG = `Olá {name}, tudo bem?\n\nNotamos que já se passaram 6 meses desde seu último procedimento conosco. Que tal agendar uma avaliação de retorno para garantir que está tudo certo com seu sorriso?`;
    const DEFAULT_CONFIRMATION_MSG = `Olá {name}! 👋\n\nPassando para confirmar sua consulta agendada para amanhã.\n\nPodemos contar com sua presença? Por favor, confirme respondendo esta mensagem.`;

    useEffect(() => {
        loadData();
        loadTemplates();
    }, []);

    const loadTemplates = async () => {
        try {
            const storedBirthday = await AsyncStorage.getItem('TEMPLATE_BIRTHDAY');
            const storedReturn = await AsyncStorage.getItem('TEMPLATE_RETURN');
            const storedConfirmation = await AsyncStorage.getItem('TEMPLATE_CONFIRMATION');
            setBirthdayTemplate(storedBirthday || DEFAULT_BIRTHDAY_MSG);
            setReturnTemplate(storedReturn || DEFAULT_RETURN_MSG);
            setConfirmationTemplate(storedConfirmation || DEFAULT_CONFIRMATION_MSG);
        } catch (error) {
            console.error('Error loading templates:', error);
        }
    };

    const saveTemplates = async () => {
        try {
            await AsyncStorage.setItem('TEMPLATE_BIRTHDAY', birthdayTemplate);
            await AsyncStorage.setItem('TEMPLATE_RETURN', returnTemplate);
            await AsyncStorage.setItem('TEMPLATE_CONFIRMATION', confirmationTemplate);
            setShowTemplatesModal(false);
            RNAlert.alert('Sucesso', 'Mensagens salvas com sucesso!');
        } catch (error) {
            console.error('Error saving templates:', error);
            RNAlert.alert('Erro', 'Não foi possível salvar as mensagens');
        }
    };

    const loadData = async () => {
        try {
            setLoading(true);
            const [scheduled, birthdays, procedures, tomorrow] = await Promise.all([
                consultationsService.getReturnAlerts(),
                alertsService.getBirthdayAlerts(),
                alertsService.getProcedureReminders(),
                appointmentsService.getTomorrow()
            ]);

            setScheduledAlerts(scheduled.sort((a, b) => a.days_until_return - b.days_until_return));
            setBirthdayAlerts(birthdays);
            setProcedureAlerts(procedures);
            setTomorrowAppointments(tomorrow);
        } catch (error) {
            console.error('Error loading alerts:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCall = (phone: string) => {
        const cleanPhone = phone.replace(/\D/g, '');
        Linking.openURL(`tel:${cleanPhone}`);
    };

    const handleWhatsApp = (phone: string, name: string, type: 'birthday' | 'return' | 'scheduled' | 'reminder') => {
        const cleanPhone = phone.replace(/\D/g, '');
        let message = '';

        if (type === 'birthday') {
            message = birthdayTemplate.replace('{name}', name);
        } else if (type === 'return') {
            message = returnTemplate.replace('{name}', name);
        } else if (type === 'reminder') {
            message = confirmationTemplate.replace('{name}', name);
        } else {
            message = `Olá ${name}! Estamos entrando em contato para lembrar sobre sua consulta de retorno. Podemos agendar um horário?`;
        }

        const encodedMessage = encodeURIComponent(message);
        Linking.openURL(`https://wa.me/55${cleanPhone}?text=${encodedMessage}`);
    };

    const getUrgencyConfig = (days: number) => {
        if (days <= 7) return {
            label: 'Urgente',
            bgColor: 'bg-red-100',
            textColor: 'text-red-700',
            borderColor: 'border-l-red-500',
            Icon: AlertTriangle
        };
        if (days <= 14) return {
            label: 'Em breve',
            bgColor: 'bg-amber-100',
            textColor: 'text-amber-700',
            borderColor: 'border-l-amber-500',
            Icon: Clock
        };
        return {
            label: 'Próximo',
            bgColor: 'bg-gray-100',
            textColor: 'text-gray-600',
            borderColor: 'border-l-gray-400',
            Icon: CheckCircle
        };
    };

    if (loading) {
        return (
            <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
                <ActivityIndicator size="large" color="#0D9488" />
                <Text className="text-gray-500 mt-4">Carregando alertas...</Text>
            </SafeAreaView>
        );
    }

    const hasAnyAlert = scheduledAlerts.length > 0 || birthdayAlerts.length > 0 || procedureAlerts.length > 0 || tomorrowAppointments.length > 0;

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            <ScrollView className="px-4 py-6">
                {/* Header */}
                <View className="flex-row items-center justify-between mb-6">
                    <View>
                        <Text className="text-2xl font-bold text-gray-900">Alertas</Text>
                        <Text className="text-gray-500 mt-1">Lembretes e notificações</Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => setShowTemplatesModal(true)}
                        className="w-10 h-10 bg-white rounded-full items-center justify-center border border-gray-200"
                    >
                        <Settings size={20} color="#6B7280" />
                    </TouchableOpacity>
                </View>

                {!hasAnyAlert ? (
                    <View className="bg-white rounded-xl p-12 items-center">
                        <Bell size={48} color="#D1D5DB" />
                        <Text className="text-gray-400 mt-4">Nenhum alerta pendente</Text>
                    </View>
                ) : (
                    <View className="gap-6">
                        {/* 0. Tomorrow's Appointments - Confirmação */}
                        {tomorrowAppointments.length > 0 && (
                            <View>
                                <View className="flex-row items-center gap-2 mb-3">
                                    <Bell size={20} color="#0D9488" />
                                    <Text className="text-lg font-bold text-gray-800">Confirmar Consultas de Amanhã</Text>
                                    <View className="bg-teal-100 px-2 py-0.5 rounded-full ml-auto">
                                        <Text className="text-xs font-bold text-teal-700">{tomorrowAppointments.length}</Text>
                                    </View>
                                </View>
                                <View className="gap-3">
                                    {tomorrowAppointments.map((appointment) => (
                                        <View key={appointment.id} className="bg-teal-50 rounded-xl p-4 border-l-4 border-l-teal-500">
                                            <View className="flex-row justify-between items-center">
                                                <View className="flex-row items-center gap-3">
                                                    <View className="bg-teal-500 px-3 py-1.5 rounded-lg">
                                                        <Text className="text-white font-bold text-sm">{appointment.time?.slice(0, 5)}</Text>
                                                    </View>
                                                    <View>
                                                        <Text className="font-bold text-gray-900">{appointment.patients?.name}</Text>
                                                        <Text className="text-gray-500 text-sm">{appointment.patients?.phone}</Text>
                                                    </View>
                                                </View>
                                            </View>

                                            <TouchableOpacity
                                                className="mt-3 bg-teal-500 rounded-lg py-2 flex-row justify-center items-center gap-2"
                                                onPress={() => handleWhatsApp(appointment.patients?.phone || '', appointment.patients?.name?.split(' ')[0] || '', 'reminder')}
                                            >
                                                <MessageCircle size={18} color="white" />
                                                <Text className="text-white font-medium">Confirmar via WhatsApp</Text>
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}

                        {/* 1. Birthday Alerts */}
                        {birthdayAlerts.length > 0 && (
                            <View>
                                <View className="flex-row items-center gap-2 mb-3">
                                    <Gift size={20} color="#EC4899" />
                                    <Text className="text-lg font-bold text-gray-800">Aniversariantes do Dia</Text>
                                </View>
                                <View className="gap-3">
                                    {birthdayAlerts.map((alert) => (
                                        <View key={alert.patient.id} className="bg-pink-50 rounded-xl p-4 border-l-4 border-l-pink-500">
                                            <View className="flex-row justify-between items-start">
                                                <View>
                                                    <Text className="font-bold text-gray-900">{alert.patient.name}</Text>
                                                    <Text className="text-gray-600 text-sm mt-1">{alert.patient.phone}</Text>
                                                </View>
                                                <View className="bg-white px-2 py-1 rounded-full">
                                                    <Text className="text-xs font-bold text-pink-600">Hoje</Text>
                                                </View>
                                            </View>

                                            <TouchableOpacity
                                                className="mt-3 bg-pink-500 rounded-lg py-2 flex-row justify-center items-center gap-2"
                                                onPress={() => handleWhatsApp(alert.patient.phone, alert.patient.name.split(' ')[0], 'birthday')}
                                            >
                                                <MessageCircle size={18} color="white" />
                                                <Text className="text-white font-medium">Mandar Parabéns</Text>
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}

                        {/* 2. Procedure Return Alerts (> 180 days) */}
                        {procedureAlerts.length > 0 && (
                            <View>
                                <View className="flex-row items-center gap-2 mb-3">
                                    <Clock size={20} color="#F59E0B" />
                                    <Text className="text-lg font-bold text-gray-800">Revisão Pendente (6 meses)</Text>
                                </View>
                                <View className="gap-3">
                                    {procedureAlerts.map((alert) => (
                                        <View key={alert.patient.id} className="bg-amber-50 rounded-xl p-4 border-l-4 border-l-amber-500">
                                            <View>
                                                <Text className="font-bold text-gray-900">{alert.patient.name}</Text>
                                                <Text className="text-gray-600 text-sm mt-1">{alert.patient.phone}</Text>
                                                <Text className="text-amber-800 text-xs mt-2">
                                                    Último proc.: {new Date(alert.date).toLocaleDateString()} ({alert.daysSince} dias atrás)
                                                </Text>
                                            </View>

                                            <TouchableOpacity
                                                className="mt-3 bg-amber-500 rounded-lg py-2 flex-row justify-center items-center gap-2"
                                                onPress={() => handleWhatsApp(alert.patient.phone, alert.patient.name.split(' ')[0], 'return')}
                                            >
                                                <MessageCircle size={18} color="white" />
                                                <Text className="text-white font-medium">Enviar Lembrete</Text>
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}

                        {/* 3. Scheduled Return Alerts */}
                        {scheduledAlerts.length > 0 && (
                            <View>
                                <View className="flex-row items-center gap-2 mb-3">
                                    <Calendar size={20} color="#0D9488" />
                                    <Text className="text-lg font-bold text-gray-800">Retornos Agendados</Text>
                                </View>
                                <View className="gap-3">
                                    {scheduledAlerts.map((alert) => {
                                        const config = getUrgencyConfig(alert.days_until_return);
                                        const IconComponent = config.Icon;
                                        return (
                                            <View
                                                key={alert.patient_id}
                                                className={`bg-white rounded-xl p-4 border-l-4 ${config.borderColor}`}
                                            >
                                                <View className="flex-row items-start justify-between">
                                                    <View className="flex-1">
                                                        <View className="flex-row items-center gap-2 mb-1">
                                                            <Text className="font-semibold text-gray-900">
                                                                {alert.patient_name}
                                                            </Text>
                                                            <View className={`px-2 py-0.5 rounded-full flex-row items-center gap-1 ${config.bgColor}`}>
                                                                <IconComponent size={12} color={config.textColor.replace('text-', '#')} />
                                                                <Text className={`text-xs font-medium ${config.textColor}`}>
                                                                    {config.label}
                                                                </Text>
                                                            </View>
                                                        </View>
                                                        <Text className="text-gray-500 text-sm">{alert.phone}</Text>
                                                        <Text className="text-gray-400 text-xs mt-1">
                                                            Data sugerida: {new Date(alert.suggested_return_date).toLocaleDateString('pt-BR')}
                                                            <Text className="font-medium"> ({alert.days_until_return} dias)</Text>
                                                        </Text>
                                                    </View>
                                                </View>

                                                <View className="flex-row gap-3 mt-4">
                                                    <TouchableOpacity
                                                        className="flex-1 flex-row items-center justify-center gap-2 py-2.5 rounded-lg border border-gray-200"
                                                        onPress={() => handleCall(alert.phone)}
                                                    >
                                                        <Phone size={18} color="#6B7280" />
                                                        <Text className="text-gray-600 font-medium">Ligar</Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity
                                                        className="flex-1 flex-row items-center justify-center gap-2 py-2.5 rounded-lg bg-teal-500"
                                                        onPress={() => handleWhatsApp(alert.phone, alert.patient_name.split(' ')[0], 'scheduled')}
                                                    >
                                                        <MessageCircle size={18} color="#FFFFFF" />
                                                        <Text className="text-white font-medium">WhatsApp</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        );
                                    })}
                                </View>
                            </View>
                        )}
                    </View>
                )}

                <View className="h-6" />
            </ScrollView>

            {/* Templates Modal */}
            <Modal
                visible={showTemplatesModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowTemplatesModal(false)}
            >
                <SafeAreaView className="flex-1 bg-gray-50">
                    <View className="flex-row items-center justify-between px-4 py-4 bg-white border-b border-gray-100">
                        <TouchableOpacity onPress={() => setShowTemplatesModal(false)}>
                            <Text className="text-gray-500 font-medium">Cancelar</Text>
                        </TouchableOpacity>
                        <Text className="text-lg font-semibold text-gray-900">Mensagens Padrão</Text>
                        <TouchableOpacity onPress={saveTemplates}>
                            <Text className="text-teal-600 font-bold">Salvar</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView className="flex-1 px-4 py-6">
                        <View className="mb-6">
                            <Text className="text-sm font-bold text-gray-900 mb-2 flex-row items-center gap-2">
                                <Gift size={16} color="#EC4899" /> Mensagem de Aniversário
                            </Text>
                            <Text className="text-xs text-gray-500 mb-2">Use {'{name}'} para inserir o nome do paciente.</Text>
                            <TextInput
                                className="bg-white border border-gray-200 rounded-xl p-4 text-gray-900 h-40 text-top"
                                multiline
                                textAlignVertical="top"
                                value={birthdayTemplate}
                                onChangeText={setBirthdayTemplate}
                                placeholder="Digite a mensagem de aniversário..."
                            />
                        </View>

                        <View className="mb-6">
                            <Text className="text-sm font-bold text-gray-900 mb-2 flex-row items-center gap-2">
                                <Clock size={16} color="#F59E0B" /> Mensagem de Retorno (6 meses)
                            </Text>
                            <Text className="text-xs text-gray-500 mb-2">Use {'{name}'} para inserir o nome do paciente.</Text>
                            <TextInput
                                className="bg-white border border-gray-200 rounded-xl p-4 text-gray-900 h-32 text-top"
                                multiline
                                textAlignVertical="top"
                                value={returnTemplate}
                                onChangeText={setReturnTemplate}
                                placeholder="Digite a mensagem de retorno..."
                            />
                        </View>

                        <View className="mb-6">
                            <Text className="text-sm font-bold text-gray-900 mb-2 flex-row items-center gap-2">
                                <Bell size={16} color="#0D9488" /> Mensagem de Confirmação de Consulta
                            </Text>
                            <Text className="text-xs text-gray-500 mb-2">Usada para confirmar consultas de amanhã. Use {'{name}'} para o nome.</Text>
                            <TextInput
                                className="bg-white border border-gray-200 rounded-xl p-4 text-gray-900 h-32 text-top"
                                multiline
                                textAlignVertical="top"
                                value={confirmationTemplate}
                                onChangeText={setConfirmationTemplate}
                                placeholder="Digite a mensagem de confirmação..."
                            />
                        </View>
                    </ScrollView>
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
}
