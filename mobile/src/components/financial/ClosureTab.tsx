import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput, RefreshControl } from 'react-native';
import { DollarSign, Filter, X } from 'lucide-react-native';
import { FinancialTransaction } from '../../types/database';
import { locationsService, Location } from '../../services/locations';
import { settingsService } from '../../services/settings';
import { useState, useMemo, useEffect } from 'react';

interface ClosureTabProps {
    transactions: FinancialTransaction[];
    loading: boolean;
    onRefresh?: () => void;
    refreshing?: boolean;
}

interface FilterState {
    locations: string[];
    methods: string[];
    startDate: string;
    endDate: string;
}

const INITIAL_FILTERS: FilterState = {
    locations: [],
    methods: [],
    startDate: '',
    endDate: ''
};

const COMMON_METHODS = ['Pix', 'Cartão de Crédito', 'Cartão de Débito', 'Dinheiro'];

const getPaymentMethod = (description: string): string | null => {
    const methodMatch = description.match(/\((.*?)\)/);
    if (!methodMatch) return null;

    const rawParts = methodMatch[1].split(' - ');
    let m = rawParts[0].trim();

    if (m.toLowerCase().match(/^(crédito|credit)$/)) return 'Cartão de Crédito';
    if (m.toLowerCase().match(/^(débito|debit)$/)) return 'Cartão de Débito';
    if (m.toLowerCase().match(/^(pix)$/)) return 'Pix';
    if (m.toLowerCase().match(/^(dinheiro|cash)$/)) return 'Dinheiro';
    if (m.toLowerCase().match(/^(boleto)$/)) return 'Boleto';

    return m;
};

