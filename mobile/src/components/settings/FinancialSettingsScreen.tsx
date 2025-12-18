import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { ArrowLeft, Save, Plus, Trash2, CreditCard, Percent, X, Tag } from 'lucide-react-native';
import { settingsService } from '../../services/settings';
import { CardFeeConfig } from '../../types/database';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Props {
    onBack?: () => void;
}

export default function FinancialSettingsScreen({ onBack }: Props) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Multiple Taxes State
    const [taxes, setTaxes] = useState<{ id: string; name: string; rate: number }[]>([]);
    const [newTaxName, setNewTaxName] = useState('');
    const [newTaxRate, setNewTaxRate] = useState('');
    const [showTaxForm, setShowTaxForm] = useState(false);

    // Card Fees
    const [cardFees, setCardFees] = useState<CardFeeConfig[]>([]);
    const [showFeeModal, setShowFeeModal] = useState(false);

    // Card Brands
    const [cardBrands, setCardBrands] = useState<{ id: string; name: string; is_default: boolean }[]>([]);
    const [newBrandName, setNewBrandName] = useState('');
    const [showBrandForm, setShowBrandForm] = useState(false);

    // Filters
    const [filterBrand, setFilterBrand] = useState('all');
    const [filterType, setFilterType] = useState<'all' | 'credit' | 'debit'>('all');

    // Fee Form
    const [editingFee, setEditingFee] = useState<CardFeeConfig | null>(null);
    const [feeBrand, setFeeBrand] = useState('visa');
    const [feeType, setFeeType] = useState<'credit' | 'debit'>('credit');
    const [feeInstallments, setFeeInstallments] = useState('1');
    const [feeRate, setFeeRate] = useState('');
    const [feeAnticipationRate, setFeeAnticipationRate] = useState('');

    // Fee Detail Modal
    const [selectedFeeForDetails, setSelectedFeeForDetails] = useState<CardFeeConfig | null>(null);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            setLoading(true);

            const fees = await settingsService.getCardFees();
            setCardFees(fees || []);

            const brands = await settingsService.getCardBrands();
            setCardBrands(brands || []);

            // Load taxes
            const loadedTaxes = await settingsService.getTaxes();
            setTaxes(loadedTaxes || []);
        } catch (error) {
            console.error(error);
            Alert.alert('Erro', 'Falha ao carregar configurações');
        } finally {
            setLoading(false);
        }
    };

    const handleAddTax = async () => {
        if (!newTaxName.trim() || !newTaxRate) {
            Alert.alert('Erro', 'Informe o nome e a taxa do imposto.');
            return;
        }
        setSaving(true);
        try {
            await settingsService.saveTax({ name: newTaxName.trim(), rate: parseFloat(newTaxRate.replace(',', '.')) || 0 });
            Alert.alert('Sucesso', 'Imposto adicionado!');
            setNewTaxName('');
            setNewTaxRate('');
            setShowTaxForm(false);
            loadSettings();
        } catch (error) {
            console.error(error);
            Alert.alert('Erro', 'Falha ao salvar imposto');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteTax = (id: string) => {
        Alert.alert('Excluir', 'Remover este imposto?', [
            { text: 'Cancelar' },
            {
                text: 'Excluir', style: 'destructive', onPress: async () => {
                    try {
                        await settingsService.deleteTax(id);
                        loadSettings();
                    } catch (error) {
                        Alert.alert('Erro', 'Falha ao excluir imposto');
                    }
                }
            }
        ]);
    };

    const handleSaveFee = async () => {
        try {
            if (!feeRate) {
                Alert.alert('Erro', 'Informe a taxa percentual');
                return;
            }

            setSaving(true);
            const rate = parseFloat(feeRate.replace(',', '.'));
            const anticipationRate = feeAnticipationRate ? parseFloat(feeAnticipationRate.replace(',', '.')) : null;
            const installments = parseInt(feeInstallments);

            // Force installments to 1 for debit to ensure consistency
            const finalInstallments = feeType === 'debit' ? 1 : installments;

            await settingsService.saveCardFee({
                brand: feeBrand,
                payment_type: feeType,
                installments: finalInstallments,
                rate,
                anticipation_rate: anticipationRate,
                id: editingFee?.id // Pass ID if editing to help debugging, though upsert uses unique keys
            });

            setShowFeeModal(false);
            await loadSettings(); // Wait for reload
        } catch (error) {
            console.error('Save error:', error);
            Alert.alert('Erro', 'Falha ao salvar regra de cartão. Verifique os dados.');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteFee = async (id: string) => {
        Alert.alert('Excluir', 'Deseja remover esta regra?', [
            { text: 'Cancelar' },
            {
                text: 'Excluir', style: 'destructive', onPress: async () => {
                    try {
                        await settingsService.deleteCardFee(id);
                        loadSettings();
                    } catch (error) {
                        Alert.alert('Erro', 'Falha ao excluir');
                    }
                }
            }
        ]);
    };

    const openFeeModal = (fee?: CardFeeConfig) => {
        if (fee) {
            setEditingFee(fee);
            setFeeBrand(fee.brand);
            setFeeType(fee.payment_type as 'credit' | 'debit');
            setFeeInstallments(fee.installments.toString());
            setFeeRate(fee.rate.toString());
            setFeeAnticipationRate(fee.anticipation_rate?.toString() || '');
        } else {
            setEditingFee(null);
            setFeeBrand('visa');
            setFeeType('credit');
            setFeeInstallments('1');
            setFeeRate('');
            setFeeAnticipationRate('');
        }
        setShowFeeModal(true);
    };

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            <View className="flex-row items-center px-4 py-4 bg-white border-b border-gray-100">
                <TouchableOpacity onPress={() => onBack?.()} className="mr-4">
                    <ArrowLeft size={24} color="#0D9488" />
                </TouchableOpacity>
                <Text className="text-lg font-semibold text-gray-900">Configurações Financeiras</Text>
            </View>

            {loading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#0D9488" />
                </View>
            ) : (
                <ScrollView className="flex-1 p-4">

                    {/* Tax Settings - Multiple Taxes */}
                    <View className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-6">
                        <View className="p-5 border-b border-gray-100 flex-row justify-between items-center">
                            <View className="flex-row items-center gap-2">
                                <Percent size={20} color="#0D9488" />
                                <Text className="text-base font-bold text-gray-900">Impostos</Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => setShowTaxForm(!showTaxForm)}
                                className="bg-teal-500 p-2 rounded-lg"
                            >
                                <Plus size={20} color="white" />
                            </TouchableOpacity>
                        </View>

                        {/* Add Tax Form */}
                        {showTaxForm && (
                            <View className="p-4 border-b border-gray-100 bg-teal-50">
                                <Text className="text-sm font-medium text-gray-700 mb-2">Novo Imposto</Text>
                                <View className="flex-row gap-2 mb-3">
                                    <TextInput
                                        className="flex-1 bg-white border border-gray-200 rounded-lg px-4 py-3"
                                        placeholder="Nome (ex: ISS, IRPJ)"
                                        value={newTaxName}
                                        onChangeText={setNewTaxName}
                                    />
                                    <View className="w-24 bg-white border border-gray-200 rounded-lg flex-row items-center px-2">
                                        <TextInput
                                            className="flex-1 py-3 text-center"
                                            placeholder="0.00"
                                            value={newTaxRate}
                                            onChangeText={setNewTaxRate}
                                            keyboardType="numeric"
                                        />
                                        <Text className="text-gray-500">%</Text>
                                    </View>
                                </View>
                                <TouchableOpacity
                                    onPress={handleAddTax}
                                    disabled={saving}
                                    className="bg-teal-500 rounded-lg py-3 items-center"
                                >
                                    {saving ? (
                                        <ActivityIndicator color="white" />
                                    ) : (
                                        <Text className="text-white font-medium">Adicionar Imposto</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Taxes List */}
                        {taxes.length === 0 ? (
                            <View className="p-6 items-center">
                                <Text className="text-gray-400">Nenhum imposto configurado</Text>
                            </View>
                        ) : (
                            <View className="p-4">
                                {taxes.map(tax => (
                                    <View key={tax.id} className="flex-row items-center justify-between py-3 border-b border-gray-100">
                                        <View className="flex-row items-center gap-3">
                                            <Text className="font-medium text-gray-800">{tax.name}</Text>
                                            <Text className="text-red-600 font-semibold">{tax.rate}%</Text>
                                        </View>
                                        <TouchableOpacity onPress={() => handleDeleteTax(tax.id)}>
                                            <Trash2 size={18} color="#ef4444" />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                                <View className="flex-row justify-end pt-3">
                                    <Text className="text-gray-500">Total: <Text className="font-bold text-red-600">{taxes.reduce((sum, t) => sum + t.rate, 0).toFixed(2)}%</Text></Text>
                                </View>
                            </View>
                        )}
                    </View>
                    <View className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-6">
                        <View className="p-5 border-b border-gray-100 flex-row justify-between items-center bg-blue-50">
                            <View className="flex-row items-center gap-2">
                                <Tag size={20} color="#1d4ed8" />
                                <Text className="text-base font-bold text-blue-900">Bandeiras de Cartão</Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => setShowBrandForm(!showBrandForm)}
                                className="bg-blue-500 p-2 rounded-lg"
                            >
                                <Plus size={20} color="white" />
                            </TouchableOpacity>
                        </View>

                        {showBrandForm && (
                            <View className="p-4 border-b border-gray-100 bg-blue-50/50">
                                <Text className="text-sm font-medium text-gray-700 mb-2">Nova Bandeira</Text>
                                <View className="flex-row gap-2">
                                    <TextInput
                                        className="flex-1 bg-white border border-gray-200 rounded-lg px-4 py-3"
                                        placeholder="Nome da bandeira"
                                        value={newBrandName}
                                        onChangeText={setNewBrandName}
                                    />
                                    <TouchableOpacity
                                        onPress={async () => {
                                            if (!newBrandName.trim()) {
                                                Alert.alert('Erro', 'Informe o nome da bandeira');
                                                return;
                                            }
                                            try {
                                                await settingsService.addCardBrand(newBrandName.trim());
                                                setNewBrandName('');
                                                setShowBrandForm(false);
                                                loadSettings();
                                                Alert.alert('Sucesso', 'Bandeira adicionada!');
                                            } catch (error: any) {
                                                Alert.alert('Erro', error.message || 'Falha ao adicionar');
                                            }
                                        }}
                                        className="bg-blue-500 px-4 rounded-lg justify-center"
                                    >
                                        <Text className="text-white font-medium">Adicionar</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        <View className="p-4">
                            <View className="flex-row flex-wrap gap-2">
                                {cardBrands.map(brand => (
                                    <View
                                        key={brand.id}
                                        className="flex-row items-center bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 gap-2"
                                    >
                                        <Text className="text-gray-900">{brand.name}</Text>
                                        <TouchableOpacity
                                            onPress={() => {
                                                Alert.alert(
                                                    'Excluir Bandeira',
                                                    `Deseja remover "${brand.name}"?`,
                                                    [
                                                        { text: 'Cancelar' },
                                                        {
                                                            text: 'Excluir',
                                                            style: 'destructive',
                                                            onPress: async () => {
                                                                try {
                                                                    await settingsService.deleteCardBrand(brand.id);
                                                                    loadSettings();
                                                                } catch (error) {
                                                                    Alert.alert('Erro', 'Falha ao excluir');
                                                                }
                                                            }
                                                        }
                                                    ]
                                                );
                                            }}
                                        >
                                            <X size={16} color="#EF4444" />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </View>
                            {cardBrands.length === 0 && (
                                <Text className="text-gray-400 text-center italic">Nenhuma bandeira cadastrada</Text>
                            )}
                        </View>
                    </View>

                    {/* Card Fees Settings */}
                    <View className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-8">
                        <View className="p-5 border-b border-gray-100 flex-row justify-between items-center bg-teal-50">
                            <View className="flex-row items-center gap-2">
                                <CreditCard size={20} color="#0f766e" />
                                <Text className="text-base font-bold text-teal-900">Taxas de Cartão</Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => openFeeModal()}
                                className="bg-teal-500 p-2 rounded-lg"
                            >
                                <Plus size={20} color="white" />
                            </TouchableOpacity>
                        </View>

                        {/* Filters */}
                        <View className="px-4 py-3 bg-white border-b border-gray-100">
                            {/* Type Filter */}
                            <View className="flex-row gap-2 mb-3">
                                {['all', 'credit', 'debit'].map(type => (
                                    <TouchableOpacity
                                        key={type}
                                        onPress={() => setFilterType(type as any)}
                                        className={`px-3 py-1.5 rounded-full border ${filterType === type
                                            ? 'bg-teal-50 border-teal-200'
                                            : 'bg-white border-gray-200'
                                            }`}
                                    >
                                        <Text className={`text-xs font-medium capitalize ${filterType === type ? 'text-teal-700' : 'text-gray-600'
                                            }`}>
                                            {type === 'all' ? 'Todos os Tipos' : type === 'credit' ? 'Crédito' : 'Débito'}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Brand Filter */}
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                                <TouchableOpacity
                                    onPress={() => setFilterBrand('all')}
                                    className={`mr-2 px-3 py-1.5 rounded-full border ${filterBrand === 'all' ? 'bg-teal-50 border-teal-200' : 'bg-white border-gray-200'
                                        }`}
                                >
                                    <Text className={`text-xs font-medium ${filterBrand === 'all' ? 'text-teal-700' : 'text-gray-600'}`}>
                                        Todas
                                    </Text>
                                </TouchableOpacity>
                                {Array.from(new Set(cardFees.map(f => f.brand))).sort().map(brand => (
                                    <TouchableOpacity
                                        key={brand}
                                        onPress={() => setFilterBrand(brand)}
                                        className={`mr-2 px-3 py-1.5 rounded-full border ${filterBrand === brand ? 'bg-teal-50 border-teal-200' : 'bg-white border-gray-200'
                                            }`}
                                    >
                                        <Text className={`text-xs font-medium capitalize ${filterBrand === brand ? 'text-teal-700' : 'text-gray-600'}`}>
                                            {brand === 'others' ? 'Outras' : brand}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        <View className="p-4">
                            {cardFees.length === 0 ? (
                                <Text className="text-gray-400 text-center italic py-4">Nenhuma taxa cadastrada</Text>
                            ) : (
                                <View className="gap-2">
                                    <View className="flex-row px-2 mb-1">
                                        <Text className="flex-1 text-xs text-gray-500 font-bold">BANDEIRA</Text>
                                        <Text className="w-20 text-xs text-gray-500 font-bold text-center">TIPO</Text>
                                        <Text className="w-20 text-xs text-gray-500 font-bold text-center">PARCELAS</Text>
                                        <Text className="w-16 text-xs text-gray-500 font-bold text-right">TAXA</Text>
                                    </View>
                                    {cardFees
                                        .filter(fee => {
                                            if (filterBrand !== 'all' && fee.brand !== filterBrand) return false;
                                            if (filterType !== 'all' && fee.payment_type !== filterType) return false;
                                            return true;
                                        })
                                        .sort((a, b) => a.brand.localeCompare(b.brand) || a.installments - b.installments)
                                        .map((fee) => (
                                            <TouchableOpacity
                                                key={fee.id}
                                                onPress={() => setSelectedFeeForDetails(fee)}
                                                className="flex-row items-center bg-gray-50 p-3 rounded-lg border border-gray-100"
                                                activeOpacity={0.7}
                                            >
                                                <Text className="flex-1 font-medium capitalize text-gray-900">
                                                    {fee.brand === 'others' ? 'Outras' : fee.brand}
                                                </Text>
                                                <Text className="w-20 text-center text-xs text-gray-600 bg-white border border-gray-200 py-1 rounded capitalize">
                                                    {fee.payment_type === 'credit' ? 'Crédito' : 'Débito'}
                                                </Text>
                                                <Text className="w-20 text-center text-gray-900">
                                                    {fee.installments}x
                                                </Text>
                                                <Text className="w-16 text-right font-bold text-red-500">
                                                    {fee.rate}%
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                </View>
                            )}
                        </View>
                    </View>
                </ScrollView>
            )}

            {/* Fee Modal - Using inline overlay instead of Modal to avoid navigation context issues */}
            {showFeeModal && (
                <View className="absolute inset-0 z-50">
                    <TouchableOpacity
                        className="absolute inset-0 bg-black/30"
                        activeOpacity={1}
                        onPress={() => setShowFeeModal(false)}
                    />
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        className="flex-1 justify-end"
                        pointerEvents="box-none"
                    >
                        <View className="bg-white rounded-t-3xl p-6">
                            <View className="flex-row justify-between items-center mb-6">
                                <Text className="text-xl font-bold text-gray-900">Nova Regra de Taxa</Text>
                                <TouchableOpacity onPress={() => setShowFeeModal(false)} className="bg-gray-100 p-2 rounded-full">
                                    <X size={20} color="#374151" />
                                </TouchableOpacity>
                            </View>

                            <View className="flex-row gap-4 mb-4">
                                <View className="flex-1">
                                    <Text className="text-sm font-medium text-gray-700 mb-2">Bandeira</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                        <View className="flex-row gap-2">
                                            {cardBrands.map(b => (
                                                <TouchableOpacity
                                                    key={b.id}
                                                    onPress={() => setFeeBrand(b.name.toLowerCase())}
                                                    className={`px-3 py-2 rounded-lg border ${feeBrand === b.name.toLowerCase() ? 'bg-teal-500 border-teal-500' : 'bg-white border-gray-200'}`}
                                                >
                                                    <Text className={`${feeBrand === b.name.toLowerCase() ? 'text-white' : 'text-gray-700'}`}>{b.name}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </ScrollView>
                                </View>
                            </View>

                            <View className="flex-row gap-4 mb-4">
                                <View className="flex-1">
                                    <Text className="text-sm font-medium text-gray-700 mb-2">Tipo</Text>
                                    <View className="flex-row bg-gray-100 p-1 rounded-lg">
                                        <TouchableOpacity
                                            onPress={() => setFeeType('credit')}
                                            style={{
                                                flex: 1,
                                                paddingVertical: 8,
                                                alignItems: 'center',
                                                borderRadius: 6,
                                                backgroundColor: feeType === 'credit' ? '#fff' : 'transparent',
                                                shadowColor: feeType === 'credit' ? '#000' : 'transparent',
                                                shadowOpacity: feeType === 'credit' ? 0.1 : 0,
                                                shadowRadius: 2,
                                                elevation: feeType === 'credit' ? 2 : 0,
                                            }}
                                        >
                                            <Text style={{
                                                fontWeight: feeType === 'credit' ? 'bold' : 'normal',
                                                color: feeType === 'credit' ? '#0D9488' : '#6B7280'
                                            }}>Crédito</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => setFeeType('debit')}
                                            style={{
                                                flex: 1,
                                                paddingVertical: 8,
                                                alignItems: 'center',
                                                borderRadius: 6,
                                                backgroundColor: feeType === 'debit' ? '#fff' : 'transparent',
                                                shadowColor: feeType === 'debit' ? '#000' : 'transparent',
                                                shadowOpacity: feeType === 'debit' ? 0.1 : 0,
                                                shadowRadius: 2,
                                                elevation: feeType === 'debit' ? 2 : 0,
                                            }}
                                        >
                                            <Text style={{
                                                fontWeight: feeType === 'debit' ? 'bold' : 'normal',
                                                color: feeType === 'debit' ? '#0D9488' : '#6B7280'
                                            }}>Débito</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {feeType === 'credit' && (
                                    <View className="w-24">
                                        <Text className="text-sm font-medium text-gray-700 mb-2">Parcelas</Text>
                                        <TextInput
                                            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-3 text-center"
                                            value={feeInstallments}
                                            onChangeText={setFeeInstallments}
                                            keyboardType="numeric"
                                        />
                                    </View>
                                )}
                            </View>

                            <View className="mb-4">
                                <Text className="text-sm font-medium text-gray-700 mb-2">Taxa Normal (%)</Text>
                                <TextInput
                                    className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-3 text-lg font-bold text-gray-900"
                                    value={feeRate}
                                    onChangeText={setFeeRate}
                                    keyboardType="numeric"
                                    placeholder="0.00"
                                />
                                <Text className="text-xs text-gray-500 mt-1">Taxa para receber no prazo padrão</Text>
                            </View>

                            <View className="mb-6">
                                <Text className="text-sm font-medium text-gray-700 mb-2">Taxa de Antecipação (%)</Text>
                                <TextInput
                                    className="bg-gray-50 border border-amber-200 rounded-lg px-3 py-3 text-lg font-bold text-gray-900"
                                    value={feeAnticipationRate}
                                    onChangeText={setFeeAnticipationRate}
                                    keyboardType="numeric"
                                    placeholder="0.00"
                                />
                                <Text className="text-xs text-gray-500 mt-1">Taxa para antecipar o recebimento</Text>
                            </View>

                            <TouchableOpacity
                                onPress={handleSaveFee}
                                disabled={saving}
                                className="bg-teal-500 rounded-xl py-4 items-center"
                            >
                                {saving ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <Text className="text-white font-bold text-lg">Salvar Regra</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            )}

            {/* Fee Detail Modal */}
            {selectedFeeForDetails && (
                <View className="absolute inset-0 z-50">
                    <TouchableOpacity
                        className="absolute inset-0 bg-black/40"
                        activeOpacity={1}
                        onPress={() => setSelectedFeeForDetails(null)}
                    />
                    <View className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6">
                        <View className="w-12 h-1 bg-gray-300 rounded-full self-center mb-4" />

                        <Text className="text-xl font-bold text-gray-900 mb-6 text-center">
                            Detalhes da Taxa
                        </Text>

                        <View className="space-y-4 mb-6">
                            <View className="flex-row justify-between py-3 border-b border-gray-100">
                                <Text className="text-gray-500">Bandeira</Text>
                                <Text className="font-semibold text-gray-900 capitalize">
                                    {selectedFeeForDetails.brand === 'others' ? 'Outras Bandeiras' : selectedFeeForDetails.brand}
                                </Text>
                            </View>
                            <View className="flex-row justify-between py-3 border-b border-gray-100">
                                <Text className="text-gray-500">Tipo</Text>
                                <Text className="font-semibold text-gray-900">
                                    {selectedFeeForDetails.payment_type === 'credit' ? 'Crédito' : 'Débito'}
                                </Text>
                            </View>
                            <View className="flex-row justify-between py-3 border-b border-gray-100">
                                <Text className="text-gray-500">Parcelas</Text>
                                <Text className="font-semibold text-gray-900">
                                    {selectedFeeForDetails.installments}x
                                </Text>
                            </View>
                            <View className="flex-row justify-between py-3 border-b border-gray-100">
                                <Text className="text-gray-500">Taxa Normal</Text>
                                <Text className="font-bold text-red-600 text-lg">
                                    {selectedFeeForDetails.rate}%
                                </Text>
                            </View>
                            <View className="flex-row justify-between py-3">
                                <Text className="text-gray-500">Taxa de Antecipação</Text>
                                <Text className="font-bold text-amber-600 text-lg">
                                    {selectedFeeForDetails.anticipation_rate ? `${selectedFeeForDetails.anticipation_rate}%` : 'Não definida'}
                                </Text>
                            </View>
                        </View>

                        <View className="flex-row gap-3">
                            <TouchableOpacity
                                onPress={() => {
                                    const feeId = selectedFeeForDetails.id;
                                    setSelectedFeeForDetails(null);
                                    handleDeleteFee(feeId);
                                }}
                                className="flex-1 bg-red-50 border border-red-200 rounded-xl py-4 items-center flex-row justify-center gap-2"
                            >
                                <Trash2 size={18} color="#EF4444" />
                                <Text className="text-red-600 font-semibold">Excluir</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setSelectedFeeForDetails(null)}
                                className="flex-1 bg-gray-100 rounded-xl py-4 items-center"
                            >
                                <Text className="text-gray-700 font-semibold">Fechar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            )}
        </SafeAreaView>
    );
}
