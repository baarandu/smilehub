import React from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { X, Calendar, Tag, Receipt, Package, Pencil, Trash2 } from 'lucide-react-native';
import { FinancialTransaction } from '../../types/database';
import { financialService } from '../../services/financial';
import { formatCurrency } from '../../utils/expense';
import { formatDate } from '../../utils/financial';

interface ExpenseDetailModalProps {
    visible: boolean;
    onClose: () => void;
    expense: FinancialTransaction | null;
    materialItems: any[];
    loadingMaterialItems: boolean;
    onEdit: (transaction: FinancialTransaction) => void;
    onRefresh: () => void;
}

export function ExpenseDetailModal({
    visible,
    onClose,
    expense,
    materialItems,
    loadingMaterialItems,
    onEdit,
    onRefresh
}: ExpenseDetailModalProps) {
    const [deleting, setDeleting] = React.useState(false);

    const formatValue = (value: number) => `R$ ${formatCurrency(value)}`;

    const handleDelete = () => {
        if (!expense) return;
        const isMaterials = expense.category === 'Materiais' && (expense as any).related_entity_id;

        Alert.alert(
            'Excluir Despesa',
            isMaterials
                ? 'A lista de materiais voltará para "Pendente". Deseja continuar?'
                : 'Tem certeza que deseja excluir esta despesa?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Excluir',
                    style: 'destructive',
                    onPress: async () => {
                        setDeleting(true);
                        try {
                            await financialService.deleteExpenseAndRevertMaterials(expense.id);
                            onClose();
                            Alert.alert('Sucesso', isMaterials
                                ? 'Despesa excluída! Lista de materiais revertida para pendente.'
                                : 'Despesa excluída com sucesso!');
                            onRefresh();
                        } catch (error) {
                            Alert.alert('Erro', 'Falha ao excluir despesa');
                        } finally {
                            setDeleting(false);
                        }
                    }
                }
            ]
        );
    };

    if (!expense) return null;

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View className="flex-1 justify-end bg-black/50">
                <View className="bg-white rounded-t-3xl h-[85%]">
                    <View className="flex-row justify-between items-center p-4 border-b border-gray-100">
                        <Text className="text-xl font-bold text-gray-800">Detalhes da Despesa</Text>
                        <TouchableOpacity onPress={onClose} className="bg-gray-100 p-2 rounded-full">
                            <X size={20} color="#374151" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView className="flex-1 p-4">
                        <View className="bg-gray-50 rounded-xl p-4 gap-3 mb-4">
                            <View className="flex-row items-center gap-3">
                                <Calendar size={16} color="#6B7280" />
                                <Text className="text-sm text-gray-700">
                                    {formatDate(expense.date)}
                                </Text>
                            </View>
                            {expense.category && (
                                <View className="flex-row items-center gap-3">
                                    <Tag size={16} color="#6B7280" />
                                    <View className="bg-gray-200 px-2 py-1 rounded">
                                        <Text className="text-xs text-gray-700">{expense.category}</Text>
                                    </View>
                                </View>
                            )}
                            {(expense as any).payment_method && (
                                <View className="flex-row items-center gap-3">
                                    <Receipt size={16} color="#6B7280" />
                                    <View className="bg-blue-100 px-2 py-1 rounded">
                                        <Text className="text-xs text-blue-700 font-medium">
                                            Forma de Pagamento: {
                                                (expense as any).payment_method === 'credit' ? 'Crédito' :
                                                (expense as any).payment_method === 'debit' ? 'Débito' :
                                                (expense as any).payment_method === 'pix' ? 'PIX' :
                                                (expense as any).payment_method === 'cash' ? 'Dinheiro' :
                                                (expense as any).payment_method === 'transfer' ? 'Transferência' :
                                                (expense as any).payment_method === 'boleto' ? 'Boleto' :
                                                (expense as any).payment_method
                                            }
                                        </Text>
                                    </View>
                                </View>
                            )}
                            {(expense as any).recurrence_id && (
                                <View className="flex-row items-center gap-3">
                                    <Calendar size={16} color="#6B7280" />
                                    <View className="bg-purple-100 px-2 py-1 rounded">
                                        <Text className="text-xs text-purple-700 font-medium">
                                            Compra Parcelada
                                        </Text>
                                    </View>
                                </View>
                            )}
                            <View className="flex-row items-center gap-3">
                                <Receipt size={16} color="#6B7280" />
                                <Text className="text-sm text-gray-700 flex-1">
                                    {expense.category === 'Materiais' && (expense as any).related_entity_id
                                        ? `Compra de ${materialItems.length || '?'} materiais`
                                        : expense.description}
                                </Text>
                            </View>
                        </View>

                        <View className="bg-[#fef2f2] rounded-xl py-6 items-center mb-4">
                            <Text className="text-sm text-gray-500 mb-1">Valor da Despesa</Text>
                            <Text className="text-3xl font-bold text-[#a03f3d]">- {formatValue(expense.amount)}</Text>
                        </View>

                        {expense.category === 'Materiais' && (
                            <View className="mb-4">
                                <View className="flex-row items-center gap-2 mb-3">
                                    <Package size={16} color="#374151" />
                                    <Text className="font-semibold text-gray-800">Itens Comprados</Text>
                                </View>
                                {loadingMaterialItems ? (
                                    <View className="py-4 items-center">
                                        <ActivityIndicator size="small" color="#6B7280" />
                                    </View>
                                ) : materialItems.length > 0 ? (
                                    <View className="gap-2">
                                        {materialItems.map((item: any, index: number) => (
                                            <View key={index} className="flex-row justify-between items-center p-3 bg-gray-50 rounded-lg">
                                                <View className="flex-1">
                                                    <Text className="font-medium text-sm text-gray-900">{item.name}</Text>
                                                    <Text className="text-xs text-gray-500">{item.quantity}x {formatValue(item.unitPrice)} • {item.supplier}</Text>
                                                </View>
                                                <Text className="font-semibold text-[#a03f3d]">{formatValue(item.totalPrice)}</Text>
                                            </View>
                                        ))}
                                    </View>
                                ) : (
                                    <Text className="text-sm text-gray-400 italic">
                                        {(expense as any).related_entity_id ? 'Itens não encontrados' : 'Despesa sem lista de materiais vinculada'}
                                    </Text>
                                )}
                            </View>
                        )}

                        {expense.category === 'Materiais' && (expense as any).related_entity_id && (
                            <View className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                                <Text className="text-sm text-orange-700">
                                    <Text className="font-bold">Atenção:</Text> Ao excluir esta despesa, a lista de materiais voltará para "Pendente".
                                </Text>
                            </View>
                        )}
                    </ScrollView>

                    <View className="p-4 border-t border-gray-100 bg-white safe-area-bottom">
                        <View className="flex-row gap-3">
                            <TouchableOpacity
                                onPress={() => { onClose(); onEdit(expense); }}
                                className="flex-1 bg-gray-100 rounded-xl p-4 flex-row items-center justify-center gap-2"
                            >
                                <Pencil size={18} color="#374151" />
                                <Text className="font-semibold text-gray-700">Editar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleDelete}
                                disabled={deleting}
                                className={`flex-1 bg-[#b94a48] rounded-xl p-4 flex-row items-center justify-center gap-2 ${deleting ? 'opacity-50' : ''}`}
                            >
                                {deleting ? <ActivityIndicator size="small" color="white" /> : <Trash2 size={18} color="white" />}
                                <Text className="font-semibold text-white">Excluir</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
