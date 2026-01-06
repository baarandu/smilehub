import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { X } from 'lucide-react-native';
import { settingsService } from '../../services/settings';
import { CardFeeConfig } from '../../types/database';

interface CardBrand {
    id: string;
    name: string;
    is_default: boolean;
}

interface CardFeeModalProps {
    visible: boolean;
    onClose: () => void;
    onSave: () => void;
    cardBrands: CardBrand[];
    editingFee?: CardFeeConfig | null;
}

export function CardFeeModal({ visible, onClose, onSave, cardBrands, editingFee }: CardFeeModalProps) {
    const [saving, setSaving] = React.useState(false);
    const [brand, setBrand] = React.useState('');
    const [type, setType] = React.useState<'credit' | 'debit'>('credit');
    const [installments, setInstallments] = React.useState('1');
    const [rate, setRate] = React.useState('');
    const [anticipationRate, setAnticipationRate] = React.useState('');

    React.useEffect(() => {
        if (editingFee) {
            setBrand(editingFee.brand);
            setType(editingFee.payment_type as 'credit' | 'debit');
            setInstallments(editingFee.installments.toString());
            setRate(editingFee.rate.toString());
            setAnticipationRate(editingFee.anticipation_rate?.toString() || '');
        } else {
            setBrand('');
            setType('credit');
            setInstallments('1');
            setRate('');
            setAnticipationRate('');
        }
    }, [editingFee, visible]);

    const handleSave = async () => {
        if (!brand) { Alert.alert('Erro', 'Selecione a bandeira do cartão'); return; }
        if (!rate) { Alert.alert('Erro', 'Informe a taxa percentual'); return; }

        setSaving(true);
        try {
            await settingsService.saveCardFee({
                brand,
                payment_type: type,
                installments: type === 'debit' ? 1 : parseInt(installments),
                rate: parseFloat(rate.replace(',', '.')),
                anticipation_rate: anticipationRate ? parseFloat(anticipationRate.replace(',', '.')) : null,
                id: editingFee?.id
            });
            onClose();
            onSave();
        } catch (error) {
            Alert.alert('Erro', 'Falha ao salvar regra de cartão.');
        } finally {
            setSaving(false);
        }
    };

    if (!visible) return null;

    return (
        <View className="absolute inset-0 z-50">
            <TouchableOpacity className="absolute inset-0 bg-black/30" activeOpacity={1} onPress={onClose} />
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 justify-end" pointerEvents="box-none">
                <View className="bg-white rounded-t-3xl p-6">
                    <View className="flex-row justify-between items-center mb-6">
                        <Text className="text-xl font-bold text-gray-900">Nova Regra de Taxa</Text>
                        <TouchableOpacity onPress={onClose} className="bg-gray-100 p-2 rounded-full"><X size={20} color="#374151" /></TouchableOpacity>
                    </View>

                    <View className="mb-4">
                        <Text className="text-sm font-medium text-gray-700 mb-2">Bandeira</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <View className="flex-row gap-2">
                                {cardBrands.map(b => (
                                    <TouchableOpacity key={b.id} onPress={() => setBrand(b.name.toLowerCase())} className={`px-3 py-2 rounded-lg border ${brand === b.name.toLowerCase() ? 'bg-teal-500 border-teal-500' : 'bg-white border-gray-200'}`}>
                                        <Text className={brand === b.name.toLowerCase() ? 'text-white' : 'text-gray-700'}>{b.name}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>
                    </View>

                    <View className="flex-row gap-4 mb-4">
                        <View className="flex-1">
                            <Text className="text-sm font-medium text-gray-700 mb-2">Tipo</Text>
                            <View className="flex-row bg-gray-100 p-1 rounded-lg">
                                <TouchableOpacity onPress={() => setType('credit')} style={{ flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6, backgroundColor: type === 'credit' ? '#fff' : 'transparent' }}>
                                    <Text style={{ fontWeight: type === 'credit' ? 'bold' : 'normal', color: type === 'credit' ? '#0D9488' : '#6B7280' }}>Crédito</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => setType('debit')} style={{ flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6, backgroundColor: type === 'debit' ? '#fff' : 'transparent' }}>
                                    <Text style={{ fontWeight: type === 'debit' ? 'bold' : 'normal', color: type === 'debit' ? '#0D9488' : '#6B7280' }}>Débito</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                        {type === 'credit' && (
                            <View className="w-24">
                                <Text className="text-sm font-medium text-gray-700 mb-2">Parcelas</Text>
                                <TextInput className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-3 text-center" value={installments} onChangeText={setInstallments} keyboardType="numeric" />
                            </View>
                        )}
                    </View>

                    <View className="mb-4">
                        <Text className="text-sm font-medium text-gray-700 mb-2">Taxa Normal (%)</Text>
                        <TextInput className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-3 text-lg font-bold text-gray-900" value={rate} onChangeText={setRate} keyboardType="numeric" placeholder="0.00" />
                        <Text className="text-xs text-gray-500 mt-1">Taxa para receber no prazo padrão</Text>
                    </View>

                    <View className="mb-6">
                        <Text className="text-sm font-medium text-gray-700 mb-2">Taxa de Antecipação (%)</Text>
                        <TextInput className="bg-gray-50 border border-amber-200 rounded-lg px-3 py-3 text-lg font-bold text-gray-900" value={anticipationRate} onChangeText={setAnticipationRate} keyboardType="numeric" placeholder="0.00" />
                        <Text className="text-xs text-gray-500 mt-1">Taxa para antecipar o recebimento</Text>
                    </View>

                    <TouchableOpacity onPress={handleSave} disabled={saving} className="bg-teal-500 rounded-xl py-4 items-center">
                        {saving ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-lg">Salvar Regra</Text>}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}
