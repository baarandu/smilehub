import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import { CardFeeConfig } from '../../types/database';
import { settingsService } from '../../services/settings';

interface FeeDetailModalProps {
    fee: CardFeeConfig | null;
    onClose: () => void;
    onRefresh: () => void;
}

export function FeeDetailModal({ fee, onClose, onRefresh }: FeeDetailModalProps) {
    if (!fee) return null;

    const handleDelete = () => {
        Alert.alert('Excluir', 'Deseja remover esta regra?', [
            { text: 'Cancelar' },
            {
                text: 'Excluir', style: 'destructive', onPress: async () => {
                    try {
                        await settingsService.deleteCardFee(fee.id);
                        onClose();
                        onRefresh();
                    } catch { Alert.alert('Erro', 'Falha ao excluir'); }
                }
            }
        ]);
    };

    return (
        <View className="absolute inset-0 z-50">
            <TouchableOpacity className="absolute inset-0 bg-black/40" activeOpacity={1} onPress={onClose} />
            <View className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6">
                <View className="w-12 h-1 bg-gray-300 rounded-full self-center mb-4" />
                <Text className="text-xl font-bold text-gray-900 mb-6 text-center">Detalhes da Taxa</Text>

                <View className="space-y-4 mb-6">
                    <View className="flex-row justify-between py-3 border-b border-gray-100">
                        <Text className="text-gray-500">Bandeira</Text>
                        <Text className="font-semibold text-gray-900 capitalize">{fee.brand === 'others' ? 'Outras Bandeiras' : fee.brand}</Text>
                    </View>
                    <View className="flex-row justify-between py-3 border-b border-gray-100">
                        <Text className="text-gray-500">Tipo</Text>
                        <Text className="font-semibold text-gray-900">{fee.payment_type === 'credit' ? 'Crédito' : 'Débito'}</Text>
                    </View>
                    <View className="flex-row justify-between py-3 border-b border-gray-100">
                        <Text className="text-gray-500">Parcelas</Text>
                        <Text className="font-semibold text-gray-900">{fee.installments}x</Text>
                    </View>
                    <View className="flex-row justify-between py-3 border-b border-gray-100">
                        <Text className="text-gray-500">Taxa Normal</Text>
                        <Text className="font-bold text-red-600 text-lg">{fee.rate}%</Text>
                    </View>
                    <View className="flex-row justify-between py-3">
                        <Text className="text-gray-500">Taxa de Antecipação</Text>
                        <Text className="font-bold text-amber-600 text-lg">{fee.anticipation_rate ? `${fee.anticipation_rate}%` : 'Não definida'}</Text>
                    </View>
                </View>

                <View className="flex-row gap-3">
                    <TouchableOpacity onPress={handleDelete} className="flex-1 bg-red-50 border border-red-200 rounded-xl py-4 items-center flex-row justify-center gap-2">
                        <Trash2 size={18} color="#EF4444" />
                        <Text className="text-red-600 font-semibold">Excluir</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onClose} className="flex-1 bg-gray-100 rounded-xl py-4 items-center">
                        <Text className="text-gray-700 font-semibold">Fechar</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}
