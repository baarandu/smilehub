import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { ArrowLeft, CreditCard, Plus } from 'lucide-react-native';
import { settingsService } from '../../services/settings';
import { CardFeeConfig } from '../../types/database';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TaxSection } from './TaxSection';
import { CardBrandSection } from './CardBrandSection';
import { CardFeeModal } from './CardFeeModal';
import { FeeDetailModal } from './FeeDetailModal';

interface Props {
    onBack?: () => void;
}

export default function FinancialSettingsScreen({ onBack }: Props) {
    const [loading, setLoading] = useState(true);
    const [taxes, setTaxes] = useState<{ id: string; name: string; rate: number }[]>([]);
    const [cardFees, setCardFees] = useState<CardFeeConfig[]>([]);
    const [cardBrands, setCardBrands] = useState<{ id: string; name: string; is_default: boolean }[]>([]);
    const [filterBrand, setFilterBrand] = useState('all');
    const [filterType, setFilterType] = useState<'all' | 'credit' | 'debit'>('all');
    const [showFeeModal, setShowFeeModal] = useState(false);
    const [editingFee, setEditingFee] = useState<CardFeeConfig | null>(null);
    const [selectedFeeForDetails, setSelectedFeeForDetails] = useState<CardFeeConfig | null>(null);

    useEffect(() => { loadSettings(); }, []);

    const loadSettings = async () => {
        try {
            setLoading(true);
            const [fees, brands, loadedTaxes] = await Promise.all([
                settingsService.getCardFees(),
                settingsService.getCardBrands(),
                settingsService.getTaxes()
            ]);
            setCardFees(fees || []);
            setCardBrands(brands || []);
            setTaxes(loadedTaxes || []);
        } catch (error) {
            Alert.alert('Erro', 'Falha ao carregar configurações');
        } finally {
            setLoading(false);
        }
    };

    const openFeeModal = (fee?: CardFeeConfig) => {
        setEditingFee(fee || null);
        setShowFeeModal(true);
    };

    const filteredFees = cardFees.filter(fee => {
        if (filterBrand !== 'all' && fee.brand !== filterBrand) return false;
        if (filterType !== 'all' && fee.payment_type !== filterType) return false;
        return true;
    }).sort((a, b) => a.brand.localeCompare(b.brand) || a.installments - b.installments);

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            <View className="flex-row items-center px-4 py-4 bg-white border-b border-gray-100">
                <TouchableOpacity onPress={() => onBack?.()} className="mr-4"><ArrowLeft size={24} color="#0D9488" /></TouchableOpacity>
                <Text className="text-lg font-semibold text-gray-900">Configurações Financeiras</Text>
            </View>

            {loading ? (
                <View className="flex-1 items-center justify-center"><ActivityIndicator size="large" color="#0D9488" /></View>
            ) : (
                <ScrollView className="flex-1 p-4">
                    <TaxSection taxes={taxes} onRefresh={loadSettings} />
                    <CardBrandSection brands={cardBrands} onRefresh={loadSettings} />

                    {/* Card Fees Section */}
                    <View className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-8">
                        <View className="p-5 border-b border-gray-100 flex-row justify-between items-center bg-teal-50">
                            <View className="flex-row items-center gap-2">
                                <CreditCard size={20} color="#0f766e" />
                                <Text className="text-base font-bold text-teal-900">Taxas de Cartão</Text>
                            </View>
                            <TouchableOpacity onPress={() => openFeeModal()} className="bg-teal-500 p-2 rounded-lg">
                                <Plus size={20} color="white" />
                            </TouchableOpacity>
                        </View>

                        {/* Filters */}
                        <View className="px-4 py-3 bg-white border-b border-gray-100">
                            <View className="flex-row gap-2 mb-3">
                                {['all', 'credit', 'debit'].map(type => (
                                    <TouchableOpacity key={type} onPress={() => setFilterType(type as any)} className={`px-3 py-1.5 rounded-full border ${filterType === type ? 'bg-teal-50 border-teal-200' : 'bg-white border-gray-200'}`}>
                                        <Text className={`text-xs font-medium ${filterType === type ? 'text-teal-700' : 'text-gray-600'}`}>
                                            {type === 'all' ? 'Todos os Tipos' : type === 'credit' ? 'Crédito' : 'Débito'}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                                <TouchableOpacity onPress={() => setFilterBrand('all')} className={`mr-2 px-3 py-1.5 rounded-full border ${filterBrand === 'all' ? 'bg-teal-50 border-teal-200' : 'bg-white border-gray-200'}`}>
                                    <Text className={`text-xs font-medium ${filterBrand === 'all' ? 'text-teal-700' : 'text-gray-600'}`}>Todas</Text>
                                </TouchableOpacity>
                                {Array.from(new Set(cardFees.map(f => f.brand))).sort().map(brand => (
                                    <TouchableOpacity key={brand} onPress={() => setFilterBrand(brand)} className={`mr-2 px-3 py-1.5 rounded-full border ${filterBrand === brand ? 'bg-teal-50 border-teal-200' : 'bg-white border-gray-200'}`}>
                                        <Text className={`text-xs font-medium capitalize ${filterBrand === brand ? 'text-teal-700' : 'text-gray-600'}`}>{brand === 'others' ? 'Outras' : brand}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        <View className="p-4">
                            {filteredFees.length === 0 ? (
                                <Text className="text-gray-400 text-center italic py-4">Nenhuma taxa cadastrada</Text>
                            ) : (
                                <View className="gap-2">
                                    <View className="flex-row px-2 mb-1">
                                        <Text className="flex-1 text-xs text-gray-500 font-bold">BANDEIRA</Text>
                                        <Text className="w-20 text-xs text-gray-500 font-bold text-center">TIPO</Text>
                                        <Text className="w-20 text-xs text-gray-500 font-bold text-center">PARCELAS</Text>
                                        <Text className="w-16 text-xs text-gray-500 font-bold text-right">TAXA</Text>
                                    </View>
                                    {filteredFees.map(fee => (
                                        <TouchableOpacity key={fee.id} onPress={() => setSelectedFeeForDetails(fee)} className="flex-row items-center bg-gray-50 p-3 rounded-lg border border-gray-100" activeOpacity={0.7}>
                                            <Text className="flex-1 font-medium capitalize text-gray-900">{fee.brand === 'others' ? 'Outras' : fee.brand}</Text>
                                            <Text className="w-20 text-center text-xs text-gray-600 bg-white border border-gray-200 py-1 rounded capitalize">{fee.payment_type === 'credit' ? 'Crédito' : 'Débito'}</Text>
                                            <Text className="w-20 text-center text-gray-900">{fee.installments}x</Text>
                                            <Text className="w-16 text-right font-bold text-red-500">{fee.rate}%</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </View>
                    </View>
                </ScrollView>
            )}

            <CardFeeModal visible={showFeeModal} onClose={() => setShowFeeModal(false)} onSave={loadSettings} cardBrands={cardBrands} editingFee={editingFee} />
            <FeeDetailModal fee={selectedFeeForDetails} onClose={() => setSelectedFeeForDetails(null)} onRefresh={loadSettings} />
        </SafeAreaView>
    );
}
