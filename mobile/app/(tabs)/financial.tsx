import { useState, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, Pressable, RefreshControl, ActivityIndicator, Alert, SafeAreaView } from 'react-native';
import { ChevronLeft, ChevronRight, ChevronDown, Plus, Settings } from 'lucide-react-native';
import { router } from 'expo-router';
import { financialService } from '../../src/services/financial';
import type { FinancialTransaction, FinancialTransactionWithPatient } from '../../src/types/database';
import { IncomeTab } from '../../src/components/financial/IncomeTab';
import { ExpensesTab } from '../../src/components/financial/ExpensesTab';
import { ClosureTab } from '../../src/components/financial/ClosureTab';
import { NewExpenseModal } from '../../src/components/financial/NewExpenseModal';

const MONTHS = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

type PeriodType = 'monthly' | 'yearly';
type TabType = 'income' | 'expenses' | 'closure';

export default function Financial() {
    const [transactions, setTransactions] = useState<FinancialTransactionWithPatient[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<TabType>('income');

    // Period State
    const [periodType, setPeriodType] = useState<PeriodType>('monthly');
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    // UI State
    const [showMonthPicker, setShowMonthPicker] = useState(false);
    const [showYearPicker, setShowYearPicker] = useState(false);
    const [showNewExpenseModal, setShowNewExpenseModal] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<FinancialTransaction | null>(null);

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

            const data = await financialService.getTransactions(start, end);
            // Sort by date (newest first), then by created_at (newest first) for same-day transactions
            setTransactions(data.sort((a, b) => {
                const dateA = new Date(a.date).getTime();
                const dateB = new Date(b.date).getTime();
                if (dateB !== dateA) return dateB - dateA;
                // Same date: sort by created_at (newest first)
                const createdA = new Date(a.created_at).getTime();
                const createdB = new Date(b.created_at).getTime();
                return createdB - createdA;
            }));
        } catch (error) {
            console.error('Error loading financial data:', error);
            Alert.alert('Erro', 'Não foi possível carregar os dados financeiros');
        } finally {
            setLoading(false);
        }
    }, [selectedYear, selectedMonth, periodType]);

    // Use useEffect instead of useFocusEffect to avoid navigation context dependency
    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleEditTransaction = (transaction: FinancialTransaction) => {
        setEditingTransaction(transaction);
        setShowNewExpenseModal(true);
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

    const handleAddPress = () => {
        if (activeTab === 'expenses') {
            setEditingTransaction(null); // Ensure clean state
            setShowNewExpenseModal(true);
        } else {
            // Future: Handle other tabs (Income/Closure? Closure usually doesn't have add)
            Alert.alert("Em breve", "Adicionar transação manual para esta aba");
        }
    };

    return (
        <>
            <SafeAreaView className="flex-1 bg-gray-50">
                {/* Header Area */}
                <View className="bg-white pb-2 pt-2">
                    <View className="px-4 flex-row justify-between items-center mb-4">
                        <View>
                            <Text className="text-2xl font-bold text-gray-900">Financeiro</Text>
                            <Text className="text-gray-500 mt-1">Gestão de caixa</Text>
                        </View>
                        <View className="flex-row gap-2">
                            <TouchableOpacity
                                className="bg-gray-100 p-3 rounded-xl border border-gray-200"
                                onPress={() => router.push('/settings/financial')}
                            >
                                <Settings size={20} color="#4B5563" />
                            </TouchableOpacity>
                            <TouchableOpacity className="bg-teal-500 p-3 rounded-xl" onPress={handleAddPress}>
                                <Plus size={20} color="#FFFFFF" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Period Controls */}
                    <View className="px-4 mb-4">
                        <View className="bg-gray-50 rounded-xl p-3 border border-gray-100 flex-row justify-between items-center">
                            {/* Toggle Monthly/Yearly */}
                            <View className="bg-gray-200 rounded-lg p-0.5 flex-row">
                                <TouchableOpacity
                                    onPress={() => setPeriodType('monthly')}
                                    style={{
                                        paddingHorizontal: 12,
                                        paddingVertical: 6,
                                        borderRadius: 6,
                                        backgroundColor: periodType === 'monthly' ? '#FFFFFF' : 'transparent',
                                        shadowColor: '#000',
                                        shadowOffset: { width: 0, height: 1 },
                                        shadowOpacity: periodType === 'monthly' ? 0.1 : 0,
                                        shadowRadius: 1,
                                        elevation: periodType === 'monthly' ? 2 : 0
                                    }}
                                >
                                    <Text className={`text-xs font-medium ${periodType === 'monthly' ? 'text-gray-900' : 'text-gray-500'}`}>Mensal</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => setPeriodType('yearly')}
                                    style={{
                                        paddingHorizontal: 12,
                                        paddingVertical: 6,
                                        borderRadius: 6,
                                        backgroundColor: periodType === 'yearly' ? '#FFFFFF' : 'transparent',
                                        shadowColor: '#000',
                                        shadowOffset: { width: 0, height: 1 },
                                        shadowOpacity: periodType === 'yearly' ? 0.1 : 0,
                                        shadowRadius: 1,
                                        elevation: periodType === 'yearly' ? 2 : 0
                                    }}
                                >
                                    <Text className={`text-xs font-medium ${periodType === 'yearly' ? 'text-gray-900' : 'text-gray-500'}`}>Anual</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Date Nav */}
                            <View className="flex-row items-center gap-2">
                                <TouchableOpacity onPress={() => periodType === 'monthly' ? navigateMonth('prev') : navigateYear('prev')} className="p-1">
                                    <ChevronLeft size={20} color="#6B7280" />
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={() => periodType === 'monthly' ? setShowMonthPicker(true) : setShowYearPicker(true)}
                                    className="flex-row items-center gap-1"
                                >
                                    <Text className="font-semibold text-gray-900 text-sm">
                                        {periodType === 'monthly' ? `${MONTHS[selectedMonth]} ${selectedYear}` : selectedYear}
                                    </Text>
                                    <ChevronDown size={14} color="#6B7280" />
                                </TouchableOpacity>

                                <TouchableOpacity onPress={() => periodType === 'monthly' ? navigateMonth('next') : navigateYear('next')} className="p-1">
                                    <ChevronRight size={20} color="#6B7280" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    <View className="flex-row px-4 border-b border-gray-100">
                        <TouchableOpacity
                            onPress={() => setActiveTab('income')}
                            style={{
                                flex: 1,
                                paddingBottom: 12,
                                alignItems: 'center',
                                borderBottomWidth: 2,
                                borderBottomColor: activeTab === 'income' ? '#0D9488' : 'transparent'
                            }}
                        >
                            <Text className={`font-medium ${activeTab === 'income' ? 'text-teal-600' : 'text-gray-500'}`}>Receitas</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setActiveTab('expenses')}
                            style={{
                                flex: 1,
                                paddingBottom: 12,
                                alignItems: 'center',
                                borderBottomWidth: 2,
                                borderBottomColor: activeTab === 'expenses' ? '#0D9488' : 'transparent'
                            }}
                        >
                            <Text className={`font-medium ${activeTab === 'expenses' ? 'text-teal-600' : 'text-gray-500'}`}>Despesas</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setActiveTab('closure')}
                            style={{
                                flex: 1,
                                paddingBottom: 12,
                                alignItems: 'center',
                                borderBottomWidth: 2,
                                borderBottomColor: activeTab === 'closure' ? '#0D9488' : 'transparent'
                            }}
                        >
                            <Text className={`font-medium ${activeTab === 'closure' ? 'text-teal-600' : 'text-gray-500'}`}>Fechamento</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Content Area */}
                <View className="flex-1 relative">
                    {loading && (
                        <View className="absolute inset-0 z-50 bg-white/50 justify-center items-center">
                            <ActivityIndicator size="large" color="#0D9488" />
                        </View>
                    )}

                    {activeTab === 'income' && <IncomeTab transactions={transactions} loading={loading} onEdit={handleEditTransaction} onRefresh={loadData} refreshing={loading} />}
                    {activeTab === 'expenses' && <ExpensesTab transactions={transactions} loading={loading} onEdit={handleEditTransaction} onRefresh={loadData} refreshing={loading} />}
                    {activeTab === 'closure' && <ClosureTab transactions={transactions} loading={loading} onRefresh={loadData} refreshing={loading} />}
                </View>

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
            <NewExpenseModal
                visible={showNewExpenseModal}
                onClose={() => {
                    setShowNewExpenseModal(false);
                    setEditingTransaction(null);
                }}
                onSave={loadData}
                transactionToEdit={editingTransaction}
            />
        </>
    );
}
