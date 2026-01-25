import { useEffect, useState } from 'react';
import { Calculator, Plus, Calendar, Banknote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { budgetsService } from '@/services/budgets';
import { getToothDisplayName, formatCurrency, formatMoney, formatDisplayDate, type ToothEntry } from '@/utils/budgetUtils';
import type { BudgetWithItems } from '@/types/database';
import { BudgetViewDialog } from './BudgetViewDialog';
import { NewBudgetDialog } from './NewBudgetDialog';

interface BudgetsTabProps {
    patientId: string;
    patientName?: string;
    onNavigateToPayments?: () => void;
}

export function BudgetsTab({ patientId, patientName, onNavigateToPayments }: BudgetsTabProps) {
    const { toast } = useToast();
    const [budgets, setBudgets] = useState<BudgetWithItems[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedBudget, setSelectedBudget] = useState<BudgetWithItems | null>(null);
    const [viewDialogOpen, setViewDialogOpen] = useState(false);
    const [newDialogOpen, setNewDialogOpen] = useState(false);
    const [editingBudget, setEditingBudget] = useState<BudgetWithItems | null>(null);

    useEffect(() => {
        loadBudgets();
    }, [patientId]);

    const loadBudgets = async () => {
        try {
            setLoading(true);
            const data = await budgetsService.getByPatient(patientId);
            setBudgets(data);

            // If a budget is currently selected, update it with fresh data
            if (selectedBudget) {
                const updated = data.find(b => b.id === selectedBudget.id);
                if (updated) {
                    setSelectedBudget(updated);
                }
            }
        } catch (error) {
            console.error('Error loading budgets:', error);
            toast({
                variant: "destructive",
                title: "Erro",
                description: "Não foi possível carregar os orçamentos.",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleAddBudget = () => {
        setNewDialogOpen(true);
    };

    const handleBudgetClick = (budget: BudgetWithItems) => {
        setSelectedBudget(budget);
        setViewDialogOpen(true);
    };

    const handleEditBudget = (budget: BudgetWithItems) => {
        setEditingBudget(budget);
        setNewDialogOpen(true);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'approved': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
            case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200'; // Using completed as 'Paid' visual equivalent
            case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-amber-100 text-amber-800 border-amber-200'; // Pending
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'approved': return 'Aprovado';
            case 'completed': return 'Concluído';
            case 'rejected': return 'Rejeitado';
            default: return 'Pendente';
        }
    };

    const getItemStatusColor = (status: string) => {
        switch (status) {
            case 'approved': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'paid':
            case 'completed': return 'bg-blue-50 text-blue-700 border-blue-200';
            default: return 'bg-amber-50 text-amber-700 border-amber-200';
        }
    };

    const renderToothBadges = (budget: BudgetWithItems) => {
        try {
            const parsed = JSON.parse(budget.notes || '{}');
            if (parsed.teeth && Array.isArray(parsed.teeth)) {
                return (
                    <div className="flex flex-wrap gap-2 mt-3">
                        {parsed.teeth.map((tooth: ToothEntry, idx: number) => (
                            <div
                                key={idx}
                                className={`flex flex-col px-3 py-2 rounded-lg border text-sm ${getItemStatusColor(tooth.status)}`}
                            >
                                <span className="font-semibold">{getToothDisplayName(tooth.tooth)}</span>
                                <span className="text-xs opacity-90">{tooth.treatments.join(', ')}</span>
                            </div>
                        ))}
                    </div>
                );
            }
        } catch (e) {
            return null;
        }
        return null;
    };

    if (loading) {
        return <div className="p-8 text-center text-muted-foreground">Carregando orçamentos...</div>;
    }

    return (
        <>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b">
                    <div className="space-y-1">
                        <CardTitle className="text-lg font-semibold">Orçamentos</CardTitle>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-amber-400" />
                                <span>Pendente</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                                <span>Aprovado</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-blue-400" />
                                <span>Pago/Concluído</span>
                            </div>
                        </div>
                    </div>
                    <Button onClick={handleAddBudget} size="sm" className="gap-2 bg-[#a03f3d] hover:bg-[#8b3634]">
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:inline">Adicionar</span>
                    </Button>
                </CardHeader>
                <CardContent className="p-0">
                    {budgets.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                                <Calculator className="w-8 h-8 text-muted-foreground" />
                            </div>
                            <p className="text-muted-foreground">Nenhum orçamento registrado</p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {budgets.map((budget) => (
                                <div
                                    key={budget.id}
                                    className="p-4 hover:bg-slate-50 transition-colors cursor-pointer"
                                    onClick={() => handleBudgetClick(budget)}
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-lg">
                                                    {budget.treatment || 'Tratamento Odontológico'}
                                                </span>
                                                <Badge
                                                    variant="outline"
                                                    className={`border-0 ${getStatusColor(budget.status)}`}
                                                >
                                                    {getStatusLabel(budget.status)}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-4 text-sm text-gray-500">
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    {formatDisplayDate(budget.date)}
                                                </div>
                                                <div className="flex items-center gap-1 font-medium text-gray-900">
                                                    <Banknote className="w-3.5 h-3.5" />
                                                    R$ {formatMoney(budget.value)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {renderToothBadges(budget)}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <BudgetViewDialog
                budget={selectedBudget}
                open={viewDialogOpen}
                onClose={() => setViewDialogOpen(false)}
                onUpdate={loadBudgets}
                onEdit={handleEditBudget}
                patientName={patientName}
                patientId={patientId}
                onNavigateToPayments={onNavigateToPayments}
            />

            <NewBudgetDialog
                patientId={patientId}
                open={newDialogOpen}
                onClose={() => { setNewDialogOpen(false); setEditingBudget(null); }}
                onSuccess={loadBudgets}
                budget={editingBudget}
            />
        </>
    );
}
