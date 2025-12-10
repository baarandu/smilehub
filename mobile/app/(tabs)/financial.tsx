import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DollarSign, TrendingUp, TrendingDown, Plus, ArrowUpRight, ArrowDownRight, ChevronLeft, ChevronRight, ChevronDown, X } from 'lucide-react-native';

const mockTransactions = [
    { id: '1', type: 'income', description: 'Consulta - Maria Silva', amount: 150, date: '2024-12-10' },
    { id: '2', type: 'income', description: 'Limpeza - João Santos', amount: 200, date: '2024-12-10' },
    { id: '3', type: 'expense', description: 'Compra de materiais', amount: 450, date: '2024-12-09' },
    { id: '4', type: 'income', description: 'Clareamento - Ana Oliveira', amount: 800, date: '2024-11-15' },
    { id: '5', type: 'expense', description: 'Conta de luz', amount: 280, date: '2024-11-08' },
    { id: '6', type: 'income', description: 'Restauração - Pedro Costa', amount: 350, date: '2024-10-20' },
    { id: '7', type: 'expense', description: 'Aluguel', amount: 2500, date: '2024-12-05' },
    { id: '8', type: 'income', description: 'Canal - Lucas Mendes', amount: 1200, date: '2024-12-03' },
];

type FilterType = 'all' | 'income' | 'expense';
type PeriodType = 'monthly' | 'yearly';

const MONTHS = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function Financial() {
    const [filter, setFilter] = useState<FilterType>('all');
    const [periodType, setPeriodType] = useState<PeriodType>('monthly');
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [showMonthPicker, setShowMonthPicker] = useState(false);
    const [showYearPicker, setShowYearPicker] = useState(false);

    const getPeriodBoundaries = () => {
        if (periodType === 'monthly') {
            const start = new Date(selectedYear, selectedMonth, 1);
            const end = new Date(selectedYear, selectedMonth + 1, 0);
            return { start, end };
        } else {
            const start = new Date(selectedYear, 0, 1);
            const end = new Date(selectedYear, 11, 31);
            return { start, end };
        }
    };

    const { start, end } = getPeriodBoundaries();

    const periodTransactions = mockTransactions.filter((t) => {
        const transactionDate = new Date(t.date);
        return transactionDate >= start && transactionDate <= end;
    });

    const totalIncome = periodTransactions
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = periodTransactions
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

    const balance = totalIncome - totalExpenses;

    const filteredTransactions = periodTransactions.filter((t) => {
        if (filter === 'all') return true;
        return t.type === filter;
    });

    const formatCurrency = (value: number) => {
        return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    };

    const handleFilterClick = (type: FilterType) => {
        setFilter(filter === type ? 'all' : type);
    };

    const navigateMonth = (direction: 'prev' | 'next') => {
        if (direction === 'next') {
            if (selectedMonth === 11) {
                setSelectedMonth(0);
                setSelectedYear(selectedYear + 1);
            } else {
                setSelectedMonth(selectedMonth + 1);
            }
        } else {
            if (selectedMonth === 0) {
                setSelectedMonth(11);
                setSelectedYear(selectedYear - 1);
            } else {
                setSelectedMonth(selectedMonth - 1);
            }
        }
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

    const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i);

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            <ScrollView className="px-4 py-6">
                {/* Header */}
                <View className="flex-row justify-between items-center mb-6">
                    <View>
                        <Text className="text-2xl font-bold text-gray-900">Financeiro</Text>
                        <Text className="text-gray-500 mt-1">Receitas e despesas</Text>
                    </View>
                    <TouchableOpacity className="bg-teal-500 p-3 rounded-xl">
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
                            {/* Month Selector */}
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

                            {/* Separator */}
                            <View className="w-px h-8 bg-gray-200 mx-2" />

                            {/* Year Selector */}
                            <TouchableOpacity onPress={() => navigateYear('prev')} className="p-3">
                                <ChevronLeft size={22} color="#0D9488" />
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setShowYearPicker(true)}
                                className="flex-row items-center gap-2 px-4 py-3 bg-gray-100 rounded-xl"
                            >
                                <Text className="font-medium text-gray-900">{selectedYear}</Text>
                                <ChevronDown size={16} color="#6B7280" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => navigateYear('next')} className="p-3">
                                <ChevronRight size={22} color="#0D9488" />
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

                    {/* Go to current period */}
                    {!isCurrentPeriod() && (
                        <TouchableOpacity onPress={goToCurrentPeriod} className="mt-3">
                            <Text className="text-teal-600 text-center text-sm">
                                Ir para {periodType === 'monthly' ? 'mês atual' : 'ano atual'}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Stats Cards */}
                <View className="gap-3 mb-6">
                    <TouchableOpacity 
                        onPress={() => handleFilterClick('income')}
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
                        {filter === 'income' && (
                            <Text className="text-green-600 text-xs mt-2 font-medium">✓ Filtro ativo</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity 
                        onPress={() => handleFilterClick('expense')}
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
                        {filter === 'expense' && (
                            <Text className="text-red-600 text-xs mt-2 font-medium">✓ Filtro ativo</Text>
                        )}
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

                {/* Transactions */}
                <View className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                    <View className="p-4 border-b border-gray-100 flex-row justify-between items-center">
                        <View>
                            <Text className="font-semibold text-gray-900">
                                {filter === 'all' && 'Todas as Transações'}
                                {filter === 'income' && 'Receitas'}
                                {filter === 'expense' && 'Despesas'}
                            </Text>
                            <Text className="text-gray-400 text-sm">{filteredTransactions.length} transação(ões)</Text>
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
                    <View>
                        {filteredTransactions.length === 0 ? (
                            <View className="p-8 items-center">
                                <Text className="text-gray-400">Nenhuma transação neste período</Text>
                            </View>
                        ) : (
                            filteredTransactions.map((transaction) => (
                                <View key={transaction.id} className="p-4 border-b border-gray-50 flex-row items-center justify-between">
                                    <View className="flex-row items-center gap-3">
                                        <View className={`w-10 h-10 rounded-lg items-center justify-center ${
                                            transaction.type === 'income' ? 'bg-green-100' : 'bg-red-100'
                                        }`}>
                                            {transaction.type === 'income' ? (
                                                <ArrowUpRight size={20} color="#22C55E" />
                                            ) : (
                                                <ArrowDownRight size={20} color="#EF4444" />
                                            )}
                                        </View>
                                        <View>
                                            <Text className="font-medium text-gray-900">{transaction.description}</Text>
                                            <Text className="text-gray-400 text-xs">
                                                {new Date(transaction.date).toLocaleDateString('pt-BR')}
                                            </Text>
                                        </View>
                                    </View>
                                    <Text className={`font-semibold ${transaction.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                                        {transaction.type === 'income' ? '+' : '-'} {formatCurrency(transaction.amount)}
                                    </Text>
                                </View>
                            ))
                        )}
                    </View>
                </View>

                <View className="h-6" />
            </ScrollView>

            {/* Month Picker Modal */}
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

            {/* Year Picker Modal */}
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
