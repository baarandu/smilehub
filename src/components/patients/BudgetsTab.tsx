import { useEffect, useState, useMemo } from 'react';
import { Calculator, Plus, Calendar, Banknote, Clock, CheckCircle2, CreditCard, User, MapPin, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { budgetsService } from '@/services/budgets';
import { getToothDisplayName, formatCurrency, formatMoney, formatDisplayDate, type ToothEntry } from '@/utils/budgetUtils';
import type { BudgetWithItems } from '@/types/database';
import { BudgetViewDialog } from './BudgetViewDialog';
import { NewBudgetDialog } from './NewBudgetDialog';
import { isProstheticTreatment, getStatusLabel, getKanbanColumn } from '@/utils/prosthesis';
import { useProstheticBudgetItems } from '@/hooks/useProstheticBudgetItems';


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

    const prostheticItems = useProstheticBudgetItems(patientId);

    // Sort budgets by date descending
    const sortedBudgets = useMemo(() => {
        return [...budgets].sort((a, b) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
        );
    }, [budgets]);

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
                // Group teeth by status
                const teethByStatus = {
                    pending: parsed.teeth.filter((t: ToothEntry) => !t.status || t.status === 'pending'),
                    approved: parsed.teeth.filter((t: ToothEntry) => t.status === 'approved'),
                    completed: parsed.teeth.filter((t: ToothEntry) => t.status === 'paid' || t.status === 'completed')
                };

                const getHintText = (key: string, count: number) => {
                    if (key === 'pending') return `Clique para aprovar ${count === 1 ? 'o orçamento' : 'os orçamentos'}`;
                    if (key === 'approved') return `Clique para pagar ${count === 1 ? 'o orçamento' : 'os orçamentos'}`;
                    return '';
                };

                const statusConfig = [
                    { key: 'pending', label: 'Pendentes', icon: <Clock className="w-4 h-4" />, color: 'text-amber-700' },
                    { key: 'approved', label: 'Aprovados', icon: <CheckCircle2 className="w-4 h-4" />, color: 'text-emerald-700' },
                    { key: 'completed', label: 'Pagos', icon: <CreditCard className="w-4 h-4" />, color: 'text-blue-700' }
                ];

                return (
                    <div className="mt-4 space-y-4">
                        {statusConfig.map(({ key, label, icon, color }) => {
                            const teeth = teethByStatus[key as keyof typeof teethByStatus];
                            if (teeth.length === 0) return null;
                            const hint = getHintText(key, teeth.length);

                            return (
                                <div key={key}>
                                    <div className={`flex items-center gap-2 text-sm font-medium ${color} mb-3`}>
                                        {icon}
                                        <span>{label}:</span>
                                        {hint && <span className="text-gray-900 font-normal ml-1">{hint}</span>}
                                    </div>
                                    <div className="flex flex-wrap gap-3">
                                        {parsed.teeth.map((tooth: ToothEntry, originalIndex: number) => {
                                            // Only show teeth that belong to this status group
                                            const belongsToGroup = key === 'pending'
                                                ? (!tooth.status || tooth.status === 'pending')
                                                : key === 'approved'
                                                    ? tooth.status === 'approved'
                                                    : (tooth.status === 'paid' || tooth.status === 'completed');
                                            if (!belongsToGroup) return null;

                                            const isProsthetic = (tooth.status === 'paid' || tooth.status === 'completed') && isProstheticTreatment(tooth.treatments);
                                            const prostheticItem = isProsthetic
                                                ? prostheticItems.items.find(pi => pi.budgetId === budget.id && pi.toothIndex === originalIndex)
                                                : undefined;

                                            return (
                                            <div
                                                key={originalIndex}
                                                className={`flex flex-col px-4 py-3 rounded-lg border ${getItemStatusColor(tooth.status)}`}
                                            >
                                                <span className="font-semibold text-base">{getToothDisplayName(tooth.tooth)}</span>
                                                <span className="text-sm opacity-90">{tooth.treatments.join(', ')}</span>
                                                {isProsthetic && prostheticItem && prostheticItem.existingOrderId && (
                                                    <Badge variant="outline" className={`mt-1 text-[10px] w-fit ${getKanbanColumn(prostheticItem.existingOrderStatus!)?.color || ''} ${getKanbanColumn(prostheticItem.existingOrderStatus!)?.bgColor || ''} ${getKanbanColumn(prostheticItem.existingOrderStatus!)?.borderColor || ''}`}>
                                                        <Wrench className="w-3 h-3 mr-0.5" />
                                                        {getStatusLabel(prostheticItem.existingOrderStatus!)}
                                                    </Badge>
                                                )}
                                                {isProsthetic && !prostheticItem?.existingOrderId && (
                                                    <Badge variant="outline" className="mt-1 text-[10px] w-fit text-gray-500 bg-gray-50 border-gray-200">
                                                        Envio Pendente
                                                    </Badge>
                                                )}
                                            </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
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
                                <span>Pago</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={handleAddBudget} size="sm" className="gap-2 bg-[#a03f3d] hover:bg-[#8b3634]">
                            <Plus className="w-4 h-4" />
                            <span className="hidden sm:inline">Adicionar</span>
                        </Button>
                    </div>
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
                        <div className="py-4 space-y-4">
                            {sortedBudgets.map((budget) => (
                                <div
                                    key={budget.id}
                                    className="p-5 mx-4 bg-white border border-gray-100 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer shadow-sm"
                                    onClick={() => handleBudgetClick(budget)}
                                >
                                    <div className="flex items-center gap-6 mb-3 flex-wrap">
                                        <div className="flex items-center gap-2 text-gray-600">
                                            <Calendar className="w-4 h-4" />
                                            <span className="text-base">{formatDisplayDate(budget.date)}</span>
                                        </div>
                                        <div className="flex items-center gap-2 font-semibold text-gray-900">
                                            <Banknote className="w-4 h-4" />
                                            <span className="text-lg">R$ {formatMoney(budget.value)}</span>
                                        </div>
                                        {budget.created_by_name && (
                                            <div className="flex items-center gap-2 text-gray-600">
                                                <User className="w-4 h-4" />
                                                <span className="text-sm">{budget.created_by_name}</span>
                                            </div>
                                        )}
                                        {budget.location && (
                                            <div className="flex items-center gap-2 text-gray-600">
                                                <MapPin className="w-4 h-4" />
                                                <span className="text-sm">{budget.location}</span>
                                            </div>
                                        )}
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
