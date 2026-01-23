import { useState, useMemo } from 'react';
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
    const [selectedPatient, setSelectedPatient] = useState<{ patientId: string; patientName: string; items: PendingItem[] } | null>(null);

    // Group pending budgets by patient
    const groupedByPatient = useMemo(() => {
        const groups: Record<string, { patientId: string; patientName: string; items: PendingItem[] }> = {};
        budgets.forEach(item => {
            if (!groups[item.patientId]) {
                groups[item.patientId] = {
                    patientId: item.patientId,
                    patientName: item.patientName,
                    items: []
                };
            }
            groups[item.patientId].items.push(item);
        });
        return Object.values(groups);
    }, [budgets]);

    const handleClose = () => {
        setSelectedPatient(null);
        onClose();
    };

    const handleBack = () => {
        setSelectedPatient(null);
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
            <SafeAreaView className="flex-1 bg-gray-50">
                <View className="flex-row items-center justify-between px-4 py-4 bg-white border-b border-gray-100">
                    <TouchableOpacity onPress={selectedPatient ? handleBack : handleClose}>
                        <X size={24} color="#6B7280" />
                    </TouchableOpacity>
                    <Text className="text-lg font-semibold text-gray-900">
                        {selectedPatient
                            ? selectedPatient.patientName
                            : `Orçamentos Pendentes (${groupedByPatient.length})`
                        }
                    </Text>
                    <View className="w-10" />
                </View>

                {loading ? (
                    <View className="flex-1 items-center justify-center">
                        <ActivityIndicator size="large" color="#0D9488" />
                    </View>
                ) : (
                    <ScrollView className="flex-1 px-4 py-4">
                        {/* Explainer - only show in patient list view */}
                        {!selectedPatient && (
                            <View className="bg-orange-50 border border-orange-100 p-3 rounded-xl mb-4">
                                <Text className="text-orange-700 text-sm">
                                    Pacientes com tratamentos pendentes de execução.
                                    Toque em um paciente para ver os detalhes.
                                </Text>
                            </View>
                        )}

                        {selectedPatient ? (
                            /* Detail view - show items for selected patient */
                            <View className="gap-3">
                                <TouchableOpacity
                                    onPress={handleBack}
                                    className="flex-row items-center gap-2 mb-2"
                                >
                                    <ChevronRight size={16} color="#0D9488" style={{ transform: [{ rotate: '180deg' }] }} />
                                    <Text className="text-teal-600 font-medium">Voltar à lista</Text>
                                </TouchableOpacity>

                                {selectedPatient.items.map((item, idx) => (
                                    <TouchableOpacity
                                        key={`${item.budgetId}-${idx}`}
                                        onPress={() => {
                                            handleClose();
                                            router.push({
                                                pathname: `/patient/${item.patientId}`,
                                                params: { tab: 'budgets' }
                                            });
                                        }}
                                        className="bg-white p-4 rounded-xl border border-gray-100"
                                    >
                                        <View className="flex-row justify-between items-start mb-2">
                                            <Text className="text-sm text-gray-500">
                                                {new Date(item.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                                            </Text>
                                            <ChevronRight size={18} color="#9CA3AF" />
                                        </View>
                                        <View className="bg-yellow-50 p-3 rounded-lg">
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

                                <TouchableOpacity
                                    onPress={() => {
                                        handleClose();
                                        router.push({
                                            pathname: `/patient/${selectedPatient.patientId}`,
                                            params: { tab: 'budgets' }
                                        });
                                    }}
                                    className="bg-teal-600 p-4 rounded-xl mt-2"
                                >
                                    <Text className="text-white font-bold text-center">
                                        Abrir Ficha do Paciente
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            /* Patient list view */
                            groupedByPatient.length === 0 ? (
                                <View className="py-12 items-center">
                                    <FileText size={48} color="#D1D5DB" />
                                    <Text className="text-gray-400 mt-4">Nenhum tratamento pendente</Text>
                                </View>
                            ) : (
                                <View className="gap-3">
                                    {groupedByPatient.map((group) => (
                                        <TouchableOpacity
                                            key={group.patientId}
                                            onPress={() => setSelectedPatient(group)}
                                            className="bg-white p-4 rounded-xl border border-gray-100 flex-row items-center justify-between"
                                        >
                                            <View className="flex-1">
                                                <Text className="font-bold text-gray-900 text-base">{group.patientName}</Text>
                                            </View>
                                            <View className="flex-row items-center gap-2">
                                                <View className="bg-orange-500 px-2.5 py-1 rounded-full">
                                                    <Text className="text-white text-xs font-bold">{group.items.length}</Text>
                                                </View>
                                                <ChevronRight size={20} color="#9CA3AF" />
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )
                        )}
                    </ScrollView>
                )}
            </SafeAreaView>
        </Modal>
    );
}
