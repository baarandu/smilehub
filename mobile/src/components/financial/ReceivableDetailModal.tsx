import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, CheckCircle, XCircle, Calendar, CreditCard, User, FileText } from 'lucide-react-native';
import type { PaymentReceivable } from '../../types/receivables';
import { formatCurrency, formatDate } from '../../utils/financial';
import { DatePickerModal } from '../common/DatePickerModal';

interface ReceivableDetailModalProps {
    receivable: PaymentReceivable | null;
    onClose: () => void;
    onConfirm: (receivableId: string, confirmationDate: string) => Promise<void>;
    onCancel: (receivableId: string) => Promise<void>;
}

const METHOD_LABELS: Record<string, string> = {
    credit: 'Cartão de Crédito',
    debit: 'Cartão de Débito',
    pix: 'PIX',
    cash: 'Dinheiro',
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
    pending: { label: 'Pendente', bg: 'bg-amber-100', text: 'text-amber-700' },
    overdue: { label: 'Em Atraso', bg: 'bg-red-100', text: 'text-red-700' },
    confirmed: { label: 'Confirmado', bg: 'bg-green-100', text: 'text-green-700' },
    cancelled: { label: 'Cancelado', bg: 'bg-gray-100', text: 'text-gray-500' },
};

export function ReceivableDetailModal({ receivable, onClose, onConfirm, onCancel }: ReceivableDetailModalProps) {
    const [confirming, setConfirming] = useState(false);
    const [cancelling, setCancelling] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [confirmDate, setConfirmDate] = useState(new Date().toISOString().split('T')[0]);

    if (!receivable) return null;

    const status = STATUS_CONFIG[receivable.status] || STATUS_CONFIG.pending;
    const methodLabel = METHOD_LABELS[receivable.payment_method] || receivable.payment_method;
    const isActive = receivable.status === 'pending' || receivable.status === 'overdue';

    const totalDeductions = receivable.tax_amount + receivable.card_fee_amount +
        receivable.anticipation_amount + receivable.location_amount;

    const handleConfirm = async () => {
        setConfirming(true);
        try {
            await onConfirm(receivable.id, confirmDate);
            onClose();
        } catch (error: any) {
            Alert.alert('Erro', error?.message || 'Falha ao confirmar parcela');
        } finally {
            setConfirming(false);
        }
    };

    const handleCancel = () => {
        Alert.alert(
            'Cancelar Parcela',
            'Tem certeza que deseja cancelar esta parcela? Esta ação não pode ser desfeita.',
            [
                { text: 'Não', style: 'cancel' },
                {
                    text: 'Sim, cancelar',
                    style: 'destructive',
                    onPress: async () => {
                        setCancelling(true);
                        try {
                            await onCancel(receivable.id);
                            onClose();
                        } catch (error: any) {
                            Alert.alert('Erro', error?.message || 'Falha ao cancelar parcela');
                        } finally {
                            setCancelling(false);
                        }
                    },
                },
            ]
        );
    };

    return (
        <Modal visible={!!receivable} animationType="slide" presentationStyle="pageSheet">
            <SafeAreaView className="flex-1 bg-gray-50">
                {/* Header */}
                <View className="flex-row items-center justify-between p-4 border-b border-gray-200 bg-white">
                    <Text className="text-lg font-semibold text-gray-900">Detalhes da Parcela</Text>
                    <TouchableOpacity onPress={onClose}>
                        <X size={24} color="#374151" />
                    </TouchableOpacity>
                </View>

                <ScrollView className="flex-1 px-4 py-4">
                    {/* Status Badge */}
                    <View className="items-center mb-6">
                        <View className={`px-4 py-2 rounded-full ${status.bg}`}>
                            <Text className={`font-semibold ${status.text}`}>{status.label}</Text>
                        </View>
                    </View>

                    {/* Amount Card */}
                    <View className="bg-white rounded-xl border border-gray-100 p-4 mb-4">
                        <Text className="text-gray-500 text-sm mb-1">Valor da Parcela</Text>
                        <Text className="text-3xl font-bold text-gray-900">{formatCurrency(receivable.amount)}</Text>
                        {totalDeductions > 0 && (
                            <View className="mt-2">
                                <Text className="text-sm text-gray-500">
                                    Valor líquido: <Text className="font-semibold text-green-600">{formatCurrency(receivable.net_amount)}</Text>
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Info Cards */}
                    <View className="bg-white rounded-xl border border-gray-100 p-4 mb-4">
                        <InfoRow icon={<User size={18} color="#6B7280" />} label="Paciente" value={receivable.patients?.name || '—'} />
                        <InfoRow icon={<FileText size={18} color="#6B7280" />} label="Procedimento" value={receivable.tooth_description} />
                        <InfoRow icon={<CreditCard size={18} color="#6B7280" />} label="Forma de Pagamento" value={methodLabel} />
                        {receivable.brand && (
                            <InfoRow icon={<CreditCard size={18} color="#6B7280" />} label="Bandeira" value={receivable.brand.toUpperCase()} />
                        )}
                        {receivable.installments > 1 && (
                            <InfoRow icon={<Calendar size={18} color="#6B7280" />} label="Parcelas" value={`${receivable.installments}x`} />
                        )}
                        <InfoRow icon={<Calendar size={18} color="#6B7280" />} label="Vencimento" value={formatDate(receivable.due_date)} />
                        {receivable.confirmed_at && (
                            <InfoRow icon={<CheckCircle size={18} color="#22C55E" />} label="Confirmado em" value={formatDate(receivable.confirmed_at)} />
                        )}
                    </View>

                    {/* Deductions Breakdown */}
                    {totalDeductions > 0 && (
                        <View className="bg-white rounded-xl border border-gray-100 p-4 mb-4">
                            <Text className="font-semibold text-gray-900 mb-3">Deduções</Text>
                            {receivable.tax_amount > 0 && (
                                <DeductionRow label={`Imposto (${receivable.tax_rate}%)`} amount={receivable.tax_amount} />
                            )}
                            {receivable.card_fee_amount > 0 && (
                                <DeductionRow label={`Taxa cartão (${receivable.card_fee_rate}%)`} amount={receivable.card_fee_amount} />
                            )}
                            {receivable.anticipation_amount > 0 && (
                                <DeductionRow label={`Antecipação (${receivable.anticipation_rate}%)`} amount={receivable.anticipation_amount} />
                            )}
                            {receivable.location_amount > 0 && (
                                <DeductionRow label={`Unidade (${receivable.location_rate}%)`} amount={receivable.location_amount} />
                            )}
                            <View className="h-px bg-gray-100 my-2" />
                            <View className="flex-row justify-between">
                                <Text className="font-semibold text-gray-900">Total deduções</Text>
                                <Text className="font-semibold text-red-600">- {formatCurrency(totalDeductions)}</Text>
                            </View>
                        </View>
                    )}

                    {/* Payer info */}
                    {!receivable.payer_is_patient && receivable.payer_name && (
                        <View className="bg-white rounded-xl border border-gray-100 p-4 mb-4">
                            <Text className="font-semibold text-gray-900 mb-2">Pagador</Text>
                            <Text className="text-gray-700">{receivable.payer_name}</Text>
                            <Text className="text-gray-500 text-sm">{receivable.payer_type === 'PJ' ? 'Pessoa Jurídica' : 'Pessoa Física'}</Text>
                        </View>
                    )}

                    {/* Confirm date picker for active receivables */}
                    {isActive && (
                        <View className="bg-white rounded-xl border border-gray-100 p-4 mb-4">
                            <Text className="font-semibold text-gray-900 mb-3">Data de Confirmação</Text>
                            <TouchableOpacity
                                onPress={() => setShowDatePicker(true)}
                                className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-3 flex-row items-center justify-between"
                            >
                                <Text className="text-gray-900">
                                    {(() => {
                                        const [y, m, d] = confirmDate.split('-');
                                        return `${d}/${m}/${y}`;
                                    })()}
                                </Text>
                                <Calendar size={20} color="#6B7280" />
                            </TouchableOpacity>
                        </View>
                    )}

                    <View className="h-4" />
                </ScrollView>

                {/* Action Buttons */}
                {isActive && (
                    <View className="p-4 border-t border-gray-200 bg-white gap-3">
                        <TouchableOpacity
                            onPress={handleConfirm}
                            disabled={confirming || cancelling}
                            className="bg-green-600 rounded-xl px-6 py-4 items-center flex-row justify-center gap-2"
                        >
                            <CheckCircle size={20} color="#FFFFFF" />
                            <Text className="text-white font-semibold">
                                {confirming ? 'Confirmando...' : 'Confirmar Recebimento'}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={handleCancel}
                            disabled={confirming || cancelling}
                            className="bg-white border border-red-200 rounded-xl px-6 py-3 items-center flex-row justify-center gap-2"
                        >
                            <XCircle size={18} color="#DC2626" />
                            <Text className="text-red-600 font-medium">
                                {cancelling ? 'Cancelando...' : 'Cancelar Parcela'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                <DatePickerModal
                    visible={showDatePicker}
                    onClose={() => setShowDatePicker(false)}
                    initialDate={new Date(confirmDate + 'T12:00:00')}
                    onSelectDate={(date) => {
                        const y = date.getFullYear();
                        const m = String(date.getMonth() + 1).padStart(2, '0');
                        const d = String(date.getDate()).padStart(2, '0');
                        setConfirmDate(`${y}-${m}-${d}`);
                    }}
                />
            </SafeAreaView>
        </Modal>
    );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <View className="flex-row items-center py-2 border-b border-gray-50">
            {icon}
            <Text className="text-gray-500 text-sm ml-3 flex-1">{label}</Text>
            <Text className="text-gray-900 font-medium text-sm">{value}</Text>
        </View>
    );
}

function DeductionRow({ label, amount }: { label: string; amount: number }) {
    return (
        <View className="flex-row justify-between py-1">
            <Text className="text-gray-600 text-sm">{label}</Text>
            <Text className="text-red-500 text-sm">- {formatCurrency(amount)}</Text>
        </View>
    );
}
