import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Filter } from 'lucide-react-native';
import { FinancialTransaction } from '../../types/database';
import { locationsService, Location } from '../../services/locations';
import { settingsService } from '../../services/settings';
import { useState, useMemo, useEffect } from 'react';
import { ClosureFilterModal, ClosureFilterState } from './ClosureFilterModal';
import { BreakdownsSection } from './BreakdownsSection';
import { formatCurrency as formatCurrencyUtil } from '../../utils/expense';

interface ClosureTabProps {
    transactions: FinancialTransaction[];
    loading: boolean;
    onRefresh?: () => void;
    refreshing?: boolean;
}

const INITIAL_FILTERS: ClosureFilterState = { locations: [], methods: [], startDate: '', endDate: '' };
const COMMON_METHODS = ['Pix', 'Cartão de Crédito', 'Cartão de Débito', 'Dinheiro'];

const getPaymentMethod = (description: string): string | null => {
    const methodMatch = description.match(/\((.*?)\)/);
    if (!methodMatch) return null;
    const m = methodMatch[1].split(' - ')[0].trim().toLowerCase();
    if (m.match(/^(crédito|credit)$/)) return 'Cartão de Crédito';
    if (m.match(/^(débito|debit)$/)) return 'Cartão de Débito';
    if (m.match(/^(pix)$/)) return 'Pix';
    if (m.match(/^(dinheiro|cash)$/)) return 'Dinheiro';
    if (m.match(/^(boleto)$/)) return 'Boleto';
    return methodMatch[1].split(' - ')[0].trim();
};

