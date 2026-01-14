import {
    TrendingUp,
    TrendingDown,
    Wallet,
    CreditCard,
    Banknote,
    QrCode,
    MapPin,
    AlertCircle,
    Filter,
    X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { locationsService } from '@/services/locations';
import { settingsService } from '@/services/settings';
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Transaction } from '@/components/financial/types';

interface ClosureTabProps {
    transactions: Transaction[];
    loading: boolean;
}

export function ClosureTab({ transactions, loading }: ClosureTabProps) {
    const safeTransactions = transactions || [];
    const [filterOpen, setFilterOpen] = useState(false);
    const [locationFilter, setLocationFilter] = useState('all');
    const [methodFilter, setMethodFilter] = useState('all'); // Applies primarily to income logic

    const { data: settings } = useQuery({
        queryKey: ['financial_settings'],
        queryFn: settingsService.getFinancialSettings
    });

    const { data: taxes = [] } = useQuery({
        queryKey: ['taxes'],
        queryFn: settingsService.getTaxes
    });

    const { data: locations = [] } = useQuery({
        queryKey: ['locations'],
        queryFn: locationsService.getAll
    });

    // Helper to normalize methods (reused from IncomeTab logic basically)
    const getNormalizedMethod = (description?: string) => {
        if (!description) return 'Outros';
        const desc = description.toLowerCase();
        if (desc.includes('pix')) return 'Pix';
        if (desc.includes('crédito') || desc.includes('credit')) return 'Cartão de Crédito';
        if (desc.includes('débito') || desc.includes('debit')) return 'Cartão de Débito';
        if (desc.includes('dinheiro') || desc.includes('cash')) return 'Dinheiro';
        return 'Outros';
    };

    const uniqueMethods = useMemo(() => {
        const methods = new Set<string>();
        safeTransactions.forEach(t => {
            if (t.type === 'income') {
                methods.add(getNormalizedMethod(t.description));
            }
        });
        return Array.from(methods).sort();
    }, [safeTransactions]);

    const filteredTransactions = useMemo(() => {
        return safeTransactions.filter(t => {
            if (locationFilter !== 'all' && t.location !== locationFilter) return false;

            // Method filter usually applies to Income, but we can try to apply to expenses if they have method info in description?
            // Usually expenses don't have the same "Method" structure in description.
            // Let's apply Method filter ONLY to Income transactions for now, or if it's 'all'.
            if (methodFilter !== 'all') {
                if (t.type === 'income') {
                    const method = getNormalizedMethod(t.description);
                    if (method !== methodFilter) return false;
                } else {
                    // For expenses, if a payment method filter is active, should we hide them?
                    // "Fechamento" balance usually implies (Income - Expense).
                    // If I filter Income by "Credit Card", does it make sense to subtract ALL expenses?
                    // Or only expenses paid by credit card? (We don't track expense payment method well yet).
                    // Let's decide: Method filter only affects Income. Expenses remain filtered ONLY by Location.
                    // Actually, if I want to see "Cash Balance", I might want (Cash Income - Cash Expenses).
                    // But if expenses don't have method, we can't filter them.
                    // SAFE BET: Apply Method filter to Income only. Expenses are unaffected by Method filter.
                    // OR: If Method filter is active, maybe we shouldn't show Balance?
                    // Let's keep it simple: Filter Income by Method. Filter Expenses by Location (always).
                }
            }
            return true;
        });
    }, [safeTransactions, locationFilter, methodFilter]);

    const income = filteredTransactions.filter(t => {
        if (t.type !== 'income') return false;
        if (methodFilter !== 'all' && getNormalizedMethod(t.description) !== methodFilter) return false;
        return true;
    });

    const expenses = filteredTransactions.filter(t => t.type === 'expense');

    const activeFilterCount = (locationFilter !== 'all' ? 1 : 0) + (methodFilter !== 'all' ? 1 : 0);

    const totalIncome = income.reduce((sum, t) => sum + t.amount, 0);

    // Tax Logic
    const legacyTax = settings?.tax_rate || 0;
    const taxesTotal = taxes.reduce((acc, t) => acc + t.rate, 0);
    const taxRate = legacyTax + taxesTotal;
    const totalTaxes = totalIncome * (taxRate / 100);

    const totalCardFees = income.reduce((sum, t) => sum + (t.card_fee_amount || 0), 0);
    const totalAnticipation = income.reduce((sum, t) => sum + ((t as any).anticipation_amount || 0), 0);

    // Procedure Fees (Explicit + Implicit)
    const totalProcedureFees = income.reduce((sum, t) => {
        const gross = t.amount;
        const net = t.net_amount || t.amount;
        const explicit = (t as any).location_amount || 0;

        const deductions =
            (t.tax_amount || 0) +
            (t.card_fee_amount || 0) +
            ((t as any).anticipation_amount || 0) +
            ((t as any).commission_amount || 0) +
            explicit;

        let implicit = gross - net - deductions;
        if (implicit < 0.01) implicit = 0;

        return sum + explicit + implicit;
    }, 0);

    const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);

    // Final Net Result
    const netResult = totalIncome - totalCardFees - totalAnticipation - totalProcedureFees - totalTaxes - totalExpenses;
    const netBalance = netResult; // Alias to match previous usage logic if needed, but we will update UI to use netResult

    // Breakdown by Method (Income only)
    const byMethod = income.reduce((acc, t) => {
        const method = getNormalizedMethod(t.description);
        acc[method] = (acc[method] || 0) + (t.net_amount || t.amount);
        return acc;
    }, {} as Record<string, number>);




    const totalForPercent = Object.values(byMethod).reduce((a, b) => a + b, 0) || 1;

    const feesByLocation = income
        .filter(t => t.location && (t.location_amount || 0) > 0)
        .reduce((acc, t) => {
            const loc = t.location!;
            const amount = (t as any).location_amount || 0;
            acc[loc] = (acc[loc] || 0) + amount;
            return acc;
        }, {} as Record<string, number>);

    const expensesByCategory = expenses.reduce((acc, t) => {
        const cat = t.category || 'Outros';
        acc[cat] = (acc[cat] || 0) + t.amount;
        return acc;
    }, {} as Record<string, number>);


    const formatCurrency = (val: number) => {
        return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    const getIcon = (method: string) => {
        switch (method) {
            case 'Pix': return <QrCode className="h-4 w-4 text-teal-600" />;
            case 'Cartão de Crédito': return <CreditCard className="h-4 w-4 text-blue-600" />;
            case 'Cartão de Débito': return <CreditCard className="h-4 w-4 text-orange-600" />;
            case 'Dinheiro': return <Banknote className="h-4 w-4 text-green-600" />;
            default: return <Wallet className="h-4 w-4 text-gray-600" />;
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header / Filter */}
            <div className="flex justify-end">
                <Button
                    variant="outline"
                    className={`gap-2 ${activeFilterCount > 0 ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100' : ''}`}
                    onClick={() => setFilterOpen(true)}
                >
                    <Filter className="h-4 w-4" />
                    <span>Filtros</span>
                    {activeFilterCount > 0 && (
                        <Badge variant="secondary" className="h-5 w-5 p-0 flex items-center justify-center bg-blue-200 text-blue-800 hover:bg-blue-300">
                            {activeFilterCount}
                        </Badge>
                    )}
                </Button>
            </div>

            {/* Main Stats */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-green-50 border-green-100">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-green-800">
                            Receita Total
                        </CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-700">{formatCurrency(totalIncome)}</div>
                        <p className="text-xs text-green-600 mt-1">Líquido: {formatCurrency(totalNetIncome)}</p>
                    </CardContent>
                </Card>

                <Card className="bg-red-50 border-red-100">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-red-800">
                            Despesas
                        </CardTitle>
                        <TrendingDown className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-700">{formatCurrency(totalExpenses)}</div>

                        <div className="mt-4 space-y-1">
                            {Object.entries(expensesByCategory)
                                .sort(([, a], [, b]) => b - a)
                                .map(([cat, amount]) => (
                                    <div key={cat} className="flex justify-between text-xs">
                                        <span className="text-red-600/80">{cat}</span>
                                        <span className="font-medium text-red-700">{formatCurrency(amount)}</span>
                                    </div>
                                ))
                            }
                            {Object.keys(expensesByCategory).length === 0 && (
                                <p className="text-xs text-red-400">Nenhuma despesa registrada.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card className={`border-l-4 ${netBalance >= 0 ? 'border-l-teal-500 bg-teal-50/30' : 'border-l-red-500 bg-red-50/30'}`}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-foreground">
                            Balanço Líquido
                        </CardTitle>
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${netBalance >= 0 ? 'text-teal-700' : 'text-red-700'}`}>
                            {formatCurrency(netBalance)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Considerando taxas descontadas</p>
                    </CardContent>
                </Card>
            </div>

            {/* Financial Statement (Demonstrativo Financeiro) */}
            <Card className="border-gray-200 shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold text-gray-900">Demonstrativo Financeiro</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="mb-6">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-gray-900 font-medium">Receita Bruta</span>
                            <span className="text-gray-900 font-bold">{formatCurrency(totalIncome)}</span>
                        </div>
                        <Progress value={100} className="h-1.5 bg-gray-100" />
                        {/* Green bar override inside Progress component might be needed or use inline style for simple bar */}
                        <div className="h-1.5 w-full bg-gray-100 rounded-full mt-1 overflow-hidden">
                            <div className="h-full bg-green-500" style={{ width: '100%' }}></div>
                        </div>
                    </div>

                    <div className="space-y-3 mb-6 pl-2">
                        <DeductionRow label="(-) Taxas de Cartão" value={totalCardFees} formatCurrency={formatCurrency} />
                        <DeductionRow label="(-) Taxa de Antecipação" value={totalAnticipation} formatCurrency={formatCurrency} color="yellow" />
                        <DeductionRow label="(-) Taxas de Procedimentos" value={totalProcedureFees} formatCurrency={formatCurrency} />
                        <DeductionRow label={`(-) Impostos (${taxRate}%)`} value={totalTaxes} formatCurrency={formatCurrency} />

                        <div className="pt-2">
                            <div className="flex items-center gap-2 pl-2 border-l-2 border-red-100 mb-1">
                                <span className="text-gray-500 text-sm font-medium">(-) Despesas Operacionais</span>
                            </div>
                            {Object.entries(expensesByCategory).sort(([, a], [, b]) => b - a).map(([cat, amount]) => (
                                <div key={cat} className="flex justify-between items-center pl-4 py-0.5">
                                    <span className="text-gray-400 text-xs">{cat}</span>
                                    <span className="text-red-400 text-xs">{formatCurrency(amount)}</span>
                                </div>
                            ))}
                            {totalExpenses === 0 && (
                                <div className="flex justify-between items-center pl-4">
                                    <span className="text-gray-400 text-xs">-</span>
                                    <span className="text-gray-400 text-xs text-right">R$ 0,00</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="h-px bg-gray-200 mb-4 border-t border-dashed" />

                    <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-900 font-bold text-lg">Receita Líquida</span>
                        <span className={`text-xl font-bold ${netResult >= 0 ? 'text-teal-600' : 'text-red-600'}`}>
                            {formatCurrency(netResult)}
                        </span>
                    </div>
                    <div className="text-right text-xs text-gray-400">
                        (Bruto - Taxas - Impostos - Despesas)
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Breakdown by Method */}
                <Card className="md:col-span-1">
                    <CardHeader>
                        <CardTitle className="text-base">Por Forma de Pagamento</CardTitle>
                        <CardDescription>Receita Líquida por método</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {Object.keys(byMethod).length === 0 ? (
                            <p className="text-sm text-muted-foreground italic text-center py-4">Sem dados para o período.</p>
                        ) : (
                            Object.entries(byMethod).sort((a, b) => b[1] - a[1]).map(([method, amount]) => {
                                const percent = (amount / totalForPercent) * 100;
                                return (
                                    <div key={method} className="space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1 bg-slate-100 rounded">
                                                    {getIcon(method)}
                                                </div>
                                                <span className="font-medium">{method}</span>
                                            </div>
                                            <span className="font-bold">{formatCurrency(amount)}</span>
                                        </div>
                                        <Progress value={percent} className="h-2" />
                                    </div>
                                );
                            })
                        )}
                    </CardContent>
                </Card>

                {/* Breakdown by Fees */}
                <Card className="md:col-span-1 border-red-100 bg-red-50/10">
                    <CardHeader>
                        <CardTitle className="text-base text-red-900">Taxas por Unidade</CardTitle>
                        <CardDescription>Valores retidos na fonte</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {Object.keys(feesByLocation).length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                                <AlertCircle className="h-8 w-8 mb-2 opacity-50" />
                                <p>Nenhuma taxa registrada neste período.</p>
                            </div>
                        ) : (
                            <ScrollArea className="h-[250px] w-full pr-4">
                                <div className="space-y-4">
                                    {Object.entries(feesByLocation).sort((a, b) => b[1] - a[1]).map(([loc, amount]) => (
                                        <div key={loc} className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-100 shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-red-50 rounded-md">
                                                    <MapPin className="h-4 w-4 text-red-600" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-foreground">{loc}</p>
                                                    <p className="text-xs text-muted-foreground">Taxa de Local</p>
                                                </div>
                                            </div>
                                            <span className="font-bold text-red-600">- {formatCurrency(amount)}</span>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        )}
                    </CardContent>
                </Card>
            </div>


            {/* Filter Dialog */}
            <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Filtrar Fechamento</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Local de Atendimento</label>
                            <Select value={locationFilter} onValueChange={setLocationFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Todos" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    {locations.map(l => (
                                        <SelectItem key={l.id} value={l.name}>{l.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Forma de Pagamento (Receitas)</label>
                            <Select value={methodFilter} onValueChange={setMethodFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Todas" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas</SelectItem>
                                    {uniqueMethods.map(m => (
                                        <SelectItem key={m} value={m}>{m}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => {
                            setLocationFilter('all');
                            setMethodFilter('all');
                            setFilterOpen(false);
                        }}>
                            Limpar
                        </Button>
                        <Button onClick={() => setFilterOpen(false)}>
                            Aplicar
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function DeductionRow({ label, value, formatCurrency, color = 'red' }: { label: string; value: number; formatCurrency: (v: number) => string; color?: 'red' | 'yellow' }) {
    const textColor = value > 0 ? (color === 'yellow' ? "text-yellow-600" : "text-red-500") : "text-gray-400";

    return (
        <div className="flex justify-between items-center">
            <div className={`flex items-center gap-2 pl-2 border-l-2 ${color === 'yellow' ? 'border-yellow-100' : 'border-red-100'}`}>
                <span className="text-gray-500 text-sm">{label}</span>
            </div>
            <span className={`font-medium text-sm ${textColor}`}>
                {value > 0 ? formatCurrency(value) : 'R$ 0,00'}
            </span>
        </div>
    );
}
