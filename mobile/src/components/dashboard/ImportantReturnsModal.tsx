import React from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Calendar, HeartPulse } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';

interface ImportantReturn {
    id: string;
    name: string;
    phone: string;
    return_alert_date: string;
}

interface ImportantReturnsModalProps {
    visible: boolean;
    onClose: () => void;
    returns: ImportantReturn[];
    loading: boolean;
}

export function ImportantReturnsModal({
    visible,
    onClose,
    returns,
    loading,
}: ImportantReturnsModalProps) {
    const router = useRouter();

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
            <SafeAreaView className="flex-1 bg-gray-50">
                <View className="flex-row items-center justify-between px-4 py-4 bg-white border-b border-gray-100">
                    <TouchableOpacity onPress={onClose}>
                        <X size={24} color="#6B7280" />
                    </TouchableOpacity>
                    <Text className="text-lg font-semibold text-gray-900">
                        Retornos Importantes ({returns.length})
                    </Text>
                    <View style={{ width: 24 }} />
                </View>

                {loading ? (
                    <View className="flex-1 items-center justify-center">
                        <ActivityIndicator size="large" color="#b94a48" />
                    </View>
                ) : (
                    <View className="flex-1">
                        <View className="px-4 py-3 bg-amber-50 mx-4 mt-4 rounded-xl border border-amber-100 mb-2">
                            <Text className="text-amber-900 font-semibold text-sm mb-1">O que é esta lista?</Text>
                            <Text className="text-amber-800 text-sm">
                                Pacientes sinalizados manualmente com <Text className="font-bold">retorno importante</Text> e suas respectivas datas de retorno.
                            </Text>
                        </View>

                        {returns.length === 0 ? (
                            <View className="flex-1 items-center justify-center p-8">
                                <HeartPulse size={48} color="#D1D5DB" />
                                <Text className="text-gray-400 mt-4 text-center">
                                    Nenhum retorno importante sinalizado
                                </Text>
                            </View>
                        ) : (
                            <ScrollView className="flex-1 p-4">
                                {returns.map((patient) => {
                                    const returnDate = new Date(patient.return_alert_date + 'T00:00:00');
                                    const today = new Date();
                                    today.setHours(0, 0, 0, 0);
                                    const diffDays = Math.ceil((returnDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                                    const isOverdue = diffDays < 0;
                                    const isToday = diffDays === 0;

                                    return (
                                        <TouchableOpacity
                                            key={patient.id}
                                            onPress={() => {
                                                onClose();
                                                router.push(`/patient/${patient.id}` as any);
                                            }}
                                            className="bg-white p-4 rounded-xl border border-gray-100 mb-3"
                                        >
                                            <View className="flex-row items-start justify-between mb-2">
                                                <View className="flex-1">
                                                    <Text className="font-semibold text-gray-900 text-base">
                                                        {patient.name}
                                                    </Text>
                                                    <Text className="text-sm text-gray-600 mt-1">
                                                        Retorno: {returnDate.toLocaleDateString('pt-BR')}
                                                    </Text>
                                                </View>
                                                <View className={`px-2 py-1 rounded-full ${
                                                    isOverdue
                                                        ? 'bg-red-100'
                                                        : isToday
                                                            ? 'bg-amber-100'
                                                            : 'bg-blue-100'
                                                }`}>
                                                    <Text className={`text-xs font-medium ${
                                                        isOverdue
                                                            ? 'text-red-700'
                                                            : isToday
                                                                ? 'text-amber-700'
                                                                : 'text-blue-700'
                                                    }`}>
                                                        {isOverdue
                                                            ? `${Math.abs(diffDays)} dia${Math.abs(diffDays) !== 1 ? 's' : ''} atrasado`
                                                            : isToday
                                                                ? 'Hoje'
                                                                : `em ${diffDays} dia${diffDays !== 1 ? 's' : ''}`}
                                                    </Text>
                                                </View>
                                            </View>

                                            {patient.phone && (
                                                <View className="flex-row items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                                                    <TouchableOpacity
                                                        onPress={(e) => {
                                                            e.stopPropagation?.();
                                                            const phone = patient.phone.replace(/\D/g, '');
                                                            const message = encodeURIComponent(`Olá ${patient.name}, tudo bem? Estamos entrando em contato sobre seu retorno.`);
                                                            Linking.openURL(`https://wa.me/55${phone}?text=${message}`);
                                                        }}
                                                        className="bg-green-50 px-3 py-2 rounded-lg flex-row items-center gap-1"
                                                    >
                                                        <Svg width={14} height={14} viewBox="0 0 24 24" fill="#15803D">
                                                            <Path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                                        </Svg>
                                                        <Text className="text-green-700 font-medium text-sm">Mensagem</Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity
                                                        onPress={(e) => {
                                                            e.stopPropagation?.();
                                                            onClose();
                                                            router.push('/agenda');
                                                        }}
                                                        className="bg-[#fef2f2] px-3 py-2 rounded-lg flex-row items-center gap-1"
                                                    >
                                                        <Calendar size={14} color="#b94a48" />
                                                        <Text className="text-[#8b3634] font-medium text-sm">Agendar</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        )}
                    </View>
                )}
            </SafeAreaView>
        </Modal>
    );
}
