import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { TrendingUp, ArrowUpRight, MapPin, Filter } from 'lucide-react-native';
import { FinancialTransactionWithPatient } from '../../types/database';
import { locationsService, Location } from '../../services/locations';
import { FilterState, INITIAL_FILTERS, COMMON_METHODS } from '../../types/financial';
import { formatCurrency, formatDate, getPaymentMethod, parseTransactionDescription } from '../../utils/financial';
import { IncomeFilterModal } from './IncomeFilterModal';
import { IncomeDetailModal } from './IncomeDetailModal';

interface IncomeTabProps {
    transactions: FinancialTransactionWithPatient[];
    loading: boolean;
    onRefresh?: () => void;
    refreshing?: boolean;
}

type IncomeSubTab = 'gross' | 'net';

export function IncomeTab({ transactions, loading, onRefresh, refreshing }: IncomeTabProps) {
    const [selectedTransaction, setSelectedTransaction] = useState<FinancialTransactionWithPatient | null>(null);
    const [subTab, setSubTab] = useState<IncomeSubTab>('gross');

    // Filter State
    const [filterModalVisible, setFilterModalVisible] = useState(false);
    const [activeFilters, setActiveFilters] = useState<FilterState>(INITIAL_FILTERS);

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

    // Derive unique options for filters
    const uniqueMethods = useMemo(() => {
        const methods = new Set<string>(COMMON_METHODS);
        transactions.forEach(t => {
            const m = getPaymentMethod(t.description);
            if (m) methods.add(m);
        });
        return Array.from(methods).sort();
    }, [transactions]);

    const uniqueLocations = useMemo(() => {
        if (availableLocations.length > 0) {
            return availableLocations.map(l => l.name).sort();
        }
        return Array.from(new Set(transactions.map(t => t.location).filter(Boolean) as string[])).sort();
    }, [transactions, availableLocations]);

    // Apply Filters Logic
    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            if (t.type !== 'income') return false;

            // 1. Patient Name
            if (activeFilters.patientName) {
                const pName = t.patients?.name?.toLowerCase() || '';
                if (!pName.includes(activeFilters.patientName.toLowerCase())) return false;
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

            // 3. Methods
            if (activeFilters.methods.length > 0) {
                const tMethod = getPaymentMethod(t.description) || 'Não informado';
                if (!activeFilters.methods.includes(tMethod)) return false;
            }

            // 4. Locations
            if (activeFilters.locations.length > 0) {
                if (!t.location || !activeFilters.locations.includes(t.location)) return false;
            }

            return true;
        });
    }, [transactions, activeFilters]);

    // Calculations
    const totalGrossIncome = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);
    const totalNetIncome = filteredTransactions.reduce((sum, t) => sum + (t.net_amount || t.amount), 0);

    const incomeByLocation = filteredTransactions
        .filter(t => t.location)
        .reduce((acc, t) => {
            const loc = t.location!;
            const amount = subTab === 'gross' ? t.amount : (t.net_amount || t.amount);
            acc[loc] = (acc[loc] || 0) + amount;
            return acc;
        }, {} as Record<string, number>);

    const relatedInstallments = selectedTransaction?.related_entity_id
        ? transactions
            .filter(t => t.related_entity_id === selectedTransaction.related_entity_id)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        : [];

    const displayTotal = subTab === 'gross' ? totalGrossIncome : totalNetIncome;
    const displayLabel = subTab === 'gross' ? 'Receita Bruta' : 'Receita Líquida';

    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (activeFilters.patientName) count++;
        if (activeFilters.startDate || activeFilters.endDate) count++;
        if (activeFilters.methods.length > 0) count++;
        if (activeFilters.locations.length > 0) count++;
        return count;
    }, [activeFilters]);

    const handleApplyFilters = (filters: FilterState) => {
        setActiveFilters(filters);
        setFilterModalVisible(false);
    };

    const handleClearFilters = () => {
        setActiveFilters(INITIAL_FILTERS);
        setFilterModalVisible(false);
    };

    return (
        <View className="flex-1">
            {/* Header / Filter Bar */}
            <View className="flex-row items-center justify-between px-4 mt-4 mb-2">
                {/* Sub-tabs */}
                <View className="flex-row bg-gray-100 rounded-lg p-1 flex-1 mr-4">
                    <TouchableOpacity
                        onPress={() => setSubTab('gross')}
                        style={{
                            flex: 1,
                            paddingVertical: 6,
                            borderRadius: 6,
                            alignItems: 'center',
                            backgroundColor: subTab === 'gross' ? '#FFFFFF' : 'transparent',
                            shadowColor: subTab === 'gross' ? '#000' : 'transparent',
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: subTab === 'gross' ? 0.1 : 0,
                            shadowRadius: 1,
                            elevation: subTab === 'gross' ? 2 : 0
                        }}
                    >
                        <Text className={`text-xs font-medium ${subTab === 'gross' ? 'text-green-600' : 'text-gray-500'}`}>Bruta</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setSubTab('net')}
                        style={{
                            flex: 1,
                            paddingVertical: 6,
                            borderRadius: 6,
                            alignItems: 'center',
                            backgroundColor: subTab === 'net' ? '#FFFFFF' : 'transparent',
                            shadowColor: subTab === 'net' ? '#000' : 'transparent',
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: subTab === 'net' ? 0.1 : 0,
                            shadowRadius: 1,
                            elevation: subTab === 'net' ? 2 : 0
                        }}
                    >
                        <Text className={`text-xs font-medium ${subTab === 'net' ? 'text-green-600' : 'text-gray-500'}`}>Líquida</Text>
                    </TouchableOpacity>
                </View>

                {/* Filter Button */}
                <TouchableOpacity
                    onPress={() => setFilterModalVisible(true)}
                    className={`p-2 rounded-lg border ${activeFilterCount > 0 ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}
                >
                    <View className="flex-row items-center gap-2">
                        <Filter size={18} color={activeFilterCount > 0 ? '#16a34a' : '#6b7280'} />
                        {activeFilterCount > 0 && (
                            <View className="bg-green-500 rounded-full w-5 h-5 items-center justify-center">
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
                            colors={['#22C55E']}
                            tintColor="#22C55E"
                        />
                    ) : undefined
                }
            >
                {/* Summary Card */}
                <View className="bg-white p-4 rounded-xl border border-green-100 mb-6 shadow-sm">
                    <View className="flex-row justify-between items-center">
                        <View>
                            <Text className="text-gray-500 text-sm">{displayLabel} {activeFilterCount > 0 ? '(Filtrado)' : ''}</Text>
                            <Text className="text-3xl font-bold text-green-500 mt-1">{formatCurrency(displayTotal)}</Text>
                            {subTab === 'net' && totalGrossIncome !== totalNetIncome && (
                                <Text className="text-xs text-gray-400 mt-1">
                                    Deduções: {formatCurrency(totalGrossIncome - totalNetIncome)}
                                </Text>
                            )}
                        </View>
                        <View className="w-12 h-12 bg-green-100 rounded-xl items-center justify-center">
                            <TrendingUp size={24} color="#22C55E" />
                        </View>
                    </View>
                </View>

                {/* Breakdown by Location */}
                {Object.keys(incomeByLocation).length > 0 && (
                    <View className="mb-6">
                        <Text className="text-sm font-semibold text-gray-700 mb-3">Receita por Unidade</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-3">
                            {Object.entries(incomeByLocation).map(([location, amount]: [string, number]) => (
                                <View key={location} className="bg-white p-3 rounded-lg border border-gray-100 mr-2 min-w-[140px]">
                                    <Text className="text-xs text-gray-500 mb-1" numberOfLines={1}>{location}</Text>
                                    <Text className="text-lg font-bold text-green-600">{formatCurrency(amount)}</Text>
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                )}

                {/* Transactions List */}
                <Text className="text-sm font-semibold text-gray-700 mb-3">
                    Transações ({filteredTransactions.length})
                </Text>
                <View className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-8">
                    {filteredTransactions.length === 0 ? (
                        <View className="p-8 items-center">
                            <Text className="text-gray-400 italic">Nenhum resultado encontrado</Text>
                        </View>
                    ) : (
                        filteredTransactions
                            .slice()
                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                            .map((transaction) => {
                                const parsed = parseTransactionDescription(
                                    transaction.description,
                                    transaction.patients?.name || ''
                                );

                                // Extract treatment info from linked budget if available
                                let treatmentDisplay = parsed.displayDescription;
                                let paymentMethodFromBudget: string | null = null;

                                const budgetData = (transaction as any).budgets;
                                if (budgetData?.notes) {
                                    try {
                                        const budgetNotes = JSON.parse(budgetData.notes);
                                        if (budgetNotes.teeth && Array.isArray(budgetNotes.teeth)) {
                                            // Find the paid tooth matching this transaction
                                            const paidTeeth = budgetNotes.teeth.filter((t: any) => t.status === 'paid' || t.status === 'completed');
                                            if (paidTeeth.length > 0) {
                                                // Get treatments from the first paid tooth
                                                const tooth = paidTeeth[0];
                                                if (tooth.treatments && tooth.treatments.length > 0) {
                                                    const toothName = tooth.tooth.includes('Arcada') ? tooth.tooth : `Dente ${tooth.tooth}`;
                                                    treatmentDisplay = `${tooth.treatments.join(', ')} - ${toothName}`;
                                                }
                                                // Get payment method if available
                                                if (tooth.paymentMethod) {
                                                    paymentMethodFromBudget = tooth.paymentMethod;
                                                }
                                            }
                                        }
                                    } catch (e) {
                                        // JSON parse error, use parsed description
                                    }
                                }

                                // Determine final payment method
                                const finalPaymentMethod = (transaction as any).payment_method || paymentMethodFromBudget;
                                let paymentMethodLabel = parsed.displayMethod;
                                if (finalPaymentMethod) {
                                    paymentMethodLabel = finalPaymentMethod === 'credit' ? 'Cartão de Crédito' :
                                        finalPaymentMethod === 'debit' ? 'Cartão de Débito' :
                                            finalPaymentMethod === 'pix' ? 'PIX' :
                                                finalPaymentMethod === 'cash' ? 'Dinheiro' :
                                                    finalPaymentMethod;
                                }

                                return (
                                    <TouchableOpacity
                                        key={transaction.id}
                                        onPress={() => setSelectedTransaction(transaction)}
                                        className="p-4 border-b border-gray-50 flex-row items-center justify-between active:bg-gray-50"
                                    >
                                        <View className="flex-1 mr-4">
                                            <View className="flex-row items-start gap-3">
                                                <View className="w-10 h-10 rounded-lg items-center justify-center bg-green-100">
                                                    <ArrowUpRight size={20} color="#22C55E" />
                                                </View>
                                                <View className="flex-1">
                                                    <Text className="font-semibold text-gray-900" numberOfLines={1}>
                                                        {transaction.patients?.name || 'Paciente não identificado'}
                                                    </Text>
                                                    <View className="mt-1">
                                                        <Text className="text-xs text-teal-700 font-semibold" numberOfLines={1}>
                                                            {treatmentDisplay}
                                                        </Text>
                                                        <Text className="text-xs text-gray-500 mt-0.5" numberOfLines={1}>
                                                            Forma: {paymentMethodLabel}
                                                        </Text>
                                                        {parsed.displayBrand && (
                                                            <Text className="text-xs text-gray-500 mt-0.5">
                                                                Bandeira: {parsed.displayBrand}
                                                            </Text>
                                                        )}
                                                        {parsed.installmentInfo && (
                                                            <Text className="text-xs text-gray-500 mt-0.5">
                                                                Parcela: {parsed.installmentInfo}
                                                            </Text>
                                                        )}
                                                        {transaction.location && (
                                                            <Text className="text-xs text-gray-500 mt-0.5" numberOfLines={1}>
                                                                Local: {transaction.location}
                                                            </Text>
                                                        )}
                                                    </View>
                                                    <View className="flex-row items-center gap-2 mt-1 flex-wrap">
                                                        <Text className="text-xs text-gray-400">
                                                            {formatDate(transaction.date)}
                                                        </Text>
                                                    </View>
                                                </View>
                                            </View>
                                        </View>
                                        <Text className="font-bold text-green-600 text-base whitespace-nowrap">
                                            + {formatCurrency(subTab === 'gross' ? transaction.amount : (transaction.net_amount || transaction.amount))}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })
                    )}
                </View>
            </ScrollView>

            {/* Filter Modal */}
            <IncomeFilterModal
                visible={filterModalVisible}
                onClose={() => setFilterModalVisible(false)}
                onApply={handleApplyFilters}
                onClear={handleClearFilters}
                currentFilters={activeFilters}
                uniqueMethods={uniqueMethods}
                uniqueLocations={uniqueLocations}
            />

            {/* Transaction Detail Modal */}
            <IncomeDetailModal
                transaction={selectedTransaction}
                onClose={() => setSelectedTransaction(null)}
                relatedInstallments={relatedInstallments}
                onRefresh={onRefresh}
            />
        </View>
    );
}
