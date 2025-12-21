import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Calendar, User, ChevronRight, Loader2 } from 'lucide-react';
import { budgetsService } from '@/services/budgets';

interface PendingItem {
    budgetId: string;
    patientId: string;
    patientName: string;
    date: string;
    tooth: {
        tooth: string;
        treatments: string[];
        values: Record<string, string>;
        status: string;
    };
    totalBudgetValue: number;
}

interface PendingBudgetsDialogProps {
    open: boolean;
    onClose: () => void;
}

const getToothDisplayName = (tooth: string): string => {
    if (tooth === 'ARC_SUP') return 'Arcada Superior';
    if (tooth === 'ARC_INF') return 'Arcada Inferior';
    if (tooth === 'ARC_AMBAS') return 'Arcada Superior + Inferior';
    if (tooth.includes('Arcada')) return tooth;
    return `Dente ${tooth}`;
};

const calculateToothTotal = (values: Record<string, string>): number => {
    return Object.values(values).reduce((sum, val) => sum + (parseInt(val || '0', 10) / 100), 0);
};

export function PendingBudgetsDialog({ open, onClose }: PendingBudgetsDialogProps) {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState<PendingItem[]>([]);

    useEffect(() => {
        if (open) {
            loadItems();
        }
    }, [open]);

    const loadItems = async () => {
        try {
            setLoading(true);
            const data = await budgetsService.getAllPending();
            setItems(data);
        } catch (error) {
            console.error('Error loading pending items:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleItemClick = (item: PendingItem) => {
        onClose();
        navigate(`/pacientes/${item.patientId}?tab=budgets`);
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-amber-500" />
                        Tratamentos Pendentes ({items.length})
                    </DialogTitle>
                </DialogHeader>

                <ScrollArea className="flex-1 p-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
                            <p>Carregando tratamentos...</p>
                        </div>
                    ) : items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-center">
                            <FileText className="w-12 h-12 mb-4 opacity-20" />
                            <p className="font-medium">Nenhum tratamento pendente</p>
                            <p className="text-sm">Todos os tratamentos foram aprovados ou finalizados.</p>
                        </div>
                    ) : (
                        <div className="grid gap-3">
                            {items.map((item, index) => (
                                <div
                                    key={`${item.budgetId}-${index}`}
                                    onClick={() => handleItemClick(item)}
                                    className="group relative bg-card p-4 rounded-xl border border-border hover:border-primary/20 hover:shadow-md transition-all cursor-pointer overflow-hidden"
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <User className="w-4 h-4 text-muted-foreground" />
                                                <span className="font-semibold text-foreground truncate">
                                                    {item.patientName}
                                                </span>
                                            </div>
                                            <div className="bg-amber-50 dark:bg-amber-950/30 px-3 py-2 rounded-lg ml-6">
                                                <p className="font-medium text-amber-800 dark:text-amber-200">
                                                    {getToothDisplayName(item.tooth.tooth)}
                                                </p>
                                                <p className="text-sm text-amber-600 dark:text-amber-300">
                                                    {item.tooth.treatments.join(', ')}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right ml-4">
                                            <p className="text-lg font-bold text-emerald-600">
                                                R$ {calculateToothTotal(item.tooth.values).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </p>
                                            <div className="flex items-center justify-end gap-1.5 mt-1 text-xs text-muted-foreground">
                                                <Calendar className="w-3.5 h-3.5" />
                                                <span>{new Date(item.date + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
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
