import { Modal, View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { X, FileText, ChevronRight, AlertTriangle } from 'lucide-react-native';
import type { BudgetWithItems } from '../../../src/types/database';

interface PendingBudgetsModalProps {
    visible: boolean;
    onClose: () => void;
    budgets: (BudgetWithItems & { patient_name: string })[];
    loading: boolean;
}

export function PendingBudgetsModal({ visible, onClose, budgets, loading }: PendingBudgetsModalProps) {
    const router = useRouter();

    const handlePressBudget = (budget: BudgetWithItems) => {
        onClose();
        router.push({
            pathname: `/patient/${budget.patient_id}`,
            params: { tab: 'budgets' }
        });
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
            <SafeAreaView className="flex-1 bg-gray-50">
                <View className="flex-row items-center justify-between px-4 py-4 bg-white border-b border-gray-100">
                    <TouchableOpacity onPress={onClose}>
                        <X size={24} color="#6B7280" />
                    </TouchableOpacity>
                    <Text className="text-lg font-semibold text-gray-900">
                        Orçamentos Pendentes ({budgets.length})
                    </Text>
                    <View style={{ width: 24 }} />
                </View>

                {loading ? (
                    <View className="flex-1 items-center justify-center">
                        <ActivityIndicator size="large" color="#0D9488" />
                    </View>
                ) : budgets.length === 0 ? (
                    <View className="flex-1 items-center justify-center p-8">
                        <FileText size={48} color="#D1D5DB" />
                        <Text className="text-gray-400 mt-4 text-center">
                            Nenhum orçamento pendente
                        </Text>
                    </View>
                ) : (
                    <ScrollView className="flex-1 p-4">
                        {budgets.map((budget) => (
                            <TouchableOpacity
                                key={budget.id}
                                onPress={() => handlePressBudget(budget)}
                                className="bg-white p-4 rounded-xl border border-gray-100 mb-3"
                            >
                                <View className="flex-row items-center justify-between mb-2">
                                    <View>
                                        <Text className="font-semibold text-gray-900 text-lg">
                                            {budget.patient_name}
                                        </Text>
                                        <Text className="text-sm text-gray-500">
                                            {new Date(budget.date).toLocaleDateString('pt-BR')}
                                        </Text>
                                    </View>
                                    <ChevronRight size={20} color="#9CA3AF" />
                                </View>

                                <View className="flex-row items-center justify-between mt-2 pt-2 border-t border-gray-50">
                                    <View className="bg-yellow-50 px-2 py-1 rounded">
                                        <Text className="text-xs font-medium text-yellow-700 uppercase">
                                            Pendente
                                        </Text>
                                    </View>
                                    <Text className="text-teal-600 font-bold text-base">
                                        R$ {budget.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                )}
            </SafeAreaView>
        </Modal>
    );
}
