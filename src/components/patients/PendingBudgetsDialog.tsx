import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Calendar, User, ChevronRight, Loader2, RotateCw } from 'lucide-react';
import { budgetsService } from '@/services/budgets';
import { formatMoney } from '@/utils/budgetUtils';
import type { BudgetWithItems } from '@/types/database';

interface PendingBudget extends BudgetWithItems {
    patient_name: string;
}

interface PendingBudgetsDialogProps {
    open: boolean;
    onClose: () => void;
}

export function PendingBudgetsDialog({ open, onClose }: PendingBudgetsDialogProps) {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [budgets, setBudgets] = useState<PendingBudget[]>([]);

    useEffect(() => {
        if (open) {
            loadBudgets();
        }
    }, [open]);

    const loadBudgets = async () => {
        try {
            setLoading(true);
            const data = await budgetsService.getAllPending();
            setBudgets(data);
        } catch (error) {
            console.error('Error loading pending budgets:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSync = async () => {
        try {
            setSyncing(true);
            await budgetsService.reconcileAllStatuses();
            await loadBudgets();
        } catch (error) {
            console.error('Error syncing budgets:', error);
        } finally {
            setSyncing(false);
        }
    };

    const handleBudgetClick = (budget: PendingBudget) => {
        onClose();
        navigate(`/pacientes/${budget.patient_id}?tab=budgets`);
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0">
                <DialogHeader className="p-6 pb-2">
                    <div className="flex items-center justify-between mr-8">
                        <DialogTitle className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-amber-500" />
                            Orçamentos Pendentes ({budgets.length})
                        </DialogTitle>
                        <button
                            onClick={handleSync}
                            disabled={syncing || loading}
                            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
                            title="Atualizar lista e corrigir inconsistências"
                        >
                            <RotateCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                            {syncing ? 'Sincronizando...' : 'Sincronizar'}
                        </button>
                    </div>
                </DialogHeader>

                <ScrollArea className="flex-1 p-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
                            <p>Carregando orçamentos...</p>
                        </div>
                    ) : budgets.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-center">
                            <FileText className="w-12 h-12 mb-4 opacity-20" />
                            <p className="font-medium">Nenhum orçamento pendente</p>
                            <p className="text-sm">Todos os orçamentos foram aprovados ou finalizados.</p>
                        </div>
                    ) : (
                        <div className="grid gap-3">
                            {budgets.map((budget) => (
                                <div
                                    key={budget.id}
                                    onClick={() => handleBudgetClick(budget)}
                                    className="group relative bg-card p-4 rounded-xl border border-border hover:border-primary/20 hover:shadow-md transition-all cursor-pointer overflow-hidden"
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <User className="w-4 h-4 text-muted-foreground" />
                                                <span className="font-semibold text-foreground truncate">
                                                    {budget.patient_name}
                                                </span>
                                            </div>
                                            <p className="text-sm text-muted-foreground truncate ml-6">
                                                {budget.treatment}
                                            </p>
                                        </div>
                                        <div className="text-right ml-4">
                                            <p className="text-lg font-bold text-emerald-600">
                                                R$ {formatMoney(budget.value)}
                                            </p>
                                            <div className="flex items-center justify-end gap-1.5 mt-1 text-xs text-muted-foreground">
                                                <Calendar className="w-3.5 h-3.5" />
                                                <span>{new Date(budget.created_at).toLocaleDateString('pt-BR')}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-3 pt-3 border-t flex items-center justify-between">
                                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                                            Pendente
                                        </span>
                                        <div className="flex items-center text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                            Ver paciente
                                            <ChevronRight className="w-3.5 h-3.5 ml-1" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
