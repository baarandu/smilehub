import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, Phone, MessageCircle, Clock, AlertTriangle, CheckCircle } from 'lucide-react-native';
import { consultationsService } from '../../src/services/consultations';
import type { ReturnAlert } from '../../src/types/database';

export default function Alerts() {
    const [loading, setLoading] = useState(true);
    const [alerts, setAlerts] = useState<ReturnAlert[]>([]);

    useEffect(() => {
        loadAlerts();
    }, []);

    const loadAlerts = async () => {
        try {
            setLoading(true);
            const data = await consultationsService.getReturnAlerts();
            setAlerts(data.sort((a, b) => a.days_until_return - b.days_until_return));
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

    const handleWhatsApp = (phone: string, name: string) => {
        const cleanPhone = phone.replace(/\D/g, '');
        const message = encodeURIComponent(
            `Olá ${name}! Estamos entrando em contato para lembrar sobre sua consulta de retorno. Podemos agendar um horário?`
        );
        Linking.openURL(`https://wa.me/55${cleanPhone}?text=${message}`);
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

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            <ScrollView className="px-4 py-6">
                {/* Header */}
                <View className="mb-6">
                    <Text className="text-2xl font-bold text-gray-900">Alertas</Text>
                    <Text className="text-gray-500 mt-1">Retornos pendentes</Text>
                </View>

                {/* Alerts List */}
                {alerts.length === 0 ? (
                    <View className="bg-white rounded-xl p-12 items-center">
                        <Bell size={48} color="#D1D5DB" />
                        <Text className="text-gray-400 mt-4">Nenhum retorno pendente</Text>
                    </View>
                ) : (
                    <View className="gap-3">
                        {alerts.map((alert) => {
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
                                                Retorno: {new Date(alert.suggested_return_date).toLocaleDateString('pt-BR')}
                                                <Text className="font-medium"> ({alert.days_until_return} dias)</Text>
                                            </Text>
                                        </View>
                                    </View>
                                    
                                    {/* Action Buttons */}
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
                                            onPress={() => handleWhatsApp(alert.phone, alert.patient_name.split(' ')[0])}
                                        >
                                            <MessageCircle size={18} color="#FFFFFF" />
                                            <Text className="text-white font-medium">WhatsApp</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                )}

                <View className="h-6" />
            </ScrollView>
        </SafeAreaView>
    );
}
