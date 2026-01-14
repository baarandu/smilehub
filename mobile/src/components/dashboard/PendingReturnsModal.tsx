import React from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Calendar, CheckCircle, AlertTriangle } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import type { PendingReturn } from '../../services/pendingReturns';

interface PendingReturnsModalProps {
    visible: boolean;
    onClose: () => void;
    returns: PendingReturn[];
    loading: boolean;
    onMarkCompleted: (procedureId: string) => Promise<void>;
}

export function PendingReturnsModal({
    visible,
    onClose,
    returns,
    loading,
    onMarkCompleted
}: PendingReturnsModalProps) {
    const router = useRouter();

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
            <SafeAreaView className="flex-1 bg-gray-50">
                <View className="flex-row items-center justify-between px-4 py-4 bg-white border-b border-gray-100">
                    <TouchableOpacity onPress={onClose}>
                        <X size={24} color="#6B7280" />
                    </TouchableOpacity>
                    <Text className="text-lg font-semibold text-gray-900">
                        Retornos Pendentes ({returns.length})
                    </Text>
                    <View style={{ width: 24 }} />
                </View>

                {loading ? (
                    <View className="flex-1 items-center justify-center">
                        <ActivityIndicator size="large" color="#0D9488" />
                    </View>
                ) : (
                    <View className="flex-1">
                        <View className="px-4 py-3 bg-amber-50 mx-4 mt-4 rounded-xl border border-amber-100 mb-2">
                            <Text className="text-amber-900 font-semibold text-sm mb-1">Como funciona esta lista?</Text>
                            <Text className="text-amber-800 text-sm">
                                Ela exibe procedimentos que estão <Text className="font-bold">Em andamento</Text> mas não tiveram nenhuma atualização nos últimos <Text className="font-bold">30 dias</Text>.
                                O objetivo é lembrar de pacientes que podem ter "sumido" antes de concluir o tratamento.
                            </Text>
                        </View>

                        {returns.length === 0 ? (
                            <View className="flex-1 items-center justify-center p-8">
                                <AlertTriangle size={48} color="#D1D5DB" />
                                <Text className="text-gray-400 mt-4 text-center">
                                    Nenhum tratamento com retorno pendente
                                </Text>
                            </View>
                        ) : (
                            <ScrollView className="flex-1 p-4">
                                {returns.map((item) => (
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
                                                        onClose();
                                                        router.push('/agenda');
                                                    }}
                                                    className="bg-teal-50 px-3 py-2 rounded-lg flex-row items-center gap-1"
                                                >
                                                    <Calendar size={14} color="#0D9488" />
                                                    <Text className="text-teal-700 font-medium text-sm">Agendar</Text>
                                                </TouchableOpacity>
                                            </View>
                                            <TouchableOpacity
                                                onPress={() => onMarkCompleted(item.procedure.id)}
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
                    </View>
                )}
            </SafeAreaView>
        </Modal>
    );
}
