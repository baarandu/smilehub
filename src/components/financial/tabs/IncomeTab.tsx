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
    Trash2,
    Loader2
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
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button
                        onClick={() => setSubTab('gross')}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${subTab === 'gross'
                            ? 'bg-white text-green-600 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        Bruta
                    </button>
                    <button
                        onClick={() => setSubTab('net')}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${subTab === 'net'
                            ? 'bg-white text-green-600 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        Líquida
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

            {/* Summary Card */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-green-100 shadow-sm bg-gradient-to-br from-white to-green-50/30">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            {displayLabel}
                        </CardTitle>
                        <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center">
                            <TrendingUp className="h-4 w-4 text-green-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {formatCurrency(displayTotal)}
                        </div>
                        {subTab === 'net' && (
                            <p className="text-xs text-muted-foreground mt-1">
                                Deduções: {formatCurrency(totalGrossIncome - totalNetIncome)}
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Breakdowns */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* Revenue by Location */}
                {Object.keys(incomeByLocation).length > 0 && (
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-medium">Receita por Unidade</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[180px] w-full pr-4">
                                <div className="space-y-4">
                                    {Object.entries(incomeByLocation).sort((a, b) => b[1] - a[1]).map(([loc, amount]) => (
                                        <div key={loc} className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 bg-green-50 rounded-md">
                                                    <MapPin className="h-3.5 w-3.5 text-green-600" />
                                                </div>
                                                <span className="text-sm font-medium truncate max-w-[150px]" title={loc}>{loc}</span>
                                            </div>
                                            <span className="text-sm font-bold text-green-600">{formatCurrency(amount)}</span>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                )}


            </div>

            {/* List */}
            <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground">Transações ({filteredTransactions.length})</h3>

                <div className="bg-white rounded-lg border divide-y">
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
                                            const installmentMatch = t.description.match(/\(\d+\/\d+\)/);
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
                                                    <p className="text-sm text-teal-700 font-medium line-clamp-1" title={procedure}>{procedure}</p>
                                                    <p className="text-xs text-muted-foreground">Forma de Pagamento: {displayMethod}</p>
                                                    {t.location && (
                                                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                            <MapPin className="h-3 w-3" />
                                                            {t.location}
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
                                        <Badge variant="secondary" className="bg-teal-50 text-teal-700">
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
                                        <span className="text-muted-foreground">Imposto ({selectedTransaction.tax_rate || 0}%)</span>
                                        <span className="font-medium text-red-500">- {formatCurrency(selectedTransaction.tax_amount)}</span>
                                    </div>
                                )}
                                {selectedTransaction.card_fee_amount !== null && selectedTransaction.card_fee_amount > 0 && (
                                    <div className="flex justify-between py-2 border-b">
                                        <span className="text-muted-foreground">Taxa de Cartão ({selectedTransaction.card_fee_rate || 0}%)</span>
                                        <span className="font-medium text-red-500">- {formatCurrency(selectedTransaction.card_fee_amount)}</span>
                                    </div>
                                )}
                                {(selectedTransaction as any).anticipation_amount !== undefined && (selectedTransaction as any).anticipation_amount > 0 && (
                                    <div className="flex justify-between py-2 border-b">
                                        <span className="text-muted-foreground">Taxa de Antecipação ({(selectedTransaction as any).anticipation_rate || 0}%)</span>
                                        <span className="font-medium text-yellow-600">- {formatCurrency((selectedTransaction as any).anticipation_amount)}</span>
                                    </div>
                                )}
                                {selectedTransaction.location_amount !== undefined && selectedTransaction.location_amount !== null && selectedTransaction.location_amount > 0 && (
                                    <div className="flex justify-between py-2 border-b">
                                        <span className="text-muted-foreground">Taxa do Procedimento ({(selectedTransaction as any).location_rate || 0}%)</span>
                                        <span className="font-medium text-orange-500">- {formatCurrency(selectedTransaction.location_amount)}</span>
                                    </div>
                                )}
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
                    <div className="py-4">
                        <p className="text-muted-foreground">
                            Tem certeza que deseja excluir esta receita?
                        </p>
                        <p className="text-sm text-muted-foreground mt-2">
                            Se houver orçamentos vinculados, eles voltarão ao status "pendente".
                        </p>
                        {selectedTransaction && (
                            <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-100">
                                <p className="font-medium text-foreground">{selectedTransaction.patients?.name || 'Receita'}</p>
                                <p className="text-lg font-bold text-red-600">{formatCurrency(selectedTransaction.amount)}</p>
                            </div>
                        )}
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
                                    await financialService.deleteIncomeAndRevertBudget(selectedTransaction.id);
                                    setConfirmDeleteOpen(false);
                                    setDetailModalOpen(false);
                                    setSelectedTransaction(null);
                                    // Trigger reload by navigating to same page
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
