import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator } from 'react-native';
import { TrendingDown, ArrowDownRight, MapPin, Filter, X, CreditCard, Receipt, Percent, Package, Calendar, Tag, Pencil, Trash2, Eye, Check } from 'lucide-react-native';
import { FinancialTransaction } from '../../types/database';
import { locationsService, Location } from '../../services/locations';
import { financialService } from '../../services/financial';
import { supabase } from '../../lib/supabase';
import { useState, useMemo, useEffect } from 'react';

interface ExpensesTabProps {
    transactions: FinancialTransaction[];
    loading: boolean;
    onEdit: (transaction: FinancialTransaction) => void;
    onRefresh: () => void;
}

interface FilterState {
    description: string;
    startDate: string; // DD/MM/YYYY
    endDate: string;   // DD/MM/YYYY
    categories: string[];
    locations: string[];
}

const INITIAL_FILTERS: FilterState = {
    description: '',
    startDate: '',
    endDate: '',
    categories: [],
    locations: []
};

export function ExpensesTab({ transactions, loading, onEdit, onRefresh }: ExpensesTabProps) {
    // Filter State
    const [filterModalVisible, setFilterModalVisible] = useState(false);
    const [activeFilters, setActiveFilters] = useState<FilterState>(INITIAL_FILTERS);
    const [tempFilters, setTempFilters] = useState<FilterState>(INITIAL_FILTERS);

    // Detail Modal State
    const [selectedExpense, setSelectedExpense] = useState<FinancialTransaction | null>(null);
    const [detailModalVisible, setDetailModalVisible] = useState(false);
    const [materialItems, setMaterialItems] = useState<any[]>([]);
    const [loadingMaterialItems, setLoadingMaterialItems] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Locations State
    const [availableLocations, setAvailableLocations] = useState<Location[]>([]);;

    useEffect(() => {
        loadLocations();
    }, []);

    const loadLocations = async () => {
        try {
            const data = await locationsService.getAll();
            setAvailableLocations(data);
        } catch (error) {
            console.error('Error loading locations', error);
        }
    };

    // Derived Data
    const expenseTransactions = transactions.filter(t => t.type === 'expense');
    const incomeTransactions = transactions.filter(t => t.type === 'income');

    // Calculate automatic deductions from income transactions
    const automaticDeductions = useMemo(() => {
        const cardFees = incomeTransactions.reduce((sum, t) => sum + ((t as any).card_fee_amount || 0), 0);
        const taxes = incomeTransactions.reduce((sum, t) => sum + ((t as any).tax_amount || 0), 0);
        const locationFees = incomeTransactions.reduce((sum, t) => sum + ((t as any).location_amount || 0), 0);

        // Location breakdown
        const locationBreakdown: Record<string, number> = {};
        incomeTransactions.forEach(t => {
            const locAmount = (t as any).location_amount || 0;
            if (t.location && locAmount > 0) {
                locationBreakdown[t.location] = (locationBreakdown[t.location] || 0) + locAmount;
            }
        });

        return {
            cardFees,
            taxes,
            locationFees,
            locationBreakdown,
            total: cardFees + taxes + locationFees
        };
    }, [incomeTransactions]);

    const uniqueCategories = useMemo(() => {
        const categories = new Set<string>();
        expenseTransactions.forEach(t => {
            if (t.category) categories.add(t.category);
        });
        return Array.from(categories).sort();
    }, [expenseTransactions]);

    const uniqueLocations = useMemo(() => {
        if (availableLocations.length > 0) {
            return availableLocations.map(l => l.name).sort();
        }
        return Array.from(new Set(expenseTransactions.map(t => t.location).filter(Boolean) as string[])).sort();
    }, [expenseTransactions, availableLocations]);

    // Filtering Logic
    const filteredExpenses = useMemo(() => {
        return expenseTransactions.filter(t => {
            // 1. Description
            if (activeFilters.description) {
                if (!t.description.toLowerCase().includes(activeFilters.description.toLowerCase())) return false;
            }

            // 2. Date Range
            const tDate = new Date(t.date);
            tDate.setHours(0, 0, 0, 0);

            if (activeFilters.startDate) {
                const [d, m, y] = activeFilters.startDate.split('/');
                if (d && m && y) {
                    const start = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
                    if (tDate < start) return false;
                }
            }

            if (activeFilters.endDate) {
                const [d, m, y] = activeFilters.endDate.split('/');
                if (d && m && y) {
                    const end = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
                    if (tDate > end) return false;
                }
            }

            // 3. Categories
            if (activeFilters.categories.length > 0) {
                const cat = t.category || '';
                if (!activeFilters.categories.includes(cat)) return false;
            }

            // 4. Locations
            if (activeFilters.locations.length > 0) {
                if (!t.location || !activeFilters.locations.includes(t.location)) return false;
            }

            return true;
        });
    }, [expenseTransactions, activeFilters]);

    const totalManualExpenses = filteredExpenses.reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = totalManualExpenses + automaticDeductions.total;

    const activeFilterCount = (activeFilters.description ? 1 : 0) +
        (activeFilters.startDate || activeFilters.endDate ? 1 : 0) +
        (activeFilters.categories.length > 0 ? 1 : 0) +
        (activeFilters.locations.length > 0 ? 1 : 0);

    const formatCurrency = (value: number) => {
        return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const handleDateChange = (text: string, field: 'startDate' | 'endDate') => {
        let cleaned = text.replace(/\D/g, '');
        if (cleaned.length > 8) cleaned = cleaned.slice(0, 8);
        let masked = cleaned;
        if (cleaned.length > 4) {
            masked = `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4)}`;
        } else if (cleaned.length > 2) {
            masked = `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
        }
        setTempFilters(prev => ({ ...prev, [field]: masked }));
    };

    const toggleFilterCategory = (cat: string) => {
        setTempFilters(prev => {
            const exists = prev.categories.includes(cat);
            return {
                ...prev,
                categories: exists ? prev.categories.filter(c => c !== cat) : [...prev.categories, cat]
            };
        });
    };

    const toggleFilterLocation = (loc: string) => {
        setTempFilters(prev => {
            const exists = prev.locations.includes(loc);
            return {
                ...prev,
                locations: exists ? prev.locations.filter(l => l !== loc) : [...prev.locations, loc]
            };
        });
    };

    const applyFilters = () => {
        setActiveFilters(tempFilters);
        setFilterModalVisible(false);
    };

    const clearFilters = () => {
        setTempFilters(INITIAL_FILTERS);
        setActiveFilters(INITIAL_FILTERS);
        setFilterModalVisible(false);
    };

    const expensesByCategory = filteredExpenses
        .reduce((acc, t) => {
            const cat = t.category || 'Outros';
            acc[cat] = (acc[cat] || 0) + t.amount;
            return acc;
        }, {} as Record<string, number>);

    return (
        <View className="flex-1">
            {/* Header / Filter Bar */}
            <View className="flex-row items-center justify-end px-4 mt-4 mb-2">
                <TouchableOpacity
                    onPress={() => {
                        setTempFilters(activeFilters);
                        setFilterModalVisible(true);
                    }}
                    className={`p-2 rounded-lg border ${activeFilterCount > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}
                >
                    <View className="flex-row items-center gap-2">
                        <Filter size={18} color={activeFilterCount > 0 ? '#EF4444' : '#6b7280'} />
                        <Text className={`text-sm font-medium ${activeFilterCount > 0 ? 'text-red-600' : 'text-gray-600'}`}>Filtros</Text>
                        {activeFilterCount > 0 && (
                            <View className="bg-red-500 rounded-full w-5 h-5 items-center justify-center">
                                <Text className="text-white text-[10px] font-bold">{activeFilterCount}</Text>
                            </View>
                        )}
                    </View>
                </TouchableOpacity>
            </View>

            <ScrollView className="flex-1 px-4 py-2" showsVerticalScrollIndicator={false}>
                {/* Summary Cards */}
                <View className="flex-row gap-3 mb-4">
                    <View className="flex-1 bg-white p-3 rounded-xl border border-red-100">
                        <Text className="text-gray-500 text-xs">Manuais</Text>
                        <Text className="text-xl font-bold text-red-500 mt-1">{formatCurrency(totalManualExpenses)}</Text>
                    </View>
                    <View className="flex-1 bg-white p-3 rounded-xl border border-orange-100">
                        <Text className="text-gray-500 text-xs">Automáticas</Text>
                        <Text className="text-xl font-bold text-orange-500 mt-1">{formatCurrency(automaticDeductions.total)}</Text>
                    </View>
                </View>

                <View className="bg-white p-4 rounded-xl border border-red-200 mb-6 shadow-sm">
                    <View className="flex-row justify-between items-center">
                        <View>
                            <Text className="text-gray-500 text-sm">Total de Despesas</Text>
                            <Text className="text-3xl font-bold text-red-600 mt-1">{formatCurrency(totalExpenses)}</Text>
                        </View>
                        <View className="w-12 h-12 bg-red-100 rounded-xl items-center justify-center">
                            <TrendingDown size={24} color="#DC2626" />
                        </View>
                    </View>
                </View>

                {/* Automatic Deductions Section */}
                {automaticDeductions.total > 0 && (
                    <View className="mb-6">
                        <Text className="text-sm font-semibold text-orange-700 mb-3 flex-row items-center">
                            Descontos Automáticos (Taxas e Impostos)
                        </Text>
                        <View className="gap-2">
                            {automaticDeductions.cardFees > 0 && (
                                <View className="bg-white p-3 rounded-xl border border-orange-100 flex-row items-center justify-between">
                                    <View className="flex-row items-center gap-3">
                                        <View className="w-10 h-10 bg-blue-100 rounded-lg items-center justify-center">
                                            <CreditCard size={18} color="#2563EB" />
                                        </View>
                                        <View>
                                            <Text className="font-medium text-gray-900">Taxa de Cartão</Text>
                                            <Text className="text-xs text-gray-500">Débito/Crédito</Text>
                                        </View>
                                    </View>
                                    <Text className="font-bold text-red-600">- {formatCurrency(automaticDeductions.cardFees)}</Text>
                                </View>
                            )}

                            {automaticDeductions.taxes > 0 && (
                                <View className="bg-white p-3 rounded-xl border border-orange-100 flex-row items-center justify-between">
                                    <View className="flex-row items-center gap-3">
                                        <View className="w-10 h-10 bg-purple-100 rounded-lg items-center justify-center">
                                            <Receipt size={18} color="#7C3AED" />
                                        </View>
                                        <View>
                                            <Text className="font-medium text-gray-900">Impostos</Text>
                                            <Text className="text-xs text-gray-500">Retenção na fonte</Text>
                                        </View>
                                    </View>
                                    <Text className="font-bold text-red-600">- {formatCurrency(automaticDeductions.taxes)}</Text>
                                </View>
                            )}

                            {Object.entries(automaticDeductions.locationBreakdown).map(([location, amount]) => (
                                <View key={location} className="bg-white p-3 rounded-xl border border-orange-100 flex-row items-center justify-between">
                                    <View className="flex-row items-center gap-3">
                                        <View className="w-10 h-10 bg-teal-100 rounded-lg items-center justify-center">
                                            <MapPin size={18} color="#0D9488" />
                                        </View>
                                        <View>
                                            <Text className="font-medium text-gray-900">Taxa do Local</Text>
                                            <Text className="text-xs text-gray-500">{location}</Text>
                                        </View>
                                    </View>
                                    <Text className="font-bold text-red-600">- {formatCurrency(amount)}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Breakdown by Category (if useful) or Location logic similar to income */}
                {Object.keys(expensesByCategory).length > 0 && (
                    <View className="mb-6">
                        <Text className="text-sm font-semibold text-gray-700 mb-3">Despesas por Categoria</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-3">
                            {Object.entries(expensesByCategory).map(([cat, amount]: [string, number]) => (
                                <View key={cat} className="bg-white p-3 rounded-lg border border-gray-100 mr-2 min-w-[120px]">
                                    <Text className="text-xs text-gray-500 mb-1" numberOfLines={1}>{cat}</Text>
                                    <Text className="text-lg font-bold text-red-600">{formatCurrency(amount)}</Text>
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                )}

                {/* List */}
                <Text className="text-sm font-semibold text-gray-700 mb-3">
                    Despesas ({filteredExpenses.length})
                </Text>
                <View className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-8">
                    {filteredExpenses.length === 0 ? (
                        <View className="p-8 items-center">
                            <Text className="text-gray-400 italic">Nenhuma despesa encontrada</Text>
                        </View>
                    ) : (
                        filteredExpenses.slice().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((transaction) => (
                            <TouchableOpacity
                                key={transaction.id}
                                className="p-4 border-b border-gray-50 flex-row items-center justify-between active:bg-gray-50"
                                onPress={async () => {
                                    setSelectedExpense(transaction);
                                    setDetailModalVisible(true);
                                    // Fetch material items if applicable
                                    if (transaction.category === 'Materiais' && (transaction as any).related_entity_id) {
                                        setLoadingMaterialItems(true);
                                        try {
                                            const { data: order } = await (supabase
                                                .from('shopping_orders') as any)
                                                .select('items')
                                                .eq('id', (transaction as any).related_entity_id)
                                                .single();
                                            if (order?.items) {
                                                setMaterialItems(order.items as any[]);
                                            }
                                        } catch (e) {
                                            console.error('Error fetching material items:', e);
                                        } finally {
                                            setLoadingMaterialItems(false);
                                        }
                                    } else {
                                        setMaterialItems([]);
                                    }
                                }}
                            >
                                <View className="flex-1 mr-4">
                                    <View className="flex-row items-start gap-3">
                                        <View className={`w-10 h-10 rounded-lg items-center justify-center ${transaction.category === 'Materiais' ? 'bg-orange-100' : 'bg-red-100'}`}>
                                            {transaction.category === 'Materiais' ? <Package size={20} color="#F97316" /> : <ArrowDownRight size={20} color="#EF4444" />}
                                        </View>
                                        <View className="flex-1">
                                            <Text className="font-medium text-gray-900" numberOfLines={1}>{transaction.description}</Text>
                                            <View className="flex-row items-center gap-2 mt-1">
                                                <Text className="text-gray-400 text-xs">
                                                    {new Date(transaction.date).toLocaleDateString('pt-BR')}
                                                </Text>
                                                <View className="flex-row items-center gap-1 bg-gray-100 px-1.5 py-0.5 rounded">
                                                    <Text className="text-xs text-gray-500">{transaction.category || 'Geral'}</Text>
                                                </View>
                                            </View>
                                        </View>
                                    </View>
                                </View>
                                <View className="flex-row items-center gap-2">
                                    <Text className="font-semibold text-red-500 whitespace-nowrap">
                                        - {formatCurrency(transaction.amount)}
                                    </Text>
                                    <Eye size={16} color="#9CA3AF" />
                                </View>
                            </TouchableOpacity>
                        ))
                    )}
                </View>
            </ScrollView>

            {/* Filter Modal */}
            <Modal visible={filterModalVisible} animationType="slide" transparent>
                <View className="flex-1 justify-end bg-black/50">
                    <View className="bg-white rounded-t-3xl h-[85%]">
                        <View className="flex-row justify-between items-center p-4 border-b border-gray-100">
                            <Text className="text-xl font-bold text-gray-800">Filtrar Despesas</Text>
                            <TouchableOpacity onPress={() => setFilterModalVisible(false)} className="bg-gray-100 p-2 rounded-full">
                                <X size={20} color="#374151" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView className="flex-1 p-4">
                            {/* Description */}
                            <Text className="text-sm font-semibold text-gray-700 mb-2">Descrição</Text>
                            <TextInput
                                className="bg-gray-50 border border-gray-200 rounded-xl p-3 mb-6"
                                placeholder="Buscar por descrição..."
                                value={tempFilters.description}
                                onChangeText={text => setTempFilters(prev => ({ ...prev, description: text }))}
                            />

                            {/* Date Period */}
                            <Text className="text-sm font-semibold text-gray-700 mb-2">Período</Text>
                            <View className="flex-row gap-4 mb-6">
                                <View className="flex-1">
                                    <Text className="text-xs text-gray-500 mb-1">Início</Text>
                                    <TextInput
                                        className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center"
                                        placeholder="DD/MM/AAAA"
                                        keyboardType="numeric"
                                        maxLength={10}
                                        value={tempFilters.startDate}
                                        onChangeText={text => handleDateChange(text, 'startDate')}
                                    />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-xs text-gray-500 mb-1">Fim</Text>
                                    <TextInput
                                        className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center"
                                        placeholder="DD/MM/AAAA"
                                        keyboardType="numeric"
                                        maxLength={10}
                                        value={tempFilters.endDate}
                                        onChangeText={text => handleDateChange(text, 'endDate')}
                                    />
                                </View>
                            </View>

                            {/* Categories */}
                            <Text className="text-sm font-semibold text-gray-700 mb-2">Categorias</Text>
                            <View className="flex-row flex-wrap gap-2 mb-6">
                                {uniqueCategories.map(cat => (
                                    <TouchableOpacity
                                        key={cat}
                                        onPress={() => toggleFilterCategory(cat)}
                                        className={`px-3 py-2 rounded-lg border ${tempFilters.categories.includes(cat) ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}
                                    >
                                        <Text className={`text-xs ${tempFilters.categories.includes(cat) ? 'text-red-700 font-medium' : 'text-gray-600'}`}>
                                            {cat}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Locations */}
                            <Text className="text-sm font-semibold text-gray-700 mb-2">Local de Atendimento</Text>
                            <View className="flex-row flex-wrap gap-2 mb-8">
                                {uniqueLocations.map(loc => (
                                    <TouchableOpacity
                                        key={loc}
                                        onPress={() => toggleFilterLocation(loc)}
                                        className={`px-3 py-2 rounded-lg border ${tempFilters.locations.includes(loc) ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}
                                    >
                                        <Text className={`text-xs ${tempFilters.locations.includes(loc) ? 'text-red-700 font-medium' : 'text-gray-600'}`}>
                                            {loc}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>

                        {/* Footer Buttons */}
                        <View className="p-4 border-t border-gray-100 bg-white safe-area-bottom">
                            <TouchableOpacity
                                onPress={applyFilters}
                                className="bg-red-600 rounded-xl p-4 items-center mb-3"
                            >
                                <Text className="text-white font-bold text-base">Aplicar Filtros</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={clearFilters}
                                className="p-4 items-center"
                            >
                                <Text className="text-gray-500 font-medium">Limpar Filtros</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Expense Detail Modal */}
            <Modal visible={detailModalVisible} animationType="slide" transparent>
                <View className="flex-1 justify-end bg-black/50">
                    <View className="bg-white rounded-t-3xl h-[85%]">
                        <View className="flex-row justify-between items-center p-4 border-b border-gray-100">
                            <Text className="text-xl font-bold text-gray-800">Detalhes da Despesa</Text>
                            <TouchableOpacity
                                onPress={() => { setDetailModalVisible(false); setSelectedExpense(null); setMaterialItems([]); }}
                                className="bg-gray-100 p-2 rounded-full"
                            >
                                <X size={20} color="#374151" />
                            </TouchableOpacity>
                        </View>

                        {selectedExpense && (
                            <ScrollView className="flex-1 p-4">
                                {/* Expense Info */}
                                <View className="bg-gray-50 rounded-xl p-4 gap-3 mb-4">
                                    <View className="flex-row items-center gap-3">
                                        <Calendar size={16} color="#6B7280" />
                                        <Text className="text-sm text-gray-700">
                                            {new Date(selectedExpense.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                                        </Text>
                                    </View>
                                    {selectedExpense.category && (
                                        <View className="flex-row items-center gap-3">
                                            <Tag size={16} color="#6B7280" />
                                            <View className="bg-gray-200 px-2 py-1 rounded">
                                                <Text className="text-xs text-gray-700">{selectedExpense.category}</Text>
                                            </View>
                                        </View>
                                    )}
                                    <View className="flex-row items-center gap-3">
                                        <Receipt size={16} color="#6B7280" />
                                        <Text className="text-sm text-gray-700 flex-1">{selectedExpense.description}</Text>
                                    </View>
                                </View>

                                {/* Amount */}
                                <View className="bg-red-50 rounded-xl py-6 items-center mb-4">
                                    <Text className="text-sm text-gray-500 mb-1">Valor da Despesa</Text>
                                    <Text className="text-3xl font-bold text-red-600">- {formatCurrency(selectedExpense.amount)}</Text>
                                </View>

                                {/* Material Items */}
                                {selectedExpense.category === 'Materiais' && (
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
                                                            <Text className="text-xs text-gray-500">{item.quantity}x {formatCurrency(item.unitPrice)} • {item.supplier}</Text>
                                                        </View>
                                                        <Text className="font-semibold text-red-600">{formatCurrency(item.totalPrice)}</Text>
                                                    </View>
                                                ))}
                                            </View>
                                        ) : (selectedExpense as any).related_entity_id ? (
                                            <Text className="text-sm text-gray-400 italic">Itens não encontrados</Text>
                                        ) : (
                                            <Text className="text-sm text-gray-400 italic">Despesa sem lista de materiais vinculada</Text>
                                        )}
                                    </View>
                                )}

                                {/* Warning for Materials */}
                                {selectedExpense.category === 'Materiais' && (selectedExpense as any).related_entity_id && (
                                    <View className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                                        <Text className="text-sm text-orange-700">
                                            <Text className="font-bold">Atenção:</Text> Ao excluir esta despesa, a lista de materiais voltará para "Pendente".
                                        </Text>
                                    </View>
                                )}
                            </ScrollView>
                        )}

                        {/* Footer Buttons */}
                        <View className="p-4 border-t border-gray-100 bg-white safe-area-bottom">
                            <View className="flex-row gap-3">
                                <TouchableOpacity
                                    onPress={() => {
                                        setDetailModalVisible(false);
                                        if (selectedExpense) onEdit(selectedExpense);
                                    }}
                                    className="flex-1 bg-gray-100 rounded-xl p-4 flex-row items-center justify-center gap-2"
                                >
                                    <Pencil size={18} color="#374151" />
                                    <Text className="font-semibold text-gray-700">Editar</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => {
                                        if (!selectedExpense) return;
                                        const isMaterials = selectedExpense.category === 'Materiais' && (selectedExpense as any).related_entity_id;
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
                                                        if (!selectedExpense) return;
                                                        setDeleting(true);
                                                        try {
                                                            await financialService.deleteExpenseAndRevertMaterials(selectedExpense.id);
                                                            setDetailModalVisible(false);
                                                            setSelectedExpense(null);
                                                            Alert.alert('Sucesso', isMaterials
                                                                ? 'Despesa excluída! Lista de materiais revertida para pendente.'
                                                                : 'Despesa excluída com sucesso!');
                                                            onRefresh();
                                                        } catch (error) {
                                                            console.error('Error deleting expense:', error);
                                                            Alert.alert('Erro', 'Falha ao excluir despesa');
                                                        } finally {
                                                            setDeleting(false);
                                                        }
                                                    }
                                                }
                                            ]
                                        );
                                    }}
                                    disabled={deleting}
                                    className={`flex-1 bg-red-500 rounded-xl p-4 flex-row items-center justify-center gap-2 ${deleting ? 'opacity-50' : ''}`}
                                >
                                    {deleting ? <ActivityIndicator size="small" color="white" /> : <Trash2 size={18} color="white" />}
                                    <Text className="font-semibold text-white">Excluir</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

