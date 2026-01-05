import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput, Platform, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { TrendingUp, ArrowUpRight, MapPin, X, Calendar, Filter, Check, Trash2 } from 'lucide-react-native';
import { FinancialTransactionWithPatient } from '../../types/database';
import { locationsService, Location } from '../../services/locations';
import { financialService } from '../../services/financial';

interface IncomeTabProps {
    transactions: FinancialTransactionWithPatient[];
    loading: boolean;
    onRefresh?: () => void;
    refreshing?: boolean;
}

type IncomeSubTab = 'gross' | 'net';

interface FilterState {
    patientName: string;
    startDate: string; // DD/MM/YYYY
    endDate: string;   // DD/MM/YYYY
    methods: string[];
    locations: string[];
}

const INITIAL_FILTERS: FilterState = {
    patientName: '',
    startDate: '',
    endDate: '',
    methods: [],
    locations: []
};

const COMMON_METHODS = ['Pix', 'Cartão de Crédito', 'Cartão de Débito', 'Dinheiro'];

const getPaymentMethod = (description: string): string | null => {
    const methodMatch = description.match(/\((.*?)\)/);
    if (!methodMatch) return null;

    const rawParts = methodMatch[1].split(' - ');
    let m = rawParts[0].trim();

    // Normalization
    if (m.toLowerCase().match(/^(crédito|credit)$/)) return 'Cartão de Crédito';
    if (m.toLowerCase().match(/^(débito|debit)$/)) return 'Cartão de Débito';
    if (m.toLowerCase().match(/^(pix)$/)) return 'Pix';
    if (m.toLowerCase().match(/^(dinheiro|cash)$/)) return 'Dinheiro';
    if (m.toLowerCase().match(/^(boleto)$/)) return 'Boleto';

    return m;
};

// Date Helpers
const getToday = () => {
    const today = new Date();
    return today.toLocaleDateString('pt-BR');
};

const getWeekRange = () => {
    const today = new Date();
    const first = today.getDate() - today.getDay(); // Sunday
    const last = first + 6; // Saturday

    const start = new Date(today.setDate(first));
    const end = new Date(today.setDate(last));

    return {
        start: start.toLocaleDateString('pt-BR'),
        end: end.toLocaleDateString('pt-BR')
    };
};

const getMonthRange = () => {
    const date = new Date();
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);

    return {
        start: start.toLocaleDateString('pt-BR'),
        end: end.toLocaleDateString('pt-BR')
    };
};

const getYearRange = () => {
    const date = new Date();
    const start = new Date(date.getFullYear(), 0, 1);
    const end = new Date(date.getFullYear(), 11, 31);

    return {
        start: start.toLocaleDateString('pt-BR'),
        end: end.toLocaleDateString('pt-BR')
    };
};

