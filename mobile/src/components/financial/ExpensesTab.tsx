import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput } from 'react-native';
import { TrendingDown, ArrowDownRight, MapPin, Filter, X } from 'lucide-react-native';
import { FinancialTransaction } from '../../types/database';
import { locationsService, Location } from '../../services/locations';
import { useState, useMemo, useEffect } from 'react';

interface ExpensesTabProps {
    transactions: FinancialTransaction[];
    loading: boolean;
    onEdit: (transaction: FinancialTransaction) => void;
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

export function ExpensesTab({ transactions, loading, onEdit }: ExpensesTabProps) {
    // Filter State
    const [filterModalVisible, setFilterModalVisible] = useState(false);
    const [activeFilters, setActiveFilters] = useState<FilterState>(INITIAL_FILTERS);
    const [tempFilters, setTempFilters] = useState<FilterState>(INITIAL_FILTERS);

    // Locations State
    const [availableLocations, setAvailableLocations] = useState<Location[]>([]);

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

    const totalExpenses = filteredExpenses.reduce((sum, t) => sum + t.amount, 0);

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
                {/* Summary Card */}
                <View className="bg-white p-4 rounded-xl border border-red-100 mb-6 shadow-sm">
                    <View className="flex-row justify-between items-center">
                        <View>
                            <Text className="text-gray-500 text-sm">Despesas Totais</Text>
                            <Text className="text-3xl font-bold text-red-500 mt-1">{formatCurrency(totalExpenses)}</Text>
                        </View>
                        <View className="w-12 h-12 bg-red-100 rounded-xl items-center justify-center">
                            <TrendingDown size={24} color="#EF4444" />
                        </View>
                    </View>
                </View>

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
                                onPress={() => onEdit(transaction)}
                            >
                                <View className="flex-1 mr-4">
                                    <View className="flex-row items-start gap-3">
                                        <View className="w-10 h-10 rounded-lg items-center justify-center bg-red-100">
                                            <ArrowDownRight size={20} color="#EF4444" />
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
                                <Text className="font-semibold text-red-500 whitespace-nowrap">
                                    - {formatCurrency(transaction.amount)}
                                </Text>
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
        </View>
    );
}
