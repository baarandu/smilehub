import { useState, useMemo } from 'react';
import {
    TrendingDown,
    Plus,
    Trash2,
    Search,
    X,
    CreditCard,
    Filter,
    Pencil
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Transaction } from '@/components/financial/types'; // Assuming types exist or will be shared
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { financialService } from '@/services/financial';
import { locationsService } from '@/services/locations';
import { toast } from 'sonner';
import { NewExpenseForm } from './NewExpenseForm'; // We'll create this form component next

interface ExpensesTabProps {
    transactions: Transaction[];
    loading: boolean;
}

export function ExpensesTab({ transactions, loading }: ExpensesTabProps) {
    const [search, setSearch] = useState('');
    const [newExpenseOpen, setNewExpenseOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const queryClient = useQueryClient();

    const deleteMutation = useMutation({
        mutationFn: financialService.deleteTransaction,
        onSuccess: () => {
            toast.success('Despesa excluída com sucesso');
            queryClient.invalidateQueries({ queryKey: ['financial'] });
            setDeleteId(null);
        },
        onError: () => {
            toast.error('Erro ao excluir despesa');
        }
    });

    const [filterOpen, setFilterOpen] = useState(false);
    const [locationFilter, setLocationFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');

    const { data: locations = [] } = useQuery({
        queryKey: ['locations'],
        queryFn: locationsService.getAll
    });

    const uniqueCategories = useMemo(() => {
        const categories = new Set<string>();
        transactions.forEach(t => {
            if (t.type === 'expense' && t.category) {
                categories.add(t.category);
            }
        });
        return Array.from(categories).sort();
    }, [transactions]);

    const filtered = useMemo(() => {
        return transactions.filter(t => {
            if (t.type !== 'expense') return false;

            if (search) {
                if (!t.description.toLowerCase().includes(search.toLowerCase())) return false;
            }

            if (locationFilter !== 'all') {
                if (t.location !== locationFilter) return false;
            }

            if (categoryFilter !== 'all') {
                if (t.category !== categoryFilter) return false;
            }

            return true;
        });
    }, [transactions, search, locationFilter, categoryFilter]);

    const activeFilterCount = (locationFilter !== 'all' ? 1 : 0) + (categoryFilter !== 'all' ? 1 : 0);

    const totalExpenses = filtered.reduce((sum, t) => sum + t.amount, 0);

    const formatCurrency = (val: number) => {
        return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                <div className="relative flex-1 sm:max-w-xs">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar despesa..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 h-9"
                    />
                    {search && (
                        <button
                            onClick={() => setSearch('')}
                            className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>

                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        className={`gap-2 ${activeFilterCount > 0 ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100' : ''}`}
                        onClick={() => setFilterOpen(true)}
                    >
                        <Filter className="h-4 w-4" />
                        <span className="hidden sm:inline">Filtros</span>
                        {activeFilterCount > 0 && (
                            <Badge variant="secondary" className="h-5 w-5 p-0 flex items-center justify-center bg-red-200 text-red-800 hover:bg-red-300">
                                {activeFilterCount}
                            </Badge>
                        )}
                    </Button>

                    <Button onClick={() => {
                        setEditingTransaction(null);
                        setNewExpenseOpen(true);
                    }} className="bg-red-600 hover:bg-red-700 text-white gap-2">
                        <Plus className="h-4 w-4" />
                        Nova Despesa
                    </Button>
                </div>
            </div>

            {/* Summary Card */}
            <div className="bg-white rounded-xl border border-red-100 p-4 shadow-sm flex items-center justify-between sm:max-w-md">
                <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Despesas</p>
                    <p className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</p>
                </div>
                <div className="h-10 w-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <TrendingDown className="h-5 w-5 text-red-600" />
                </div>
            </div>

            {/* List */}
            <div className="bg-white rounded-lg border divide-y">
                {filtered.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground italic">
                        Nenhuma despesa encontrada.
                    </div>
                ) : (
                    filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((t) => (
                        <div key={t.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                            <div className="flex items-start gap-4">
                                <div className="h-10 w-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <CreditCard className="h-5 w-5 text-red-600" />
                                </div>
                                <div>
                                    <p className="font-medium text-foreground">{t.description}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs text-slate-400">{new Date(t.date).toLocaleDateString()}</span>
                                        {t.category && (
                                            <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-normal text-slate-500">
                                                {t.category}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="font-bold text-red-600">
                                    - {formatCurrency(t.amount)}
                                </span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => setDeleteId(t.id)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => {
                                        setEditingTransaction(t);
                                        setNewExpenseOpen(true);
                                    }}
                                >
                                    <Pencil className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* New Expense Dialog */}
            <Dialog open={newExpenseOpen} onOpenChange={(open) => {
                if (!open) setEditingTransaction(null);
                setNewExpenseOpen(open);
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingTransaction ? 'Editar Despesa' : 'Nova Despesa'}</DialogTitle>
                    </DialogHeader>
                    <NewExpenseForm
                        onSuccess={() => setNewExpenseOpen(false)}
                        transactionToEdit={editingTransaction}
                    />
                </DialogContent>
            </Dialog>

            {/* Filter Dialog */}
            <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Filtrar Despesas</DialogTitle>
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
                            <label className="text-sm font-medium">Categoria</label>
                            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Todas" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas</SelectItem>
                                    {uniqueCategories.map(c => (
                                        <SelectItem key={c} value={c}>{c}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => {
                            setLocationFilter('all');
                            setCategoryFilter('all');
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

            {/* Delete Confirmation */}
            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir Despesa</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja excluir esta despesa? Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => deleteId && deleteMutation.mutate(deleteId)}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Excluir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