export function IncomeTab({ transactions, loading, onRefresh, refreshing }: IncomeTabProps) {
    const [selectedTransaction, setSelectedTransaction] = useState<FinancialTransactionWithPatient | null>(null);
    const [subTab, setSubTab] = useState<IncomeSubTab>('gross');

    // Filter State
    const [filterModalVisible, setFilterModalVisible] = useState(false);
    const [activeFilters, setActiveFilters] = useState<FilterState>(INITIAL_FILTERS);
    const [tempFilters, setTempFilters] = useState<FilterState>(INITIAL_FILTERS);

    // Locations State
    const [availableLocations, setAvailableLocations] = useState<Location[]>([]);

    // Delete State
    const [deleting, setDeleting] = useState(false);
    const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);

    React.useEffect(() => {
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
        // Fallback to transactions if API fails or empty
        return Array.from(new Set(transactions.map(t => t.location).filter(Boolean) as string[])).sort();
    }, [transactions, availableLocations]);

    // Apply Filters Logic
    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            // Filter by Type (always Income)
            if (t.type !== 'income') return false;

            // 1. Patient Name
            if (activeFilters.patientName) {
                const pName = t.patients?.name?.toLowerCase() || '';
                if (!pName.includes(activeFilters.patientName.toLowerCase())) return false;
            }

            // 2. Date Range
            const tDate = new Date(t.date); // assumed YYYY-MM-DD from DB
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

    // Calculations based on FILTERED transactions
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

    // Related installments (needs access to FULL list to find siblings, but only if they match ID)
    // Actually, related installments should probably still be found even if they are outside the filter range?
    // Usually YES, users want to see the history. So we keep `transactions` for lookup.
    const relatedInstallments = selectedTransaction?.related_entity_id
        ? transactions
            .filter(t => t.related_entity_id === selectedTransaction.related_entity_id)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        : [];

    const displayTotal = subTab === 'gross' ? totalGrossIncome : totalNetIncome;
    const displayLabel = subTab === 'gross' ? 'Receita Bruta' : 'Receita Líquida';

    const formatCurrency = (value: number) => {
        return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('pt-BR');
    };

    const handleDateChange = (text: string, field: 'startDate' | 'endDate') => {
        // Simple mask DD/MM/YYYY
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

    const toggleFilterMethod = (method: string) => {
        setTempFilters(prev => {
            const exists = prev.methods.includes(method);
            return {
                ...prev,
                methods: exists ? prev.methods.filter(m => m !== method) : [...prev.methods, method]
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

    // Delete Income Handler
    const handleDeleteIncome = async () => {
        console.log('handleDeleteIncome called, selectedTransaction:', selectedTransaction?.id);
        if (!selectedTransaction) return;
        setDeleting(true);
        try {
            console.log('Calling deleteIncomeAndRevertBudget...');
            await financialService.deleteIncomeAndRevertBudget(selectedTransaction.id);
            console.log('Delete successful');
            setConfirmDeleteVisible(false);
            setSelectedTransaction(null);
            // Refresh the list
            if (onRefresh) {
                onRefresh();
            }
            Alert.alert('Sucesso', 'Receita excluída. Orçamentos vinculados voltaram a pendente.');
        } catch (error) {
            console.error('Error deleting:', error);
            Alert.alert('Erro', 'Falha ao excluir receita.');
        } finally {
            setDeleting(false);
        }
    };

    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (activeFilters.patientName) count++;
        if (activeFilters.startDate || activeFilters.endDate) count++;
        if (activeFilters.methods.length > 0) count++;
        if (activeFilters.locations.length > 0) count++;
        return count;
    }, [activeFilters]);

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
                    onPress={() => {
                        setTempFilters(activeFilters); // Load current active into temp
                        setFilterModalVisible(true);
                    }}
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

                {/* List */}
                <Text className="text-sm font-semibold text-gray-700 mb-3">
                    Transações ({filteredTransactions.length})
                </Text>
                <View className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-8">
                    {filteredTransactions.length === 0 ? (
                        <View className="p-8 items-center">
                            <Text className="text-gray-400 italic">Nenhum resultado encontrado</Text>
                        </View>
                    ) : (
                        filteredTransactions.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((transaction) => (
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

                                            {(() => {
                                                const rawDesc = transaction.description;
                                                const patientName = transaction.patients?.name || '';

                                                // 1. Extract Installment info
                                                const installmentMatch = rawDesc.match(/\(\d+\/\d+\)/);
                                                const installmentInfo = installmentMatch ? installmentMatch[0].replace(/[()]/g, '') : null;

                                                let workingDesc = rawDesc;
                                                if (installmentMatch) {
                                                    workingDesc = workingDesc.replace(installmentMatch[0], '');
                                                }

                                                // 2. Extract Method
                                                const methodMatch = workingDesc.match(/\((.*?)\)/);
                                                const rawPaymentInfo = methodMatch ? methodMatch[1] : null;

                                                if (methodMatch) {
                                                    workingDesc = workingDesc.replace(methodMatch[0], '');
                                                }

                                                let displayMethod = 'Não informado';
                                                let displayBrand = null;

                                                if (rawPaymentInfo) {
                                                    const methodParts = rawPaymentInfo.split(' - ');
                                                    let methodType = methodParts[0];
                                                    if (methodType.toLowerCase() === 'crédito' || methodType.toLowerCase() === 'credit') methodType = 'Cartão de Crédito';
                                                    if (methodType.toLowerCase() === 'débito' || methodType.toLowerCase() === 'debit') methodType = 'Cartão de Débito';
                                                    displayMethod = methodType;
                                                    if (methodParts.length > 1) {
                                                        displayBrand = methodParts[1].replace('_', '/');
                                                    }
                                                }

                                                const parts = workingDesc.split(' - ').map(p => p.trim());
                                                const filteredParts = parts.filter(p => p && p.toLowerCase() !== patientName.toLowerCase());

                                                let tooth = '';
                                                let procedure = '';
                                                filteredParts.forEach(part => {
                                                    if (part.toLowerCase().startsWith('dente') || part.toLowerCase().startsWith('arcada')) {
                                                        tooth = part;
                                                    } else {
                                                        procedure = procedure ? `${procedure} - ${part}` : part;
                                                    }
                                                });

                                                if (!procedure && filteredParts.length > 0 && !tooth) procedure = filteredParts.join(' - ');
                                                if (!procedure) procedure = 'Procedimento';

                                                const line2 = tooth ? `${tooth} - ${procedure}` : procedure;

                                                return (
                                                    <View className="mt-1">
                                                        <Text className="text-xs text-gray-600 font-medium" numberOfLines={1}>{line2}</Text>
                                                        <Text className="text-xs text-gray-500 mt-0.5" numberOfLines={1}>Forma: {displayMethod}</Text>
                                                        {displayBrand && <Text className="text-xs text-gray-500 mt-0.5">Bandeira: {displayBrand}</Text>}
                                                        {installmentInfo && <Text className="text-xs text-gray-500 mt-0.5">Parcela: {installmentInfo}</Text>}
                                                    </View>
                                                );
                                            })()}

                                            <View className="flex-row items-center gap-2 mt-1 flex-wrap">
                                                <Text className="text-xs text-gray-400">
                                                    {formatDate(transaction.date)}
                                                </Text>
                                                {transaction.location && (
                                                    <View className="flex-row items-center gap-1 bg-teal-50 px-1.5 py-0.5 rounded">
                                                        <MapPin size={10} color="#0D9488" />
                                                        <Text className="text-xs text-teal-600">{transaction.location}</Text>
                                                    </View>
                                                )}
                                            </View>
                                        </View>
                                    </View>
                                </View>
                                <Text className="font-bold text-green-600 text-base whitespace-nowrap">
                                    + {formatCurrency(subTab === 'gross' ? transaction.amount : (transaction.net_amount || transaction.amount))}
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
                            <Text className="text-xl font-bold text-gray-800">Filtrar Receitas</Text>
                            <TouchableOpacity onPress={() => setFilterModalVisible(false)} className="bg-gray-100 p-2 rounded-full">
                                <X size={20} color="#374151" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView className="flex-1 p-4">
                            {/* Patient Name */}
                            <Text className="text-sm font-semibold text-gray-700 mb-2">Paciente</Text>
                            <TextInput
                                className="bg-gray-50 border border-gray-200 rounded-xl p-3 mb-6"
                                placeholder="Nome do paciente..."
                                value={tempFilters.patientName}
                                onChangeText={text => setTempFilters(prev => ({ ...prev, patientName: text }))}
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

                            {/* Payment Methods */}
                            <Text className="text-sm font-semibold text-gray-700 mb-2">Forma de Pagamento</Text>
                            <View className="flex-row flex-wrap gap-2 mb-6">
                                {uniqueMethods.map(method => (
                                    <TouchableOpacity
                                        key={method}
                                        onPress={() => toggleFilterMethod(method)}
                                        className={`px-3 py-2 rounded-lg border ${tempFilters.methods.includes(method) ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}
                                    >
                                        <Text className={`text-xs ${tempFilters.methods.includes(method) ? 'text-green-700 font-medium' : 'text-gray-600'}`}>
                                            {method}
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
                                        className={`px-3 py-2 rounded-lg border ${tempFilters.locations.includes(loc) ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}
                                    >
                                        <Text className={`text-xs ${tempFilters.locations.includes(loc) ? 'text-green-700 font-medium' : 'text-gray-600'}`}>
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
                                className="bg-green-600 rounded-xl p-4 items-center mb-3"
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

            {/* Transaction Details Modal (Existing) */}
            <Modal visible={!!selectedTransaction} transparent animationType="fade" statusBarTranslucent>
                <View className="flex-1 justify-center items-center p-4 bg-black/50">
                    <TouchableOpacity
                        style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}
                        activeOpacity={1}
                        onPress={() => setSelectedTransaction(null)}
                    />
                    <View className="bg-white w-full max-w-sm rounded-2xl overflow-hidden shadow-xl" style={{ maxHeight: '85%' }}>
                        <View className="bg-teal-500 p-6 pt-8">
                            <View className="flex-row justify-between items-start">
                                <View>
                                    <Text className="text-teal-100 font-medium mb-1">Receita</Text>
                                    <Text className="text-white text-3xl font-bold">
                                        {selectedTransaction && formatCurrency(selectedTransaction.amount)}
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    onPress={() => setSelectedTransaction(null)}
                                    className="bg-teal-600 p-2 rounded-full"
                                >
                                    <X size={20} color="white" />
                                </TouchableOpacity>
                            </View>
                            {selectedTransaction && (() => {
                                const rawDesc = selectedTransaction.description;
                                const patientName = selectedTransaction.patients?.name || '';

                                // Extract Installment info
                                const installmentMatch = rawDesc.match(/\(\d+\/\d+\)/);
                                const installmentInfo = installmentMatch ? installmentMatch[0].replace(/[()]/g, '') : null;

                                let workingDesc = rawDesc;
                                if (installmentMatch) {
                                    workingDesc = workingDesc.replace(installmentMatch[0], '');
                                }

                                // Extract Method
                                const methodMatch = workingDesc.match(/\((.*?)\)/);
                                const rawPaymentInfo = methodMatch ? methodMatch[1] : null;

                                if (methodMatch) {
                                    workingDesc = workingDesc.replace(methodMatch[0], '');
                                }

                                // Process Method and Brand
                                let displayMethod = 'Não informado';
                                let displayBrand = null;

                                if (rawPaymentInfo) {
                                    const methodParts = rawPaymentInfo.split(' - ');
                                    let methodType = methodParts[0];
                                    if (methodType.toLowerCase() === 'crédito' || methodType.toLowerCase() === 'credit') methodType = 'Cartão de Crédito';
                                    if (methodType.toLowerCase() === 'débito' || methodType.toLowerCase() === 'debit') methodType = 'Cartão de Débito';
                                    displayMethod = methodType;
                                    if (methodParts.length > 1) {
                                        displayBrand = methodParts[1].replace('_', '/');
                                    }
                                }

                                // Split and Filter Parts
                                const parts = workingDesc.split(' - ').map(p => p.trim());
                                const filteredParts = parts.filter(p => p && p.toLowerCase() !== patientName.toLowerCase());

                                let tooth = '';
                                let procedure = '';

                                filteredParts.forEach(part => {
                                    if (part.toLowerCase().startsWith('dente') || part.toLowerCase().startsWith('arcada')) {
                                        tooth = part;
                                    } else {
                                        procedure = procedure ? `${procedure} - ${part}` : part;
                                    }
                                });

                                if (!procedure && filteredParts.length > 0 && !tooth) procedure = filteredParts.join(' - ');
                                if (!procedure) procedure = 'Procedimento';

                                const line2 = tooth ? `${tooth} - ${procedure}` : procedure;

                                return (
                                    <View className="mt-4">
                                        <Text className="text-teal-50 text-sm opacity-90">{line2}</Text>
                                        <Text className="text-teal-100 text-xs mt-1">
                                            {displayMethod}{displayBrand ? ` - ${displayBrand}` : ''}{installmentInfo ? ` (${installmentInfo})` : ''}
                                        </Text>
                                    </View>
                                );
                            })()}
                        </View>

                        <ScrollView>
                            <View style={{ padding: 24, paddingBottom: 40 }}>
                                {/* Main Info */}
                                <View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <View className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center">
                                            <TrendingUp size={20} color="#374151" />
                                        </View>
                                        <View>
                                            <Text className="text-xs text-gray-500 uppercase tracking-wider">Paciente</Text>
                                            <Text className="text-gray-900 font-medium text-lg">
                                                {selectedTransaction?.patients?.name || 'Não identificado'}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16 }}>
                                        <View className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center">
                                            <MapPin size={20} color="#374151" />
                                        </View>
                                        <View>
                                            <Text className="text-xs text-gray-500 uppercase tracking-wider">Local de Atendimento</Text>
                                            <Text className="text-gray-900 font-medium text-base">
                                                {selectedTransaction?.location || 'Não informado'}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16 }}>
                                        <View className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center">
                                            <Calendar size={20} color="#374151" />
                                        </View>
                                        <View>
                                            <Text className="text-xs text-gray-500 uppercase tracking-wider">Data do Pagamento</Text>
                                            <Text className="text-gray-900 font-medium text-base">
                                                {selectedTransaction && formatDate(selectedTransaction.date)}
                                            </Text>
                                        </View>
                                    </View>
                                </View>

                                {/* Financial Breakdown */}
                                {selectedTransaction && (
                                    (selectedTransaction.tax_amount && selectedTransaction.tax_amount > 0) ||
                                    (selectedTransaction.card_fee_amount && selectedTransaction.card_fee_amount > 0) ||
                                    ((selectedTransaction as any).anticipation_amount && (selectedTransaction as any).anticipation_amount > 0) ||
                                    ((selectedTransaction as any).location_amount && (selectedTransaction as any).location_amount > 0)
                                ) ? (
                                    <View style={{ backgroundColor: '#f9fafb', borderRadius: 12, padding: 16, marginTop: 16 }}>
                                        <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#111827', marginBottom: 12 }}>Detalhamento Financeiro</Text>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Text style={{ color: '#4b5563' }}>Valor Bruto</Text>
                                            <Text style={{ fontWeight: '600', color: '#111827' }}>{formatCurrency(selectedTransaction.amount)}</Text>
                                        </View>
                                        {selectedTransaction.tax_amount && selectedTransaction.tax_amount > 0 ? (
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                                                <Text style={{ color: '#6b7280', fontSize: 14 }}>Imposto ({selectedTransaction.tax_rate || 0}%)</Text>
                                                <Text style={{ color: '#ef4444', fontSize: 14 }}>- {formatCurrency(selectedTransaction.tax_amount)}</Text>
                                            </View>
                                        ) : null}
                                        {selectedTransaction.card_fee_amount && selectedTransaction.card_fee_amount > 0 ? (
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                                                <Text style={{ color: '#6b7280', fontSize: 14 }}>Taxa do Cartão ({selectedTransaction.card_fee_rate || 0}%)</Text>
                                                <Text style={{ color: '#ef4444', fontSize: 14 }}>- {formatCurrency(selectedTransaction.card_fee_amount)}</Text>
                                            </View>
                                        ) : null}
                                        {(selectedTransaction as any).anticipation_amount && (selectedTransaction as any).anticipation_amount > 0 ? (
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                                                <Text style={{ color: '#6b7280', fontSize: 14 }}>Antecipação ({(selectedTransaction as any).anticipation_rate || 0}%)</Text>
                                                <Text style={{ color: '#ef4444', fontSize: 14 }}>- {formatCurrency((selectedTransaction as any).anticipation_amount)}</Text>
                                            </View>
                                        ) : null}
                                        {(selectedTransaction as any).location_amount && (selectedTransaction as any).location_amount > 0 ? (
                                            <View key="location" style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                                <Text style={{ fontSize: 14, color: '#6B7280' }}>
                                                    Taxa do Procedimento ({(selectedTransaction as any).location_rate || 0}%):
                                                </Text>
                                                <Text style={{ fontSize: 14, color: '#EF4444', fontWeight: '500' }}>
                                                    - {formatCurrency((selectedTransaction as any).location_amount)}
                                                </Text>
                                            </View>
                                        ) : null}
                                        <View style={{ borderTopWidth: 1, borderTopColor: '#e5e7eb', marginTop: 8, paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Text style={{ fontWeight: 'bold', color: '#111827' }}>Valor Líquido</Text>
                                            <Text style={{ fontWeight: 'bold', color: '#16a34a' }}>{formatCurrency(selectedTransaction.net_amount || selectedTransaction.amount)}</Text>
                                        </View>
                                    </View>
                                ) : null}

                                {/* Installments / Payment History */}
                                {relatedInstallments.length > 0 && (
                                    <View>
                                        <Text className="text-sm font-bold text-gray-900 mb-3 border-b border-gray-100 pb-2 mt-4">Histórico de Parcelas</Text>
                                        <View>
                                            {relatedInstallments.map((inst, index) => (
                                                <View key={inst.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 8, backgroundColor: inst.id === selectedTransaction?.id ? '#f0fdf4' : '#f9fafb', borderWidth: inst.id === selectedTransaction?.id ? 1 : 0, borderColor: '#bbf7d0', marginBottom: 8 }}>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12 }}>
                                                        <View className="w-6 h-6 rounded-full bg-white items-center justify-center border border-gray-200">
                                                            <Text className="text-xs text-gray-500">{index + 1}</Text>
                                                        </View>
                                                        <View className="ml-2">
                                                            <Text className="text-gray-900 font-medium">
                                                                {formatDate(inst.date)}
                                                            </Text>
                                                            {inst.id === selectedTransaction?.id && (
                                                                <Text className="text-[10px] text-green-600 font-bold">ATUAL</Text>
                                                            )}
                                                        </View>
                                                    </View>
                                                    <Text className="text-gray-900 font-bold">
                                                        {formatCurrency(inst.amount)}
                                                    </Text>
                                                </View>
                                            ))}
                                        </View>
                                    </View>
                                )}
                            </View>
                        </ScrollView>

                        {/* Delete Button - Fixed Footer outside ScrollView */}
                        <View style={{ padding: 16, paddingBottom: 24, borderTopWidth: 1, borderTopColor: '#f3f4f6' }}>
                            <TouchableOpacity
                                activeOpacity={0.7}
                                onPress={() => {
                                    Alert.alert(
                                        'Excluir Receita',
                                        'Tem certeza que deseja excluir esta receita?\n\nSe houver orçamentos vinculados, eles voltarão ao status "pendente".',
                                        [
                                            { text: 'Cancelar', style: 'cancel' },
                                            {
                                                text: 'Excluir',
                                                style: 'destructive',
                                                onPress: async () => {
                                                    if (!selectedTransaction) return;
                                                    setDeleting(true);
                                                    try {
                                                        await financialService.deleteIncomeAndRevertBudget(selectedTransaction.id);
                                                        setSelectedTransaction(null);
                                                        if (onRefresh) {
                                                            onRefresh();
                                                        }
                                                        Alert.alert('Sucesso', 'Receita excluída. Orçamentos vinculados voltaram a pendente.');
                                                    } catch (error) {
                                                        console.error('Error deleting:', error);
                                                        Alert.alert('Erro', 'Falha ao excluir receita.');
                                                    } finally {
                                                        setDeleting(false);
                                                    }
                                                }
                                            }
                                        ]
                                    );
                                }}
                                disabled={deleting}
                                style={{
                                    backgroundColor: deleting ? '#fecaca' : '#fef2f2',
                                    borderWidth: 1,
                                    borderColor: '#fecaca',
                                    borderRadius: 12,
                                    padding: 16,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 8
                                }}
                            >
                                {deleting ? (
                                    <ActivityIndicator size="small" color="#dc2626" />
                                ) : (
                                    <Trash2 size={18} color="#dc2626" />
                                )}
                                <Text style={{ color: '#dc2626', fontWeight: '600' }}>
                                    {deleting ? 'Excluindo...' : 'Excluir Receita'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Confirm Delete Modal */}
            <Modal visible={confirmDeleteVisible} transparent animationType="fade" statusBarTranslucent>
                <View className="flex-1 justify-center items-center p-4 bg-black/50">
                    <View className="bg-white w-full max-w-sm rounded-2xl overflow-hidden shadow-xl p-6">
                        <View className="flex-row items-center gap-3 mb-4">
                            <View className="w-10 h-10 rounded-full bg-red-100 items-center justify-center">
                                <Trash2 size={20} color="#dc2626" />
                            </View>
                            <Text className="text-xl font-bold text-red-600">Confirmar Exclusão</Text>
                        </View>

                        <Text className="text-gray-600 mb-2">
                            Tem certeza que deseja excluir esta receita?
                        </Text>
                        <Text className="text-sm text-gray-500 mb-4">
                            Se houver orçamentos vinculados, eles voltarão ao status "pendente".
                        </Text>

                        {selectedTransaction && (
                            <View className="bg-red-50 p-4 rounded-xl border border-red-100 mb-4">
                                <Text className="font-medium text-gray-900">
                                    {selectedTransaction.patients?.name || 'Receita'}
                                </Text>
                                <Text className="text-lg font-bold text-red-600 mt-1">
                                    {formatCurrency(selectedTransaction.amount)}
                                </Text>
                            </View>
                        )}

                        <View className="flex-row gap-3">
                            <TouchableOpacity
                                onPress={() => setConfirmDeleteVisible(false)}
                                disabled={deleting}
                                className="flex-1 bg-gray-100 rounded-xl p-4 items-center"
                            >
                                <Text className="text-gray-700 font-semibold">Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={async () => {
                                    console.log('Confirm delete pressed');
                                    if (!selectedTransaction) return;
                                    setDeleting(true);
                                    try {
                                        console.log('Calling service...');
                                        await financialService.deleteIncomeAndRevertBudget(selectedTransaction.id);
                                        console.log('Delete success');
                                        setConfirmDeleteVisible(false);
                                        setSelectedTransaction(null);
                                        if (onRefresh) {
                                            onRefresh();
                                        }
                                        Alert.alert('Sucesso', 'Receita excluída. Orçamentos vinculados voltaram a pendente.');
                                    } catch (error) {
                                        console.error('Error deleting:', error);
                                        Alert.alert('Erro', 'Falha ao excluir receita.');
                                    } finally {
                                        setDeleting(false);
                                    }
                                }}
                                disabled={deleting}
                                className="flex-1 bg-red-600 rounded-xl p-4 items-center flex-row justify-center gap-2"
                            >
                                {deleting ? (
                                    <ActivityIndicator color="white" size="small" />
                                ) : (
                                    <Trash2 size={18} color="white" />
                                )}
                                <Text className="text-white font-semibold">{deleting ? 'Excluindo...' : 'Excluir'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

        </View>
    );
}
