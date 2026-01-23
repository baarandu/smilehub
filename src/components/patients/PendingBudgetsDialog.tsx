import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { FileText, Calendar, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react';
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

interface PatientGroup {
    patientId: string;
    patientName: string;
    items: PendingItem[];
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
    const [selectedPatient, setSelectedPatient] = useState<PatientGroup | null>(null);

    useEffect(() => {
        if (open) {
            loadItems();
            setSelectedPatient(null);
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

    // Group pending budgets by patient
    const groupedByPatient = useMemo(() => {
        const groups: Record<string, PatientGroup> = {};
        items.forEach(item => {
            if (!groups[item.patientId]) {
                groups[item.patientId] = {
                    patientId: item.patientId,
                    patientName: item.patientName,
                    items: []
                };
            }
            groups[item.patientId].items.push(item);
        });
        return Object.values(groups);
    }, [items]);

    const handleClose = () => {
        setSelectedPatient(null);
        onClose();
    };

    const handleBack = () => {
        setSelectedPatient(null);
    };

    const handleOpenPatient = (patientId: string) => {
        handleClose();
        navigate(`/pacientes/${patientId}?tab=budgets`);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-amber-500" />
                        {selectedPatient
                            ? selectedPatient.patientName
                            : `Orçamentos Pendentes (${groupedByPatient.length})`
                        }
                    </DialogTitle>
                </DialogHeader>

                <ScrollArea className="flex-1 px-6 pb-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
                            <p>Carregando tratamentos...</p>
                        </div>
                    ) : selectedPatient ? (
                        /* Detail view - show items for selected patient */
                        <div className="space-y-3">
                            <button
                                onClick={handleBack}
                                className="flex items-center gap-2 text-sm text-teal-600 hover:text-teal-700 font-medium mb-4"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                Voltar à lista
                            </button>

                            {selectedPatient.items.map((item, idx) => (
                                <div
                                    key={`${item.budgetId}-${idx}`}
                                    onClick={() => handleOpenPatient(item.patientId)}
                                    className="bg-card p-4 rounded-xl border border-border hover:border-primary/20 hover:shadow-md transition-all cursor-pointer"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                            <Calendar className="w-3.5 h-3.5" />
                                            <span>{new Date(item.date + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                    </div>
                                    <div className="bg-amber-50 dark:bg-amber-950/30 px-3 py-2 rounded-lg">
                                        <p className="font-medium text-amber-800 dark:text-amber-200">
                                            {getToothDisplayName(item.tooth.tooth)}
                                        </p>
                                        <p className="text-sm text-amber-600 dark:text-amber-300">
                                            {item.tooth.treatments.join(', ')}
                                        </p>
                                        <p className="text-teal-600 font-bold mt-1">
                                            R$ {calculateToothTotal(item.tooth.values).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                </div>
                            ))}

                            <Button
                                onClick={() => handleOpenPatient(selectedPatient.patientId)}
                                className="w-full mt-4 bg-teal-600 hover:bg-teal-700"
                            >
                                Abrir Ficha do Paciente
                            </Button>
                        </div>
                    ) : groupedByPatient.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-center">
                            <FileText className="w-12 h-12 mb-4 opacity-20" />
                            <p className="font-medium">Nenhum tratamento pendente</p>
                            <p className="text-sm">Todos os tratamentos foram aprovados ou finalizados.</p>
                        </div>
                    ) : (
                        /* Patient list view */
                        <div className="space-y-3">
                            <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-900 p-3 rounded-xl mb-4">
                                <p className="text-orange-700 dark:text-orange-300 text-sm">
                                    Pacientes com tratamentos pendentes de execução.
                                    Clique em um paciente para ver os detalhes.
                                </p>
                            </div>

                            {groupedByPatient.map((group) => (
                                <div
                                    key={group.patientId}
                                    onClick={() => setSelectedPatient(group)}
                                    className="bg-card p-4 rounded-xl border border-border hover:border-primary/20 hover:shadow-md transition-all cursor-pointer flex items-center justify-between"
                                >
                                    <span className="font-semibold text-foreground">
                                        {group.patientName}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <span className="bg-orange-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                                            {group.items.length}
                                        </span>
                                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
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
