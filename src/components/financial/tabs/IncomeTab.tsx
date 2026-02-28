import { useState, useMemo } from 'react';
import {
    TrendingUp,
    MapPin,
    Filter,
    ArrowUpRight,
    Search,
    X,
    Calendar,
    Eye,
    EyeOff,
    Trash2,
    Loader2,
    User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Transaction } from '@/components/financial/types';
import { financialService } from '@/services/financial';
import { locationsService, Location } from '@/services/locations';
import { useQuery } from '@tanstack/react-query';

interface IncomeTabProps {
    transactions: Transaction[];
    loading: boolean;
}

type IncomeSubTab = 'gross' | 'net';

export function IncomeTab({ transactions, loading }: IncomeTabProps) {
    const [subTab, setSubTab] = useState<IncomeSubTab>('gross');

    // Filter State
    const [filterOpen, setFilterOpen] = useState(false);
    const [patientFilter, setPatientFilter] = useState('');
    const [methodFilter, setMethodFilter] = useState('all');
    const [locationFilter, setLocationFilter] = useState('all');
    const [startDateFilter, setStartDateFilter] = useState('');
    const [endDateFilter, setEndDateFilter] = useState('');

    // Detail modal state
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
    const [orthoAction, setOrthoAction] = useState<'delete' | 'pause' | 'keep'>('pause');

    // Card visibility state
    const [hiddenCards, setHiddenCards] = useState<Set<string>>(new Set());
    const toggleCardVisibility = (cardId: string) => {
        setHiddenCards(prev => {
            const newSet = new Set(prev);
            if (newSet.has(cardId)) {
                newSet.delete(cardId);
            } else {
                newSet.add(cardId);
            }
            return newSet;
        });
    };

    // Load Locations
    const { data: locations = [] } = useQuery({
        queryKey: ['locations'],
        queryFn: locationsService.getAll
    });

    // Calculate Methods
    const uniqueMethods = useMemo(() => {
        const methods = new Set<string>();
        transactions.forEach(t => {
            if (t.type === 'income') {
                // Basic extraction logic similar to mobile
                const match = t.description.match(/\((.*?)\)/);
                if (match) {
                    const parts = match[1].split(' - ');
                    let m = parts[0].trim();
                    if (m.toLowerCase().match(/^(crédito|credit)$/)) m = 'Cartão de Crédito';
                    if (m.toLowerCase().match(/^(débito|debit)$/)) m = 'Cartão de Débito';
                    if (m.toLowerCase().match(/^(pix)$/)) m = 'Pix';
                    if (m.toLowerCase().match(/^(dinheiro|cash)$/)) m = 'Dinheiro';
                    methods.add(m);
                }
            }
        });
        return Array.from(methods).sort();
    }, [transactions]);

    // Filter Logic
    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            if (t.type !== 'income') return false;

            // Patient Name
            if (patientFilter) {
                const pName = t.patients?.name?.toLowerCase() || '';
                if (!pName.includes(patientFilter.toLowerCase())) return false;
            }

            // Method
            if (methodFilter !== 'all') {
                const match = t.description.match(/\((.*?)\)/);
                const rawMethod = match ? match[1].split(' - ')[0].trim() : '';
                let normalized = rawMethod;
                if (rawMethod.toLowerCase().match(/^(crédito|credit)$/)) normalized = 'Cartão de Crédito';
                if (rawMethod.toLowerCase().match(/^(débito|debit)$/)) normalized = 'Cartão de Débito';
                if (rawMethod.toLowerCase().match(/^(pix)$/)) normalized = 'Pix';
                if (rawMethod.toLowerCase().match(/^(dinheiro|cash)$/)) normalized = 'Dinheiro';

                if (normalized !== methodFilter) return false;
            }

            // Location
            if (locationFilter !== 'all') {
                if (t.location !== locationFilter) return false;
            }

            // Date Range Filter
            if (startDateFilter || endDateFilter) {
                const tDate = new Date(t.date);
                if (startDateFilter) {
                    const start = new Date(startDateFilter);
                    if (tDate < start) return false;
                }
                if (endDateFilter) {
                    const end = new Date(endDateFilter);
                    end.setHours(23, 59, 59, 999);
                    if (tDate > end) return false;
                }
            }

            return true;
        });
    }, [transactions, patientFilter, methodFilter, locationFilter, startDateFilter, endDateFilter]);

    // Calculations
    const totalGrossIncome = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);
    const totalNetIncome = filteredTransactions.reduce((sum, t) => sum + (t.net_amount || t.amount), 0);

    const displayTotal = subTab === 'gross' ? totalGrossIncome : totalNetIncome;
    const displayLabel = subTab === 'gross' ? 'Receita Bruta' : 'Receita Líquida';

    // Additional stats
    const transactionCount = filteredTransactions.length;
    const averageTicket = transactionCount > 0 ? displayTotal / transactionCount : 0;
    const highestTransaction = filteredTransactions.length > 0
        ? Math.max(...filteredTransactions.map(t => subTab === 'gross' ? t.amount : (t.net_amount || t.amount)))
        : 0;

    // Income by payment method
    const incomeByMethod = filteredTransactions.reduce((acc, t) => {
        const pm = (t as any).payment_method;
        let method = 'Outros';
        if (pm === 'credit') method = 'Cartão de Crédito';
        else if (pm === 'debit') method = 'Cartão de Débito';
        else if (pm === 'pix') method = 'Pix';
        else if (pm === 'cash') method = 'Dinheiro';
        else if (pm) method = pm;
        else {
            // Try to parse from description
            const match = t.description.match(/\((.*?)\)/);
            if (match) {
                const parts = match[1].split(' - ');
                const m = parts[0].trim().toLowerCase();
                if (m === 'crédito' || m === 'credit') method = 'Cartão de Crédito';
                else if (m === 'débito' || m === 'debit') method = 'Cartão de Débito';
                else if (m === 'pix') method = 'Pix';
                else if (m === 'dinheiro' || m === 'cash') method = 'Dinheiro';
            }
        }
        const amount = subTab === 'gross' ? t.amount : (t.net_amount || t.amount);
        acc[method] = (acc[method] || 0) + amount;
        return acc;
    }, {} as Record<string, number>);

    const incomeByLocation = filteredTransactions
        .filter(t => t.location)
        .reduce((acc, t) => {
            const loc = t.location!;
            const amount = subTab === 'gross' ? t.amount : (t.net_amount || t.amount);
            acc[loc] = (acc[loc] || 0) + amount;
            return acc;
        }, {} as Record<string, number>);

    const feesByLocation = filteredTransactions
        .filter(t => t.location && (t.location_amount || 0) > 0)
        .reduce((acc, t) => {
            const loc = t.location!;
            // Need precise correct typing if possible, assuming location_amount exists
            const amount = (t as any).location_amount || 0;
            acc[loc] = (acc[loc] || 0) + amount;
            return acc;
        }, {} as Record<string, number>);


    const formatCurrency = (val: number) => {
        return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    const activeFilterCount = (patientFilter ? 1 : 0) + (methodFilter !== 'all' ? 1 : 0) + (locationFilter !== 'all' ? 1 : 0) + (startDateFilter || endDateFilter ? 1 : 0);

    const handleCardClick = (transaction: Transaction) => {
        setSelectedTransaction(transaction);
        setDetailModalOpen(true);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header Controls */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                <div className="flex bg-slate-100 p-1.5 rounded-xl gap-1">
                    <button
                        onClick={() => setSubTab('gross')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${subTab === 'gross'
                            ? 'bg-white text-green-600 shadow-md border border-green-100'
                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                            }`}
                    >
                        <TrendingUp className="h-4 w-4" />
                        Receita Bruta
                    </button>
                    <button
                        onClick={() => setSubTab('net')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${subTab === 'net'
                            ? 'bg-white text-green-600 shadow-md border border-green-100'
                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                            }`}
                    >
                        <TrendingUp className="h-4 w-4" />
                        Receita Líquida
                    </button>
                </div>

                <div className="flex gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar paciente..."
                            value={patientFilter}
                            onChange={(e) => setPatientFilter(e.target.value)}
                            className="pl-9 h-9"
                        />
                        {patientFilter && (
                            <button
                                onClick={() => setPatientFilter('')}
                                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    <Button
                        variant="outline"
                        size="sm"
                        className={`h-9 gap-2 ${activeFilterCount > 0 ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100' : ''}`}
                        onClick={() => setFilterOpen(true)}
                    >
                        <Filter className="h-4 w-4" />
                        <span className="hidden sm:inline">Filtros</span>
                        {activeFilterCount > 0 && (
                            <Badge variant="secondary" className="h-5 w-5 p-0 flex items-center justify-center bg-green-200 text-green-800 hover:bg-green-300">
                                {activeFilterCount}
                            </Badge>
                        )}
                    </Button>
                </div>
            </div>

            {/* Summary Cards - 2 cards principais */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                {/* Card Receita */}
                <Card className={`relative group border-green-100 shadow-sm bg-gradient-to-br from-white to-green-50/30 transition-all ${hiddenCards.has('total') ? 'opacity-50' : ''}`}>
                    <button
                        onClick={(e) => { e.stopPropagation(); toggleCardVisibility('total'); }}
                        className="absolute top-2 right-2 p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-gray-100 transition-all z-10"
                        title={hiddenCards.has('total') ? 'Mostrar' : 'Ocultar'}
                    >
                        {hiddenCards.has('total') ? <EyeOff className="h-3.5 w-3.5 text-gray-400" /> : <Eye className="h-3.5 w-3.5 text-gray-300" />}
                    </button>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            {displayLabel}
                        </CardTitle>
                        <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center">
                            <TrendingUp className="h-4 w-4 text-green-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold text-green-600 ${hiddenCards.has('total') ? 'blur-md select-none' : ''}`}>
                            {formatCurrency(displayTotal)}
                        </div>
                        <p className={`text-xs text-muted-foreground mt-1 ${hiddenCards.has('total') ? 'blur-md select-none' : ''}`}>
                            {subTab === 'net' ? `Deduções: ${formatCurrency(totalGrossIncome - totalNetIncome)}` : `${transactionCount} receitas no período`}
                        </p>
                    </CardContent>
                </Card>

                {/* Card Ticket Médio */}
                <Card className={`relative group border-purple-100 shadow-sm bg-gradient-to-br from-white to-purple-50/30 transition-all ${hiddenCards.has('average') ? 'opacity-50' : ''}`}>
                    <button
                        onClick={(e) => { e.stopPropagation(); toggleCardVisibility('average'); }}
                        className="absolute top-2 right-2 p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-gray-100 transition-all z-10"
                        title={hiddenCards.has('average') ? 'Mostrar' : 'Ocultar'}
                    >
                        {hiddenCards.has('average') ? <EyeOff className="h-3.5 w-3.5 text-gray-400" /> : <Eye className="h-3.5 w-3.5 text-gray-300" />}
                    </button>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div className="flex items-center gap-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Ticket Médio
                            </CardTitle>
                            {highestTransaction > 0 && (
                                <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium" title={`Maior: ${formatCurrency(highestTransaction)}`}>
                                    máx {formatCurrency(highestTransaction).replace('R$', '').trim()}
                                </span>
                            )}
                        </div>
                        <div className="h-8 w-8 bg-purple-100 rounded-lg flex items-center justify-center">
                            <TrendingUp className="h-4 w-4 text-purple-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold text-purple-600 ${hiddenCards.has('average') ? 'blur-md select-none' : ''}`}>
                            {formatCurrency(averageTicket)}
                        </div>
                        <p className={`text-xs text-muted-foreground mt-1 ${hiddenCards.has('average') ? 'blur-md select-none' : ''}`}>
                            por transação
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Título das Transações */}
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-muted-foreground">Transações ({filteredTransactions.length})</h3>
            </div>

            {/* Layout 2 colunas: Lista à esquerda, Breakdowns à direita */}
            <div className="grid gap-6 lg:grid-cols-5 items-start">
                {/* Coluna Esquerda: Lista de Transações */}
                <div className="lg:col-span-3">
                    <div className="bg-white rounded-lg border divide-y max-h-[500px] overflow-y-auto">
                    {filteredTransactions.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground italic">
                            Nenhuma transação encontrada.
                        </div>
                    ) : (
                        filteredTransactions.sort((a, b) => {
                            const dateA = new Date(a.date).getTime();
                            const dateB = new Date(b.date).getTime();
                            if (dateB !== dateA) return dateB - dateA;

                            // Sorting fallback: created_at desc
                            const createdA = a.created_at ? new Date(a.created_at).getTime() : 0;
                            const createdB = b.created_at ? new Date(b.created_at).getTime() : 0;
                            return createdB - createdA;
                        }).map((t) => (
                            <div
                                key={t.id}
                                className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer group"
                                onClick={() => handleCardClick(t)}
                            >
                                <div className="flex items-start gap-4">
                                    <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <ArrowUpRight className="h-5 w-5 text-green-600" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-foreground">{t.patients?.name || 'Não identificado'}</p>
                                        {(() => {
                                            // Parse procedure from description
                                            const installmentMatch = t.description.match(/\((\d+\/\d+)\)/);
                                            const installmentInfo = installmentMatch ? installmentMatch[1] : null;
                                            let workingDesc = t.description;
                                            if (installmentMatch) workingDesc = workingDesc.replace(installmentMatch[0], '');
                                            const methodMatch = workingDesc.match(/\((.*?)\)/);
                                            if (methodMatch) workingDesc = workingDesc.replace(methodMatch[0], '');
                                            const parts = workingDesc.split(' - ').map(p => p.trim()).filter(p => p && p.toLowerCase() !== (t.patients?.name?.toLowerCase() || ''));
                                            const procedure = parts.length > 0 ? parts.join(' - ') : 'Procedimento';

                                            // Determine payment method from transaction field or parsed description
                                            const paymentMethod = (t as any).payment_method;
                                            let displayMethod = 'Não informado';
                                            if (paymentMethod) {
                                                displayMethod = paymentMethod === 'credit' ? 'Cartão de Crédito' :
                                                    paymentMethod === 'debit' ? 'Cartão de Débito' :
                                                        paymentMethod === 'pix' ? 'PIX' :
                                                            paymentMethod === 'cash' ? 'Dinheiro' : paymentMethod;
                                            } else if (methodMatch) {
                                                const methodParts = methodMatch[1].split(' - ');
                                                let methodType = methodParts[0];
                                                if (methodType.toLowerCase() === 'crédito' || methodType.toLowerCase() === 'credit') methodType = 'Cartão de Crédito';
                                                if (methodType.toLowerCase() === 'débito' || methodType.toLowerCase() === 'debit') methodType = 'Cartão de Débito';
                                                if (methodType.toLowerCase() === 'pix') methodType = 'Pix';
                                                if (methodType.toLowerCase() === 'dinheiro' || methodType.toLowerCase() === 'cash') methodType = 'Dinheiro';
                                                displayMethod = methodType;
                                            }

                                            return (
                                                <>
                                                    <p className="text-sm text-[#8b3634] font-medium line-clamp-1" title={procedure}>
                                                        {procedure}
                                                        {installmentInfo && (
                                                            <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-medium">
                                                                {installmentInfo}
                                                            </span>
                                                        )}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">Forma de Pagamento: {displayMethod}</p>
                                                    {t.location && (
                                                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                            <MapPin className="h-3 w-3" />
                                                            {t.location}
                                                        </p>
                                                    )}
                                                    {(t as any).created_by_name && (
                                                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                            <User className="h-3 w-3" />
                                                            {(t as any).created_by_name}
                                                        </p>
                                                    )}
                                                </>
                                            );
                                        })()}
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs text-slate-400">{new Date(t.date.split('T')[0] + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="text-right">
                                        <span className="block font-bold text-green-600">
                                            + {formatCurrency(subTab === 'gross' ? t.amount : (t.net_amount || t.amount))}
                                        </span>
                                        {t.type === 'income' && subTab === 'net' && t.amount !== (t.net_amount || t.amount) && (
                                            <span className="text-xs text-slate-400 line-through">
                                                {formatCurrency(t.amount)}
                                            </span>
                                        )}
                                    </div>
                                    <Eye className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            </div>
                        ))
                    )}
                    </div>
                </div>

                {/* Coluna Direita: Breakdowns */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Revenue by Payment Method */}
                    {Object.keys(incomeByMethod).length > 0 && (
                        <Card className={`relative group transition-all ${hiddenCards.has('method') ? 'opacity-50' : ''}`}>
                            <button
                                onClick={(e) => { e.stopPropagation(); toggleCardVisibility('method'); }}
                                className="absolute top-3 right-3 p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-gray-100 transition-all z-10"
                                title={hiddenCards.has('method') ? 'Mostrar' : 'Ocultar'}
                            >
                                {hiddenCards.has('method') ? <EyeOff className="h-3.5 w-3.5 text-gray-400" /> : <Eye className="h-3.5 w-3.5 text-gray-300" />}
                            </button>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium">Receita por Forma de Pagamento</CardTitle>
                            </CardHeader>
                            <CardContent className={hiddenCards.has('method') ? 'blur-md select-none' : ''}>
                                <div className="space-y-3">
                                    {Object.entries(incomeByMethod).sort((a, b) => b[1] - a[1]).map(([method, amount]) => {
                                        const getMethodStyle = (m: string) => {
                                            if (m.includes('Crédito')) return { bg: 'bg-purple-50', color: 'text-purple-600', bar: 'bg-purple-500' };
                                            if (m.includes('Débito')) return { bg: 'bg-blue-50', color: 'text-blue-600', bar: 'bg-blue-500' };
                                            if (m === 'Pix') return { bg: 'bg-teal-50', color: 'text-teal-600', bar: 'bg-teal-500' };
                                            if (m === 'Dinheiro') return { bg: 'bg-green-50', color: 'text-green-600', bar: 'bg-green-500' };
                                            return { bg: 'bg-gray-50', color: 'text-gray-600', bar: 'bg-gray-500' };
                                        };
                                        const style = getMethodStyle(method);
                                        const percentage = displayTotal > 0 ? ((amount / displayTotal) * 100).toFixed(0) : '0';
                                        return (
                                            <div key={method} className="space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`p-1 ${style.bg} rounded`}>
                                                            <ArrowUpRight className={`h-3 w-3 ${style.color}`} />
                                                        </div>
                                                        <span className="text-xs font-medium">{method}</span>
                                                    </div>
                                                    <span className="text-xs font-bold text-green-600">{formatCurrency(amount)}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full ${style.bar} rounded-full transition-all`}
                                                            style={{ width: `${percentage}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-[10px] text-muted-foreground w-8 text-right">{percentage}%</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Revenue by Location */}
                    {Object.keys(incomeByLocation).length > 0 && (
                        <Card className={`relative group transition-all ${hiddenCards.has('location') ? 'opacity-50' : ''}`}>
                            <button
                                onClick={(e) => { e.stopPropagation(); toggleCardVisibility('location'); }}
                                className="absolute top-3 right-3 p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-gray-100 transition-all z-10"
                                title={hiddenCards.has('location') ? 'Mostrar' : 'Ocultar'}
                            >
                                {hiddenCards.has('location') ? <EyeOff className="h-3.5 w-3.5 text-gray-400" /> : <Eye className="h-3.5 w-3.5 text-gray-300" />}
                            </button>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium">Receita por Local</CardTitle>
                            </CardHeader>
                            <CardContent className={hiddenCards.has('location') ? 'blur-md select-none' : ''}>
                                <div className="space-y-2">
                                    {Object.entries(incomeByLocation).sort((a, b) => b[1] - a[1]).map(([loc, amount]) => (
                                        <div key={loc} className="flex items-center justify-between py-1">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1 bg-green-50 rounded">
                                                    <MapPin className="h-3 w-3 text-green-600" />
                                                </div>
                                                <span className="text-xs font-medium truncate max-w-[120px]" title={loc}>{loc}</span>
                                            </div>
                                            <span className="text-xs font-bold text-green-600">{formatCurrency(amount)}</span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            {/* Filter Sheet/Dialog */}
            <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Filtrar Receitas</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        {/* Date Range Filter */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                Período
                            </label>
                            <div className="flex items-center gap-2">
                                <Input
                                    type="date"
                                    value={startDateFilter}
                                    onChange={(e) => setStartDateFilter(e.target.value)}
                                    placeholder="Data início"
                                    className="flex-1"
                                />
                                <span className="text-muted-foreground">até</span>
                                <Input
                                    type="date"
                                    value={endDateFilter}
                                    onChange={(e) => setEndDateFilter(e.target.value)}
                                    placeholder="Data fim"
                                    className="flex-1"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Forma de Pagamento</label>
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
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => {
                            setMethodFilter('all');
                            setLocationFilter('all');
                            setPatientFilter('');
                            setStartDateFilter('');
                            setEndDateFilter('');
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

            {/* Transaction Detail Modal */}
            <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Detalhes da Receita</DialogTitle>
                    </DialogHeader>
                    {selectedTransaction && (
                        <div className="space-y-4 py-4">
                            {/* Patient Info */}
                            <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                                <p className="text-sm text-muted-foreground">Paciente</p>
                                <p className="text-lg font-bold text-foreground">{selectedTransaction.patients?.name || 'Não identificado'}</p>
                            </div>

                            {/* Amount Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 p-4 rounded-lg">
                                    <p className="text-sm text-muted-foreground">Valor Bruto</p>
                                    <p className="text-xl font-bold text-green-600">{formatCurrency(selectedTransaction.amount)}</p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-lg">
                                    <p className="text-sm text-muted-foreground">Valor Líquido</p>
                                    <p className="text-xl font-bold text-green-600">{formatCurrency(selectedTransaction.net_amount || selectedTransaction.amount)}</p>
                                </div>
                            </div>

                            {/* Details */}
                            <div className="space-y-3">
                                <div className="flex justify-between py-2 border-b">
                                    <span className="text-muted-foreground">Data</span>
                                    <span className="font-medium">{new Date(selectedTransaction.date.split('T')[0] + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b">
                                    <span className="text-muted-foreground">Descrição</span>
                                    <span className="font-medium text-right max-w-[250px]">{selectedTransaction.description}</span>
                                </div>
                                {selectedTransaction.location && (
                                    <div className="flex justify-between py-2 border-b">
                                        <span className="text-muted-foreground">Local</span>
                                        <Badge variant="secondary" className="bg-red-50 text-[#8b3634]">
                                            {selectedTransaction.location}
                                        </Badge>
                                    </div>
                                )}
                                <div className="flex justify-between py-2 border-b">
                                    <span className="text-muted-foreground">Forma de Pagamento</span>
                                    <span className="font-medium">
                                        {(() => {
                                            const pm = (selectedTransaction as any).payment_method;
                                            if (pm) {
                                                if (pm === 'credit') return 'Cartão de Crédito';
                                                if (pm === 'debit') return 'Cartão de Débito';
                                                if (pm === 'pix') return 'PIX';
                                                if (pm === 'cash') return 'Dinheiro';
                                                return pm;
                                            }
                                            return 'Não informado';
                                        })()}
                                    </span>
                                </div>
                                {(selectedTransaction.tax_amount !== undefined && selectedTransaction.tax_amount !== null && selectedTransaction.tax_amount > 0) && (
                                    <div className="flex justify-between py-2 border-b">
                                        <span className="text-muted-foreground">Imposto ({(selectedTransaction as any).tax_rate || 0}%)</span>
                                        <span className="font-medium text-red-500">- {formatCurrency(selectedTransaction.tax_amount)}</span>
                                    </div>
                                )}
                                {selectedTransaction.card_fee_amount !== null && selectedTransaction.card_fee_amount > 0 && (
                                    <div className="flex justify-between py-2 border-b">
                                        <span className="text-muted-foreground">Taxa de Cartão ({(selectedTransaction as any).card_fee_rate || 0}%)</span>
                                        <span className="font-medium text-red-500">- {formatCurrency(selectedTransaction.card_fee_amount)}</span>
                                    </div>
                                )}
                                {(selectedTransaction as any).anticipation_amount !== undefined && (selectedTransaction as any).anticipation_amount > 0 && (
                                    <div className="flex justify-between py-2 border-b">
                                        <span className="text-muted-foreground">Taxa de Antecipação ({(selectedTransaction as any).anticipation_rate || 0}%)</span>
                                        <span className="font-medium text-yellow-600">- {formatCurrency((selectedTransaction as any).anticipation_amount)}</span>
                                    </div>
                                )}
                                {(selectedTransaction as any).commission_amount !== undefined && (selectedTransaction as any).commission_amount > 0 && (
                                    <div className="flex justify-between py-2 border-b">
                                        <span className="text-muted-foreground">Comissão ({(selectedTransaction as any).commission_rate || 0}%)</span>
                                        <span className="font-medium text-red-500">- {formatCurrency((selectedTransaction as any).commission_amount)}</span>
                                    </div>
                                )}
                                {selectedTransaction.location_amount !== undefined && selectedTransaction.location_amount !== null && selectedTransaction.location_amount > 0 && (
                                    <div className="flex justify-between py-2 border-b">
                                        <span className="text-muted-foreground">Taxa do Procedimento ({(selectedTransaction as any).location_rate || 0}%)</span>
                                        <span className="font-medium text-orange-500">- {formatCurrency(selectedTransaction.location_amount)}</span>
                                    </div>
                                )}
                                {(() => {
                                    const explicitDeductions =
                                        (selectedTransaction.tax_amount || 0) +
                                        (selectedTransaction.card_fee_amount || 0) +
                                        ((selectedTransaction as any).anticipation_amount || 0) +
                                        ((selectedTransaction as any).commission_amount || 0) +
                                        ((selectedTransaction as any).location_amount || 0);

                                    const totalDifference = selectedTransaction.amount - (selectedTransaction.net_amount || selectedTransaction.amount);
                                    const implicitDeductions = totalDifference - explicitDeductions;

                                    if (implicitDeductions > 0.01) {
                                        const label = ((selectedTransaction as any).location_amount || 0) > 0 ? 'Outros Descontos' : 'Taxa do Procedimento';
                                        return (
                                            <div className="flex justify-between py-2 border-b">
                                                <span className="text-muted-foreground">{label}</span>
                                                <span className="font-medium text-red-500">- {formatCurrency(implicitDeductions)}</span>
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}
                            </div>
                        </div>
                    )}
                    <div className="flex justify-between">
                        <Button
                            variant="destructive"
                            onClick={() => setConfirmDeleteOpen(true)}
                            className="gap-2"
                        >
                            <Trash2 className="w-4 h-4" />
                            Excluir
                        </Button>
                        <Button onClick={() => setDetailModalOpen(false)}>Fechar</Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Confirm Delete Dialog */}
            <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-red-600 flex items-center gap-2">
                            <Trash2 className="w-5 h-5" />
                            Confirmar Exclusão
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <p className="text-muted-foreground">
                            Tem certeza que deseja excluir esta receita?
                        </p>
                        <p className="text-sm text-muted-foreground">
                            Se houver orçamentos vinculados, eles voltarão ao status "pendente".
                        </p>
                        {selectedTransaction && (
                            <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                                <p className="font-medium text-foreground">{selectedTransaction.patients?.name || 'Receita'}</p>
                                <p className="text-lg font-bold text-red-600">{formatCurrency(selectedTransaction.amount)}</p>
                            </div>
                        )}
                        {selectedTransaction && (() => {
                            const desc = selectedTransaction.description || '';
                            const isOrtho = ['Aparelho Ortodôntico', 'Aparelho ortopédico'].some(t => desc.includes(t));
                            if (!isOrtho) return null;
                            return (
                                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 space-y-3">
                                    <p className="text-sm font-medium text-amber-800">
                                        Esta receita está vinculada a um caso ortodôntico. O que fazer com o caso?
                                    </p>
                                    <RadioGroup value={orthoAction} onValueChange={(v) => setOrthoAction(v as any)}>
                                        <div className="flex items-center gap-2">
                                            <RadioGroupItem value="pause" id="ortho-pause" />
                                            <Label htmlFor="ortho-pause" className="text-sm cursor-pointer">
                                                Pausar o caso na Central de Orto
                                            </Label>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <RadioGroupItem value="delete" id="ortho-delete" />
                                            <Label htmlFor="ortho-delete" className="text-sm cursor-pointer">
                                                Excluir o caso da Central de Orto
                                            </Label>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <RadioGroupItem value="keep" id="ortho-keep" />
                                            <Label htmlFor="ortho-keep" className="text-sm cursor-pointer">
                                                Manter o caso (não alterar)
                                            </Label>
                                        </div>
                                    </RadioGroup>
                                </div>
                            );
                        })()}
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setConfirmDeleteOpen(false)} disabled={deleting}>
                            Cancelar
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={async () => {
                                if (!selectedTransaction) return;
                                setDeleting(true);
                                try {
                                    await financialService.deleteIncomeAndRevertBudget(selectedTransaction.id, orthoAction);
                                    setConfirmDeleteOpen(false);
                                    setDetailModalOpen(false);
                                    setSelectedTransaction(null);
                                    window.location.reload();
                                } catch (error) {
                                    console.error('Error deleting:', error);
                                    alert('Erro ao excluir receita');
                                } finally {
                                    setDeleting(false);
                                }
                            }}
                            disabled={deleting}
                            className="gap-2"
                        >
                            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            {deleting ? 'Excluindo...' : 'Confirmar Exclusão'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
