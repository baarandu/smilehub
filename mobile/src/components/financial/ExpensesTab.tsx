import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { TrendingDown, ArrowDownRight, MapPin, Filter, CreditCard, Receipt, Package, Eye } from 'lucide-react-native';
import { FinancialTransaction } from '../../types/database';
import { locationsService, Location } from '../../services/locations';
import { supabase } from '../../lib/supabase';
import { useState, useMemo, useEffect } from 'react';
import { ExpenseFilterModal, FilterState } from './ExpenseFilterModal';
import { ExpenseDetailModal } from './ExpenseDetailModal';
import { formatCurrency as formatCurrencyUtil } from '../../utils/expense';
import { formatDate } from '../../utils/financial';
import { SwipeableTransactionItem } from './SwipeableTransactionItem';
import { financialService } from '../../services/financial';

interface ExpensesTabProps {
    transactions: FinancialTransaction[];
    loading: boolean;
    onEdit: (transaction: FinancialTransaction) => void;
    onRefresh: () => void;
    refreshing?: boolean;
}

const INITIAL_FILTERS: FilterState = { description: '', startDate: '', endDate: '', categories: [], locations: [] };

export function ExpensesTab({ transactions, loading, onEdit, onRefresh, refreshing }: ExpensesTabProps) {
    const [filterModalVisible, setFilterModalVisible] = useState(false);
    const [activeFilters, setActiveFilters] = useState<FilterState>(INITIAL_FILTERS);
    const [tempFilters, setTempFilters] = useState<FilterState>(INITIAL_FILTERS);
    const [selectedExpense, setSelectedExpense] = useState<FinancialTransaction | null>(null);
    const [detailModalVisible, setDetailModalVisible] = useState(false);
    const [materialItems, setMaterialItems] = useState<any[]>([]);
    const [loadingMaterialItems, setLoadingMaterialItems] = useState(false);
    const [availableLocations, setAvailableLocations] = useState<Location[]>([]);

    useEffect(() => { loadLocations(); }, []);

    const loadLocations = async () => {
        try { setAvailableLocations(await locationsService.getAll()); } catch (e) { console.error(e); }
    };

    const expenseTransactions = transactions.filter(t => t.type === 'expense');
    const incomeTransactions = transactions.filter(t => t.type === 'income');

    const automaticDeductions = useMemo(() => {
        const cardFees = incomeTransactions.reduce((sum, t) => sum + ((t as any).card_fee_amount || 0), 0);
        const taxes = incomeTransactions.reduce((sum, t) => sum + ((t as any).tax_amount || 0), 0);
        const locationFees = incomeTransactions.reduce((sum, t) => sum + ((t as any).location_amount || 0), 0);
        const locationBreakdown: Record<string, number> = {};
        incomeTransactions.forEach(t => {
            const locAmount = (t as any).location_amount || 0;
            if (t.location && locAmount > 0) locationBreakdown[t.location] = (locationBreakdown[t.location] || 0) + locAmount;
        });
        return { cardFees, taxes, locationFees, locationBreakdown, total: cardFees + taxes + locationFees };
    }, [incomeTransactions]);

    const uniqueCategories = useMemo(() => Array.from(new Set(expenseTransactions.map(t => t.category).filter(Boolean) as string[])).sort(), [expenseTransactions]);
    const uniqueLocations = useMemo(() => availableLocations.length > 0 ? availableLocations.map(l => l.name).sort() : Array.from(new Set(expenseTransactions.map(t => t.location).filter(Boolean) as string[])).sort(), [expenseTransactions, availableLocations]);

    const filteredExpenses = useMemo(() => expenseTransactions.filter(t => {
        if (activeFilters.description && !t.description.toLowerCase().includes(activeFilters.description.toLowerCase())) return false;
        const tDate = new Date(t.date); tDate.setHours(0, 0, 0, 0);
        if (activeFilters.startDate) { const [d, m, y] = activeFilters.startDate.split('/'); if (d && m && y && tDate < new Date(parseInt(y), parseInt(m) - 1, parseInt(d))) return false; }
        if (activeFilters.endDate) { const [d, m, y] = activeFilters.endDate.split('/'); if (d && m && y && tDate > new Date(parseInt(y), parseInt(m) - 1, parseInt(d))) return false; }
        if (activeFilters.categories.length > 0 && !activeFilters.categories.includes(t.category || '')) return false;
        if (activeFilters.locations.length > 0 && (!t.location || !activeFilters.locations.includes(t.location))) return false;
        return true;
    }), [expenseTransactions, activeFilters]);

    const totalManualExpenses = filteredExpenses.reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = totalManualExpenses + automaticDeductions.total;
    const activeFilterCount = (activeFilters.description ? 1 : 0) + (activeFilters.startDate || activeFilters.endDate ? 1 : 0) + (activeFilters.categories.length > 0 ? 1 : 0) + (activeFilters.locations.length > 0 ? 1 : 0);

    const formatCurrency = (value: number) => `R$ ${formatCurrencyUtil(value)}`;

    const expensesByCategory = filteredExpenses.reduce((acc, t) => { const cat = t.category || 'Outros'; acc[cat] = (acc[cat] || 0) + t.amount; return acc; }, {} as Record<string, number>);

    const handleExpensePress = async (transaction: FinancialTransaction) => {
        setSelectedExpense(transaction);
        setDetailModalVisible(true);
        if (transaction.category === 'Materiais' && (transaction as any).related_entity_id) {
            setLoadingMaterialItems(true);
            try {
                const { data: order } = await (supabase.from('shopping_orders') as any).select('items').eq('id', (transaction as any).related_entity_id).single();
                if (order?.items) setMaterialItems(order.items as any[]);
            } catch (e) { console.error(e); } finally { setLoadingMaterialItems(false); }
        } else { setMaterialItems([]); }
    };

    const handleEditExpense = (transaction: FinancialTransaction) => {
        onEdit(transaction);
    };

    const handleDeleteExpense = (transaction: FinancialTransaction) => {
        Alert.alert(
            'Excluir Despesa',
            `Tem certeza que deseja excluir "${transaction.description}"?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Excluir',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            if (transaction.category === 'Materiais' && (transaction as any).related_entity_id) {
                                await financialService.deleteExpenseAndRevertMaterials(transaction.id);
                            } else {
                                await financialService.delete(transaction.id);
                            }
                            onRefresh();
                        } catch (error: any) {
                            Alert.alert('Erro', error?.message || 'Não foi possível excluir a despesa.');
                        }
                    },
                },
            ]
        );
    };

    return (
        <View className="flex-1">
            <View className="flex-row items-center justify-end px-4 mt-4 mb-2">
                <TouchableOpacity onPress={() => { setTempFilters(activeFilters); setFilterModalVisible(true); }} className={`p-2 rounded-lg border ${activeFilterCount > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
                    <View className="flex-row items-center gap-2">
                        <Filter size={18} color={activeFilterCount > 0 ? '#EF4444' : '#6b7280'} />
                        <Text className={`text-sm font-medium ${activeFilterCount > 0 ? 'text-red-600' : 'text-gray-600'}`}>Filtros</Text>
                        {activeFilterCount > 0 && <View className="bg-red-500 rounded-full w-5 h-5 items-center justify-center"><Text className="text-white text-[10px] font-bold">{activeFilterCount}</Text></View>}
                    </View>
                </TouchableOpacity>
            </View>

            <ScrollView className="flex-1 px-4 py-2" showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing || false} onRefresh={onRefresh} colors={['#EF4444']} tintColor="#EF4444" />}>
                <View className="flex-row gap-3 mb-4">
                    <View className="flex-1 bg-white p-3 rounded-xl border border-red-100"><Text className="text-gray-500 text-xs">Manuais</Text><Text className="text-xl font-bold text-red-500 mt-1">{formatCurrency(totalManualExpenses)}</Text></View>
                    <View className="flex-1 bg-white p-3 rounded-xl border border-orange-100"><Text className="text-gray-500 text-xs">Automáticas</Text><Text className="text-xl font-bold text-orange-500 mt-1">{formatCurrency(automaticDeductions.total)}</Text></View>
                </View>

                <View className="bg-white p-4 rounded-xl border border-red-200 mb-6 shadow-sm">
                    <View className="flex-row justify-between items-center">
                        <View><Text className="text-gray-500 text-sm">Total de Despesas</Text><Text className="text-3xl font-bold text-red-600 mt-1">{formatCurrency(totalExpenses)}</Text></View>
                        <View className="w-12 h-12 bg-red-100 rounded-xl items-center justify-center"><TrendingDown size={24} color="#DC2626" /></View>
                    </View>
                </View>

                {automaticDeductions.total > 0 && (
                    <View className="mb-6">
                        <Text className="text-sm font-semibold text-orange-700 mb-3">Descontos Automáticos (Taxas e Impostos)</Text>
                        <View className="gap-2">
                            {automaticDeductions.cardFees > 0 && (
                                <View className="bg-white p-3 rounded-xl border border-orange-100 flex-row items-center justify-between">
                                    <View className="flex-row items-center gap-3"><View className="w-10 h-10 bg-blue-100 rounded-lg items-center justify-center"><CreditCard size={18} color="#2563EB" /></View><View><Text className="font-medium text-gray-900">Taxa de Cartão</Text><Text className="text-xs text-gray-500">Débito/Crédito</Text></View></View>
                                    <Text className="font-bold text-red-600">- {formatCurrency(automaticDeductions.cardFees)}</Text>
                                </View>
                            )}
                            {automaticDeductions.taxes > 0 && (
                                <View className="bg-white p-3 rounded-xl border border-orange-100 flex-row items-center justify-between">
                                    <View className="flex-row items-center gap-3"><View className="w-10 h-10 bg-purple-100 rounded-lg items-center justify-center"><Receipt size={18} color="#7C3AED" /></View><View><Text className="font-medium text-gray-900">Impostos</Text><Text className="text-xs text-gray-500">Retenção na fonte</Text></View></View>
                                    <Text className="font-bold text-red-600">- {formatCurrency(automaticDeductions.taxes)}</Text>
                                </View>
                            )}
                            {Object.entries(automaticDeductions.locationBreakdown).map(([location, amount]) => (
                                <View key={location} className="bg-white p-3 rounded-xl border border-orange-100 flex-row items-center justify-between">
                                    <View className="flex-row items-center gap-3"><View className="w-10 h-10 bg-teal-100 rounded-lg items-center justify-center"><MapPin size={18} color="#0D9488" /></View><View><Text className="font-medium text-gray-900">Taxa do Local</Text><Text className="text-xs text-gray-500">{location}</Text></View></View>
                                    <Text className="font-bold text-red-600">- {formatCurrency(amount)}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {Object.keys(expensesByCategory).length > 0 && (
                    <View className="mb-6">
                        <Text className="text-sm font-semibold text-gray-700 mb-3">Despesas por Categoria</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-3">
                            {Object.entries(expensesByCategory).map(([cat, amount]: [string, number]) => (
                                <View key={cat} className="bg-white p-3 rounded-lg border border-gray-100 mr-2 min-w-[120px]"><Text className="text-xs text-gray-500 mb-1" numberOfLines={1}>{cat}</Text><Text className="text-lg font-bold text-red-600">{formatCurrency(amount)}</Text></View>
                            ))}
                        </ScrollView>
                    </View>
                )}

                <Text className="text-sm font-semibold text-gray-700 mb-3">Despesas ({filteredExpenses.length})</Text>
                <View className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-8">
                    {filteredExpenses.length === 0 ? (
                        <View className="p-8 items-center"><Text className="text-gray-400 italic">Nenhuma despesa encontrada</Text></View>
                    ) : (
                        filteredExpenses.slice().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((transaction) => (
                            <SwipeableTransactionItem
                                key={transaction.id}
                                transaction={transaction}
                                onPress={() => handleExpensePress(transaction)}
                                onEdit={() => handleEditExpense(transaction)}
                                onDelete={() => handleDeleteExpense(transaction)}
                            >
                                <View className="p-4 border-b border-gray-50 flex-row items-center justify-between bg-white">
                                    <View className="flex-1 mr-4">
                                        <View className="flex-row items-start gap-3">
                                            <View className={`w-10 h-10 rounded-lg items-center justify-center ${transaction.category === 'Materiais' ? 'bg-orange-100' : 'bg-red-100'}`}>
                                                {transaction.category === 'Materiais' ? <Package size={20} color="#F97316" /> : <ArrowDownRight size={20} color="#EF4444" />}
                                            </View>
                                            <View className="flex-1">
                                                <Text className="font-medium text-gray-900" numberOfLines={1}>{transaction.description}</Text>
                                                <View className="flex-row items-center gap-2 mt-1">
                                                    <Text className="text-gray-400 text-xs">{formatDate(transaction.date)}</Text>
                                                    <View className="flex-row items-center gap-1 bg-gray-100 px-1.5 py-0.5 rounded"><Text className="text-xs text-gray-500">{transaction.category || 'Geral'}</Text></View>
                                                </View>
                                            </View>
                                        </View>
                                    </View>
                                    <View className="flex-row items-center gap-2">
                                        <Text className="font-semibold text-red-500 whitespace-nowrap">- {formatCurrency(transaction.amount)}</Text>
                                        <Eye size={16} color="#9CA3AF" />
                                    </View>
                                </View>
                            </SwipeableTransactionItem>
                        ))
                    )}
                </View>
            </ScrollView>

            <ExpenseFilterModal
                visible={filterModalVisible}
                onClose={() => setFilterModalVisible(false)}
                filters={tempFilters}
                setFilters={setTempFilters}
                uniqueCategories={uniqueCategories}
                uniqueLocations={uniqueLocations}
                onApply={() => { setActiveFilters(tempFilters); setFilterModalVisible(false); }}
                onClear={() => { setTempFilters(INITIAL_FILTERS); setActiveFilters(INITIAL_FILTERS); setFilterModalVisible(false); }}
            />

            <ExpenseDetailModal
                visible={detailModalVisible}
                onClose={() => { setDetailModalVisible(false); setSelectedExpense(null); setMaterialItems([]); }}
                expense={selectedExpense}
                materialItems={materialItems}
                loadingMaterialItems={loadingMaterialItems}
                onEdit={onEdit}
                onRefresh={onRefresh}
            />
        </View>
    );
}
