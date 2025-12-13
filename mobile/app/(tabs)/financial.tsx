import { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Pressable, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DollarSign, TrendingUp, TrendingDown, Plus, ArrowUpRight, ArrowDownRight, ChevronLeft, ChevronRight, ChevronDown, X, MapPin } from 'lucide-react-native';
import { useFocusEffect } from 'expo-router';
import { financialService } from '../../src/services/financial';
import type { FinancialTransaction } from '../../src/types/database';

type FilterType = 'all' | 'income' | 'expense';
type PeriodType = 'monthly' | 'yearly';

const MONTHS = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function Financial() {
    const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
    const [loading, setLoading] = useState(false);

    // Filters
    const [filter, setFilter] = useState<FilterType>('all');
    const [periodType, setPeriodType] = useState<PeriodType>('monthly');
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    // UI State
    const [showMonthPicker, setShowMonthPicker] = useState(false);
    const [showYearPicker, setShowYearPicker] = useState(false);

    // Data Loading
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            let start: Date, end: Date;

            if (periodType === 'monthly') {
                start = new Date(selectedYear, selectedMonth, 1);
                end = new Date(selectedYear, selectedMonth + 1, 0);
            } else {
                start = new Date(selectedYear, 0, 1);
                end = new Date(selectedYear, 11, 31);
            }

            // Adjust for timezone if needed, simple approach for now
            const data = await financialService.getTransactions(start, end);
            setTransactions(data);
        } catch (error) {
            console.error('Error loading financial data:', error);
            Alert.alert('Erro', 'Não foi possível carregar os dados financeiros');
        } finally {
            setLoading(false);
        }
    }, [selectedYear, selectedMonth, periodType]);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    // Calculations
    const totalIncome = transactions
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = transactions
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

    const balance = totalIncome - totalExpenses;

    // Local Filtering (Client side for now, can be server side later)
    const filteredTransactions = transactions.filter((t) => {
        if (filter === 'all') return true;
        return t.type === filter;
    });

    // Formatters
    const formatCurrency = (value: number) => {
        return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    };

    // Navigation Handlers
    const navigateMonth = (direction: 'prev' | 'next') => {
        const newDate = new Date(selectedYear, selectedMonth + (direction === 'next' ? 1 : -1));
        setSelectedMonth(newDate.getMonth());
        setSelectedYear(newDate.getFullYear());
    };

    const navigateYear = (direction: 'prev' | 'next') => {
        setSelectedYear(selectedYear + (direction === 'next' ? 1 : -1));
    };

    const goToCurrentPeriod = () => {
        setSelectedMonth(new Date().getMonth());
        setSelectedYear(new Date().getFullYear());
    };

    const isCurrentPeriod = () => {
        const now = new Date();
        if (periodType === 'monthly') {
            return now.getMonth() === selectedMonth && now.getFullYear() === selectedYear;
        } else {
            return now.getFullYear() === selectedYear;
        }
    };

    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            <ScrollView
                className="px-4 py-6"
                refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
            >
                {/* Header */}
                <View className="flex-row justify-between items-center mb-6">
                    <View>
                        <Text className="text-2xl font-bold text-gray-900">Financeiro</Text>
                        <Text className="text-gray-500 mt-1">Receitas e despesas</Text>
                    </View>
                    <TouchableOpacity className="bg-teal-500 p-3 rounded-xl" onPress={() => Alert.alert("Em breve", "Adicionar despesa manual")}>
                        <Plus size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>

                {/* Period Selector */}
                <View className="bg-white rounded-xl p-4 border border-gray-100 mb-6">
                    {/* Period Type Toggle */}
                    <View className="flex-row justify-center mb-4">
                        <View className="flex-row bg-gray-100 rounded-lg p-1">
                            <TouchableOpacity
                                onPress={() => setPeriodType('monthly')}
                                className={`px-4 py-2 rounded-md ${periodType === 'monthly' ? 'bg-white shadow-sm' : ''}`}
                            >
                                <Text className={`text-sm font-medium ${periodType === 'monthly' ? 'text-gray-900' : 'text-gray-500'}`}>
                                    Mensal
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setPeriodType('yearly')}
                                className={`px-4 py-2 rounded-md ${periodType === 'yearly' ? 'bg-white shadow-sm' : ''}`}
                            >
                                <Text className={`text-sm font-medium ${periodType === 'yearly' ? 'text-gray-900' : 'text-gray-500'}`}>
                                    Anual
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Period Navigation */}
                    {periodType === 'monthly' ? (
                        <View className="flex-row items-center justify-center gap-2">
                            <TouchableOpacity onPress={() => navigateMonth('prev')} className="p-3">
                                <ChevronLeft size={22} color="#0D9488" />
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setShowMonthPicker(true)}
                                className="flex-row items-center gap-2 px-4 py-3 bg-gray-100 rounded-xl"
                            >
                                <Text className="font-medium text-gray-900">{MONTHS[selectedMonth]}</Text>
                                <ChevronDown size={16} color="#6B7280" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => navigateMonth('next')} className="p-3">
                                <ChevronRight size={22} color="#0D9488" />
                            </TouchableOpacity>

                            <View className="w-px h-8 bg-gray-200 mx-2" />

                            <TouchableOpacity
                                onPress={() => setShowYearPicker(true)}
                                className="flex-row items-center gap-2 px-4 py-3 bg-gray-100 rounded-xl"
                            >
                                <Text className="font-medium text-gray-900">{selectedYear}</Text>
                                <ChevronDown size={16} color="#6B7280" />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View className="flex-row items-center justify-center gap-3">
                            <TouchableOpacity onPress={() => navigateYear('prev')} className="p-3">
                                <ChevronLeft size={26} color="#0D9488" />
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setShowYearPicker(true)}
                                className="flex-row items-center gap-2 px-6 py-3 bg-gray-100 rounded-xl"
                            >
                                <Text className="text-lg font-semibold text-gray-900">{selectedYear}</Text>
                                <ChevronDown size={18} color="#6B7280" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => navigateYear('next')} className="p-3">
                                <ChevronRight size={26} color="#0D9488" />
                            </TouchableOpacity>
                        </View>
                    )}

                    {!isCurrentPeriod() && (
                        <TouchableOpacity onPress={goToCurrentPeriod} className="mt-3">
                            <Text className="text-teal-600 text-center text-sm">
                                Ir para atual
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Stats Cards */}
                <View className="gap-3 mb-6">
                    <TouchableOpacity
                        onPress={() => setFilter(filter === 'income' ? 'all' : 'income')}
                        className={`bg-white p-4 rounded-xl border-2 ${filter === 'income' ? 'border-green-500' : 'border-gray-100'}`}
                        activeOpacity={0.7}
                    >
                        <View className="flex-row justify-between items-center">
                            <View>
                                <Text className="text-gray-500 text-sm">Receitas</Text>
                                <Text className="text-2xl font-bold text-green-500 mt-1">{formatCurrency(totalIncome)}</Text>
                            </View>
                            <View className="w-12 h-12 bg-green-100 rounded-xl items-center justify-center">
                                <TrendingUp size={24} color="#22C55E" />
                            </View>
                        </View>
                    </TouchableOpacity>

                    {/* Revenue by Location Breakdown - Only Show if there is data */}
                    {Object.keys(transactions.filter(t => t.type === 'income' && t.location).reduce((acc, t) => {
                        const loc = t.location!;
                        acc[loc] = (acc[loc] || 0) + t.amount;
                        return acc;
                    }, {} as Record<string, number>)).length > 0 && (
                            <View className="mt-2">
                                <Text className="text-sm font-semibold text-gray-700 mb-2 ml-1">Receita por Local</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-3 pl-1">
                                    {Object.entries(transactions
                                        .filter(t => t.type === 'income' && t.location)
                                        .reduce((acc, t) => {
                                            const loc = t.location!;
                                            acc[loc] = (acc[loc] || 0) + t.amount;
                                            return acc;
                                        }, {} as Record<string, number>))
                                        .map(([location, amount]) => (
                                            <View key={location} className="bg-white p-3 rounded-lg border border-gray-100 mr-2 min-w-[120px]">
                                                <Text className="text-xs text-gray-500 mb-1" numberOfLines={1}>{location}</Text>
                                                <Text className="text-sm font-bold text-green-600">{formatCurrency(amount)}</Text>
                                            </View>
                                        ))}
                                </ScrollView>
                            </View>
                        )}

                    <TouchableOpacity
                        onPress={() => setFilter(filter === 'expense' ? 'all' : 'expense')}
                        className={`bg-white p-4 rounded-xl border-2 ${filter === 'expense' ? 'border-red-500' : 'border-gray-100'}`}
                        activeOpacity={0.7}
                    >
                        <View className="flex-row justify-between items-center">
                            <View>
                                <Text className="text-gray-500 text-sm">Despesas</Text>
                                <Text className="text-2xl font-bold text-red-500 mt-1">{formatCurrency(totalExpenses)}</Text>
                            </View>
                            <View className="w-12 h-12 bg-red-100 rounded-xl items-center justify-center">
                                <TrendingDown size={24} color="#EF4444" />
                            </View>
                        </View>
                    </TouchableOpacity>

                    <View className="bg-white p-4 rounded-xl border border-gray-100">
                        <View className="flex-row justify-between items-center">
                            <View>
                                <Text className="text-gray-500 text-sm">Saldo</Text>
                                <Text className={`text-2xl font-bold mt-1 ${balance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                    {formatCurrency(balance)}
                                </Text>
                            </View>
                            <View className="w-12 h-12 bg-teal-100 rounded-xl items-center justify-center">
                                <DollarSign size={24} color="#0D9488" />
                            </View>
                        </View>
                    </View>
                </View>

                {/* Transactions List */}
                <View className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-8">
                    <View className="p-4 border-b border-gray-100 flex-row justify-between items-center">
                        <View>
                            <Text className="font-semibold text-gray-900">
                                {filter === 'all' && 'Todas as Transações'}
                                {filter === 'income' && 'Receitas'}
                                {filter === 'expense' && 'Despesas'}
                            </Text>
                            <Text className="text-gray-400 text-sm">{filteredTransactions.length} registros</Text>
                        </View>
                        {filter !== 'all' && (
                            <TouchableOpacity
                                onPress={() => setFilter('all')}
                                className="flex-row items-center gap-1 px-3 py-1.5 bg-gray-100 rounded-full"
                            >
                                <X size={14} color="#6B7280" />
                                <Text className="text-gray-600 text-sm">Limpar</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {loading ? (
                        <View className="p-8">
                            <ActivityIndicator size="small" color="#0D9488" />
                        </View>
                    ) : filteredTransactions.length === 0 ? (
                        <View className="p-8 items-center">
                            <Text className="text-gray-400 italic">Nenhum registro encontrado</Text>
                        </View>
                    ) : (
                        filteredTransactions.map((transaction) => (
                            <View key={transaction.id} className="p-4 border-b border-gray-50 flex-row items-center justify-between">
                                <View className="flex-1 mr-4">
                                    <View className="flex-row items-start gap-3">
                                        <View className={`w-10 h-10 rounded-lg items-center justify-center ${transaction.type === 'income' ? 'bg-green-100' : 'bg-red-100'
                                            }`}>
                                            {transaction.type === 'income' ? (
                                                <ArrowUpRight size={20} color="#22C55E" />
                                            ) : (
                                                <ArrowDownRight size={20} color="#EF4444" />
                                            )}
                                        </View>
                                        <View className="flex-1">
                                            <Text className="font-medium text-gray-900" numberOfLines={1}>{transaction.description}</Text>
                                            <View className="flex-row items-center gap-2 mt-1">
                                                <Text className="text-gray-400 text-xs">
                                                    {new Date(transaction.date).toLocaleDateString('pt-BR')}
                                                </Text>
                                                {transaction.location && (
                                                    <View className="flex-row items-center gap-1 bg-gray-100 px-1.5 py-0.5 rounded">
                                                        <MapPin size={10} color="#6B7280" />
                                                        <Text className="text-xs text-gray-500">{transaction.location}</Text>
                                                    </View>
                                                )}
                                            </View>
                                        </View>
                                    </View>
                                </View>
                                <Text className={`font-semibold whitespace-nowrap ${transaction.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                                    {transaction.type === 'income' ? '+' : '-'} {formatCurrency(transaction.amount)}
                                </Text>
                            </View>
                        ))
                    )}
                </View>
            </ScrollView>

            {/* Pickers */}
            <Modal visible={showMonthPicker} transparent animationType="fade">
                <Pressable className="flex-1 bg-black/50 justify-center items-center" onPress={() => setShowMonthPicker(false)}>
                    <View className="bg-white rounded-2xl p-4 w-80 mx-4">
                        <Text className="text-lg font-semibold text-gray-900 mb-4 text-center">Selecionar Mês</Text>
                        <View className="flex-row flex-wrap justify-center gap-2">
                            {MONTHS.map((month, index) => (
                                <TouchableOpacity
                                    key={month}
                                    onPress={() => { setSelectedMonth(index); setShowMonthPicker(false); }}
                                    className={`px-4 py-3 rounded-lg ${selectedMonth === index ? 'bg-teal-500' : 'bg-gray-100'}`}
                                >
                                    <Text className={`font-medium ${selectedMonth === index ? 'text-white' : 'text-gray-700'}`}>
                                        {month.slice(0, 3)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </Pressable>
            </Modal>

            <Modal visible={showYearPicker} transparent animationType="fade">
                <Pressable className="flex-1 bg-black/50 justify-center items-center" onPress={() => setShowYearPicker(false)}>
                    <View className="bg-white rounded-2xl p-4 w-72 mx-4">
                        <Text className="text-lg font-semibold text-gray-900 mb-4 text-center">Selecionar Ano</Text>
                        <View className="flex-row flex-wrap justify-center gap-2">
                            {years.map((year) => (
                                <TouchableOpacity
                                    key={year}
                                    onPress={() => { setSelectedYear(year); setShowYearPicker(false); }}
                                    className={`px-5 py-3 rounded-lg ${selectedYear === year ? 'bg-teal-500' : 'bg-gray-100'}`}
                                >
                                    <Text className={`font-medium ${selectedYear === year ? 'text-white' : 'text-gray-700'}`}>
                                        {year}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </Pressable>
            </Modal>
        </SafeAreaView>
    );
}
