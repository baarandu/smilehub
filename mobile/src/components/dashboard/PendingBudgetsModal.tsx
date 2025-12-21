import { Modal, View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { X, FileText, ChevronRight } from 'lucide-react-native';

interface PendingItem {
    budgetId: string;
    patientId: string;
    patientName: string;
    date: string;
    tooth: {
        tooth: string;
        treatments: string[];
        values: Record<string, string>;
        status: string;
    };
    totalBudgetValue: number;
}

interface PendingBudgetsModalProps {
    visible: boolean;
    onClose: () => void;
    budgets: PendingItem[];
    loading: boolean;
}

const getToothDisplayName = (tooth: string): string => {
    if (tooth === 'ARC_SUP') return 'Arcada Superior';
    if (tooth === 'ARC_INF') return 'Arcada Inferior';
    if (tooth === 'ARC_AMBAS') return 'Arcada Superior + Inferior';
    if (tooth.includes('Arcada')) return tooth;
    return `Dente ${tooth}`;
};

const calculateToothTotal = (values: Record<string, string>): number => {
    return Object.values(values).reduce((sum, val) => sum + (parseInt(val || '0', 10) / 100), 0);
};

export function PendingBudgetsModal({ visible, onClose, budgets, loading }: PendingBudgetsModalProps) {
    const router = useRouter();

    const handlePressItem = (item: PendingItem) => {
        onClose();
        router.push({
            pathname: `/patient/${item.patientId}`,
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
                        Tratamentos Pendentes ({budgets.length})
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
                            Nenhum tratamento pendente
                        </Text>
                    </View>
                ) : (
                    <ScrollView className="flex-1 p-4">
                        {budgets.map((item, index) => (
                            <TouchableOpacity
                                key={`${item.budgetId}-${index}`}
                                onPress={() => handlePressItem(item)}
                                className="bg-white p-4 rounded-xl border border-gray-100 mb-3"
                            >
                                <View className="flex-row items-center justify-between mb-2">
                                    <View className="flex-1">
                                        <Text className="font-semibold text-gray-900 text-lg">
                                            {item.patientName}
                                        </Text>
                                        <Text className="text-sm text-gray-500">
                                            {new Date(item.date).toLocaleDateString('pt-BR')}
                                        </Text>
                                    </View>
                                    <ChevronRight size={20} color="#9CA3AF" />
                                </View>

                                <View className="bg-yellow-50 p-3 rounded-lg mt-2">
                                    <Text className="font-medium text-yellow-800">
                                        {getToothDisplayName(item.tooth.tooth)}
                                    </Text>
                                    <Text className="text-sm text-yellow-600">
                                        {item.tooth.treatments.join(', ')}
                                    </Text>
                                    <Text className="text-teal-600 font-bold mt-1">
                                        R$ {calculateToothTotal(item.tooth.values).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