export function ClosureTab({ transactions, loading, onRefresh, refreshing }: ClosureTabProps) {
    // Filter State
    const [filterModalVisible, setFilterModalVisible] = useState(false);
    const [activeFilters, setActiveFilters] = useState<FilterState>(INITIAL_FILTERS);
    const [tempFilters, setTempFilters] = useState<FilterState>(INITIAL_FILTERS);

    // Locations State
    const [availableLocations, setAvailableLocations] = useState<Location[]>([]);

    // Settings State
    const [taxRate, setTaxRate] = useState(0);

    useEffect(() => {
        loadLocations();
        loadSettings();
    }, []);

    const loadLocations = async () => {
        try {
            const data = await locationsService.getAll();
            setAvailableLocations(data);
        } catch (error) {
            console.error('Error loading locations', error);
        }
    };

    const loadSettings = async () => {
        try {
            const settings = await settingsService.getFinancialSettings();
            if (settings) {
                setTaxRate(settings.tax_rate || 0);
            }
        } catch (error) {
            console.error('Error loading financial settings', error);
        }
    };

    // Derived Options
    const uniqueLocations = useMemo(() => {
        if (availableLocations.length > 0) {
            return availableLocations.map(l => l.name).sort();
        }
        return Array.from(new Set(transactions.map(t => t.location).filter(Boolean) as string[])).sort();
    }, [transactions, availableLocations]);

    const uniqueMethods = useMemo(() => {
        const methods = new Set<string>(COMMON_METHODS);
        transactions.forEach(t => {
            if (t.type === 'income') {
                const m = getPaymentMethod(t.description);
                if (m) methods.add(m);
            }
        });
        return Array.from(methods).sort();
    }, [transactions]);

    // Filtering Logic
    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            // 1. Location (Applies to ALL)
            if (activeFilters.locations.length > 0) {
                if (!t.location || !activeFilters.locations.includes(t.location)) return false;
            }

            // 2. Method (Applies to both Income and Expense if method is present)
            if (activeFilters.methods.length > 0) {
                const method = getPaymentMethod(t.description) || 'Não informado';
                if (!activeFilters.methods.includes(method)) return false;
            }

            // 3. Date Range
            const tDate = new Date(t.date);
            tDate.setHours(0, 0, 0, 0);
            // Fix timezone issue by treating string date as local noon
            const [y, m, d] = t.date.split('-').map(Number);
            const compDate = new Date(y, m - 1, d); // Local

            if (activeFilters.startDate) {
                const [d, m, y] = activeFilters.startDate.split('/');
                if (d && m && y) {
                    const start = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
                    if (compDate < start) return false;
                }
            }

            if (activeFilters.endDate) {
                const [d, m, y] = activeFilters.endDate.split('/');
                if (d && m && y) {
                    const end = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
                    if (compDate > end) return false;
                }
            }

            return true;
        });
    }, [transactions, activeFilters]);

    const activeFilterCount = (activeFilters.locations.length > 0 ? 1 : 0) +
        (activeFilters.methods.length > 0 ? 1 : 0) +
        (activeFilters.startDate || activeFilters.endDate ? 1 : 0);

    const totalIncome = filteredTransactions
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

    // Calculate Tax based on Total Income * Rate
    const totalTaxes = totalIncome * (taxRate / 100);

    const totalCardFees = filteredTransactions
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + (t.card_fee_amount || 0), 0);

    // Calculate total anticipation fees from income transactions
    const totalAnticipation = filteredTransactions
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + ((t as any).anticipation_amount || 0), 0);

    // Note: totalNetIncome logic was: reduced (net_amount || amount). 
    // Now we must be careful. If we calculate taxes separately, we shouldn't subtract them twice 
    // if net_amount ALREADY subtracts them.
    // Assuming net_amount subtracts fees only? Or creates a mess?
    // Let's stick to calculating explicit deductions block and Final Net Result = Income - Deductions.

    const totalExpenses = filteredTransactions
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

    const expensesByLocation = filteredTransactions
        .filter(t => t.type === 'expense' && t.location)
        .reduce((acc, t) => {
            const loc = t.location!;
            acc[loc] = (acc[loc] || 0) + t.amount;
            return acc;
        }, {} as Record<string, number>);

    const feesByLocation = filteredTransactions
        .filter(t => t.location && (t.location_amount || 0) > 0)
        .reduce((acc, t) => {
            const loc = t.location!;
            acc[loc] = (acc[loc] || 0) + (t.location_amount || 0);
            return acc;
        }, {} as Record<string, number>);

    // New: Aggregate by Category for Detailed Statement
    const expensesByCategory = filteredTransactions
        .filter(t => t.type === 'expense')
        .reduce((acc, t) => {
            const cat = t.category || 'Outros';
            acc[cat] = (acc[cat] || 0) + t.amount;
            return acc;
        }, {} as Record<string, number>);

    const totalFees = Object.values(feesByLocation).reduce((sum, v) => sum + v, 0);

    // Net Result - now includes anticipation fees
    const netResult = totalIncome - totalCardFees - totalAnticipation - totalFees - totalTaxes - totalExpenses;

    // Profit Margin
    const profitMargin = totalIncome > 0 ? ((netResult / totalIncome) * 100).toFixed(1) : '0';


    const toggleFilterLocation = (loc: string) => {
        setTempFilters(prev => {
            const exists = prev.locations.includes(loc);
            return {
                ...prev,
                locations: exists ? prev.locations.filter(l => l !== loc) : [...prev.locations, loc]
            };
        });
    };

    const toggleFilterMethod = (method: string) => {
        setTempFilters(prev => {
            const exists = prev.methods.includes(method);
            return {
                ...prev,
                methods: exists ? prev.methods.filter(m => m !== method) : [...prev.methods, method]
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

    const formatCurrency = (value: number) => {
        return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    return (
        <View className="flex-1">
            {/* Header / Filter Bar */}
            <View className="flex-row items-center justify-end px-4 mt-4 mb-2">
                <TouchableOpacity
                    onPress={() => {
                        setTempFilters(activeFilters);
                        setFilterModalVisible(true);
                    }}
                    className={`p-2 rounded-lg border ${activeFilterCount > 0 ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'}`}
                >
                    <View className="flex-row items-center gap-2">
                        <Filter size={18} color={activeFilterCount > 0 ? '#2563EB' : '#6b7280'} />
                        <Text className={`text-sm font-medium ${activeFilterCount > 0 ? 'text-blue-600' : 'text-gray-600'}`}>Filtros</Text>
                        {activeFilterCount > 0 && (
                            <View className="bg-blue-500 rounded-full w-5 h-5 items-center justify-center">
                                <Text className="text-white text-[10px] font-bold">{activeFilterCount}</Text>
                            </View>
                        )}
                    </View>
                </TouchableOpacity>
            </View>

            <ScrollView
                className="flex-1 px-4 py-2"
                showsVerticalScrollIndicator={false}
                refreshControl={
                    onRefresh ? (
                        <RefreshControl
                            refreshing={refreshing || false}
                            onRefresh={onRefresh}
                            colors={['#0D9488']}
                            tintColor="#0D9488"
                        />
                    ) : undefined
                }
            >
                {/* Balance Card */}
                <View className="bg-teal-600 p-6 rounded-2xl mb-6 shadow-md shadow-teal-900/20">
                    <Text className="text-teal-100 text-sm font-medium mb-1">Saldo Final</Text>
                    <Text className="text-4xl font-bold text-white mb-4">
                        {formatCurrency(netResult)}
                    </Text>

                    <View className="flex-row bg-teal-800/30 rounded-xl p-3 justify-between">
                        <View>
                            <Text className="text-teal-100 text-xs">Margem</Text>
                            <Text className="text-white font-bold">{profitMargin}%</Text>
                        </View>
                        <View className="w-px bg-teal-500/30 mx-2" />
                        <View>
                            <Text className="text-teal-100 text-xs">Entradas</Text>
                            <Text className="text-white font-bold">{formatCurrency(totalIncome)}</Text>
                        </View>
                        <View className="w-px bg-teal-500/30 mx-2" />
                        <View>
                            <Text className="text-teal-100 text-xs">Saídas</Text>
                            <Text className="text-white font-bold">{formatCurrency(totalExpenses)}</Text>
                        </View>
                    </View>
                </View>

                {/* Financial Statement Visualization */}
                <View className="bg-white p-6 rounded-xl border border-gray-100 mb-6">
                    <Text className="text-sm font-semibold text-gray-900 mb-6">Demonstrativo Financeiro</Text>

                    {/* 1. Gross Income (Positive) */}
                    <View className="mb-4">
                        <View className="flex-row justify-between items-center mb-1">
                            <Text className="text-gray-900 font-medium text-sm">Receita Bruta</Text>
                            <Text className="text-gray-900 font-bold text-sm">{formatCurrency(totalIncome)}</Text>
                        </View>
                        <View className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <View className="h-full bg-green-500 rounded-full" style={{ width: '100%' }} />
                        </View>
                    </View>

                    {/* Deductions Block */}
                    <View className="space-y-3 mb-6">
                        {/* 2. Card Fees (Negative) */}
                        <View className="flex-row justify-between items-center">
                            <View className="flex-row items-center gap-2 pl-2 border-l-2 border-red-100">
                                <Text className="text-gray-500 text-xs">(-) Taxas de Cartão</Text>
                            </View>
                            <Text className={totalCardFees > 0 ? "text-red-500 font-medium text-xs" : "text-gray-400 text-xs"}>
                                {totalCardFees > 0 ? formatCurrency(totalCardFees) : 'R$ 0,00'}
                            </Text>
                        </View>

                        {/* Anticipation Fees (Negative) */}
                        <View className="flex-row justify-between items-center">
                            <View className="flex-row items-center gap-2 pl-2 border-l-2 border-yellow-100">
                                <Text className="text-gray-500 text-xs">(-) Taxa de Antecipação</Text>
                            </View>
                            <Text className={totalAnticipation > 0 ? "text-yellow-600 font-medium text-xs" : "text-gray-400 text-xs"}>
                                {totalAnticipation > 0 ? formatCurrency(totalAnticipation) : 'R$ 0,00'}
                            </Text>
                        </View>

                        {/* 3. Location Fees (Negative) */}
                        <View className="flex-row justify-between items-center">
                            <View className="flex-row items-center gap-2 pl-2 border-l-2 border-red-100">
                                <Text className="text-gray-500 text-xs">(-) Taxas de Procedimentos</Text>
                            </View>
                            <Text className={totalFees > 0 ? "text-red-500 font-medium text-xs" : "text-gray-400 text-xs"}>
                                {totalFees > 0 ? formatCurrency(totalFees) : 'R$ 0,00'}
                            </Text>
                        </View>

                        {/* 4. Taxes (Negative) */}
                        <View className="flex-row justify-between items-center">
                            <View className="flex-row items-center gap-2 pl-2 border-l-2 border-red-100">
                                <Text className="text-gray-500 text-xs">
                                    (-) Impostos ({taxRate}%)
                                </Text>
                            </View>
                            <Text className={totalTaxes > 0 ? "text-red-500 font-medium text-xs" : "text-gray-400 text-xs"}>
                                {totalTaxes > 0 ? formatCurrency(totalTaxes) : 'R$ 0,00'}
                            </Text>
                        </View>

                        {/* 5. Expenses (Negative) */}
                        {/* 5. Expenses (Detailed by Category) */}
                        <View>
                            <View className="flex-row items-center gap-2 pl-2 border-l-2 border-red-100 mb-1">
                                <Text className="text-gray-500 text-xs font-medium">(-) Despesas Operacionais</Text>
                            </View>

                            {/* List Categories */}
                            {Object.entries(expensesByCategory)
                                .sort(([, a], [, b]) => b - a)
                                .map(([category, amount]) => (
                                    <View key={category} className="flex-row justify-between items-center pl-4 py-0.5">
                                        <Text className="text-gray-400 text-[10px]">{category}</Text>
                                        <Text className="text-red-400 text-[10px]">
                                            {formatCurrency(amount)}
                                        </Text>
                                    </View>
                                ))}

                            {/* Show safe fallback if 0 expenses to keep layout consistent? No, just hide if 0. */}
                            {totalExpenses === 0 && (
                                <View className="flex-row justify-between items-center pl-4">
                                    <Text className="text-gray-400 text-[10px]">-</Text>
                                    <Text className="text-gray-400 text-[10px]">R$ 0,00</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Divider */}
                    <View className="h-px bg-gray-200 mb-4 border-t border-dashed" />

                    {/* 6. Net Result (Equals) */}
                    <View className="flex-row justify-between items-center">
                        <Text className="text-gray-900 font-bold text-base">Receita Líquida</Text>
                        <Text className={`text-xl font-bold ${netResult >= 0 ? 'text-teal-600' : 'text-red-600'}`}>
                            {formatCurrency(netResult)}
                        </Text>
                    </View>
                    <Text className="text-right text-[10px] text-gray-400 mt-1">
                        (Bruto - Taxas - Impostos - Despesas)
                    </Text>
                </View>

                {/* Location Fees Breakdown (Vertical List like Payment Methods) */}
                {Object.keys(feesByLocation).length > 0 && (
                    <View className="bg-white p-6 rounded-xl border border-gray-100 mb-6">
                        <Text className="text-sm font-semibold text-gray-900 mb-4">Taxas por Local</Text>
                        <View className="gap-3">
                            {Object.entries(feesByLocation)
                                .sort(([, a], [, b]) => b - a)
                                .map(([location, amount]) => (
                                    <Row
                                        key={location}
                                        label={location}
                                        value={amount}
                                        total={totalFees} // Percentage relative to total fees? Or total income? Usually total fees makes sense for distribution.
                                        format={(v) => formatCurrency(v).replace('R$', '- R$')}
                                        color="bg-orange-500"
                                    />
                                ))}
                        </View>
                        <View className="mt-4 pt-4 border-t border-gray-50 flex-row justify-between items-center">
                            <Text className="text-gray-500 text-xs">Total de Taxas</Text>
                            <Text className="text-orange-600 font-bold">{formatCurrency(totalFees).replace('R$', '- R$')}</Text>
                        </View>
                    </View>
                )}

                {/* Expenses by Location Breakdown */}
                {totalExpenses > 0 && (
                    <View className="mb-6">
                        <Text className="text-sm font-semibold text-gray-900 mb-4">Despesas por Local</Text>
                        {Object.keys(expensesByLocation).length > 0 ? (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-3">
                                {Object.entries(expensesByLocation).map(([location, amount]: [string, number]) => (
                                    <View key={location} className="bg-red-50 p-3 rounded-lg border border-red-100 mr-2 min-w-[140px]">
                                        <View className="flex-row items-center gap-1 mb-1">
                                            <Text className="text-xs text-gray-500" numberOfLines={1}>{location}</Text>
                                        </View>
                                        <Text className="text-lg font-bold text-red-600">{formatCurrency(amount).replace('R$', '- R$')}</Text>
                                    </View>
                                ))}
                            </ScrollView>
                        ) : (
                            <Text className="text-gray-400 text-sm italic">Nenhuma despesa com local informado.</Text>
                        )}
                    </View>
                )}

                <Breakdowns transactions={filteredTransactions} formatCurrency={formatCurrency} />


            </ScrollView>

            {/* Filter Modal */}
            <Modal visible={filterModalVisible} animationType="slide" transparent>
                <View className="flex-1 justify-end bg-black/50">
                    <View className="bg-white rounded-t-3xl h-[85%]">
                        <View className="flex-row justify-between items-center p-4 border-b border-gray-100">
                            <Text className="text-xl font-bold text-gray-800">Filtrar Fechamento</Text>
                            <TouchableOpacity onPress={() => setFilterModalVisible(false)} className="bg-gray-100 p-2 rounded-full">
                                <X size={20} color="#374151" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView className="flex-1 p-4">
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

                            {/* Locations */}
                            <Text className="text-sm font-semibold text-gray-700 mb-2">Local de Atendimento</Text>
                            <View className="flex-row flex-wrap gap-2 mb-8">
                                {uniqueLocations.map(loc => (
                                    <TouchableOpacity
                                        key={loc}
                                        onPress={() => toggleFilterLocation(loc)}
                                        className={`px-3 py-2 rounded-lg border ${tempFilters.locations.includes(loc) ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'}`}
                                    >
                                        <Text className={`text-xs ${tempFilters.locations.includes(loc) ? 'text-blue-700 font-medium' : 'text-gray-600'}`}>
                                            {loc}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Payment Methods */}
                            <Text className="text-sm font-semibold text-gray-700 mb-2">Forma de Pagamento (Receitas)</Text>
                            <View className="flex-row flex-wrap gap-2 mb-6">
                                {uniqueMethods.map(method => (
                                    <TouchableOpacity
                                        key={method}
                                        onPress={() => toggleFilterMethod(method)}
                                        className={`px-3 py-2 rounded-lg border ${tempFilters.methods.includes(method) ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'}`}
                                    >
                                        <Text className={`text-xs ${tempFilters.methods.includes(method) ? 'text-blue-700 font-medium' : 'text-gray-600'}`}>
                                            {method}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>

                        {/* Footer Buttons */}
                        <View className="p-4 border-t border-gray-100 bg-white safe-area-bottom">
                            <TouchableOpacity
                                onPress={applyFilters}
                                className="bg-blue-600 rounded-xl p-4 items-center mb-3"
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

function Breakdowns({ transactions, formatCurrency }: { transactions: FinancialTransaction[], formatCurrency: (v: number) => string }) {
    // Only analyze Income for Payment Methods
    const incomeTransactions = transactions.filter(t => t.type === 'income');

    const totals = {
        credit: 0,
        debit: 0,
        pix: 0,
        cash: 0,
        transfer: 0,
        other: 0
    };

    const brands = {
        visa_master: 0,
        elo: 0,
        other: 0,
        unknown: 0
    };

    incomeTransactions.forEach(t => {
        const desc = t.description.toLowerCase();
        let matched = false;

        if (desc.includes('(crédito') || desc.includes('crédito')) {
            totals.credit += t.amount;
            matched = true;

            // Brand check (only for cards)
            if (desc.includes('visa/master') || desc.includes('visa') || desc.includes('master')) brands.visa_master += t.amount;
            else if (desc.includes('elo')) brands.elo += t.amount;
            else if (desc.includes('outro')) brands.other += t.amount;
            else brands.unknown += t.amount;
        }
        else if (desc.includes('(débito') || desc.includes('débito')) {
            totals.debit += t.amount;
            matched = true;

            // Brand check (only for cards)
            if (desc.includes('visa/master') || desc.includes('visa') || desc.includes('master')) brands.visa_master += t.amount;
            else if (desc.includes('elo')) brands.elo += t.amount;
            else if (desc.includes('outro')) brands.other += t.amount;
            else brands.unknown += t.amount;
        }
        else if (desc.includes('(pix') || desc.includes('pix')) {
            totals.pix += t.amount;
            matched = true;
        }
        else if (desc.includes('(dinheiro') || desc.includes('dinheiro')) {
            totals.cash += t.amount;
            matched = true;
        }
        else if (desc.includes('(transf') || desc.includes('transferência')) {
            totals.transfer += t.amount;
            matched = true;
        }

        if (!matched) {
            totals.other += t.amount;
        }
    });

    const hasCardData = totals.credit > 0 || totals.debit > 0;

    return (
        <View>
            {/* Payment Methods */}
            <View className="bg-white p-6 rounded-xl border border-gray-100 mb-6">
                <Text className="text-sm font-semibold text-gray-900 mb-4">Resumo por Forma de Pagamento</Text>

                <View className="gap-3">
                    <Row label="Pix" value={totals.pix} total={incomeTransactions.reduce((acc, t) => acc + t.amount, 0)} format={formatCurrency} color="bg-teal-500" />
                    <Row label="Dinheiro" value={totals.cash} total={incomeTransactions.reduce((acc, t) => acc + t.amount, 0)} format={formatCurrency} color="bg-green-600" />
                    <Row label="Crédito" value={totals.credit} total={incomeTransactions.reduce((acc, t) => acc + t.amount, 0)} format={formatCurrency} color="bg-blue-500" />
                    <Row label="Débito" value={totals.debit} total={incomeTransactions.reduce((acc, t) => acc + t.amount, 0)} format={formatCurrency} color="bg-blue-400" />
                    {totals.transfer > 0 && <Row label="Transferência" value={totals.transfer} total={incomeTransactions.reduce((acc, t) => acc + t.amount, 0)} format={formatCurrency} color="bg-purple-500" />}
                    {totals.other > 0 && <Row label="Outros / Não ident." value={totals.other} total={incomeTransactions.reduce((acc, t) => acc + t.amount, 0)} format={formatCurrency} color="bg-gray-400" />}
                </View>
            </View>

            {/* Brands (Only show if cards exist) */}
            {hasCardData && (
                <View className="bg-white p-6 rounded-xl border border-gray-100 mb-6">
                    <Text className="text-sm font-semibold text-gray-900 mb-4">Detalhamento de Cartões (Bandeiras)</Text>
                    <Text className="text-xs text-gray-500 mb-4 -mt-2">Total Crédito + Débito: {formatCurrency(totals.credit + totals.debit)}</Text>

                    <View className="flex-row gap-4 mb-2">
                        <BrandBox label="Visa/Master" value={brands.visa_master} />
                        <BrandBox label="Elo" value={brands.elo} />
                        <BrandBox label="Outros" value={brands.other + brands.unknown} />
                    </View>
                </View>
            )}
        </View>
    );
}

function Row({ label, value, total, format, color }: { label: string, value: number, total: number, format: (v: number) => string, color: string }) {
    if (value === 0) return null;
    const percentage = total > 0 ? (value / total) * 100 : 0;

    return (
        <View>
            <View className="flex-row justify-between mb-1">
                <Text className="text-gray-600 text-xs">{label}</Text>
                <Text className="text-gray-900 font-medium text-xs">{format(value)}</Text>
            </View>
            <View className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <View className={`h-full ${color} rounded-full`} style={{ width: `${percentage}%` }} />
            </View>
        </View>
    );
}

function BrandBox({ label, value }: { label: string, value: number }) {
    return (
        <View className="flex-1 bg-gray-50 p-3 rounded-lg border border-gray-100 items-center">
            <Text className="text-xs text-gray-500 mb-1">{label}</Text>
            <Text className="text-sm font-bold text-gray-900">
                {value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </Text>
        </View>
    );
}