export function ClosureTab({ transactions, loading, onRefresh, refreshing }: ClosureTabProps) {
    const [filterModalVisible, setFilterModalVisible] = useState(false);
    const [activeFilters, setActiveFilters] = useState<ClosureFilterState>(INITIAL_FILTERS);
    const [tempFilters, setTempFilters] = useState<ClosureFilterState>(INITIAL_FILTERS);
    const [availableLocations, setAvailableLocations] = useState<Location[]>([]);
    const [taxRate, setTaxRate] = useState(0);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            const [locations, settings] = await Promise.all([locationsService.getAll(), settingsService.getFinancialSettings()]);
            setAvailableLocations(locations);
            if (settings) setTaxRate(settings.tax_rate || 0);
        } catch (e) { console.error(e); }
    };

    const uniqueLocations = useMemo(() => availableLocations.length > 0 ? availableLocations.map(l => l.name).sort() : Array.from(new Set(transactions.map(t => t.location).filter(Boolean) as string[])).sort(), [transactions, availableLocations]);
    const uniqueMethods = useMemo(() => { const methods = new Set<string>(COMMON_METHODS); transactions.forEach(t => { if (t.type === 'income') { const m = getPaymentMethod(t.description); if (m) methods.add(m); } }); return Array.from(methods).sort(); }, [transactions]);

    const filteredTransactions = useMemo(() => transactions.filter(t => {
        if (activeFilters.locations.length > 0 && (!t.location || !activeFilters.locations.includes(t.location))) return false;
        if (activeFilters.methods.length > 0) { const method = getPaymentMethod(t.description) || 'Não informado'; if (!activeFilters.methods.includes(method)) return false; }
        const [y, m, d] = t.date.split('-').map(Number);
        const compDate = new Date(y, m - 1, d);
        if (activeFilters.startDate) { const [sd, sm, sy] = activeFilters.startDate.split('/'); if (sd && sm && sy && compDate < new Date(parseInt(sy), parseInt(sm) - 1, parseInt(sd))) return false; }
        if (activeFilters.endDate) { const [ed, em, ey] = activeFilters.endDate.split('/'); if (ed && em && ey && compDate > new Date(parseInt(ey), parseInt(em) - 1, parseInt(ed))) return false; }
        return true;
    }), [transactions, activeFilters]);

    const activeFilterCount = (activeFilters.locations.length > 0 ? 1 : 0) + (activeFilters.methods.length > 0 ? 1 : 0) + (activeFilters.startDate || activeFilters.endDate ? 1 : 0);

    const totalIncome = filteredTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalTaxes = totalIncome * (taxRate / 100);
    const totalCardFees = filteredTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + (t.card_fee_amount || 0), 0);
    const totalAnticipation = filteredTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + ((t as any).anticipation_amount || 0), 0);
    const totalExpenses = filteredTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const expensesByLocation = filteredTransactions.filter(t => t.type === 'expense' && t.location).reduce((acc, t) => { acc[t.location!] = (acc[t.location!] || 0) + t.amount; return acc; }, {} as Record<string, number>);
    const feesByLocation = filteredTransactions.filter(t => t.location && (t.location_amount || 0) > 0).reduce((acc, t) => { acc[t.location!] = (acc[t.location!] || 0) + (t.location_amount || 0); return acc; }, {} as Record<string, number>);
    const expensesByCategory = filteredTransactions.filter(t => t.type === 'expense').reduce((acc, t) => { const cat = t.category || 'Outros'; acc[cat] = (acc[cat] || 0) + t.amount; return acc; }, {} as Record<string, number>);
    const totalFees = Object.values(feesByLocation).reduce((sum, v) => sum + v, 0);
    const netResult = totalIncome - totalCardFees - totalAnticipation - totalFees - totalTaxes - totalExpenses;
    const profitMargin = totalIncome > 0 ? ((netResult / totalIncome) * 100).toFixed(1) : '0';

    const formatCurrency = (value: number) => `R$ ${formatCurrencyUtil(value)}`;

    return (
        <View className="flex-1">
            <View className="flex-row items-center justify-end px-4 mt-4 mb-2">
                <TouchableOpacity onPress={() => { setTempFilters(activeFilters); setFilterModalVisible(true); }} className={`p-2 rounded-lg border ${activeFilterCount > 0 ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'}`}>
                    <View className="flex-row items-center gap-2">
                        <Filter size={18} color={activeFilterCount > 0 ? '#2563EB' : '#6b7280'} />
                        <Text className={`text-sm font-medium ${activeFilterCount > 0 ? 'text-blue-600' : 'text-gray-600'}`}>Filtros</Text>
                        {activeFilterCount > 0 && <View className="bg-blue-500 rounded-full w-5 h-5 items-center justify-center"><Text className="text-white text-[10px] font-bold">{activeFilterCount}</Text></View>}
                    </View>
                </TouchableOpacity>
            </View>

            <ScrollView className="flex-1 px-4 py-2" showsVerticalScrollIndicator={false} refreshControl={onRefresh ? <RefreshControl refreshing={refreshing || false} onRefresh={onRefresh} colors={['#0D9488']} tintColor="#0D9488" /> : undefined}>
                {/* Balance Card */}
                <View className="bg-teal-600 p-6 rounded-2xl mb-6 shadow-md shadow-teal-900/20">
                    <Text className="text-teal-100 text-sm font-medium mb-1">Saldo Final</Text>
                    <Text className="text-4xl font-bold text-white mb-4">{formatCurrency(netResult)}</Text>
                    <View className="flex-row bg-teal-800/30 rounded-xl p-3 justify-between">
                        <View><Text className="text-teal-100 text-xs">Margem</Text><Text className="text-white font-bold">{profitMargin}%</Text></View>
                        <View className="w-px bg-teal-500/30 mx-2" />
                        <View><Text className="text-teal-100 text-xs">Entradas</Text><Text className="text-white font-bold">{formatCurrency(totalIncome)}</Text></View>
                        <View className="w-px bg-teal-500/30 mx-2" />
                        <View><Text className="text-teal-100 text-xs">Saídas</Text><Text className="text-white font-bold">{formatCurrency(totalExpenses)}</Text></View>
                    </View>
                </View>

                {/* Financial Statement */}
                <View className="bg-white p-6 rounded-xl border border-gray-100 mb-6">
                    <Text className="text-sm font-semibold text-gray-900 mb-6">Demonstrativo Financeiro</Text>
                    <View className="mb-4"><View className="flex-row justify-between items-center mb-1"><Text className="text-gray-900 font-medium text-sm">Receita Bruta</Text><Text className="text-gray-900 font-bold text-sm">{formatCurrency(totalIncome)}</Text></View><View className="h-1.5 bg-gray-100 rounded-full overflow-hidden"><View className="h-full bg-green-500 rounded-full" style={{ width: '100%' }} /></View></View>
                    <View className="space-y-3 mb-6">
                        <DeductionRow label="(-) Taxas de Cartão" value={totalCardFees} formatCurrency={formatCurrency} />
                        <DeductionRow label="(-) Taxa de Antecipação" value={totalAnticipation} formatCurrency={formatCurrency} color="yellow" />
                        <DeductionRow label="(-) Taxas de Procedimentos" value={totalFees} formatCurrency={formatCurrency} />
                        <DeductionRow label={`(-) Impostos (${taxRate}%)`} value={totalTaxes} formatCurrency={formatCurrency} />
                        <View><View className="flex-row items-center gap-2 pl-2 border-l-2 border-red-100 mb-1"><Text className="text-gray-500 text-xs font-medium">(-) Despesas Operacionais</Text></View>
                            {Object.entries(expensesByCategory).sort(([, a], [, b]) => b - a).map(([cat, amount]) => (<View key={cat} className="flex-row justify-between items-center pl-4 py-0.5"><Text className="text-gray-400 text-[10px]">{cat}</Text><Text className="text-red-400 text-[10px]">{formatCurrency(amount)}</Text></View>))}
                            {totalExpenses === 0 && <View className="flex-row justify-between items-center pl-4"><Text className="text-gray-400 text-[10px]">-</Text><Text className="text-gray-400 text-[10px]">R$ 0,00</Text></View>}
                        </View>
                    </View>
                    <View className="h-px bg-gray-200 mb-4 border-t border-dashed" />
                    <View className="flex-row justify-between items-center"><Text className="text-gray-900 font-bold text-base">Receita Líquida</Text><Text className={`text-xl font-bold ${netResult >= 0 ? 'text-teal-600' : 'text-red-600'}`}>{formatCurrency(netResult)}</Text></View>
                    <Text className="text-right text-[10px] text-gray-400 mt-1">(Bruto - Taxas - Impostos - Despesas)</Text>
                </View>

                {/* Location Fees */}
                {Object.keys(feesByLocation).length > 0 && (
                    <View className="bg-white p-6 rounded-xl border border-gray-100 mb-6">
                        <Text className="text-sm font-semibold text-gray-900 mb-4">Taxas por Local</Text>
                        <View className="gap-3">{Object.entries(feesByLocation).sort(([, a], [, b]) => b - a).map(([loc, amount]) => (<View key={loc}><View className="flex-row justify-between mb-1"><Text className="text-gray-600 text-xs">{loc}</Text><Text className="text-gray-900 font-medium text-xs">- {formatCurrency(amount)}</Text></View><View className="h-1.5 bg-gray-100 rounded-full overflow-hidden"><View className="h-full bg-orange-500 rounded-full" style={{ width: `${totalFees > 0 ? (amount / totalFees) * 100 : 0}%` }} /></View></View>))}</View>
                        <View className="mt-4 pt-4 border-t border-gray-50 flex-row justify-between items-center"><Text className="text-gray-500 text-xs">Total de Taxas</Text><Text className="text-orange-600 font-bold">- {formatCurrency(totalFees)}</Text></View>
                    </View>
                )}

                {/* Expenses by Location */}
                {totalExpenses > 0 && (<View className="mb-6"><Text className="text-sm font-semibold text-gray-900 mb-4">Despesas por Local</Text>{Object.keys(expensesByLocation).length > 0 ? (<ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-3">{Object.entries(expensesByLocation).map(([loc, amount]) => (<View key={loc} className="bg-red-50 p-3 rounded-lg border border-red-100 mr-2 min-w-[140px]"><Text className="text-xs text-gray-500" numberOfLines={1}>{loc}</Text><Text className="text-lg font-bold text-red-600">- {formatCurrency(amount)}</Text></View>))}</ScrollView>) : (<Text className="text-gray-400 text-sm italic">Nenhuma despesa com local informado.</Text>)}</View>)}

                <BreakdownsSection transactions={filteredTransactions} formatCurrency={formatCurrency} />
            </ScrollView>

            <ClosureFilterModal visible={filterModalVisible} onClose={() => setFilterModalVisible(false)} filters={tempFilters} setFilters={setTempFilters} uniqueLocations={uniqueLocations} uniqueMethods={uniqueMethods} onApply={() => { setActiveFilters(tempFilters); setFilterModalVisible(false); }} onClear={() => { setTempFilters(INITIAL_FILTERS); setActiveFilters(INITIAL_FILTERS); setFilterModalVisible(false); }} />
        </View>
    );
}

function DeductionRow({ label, value, formatCurrency, color = 'red' }: { label: string; value: number; formatCurrency: (v: number) => string; color?: 'red' | 'yellow' }) {
    return (
        <View className="flex-row justify-between items-center">
            <View className={`flex-row items-center gap-2 pl-2 border-l-2 ${color === 'yellow' ? 'border-yellow-100' : 'border-red-100'}`}><Text className="text-gray-500 text-xs">{label}</Text></View>
            <Text className={value > 0 ? (color === 'yellow' ? "text-yellow-600 font-medium text-xs" : "text-red-500 font-medium text-xs") : "text-gray-400 text-xs"}>{value > 0 ? formatCurrency(value) : 'R$ 0,00'}</Text>
        </View>
    );
}
