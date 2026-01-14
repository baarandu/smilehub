import React from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { TrendingUp, MapPin, Calendar, X, Trash2, CreditCard } from 'lucide-react-native';
import { FinancialTransactionWithPatient } from '../../types/database';
import { formatCurrency, formatDate, parseTransactionDescription } from '../../utils/financial';
import { financialService } from '../../services/financial';

interface IncomeDetailModalProps {
    transaction: FinancialTransactionWithPatient | null;
    onClose: () => void;
    relatedInstallments: FinancialTransactionWithPatient[];
    onRefresh?: () => void;
}

export const IncomeDetailModal: React.FC<IncomeDetailModalProps> = ({
    transaction,
    onClose,
    relatedInstallments,
    onRefresh
}) => {
    const [deleting, setDeleting] = React.useState(false);

    if (!transaction) return null;

    const parsed = parseTransactionDescription(
        transaction.description,
        transaction.patients?.name || ''
    );

    const handleDelete = () => {
        Alert.alert(
            'Excluir Receita',
            'Tem certeza que deseja excluir esta receita?\n\nSe houver orçamentos vinculados, eles voltarão ao status "pendente".',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Excluir',
                    style: 'destructive',
                    onPress: async () => {
                        setDeleting(true);
                        try {
                            await financialService.deleteIncomeAndRevertBudget(transaction.id);
                            onClose();
                            if (onRefresh) {
                                onRefresh();
                            }
                            Alert.alert('Sucesso', 'Receita excluída. Orçamentos vinculados voltaram a pendente.');
                        } catch (error) {
                            console.error('Error deleting:', error);
                            Alert.alert('Erro', 'Falha ao excluir receita.');
                        } finally {
                            setDeleting(false);
                        }
                    }
                }
            ]
        );
    };

    const hasDeductions =
        ((transaction.tax_amount || 0) > 0) ||
        ((transaction.card_fee_amount || 0) > 0) ||
        (((transaction as any).anticipation_amount || 0) > 0) ||
        (((transaction as any).location_amount || 0) > 0);

    return (
        <Modal visible={!!transaction} transparent animationType="fade" statusBarTranslucent>
            <View className="flex-1 justify-center items-center p-4 bg-black/50">
                <TouchableOpacity
                    style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}
                    activeOpacity={1}
                    onPress={onClose}
                />
                <View className="bg-white w-full max-w-sm rounded-2xl overflow-hidden shadow-xl" style={{ maxHeight: '85%' }}>
                    {/* Header */}
                    <View className="bg-teal-500 p-6 pt-8">
                        <View className="flex-row justify-between items-start">
                            <View>
                                <Text className="text-teal-100 font-medium mb-1">Receita</Text>
                                <Text className="text-white text-3xl font-bold">
                                    {formatCurrency(transaction.amount)}
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={onClose}
                                className="bg-teal-600 p-2 rounded-full"
                            >
                                <X size={20} color="white" />
                            </TouchableOpacity>
                        </View>
                        <View className="mt-4">
                            <Text className="text-teal-50 text-sm opacity-90">{parsed.displayDescription}</Text>
                            <Text className="text-teal-100 text-xs mt-1">
                                {parsed.installmentInfo ? `(Parcela ${parsed.installmentInfo})` : ''}
                            </Text>
                        </View>
                    </View>

                    <ScrollView>
                        <View style={{ padding: 24, paddingBottom: 40 }}>
                            {/* Main Info */}
                            <View>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <View className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center">
                                        <TrendingUp size={20} color="#374151" />
                                    </View>
                                    <View>
                                        <Text className="text-xs text-gray-500 uppercase tracking-wider">Paciente</Text>
                                        <Text className="text-gray-900 font-medium text-lg">
                                            {transaction.patients?.name || 'Não identificado'}
                                        </Text>
                                    </View>
                                </View>

                                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16 }}>
                                    <View className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center">
                                        <MapPin size={20} color="#374151" />
                                    </View>
                                    <View>
                                        <Text className="text-xs text-gray-500 uppercase tracking-wider">Local de Atendimento</Text>
                                        <Text className="text-gray-900 font-medium text-base">
                                            {transaction.location || 'Não informado'}
                                        </Text>
                                    </View>
                                </View>

                                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16 }}>
                                    <View className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center">
                                        <Calendar size={20} color="#374151" />
                                    </View>
                                    <View>
                                        <Text className="text-xs text-gray-500 uppercase tracking-wider">Data do Pagamento</Text>
                                        <Text className="text-gray-900 font-medium text-base">
                                            {formatDate(transaction.date)}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16 }}>
                                <View className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center">
                                    <CreditCard size={20} color="#374151" />
                                </View>
                                <View>
                                    <Text className="text-xs text-gray-500 uppercase tracking-wider">Forma de Pagamento</Text>
                                    <Text className="text-gray-900 font-medium text-base">
                                        {(() => {
                                            const pm = (transaction as any).payment_method;
                                            if (pm) {
                                                if (pm === 'credit') return 'Cartão de Crédito';
                                                if (pm === 'debit') return 'Cartão de Débito';
                                                if (pm === 'pix') return 'PIX';
                                                if (pm === 'cash') return 'Dinheiro';
                                                return pm;
                                            }
                                            return 'Não informado';
                                        })()}
                                    </Text>
                                </View>
                            </View>


                            {hasDeductions && (
                                <View style={{ backgroundColor: '#f9fafb', borderRadius: 12, padding: 16, marginTop: 16 }}>
                                    <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#111827', marginBottom: 12 }}>Detalhamento Financeiro</Text>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Text style={{ color: '#4b5563' }}>Valor Bruto</Text>
                                        <Text style={{ fontWeight: '600', color: '#111827' }}>{formatCurrency(transaction.amount)}</Text>
                                    </View>
                                    {(transaction.tax_amount || 0) > 0 && (
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                                            <Text style={{ color: '#6b7280', fontSize: 14 }}>Imposto ({transaction.tax_rate || 0}%)</Text>
                                            <Text style={{ color: '#ef4444', fontSize: 14 }}>- {formatCurrency(transaction.tax_amount || 0)}</Text>
                                        </View>
                                    )}
                                    {(transaction.card_fee_amount || 0) > 0 && (
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                                            <Text style={{ color: '#6b7280', fontSize: 14 }}>Taxa do Cartão ({transaction.card_fee_rate || 0}%)</Text>
                                            <Text style={{ color: '#ef4444', fontSize: 14 }}>- {formatCurrency(transaction.card_fee_amount || 0)}</Text>
                                        </View>
                                    )}
                                    {((transaction as any).anticipation_amount || 0) > 0 && (
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                                            <Text style={{ color: '#6b7280', fontSize: 14 }}>Antecipação ({(transaction as any).anticipation_rate || 0}%)</Text>
                                            <Text style={{ color: '#ef4444', fontSize: 14 }}>- {formatCurrency((transaction as any).anticipation_amount || 0)}</Text>
                                        </View>
                                    )}
                                    {(transaction as any).location_amount > 0 && (
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4, marginTop: 8 }}>
                                            <Text style={{ fontSize: 14, color: '#6B7280' }}>Taxa do Procedimento ({(transaction as any).location_rate || 0}%):</Text>
                                            <Text style={{ fontSize: 14, color: '#EF4444', fontWeight: '500' }}>- {formatCurrency((transaction as any).location_amount)}</Text>
                                        </View>
                                    )}
                                    <View style={{ borderTopWidth: 1, borderTopColor: '#e5e7eb', marginTop: 8, paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Text style={{ fontWeight: 'bold', color: '#111827' }}>Valor Líquido</Text>
                                        <Text style={{ fontWeight: 'bold', color: '#16a34a' }}>{formatCurrency(transaction.net_amount || transaction.amount)}</Text>
                                    </View>
                                </View>
                            )}

                            {/* Installments / Payment History */}
                            {relatedInstallments.length > 0 && (
                                <View>
                                    <Text className="text-sm font-bold text-gray-900 mb-3 border-b border-gray-100 pb-2 mt-4">Histórico de Parcelas</Text>
                                    <View>
                                        {relatedInstallments.map((inst, index) => (
                                            <View
                                                key={inst.id}
                                                style={{
                                                    flexDirection: 'row',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    padding: 12,
                                                    borderRadius: 8,
                                                    backgroundColor: inst.id === transaction?.id ? '#f0fdf4' : '#f9fafb',
                                                    borderWidth: inst.id === transaction?.id ? 1 : 0,
                                                    borderColor: '#bbf7d0',
                                                    marginBottom: 8
                                                }}
                                            >
                                                <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12 }}>
                                                    <View className="w-6 h-6 rounded-full bg-white items-center justify-center border border-gray-200">
                                                        <Text className="text-xs text-gray-500">{index + 1}</Text>
                                                    </View>
                                                    <View className="ml-2">
                                                        <Text className="text-gray-900 font-medium">
                                                            {formatDate(inst.date)}
                                                        </Text>
                                                        {inst.id === transaction?.id && (
                                                            <Text className="text-[10px] text-green-600 font-bold">ATUAL</Text>
                                                        )}
                                                    </View>
                                                </View>
                                                <Text className="text-gray-900 font-bold">
                                                    {formatCurrency(inst.amount)}
                                                </Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            )}
                        </View>
                    </ScrollView>

                    {/* Delete Button */}
                    <View style={{ padding: 16, paddingBottom: 24, borderTopWidth: 1, borderTopColor: '#f3f4f6' }}>
                        <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={handleDelete}
                            disabled={deleting}
                            style={{
                                backgroundColor: deleting ? '#fecaca' : '#fef2f2',
                                borderWidth: 1,
                                borderColor: '#fecaca',
                                borderRadius: 12,
                                padding: 16,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 8
                            }}
                        >
                            {deleting ? (
                                <ActivityIndicator size="small" color="#dc2626" />
                            ) : (
                                <Trash2 size={18} color="#dc2626" />
                            )}
                            <Text style={{ color: '#dc2626', fontWeight: '600' }}>
                                {deleting ? 'Excluindo...' : 'Excluir Receita'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View >
        </Modal >
    );
};
