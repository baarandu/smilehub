import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { Anamnese } from '@/types/database';
import { Calendar as CalendarIcon } from 'lucide-react';

interface AnamneseSummaryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    anamnese: Anamnese;
}

interface AnamneseItem {
    label: string;
    value: boolean;
    details?: string | null;
}

export function AnamneseSummaryDialog({
    open,
    onOpenChange,
    anamnese,
}: AnamneseSummaryDialogProps) {
    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
        });
    };

    // Mapear todos os campos da anamnese
    const anamneseItems: AnamneseItem[] = [
        { label: 'Em tratamento médico', value: anamnese.medical_treatment, details: anamnese.medical_treatment_details },
        { label: 'Cirurgia recente', value: anamnese.recent_surgery, details: anamnese.recent_surgery_details },
        { label: 'Problemas de cicatrização', value: anamnese.healing_problems, details: anamnese.healing_problems_details },
        { label: 'Doença respiratória', value: (anamnese as any).respiratory_problems, details: (anamnese as any).respiratory_problems_details },
        { label: 'Medicação atual', value: anamnese.current_medication, details: anamnese.current_medication_details },
        { label: 'Histórico de anestesia local', value: anamnese.local_anesthesia_history },
        { label: 'Reação à anestesia', value: anamnese.anesthesia_reaction, details: anamnese.anesthesia_reaction_details },
        { label: 'Gestante ou amamentando', value: anamnese.pregnant_or_breastfeeding },
        { label: 'Fumante ou bebe', value: anamnese.smoker_or_drinker, details: anamnese.smoker_or_drinker_details },
        { label: 'Jejum', value: anamnese.fasting },
        { label: 'Diabetes', value: anamnese.diabetes, details: anamnese.diabetes_details },
        { label: 'Depressão, ansiedade ou pânico', value: anamnese.depression_anxiety_panic, details: anamnese.depression_anxiety_panic_details },
        { label: 'Convulsão ou epilepsia', value: anamnese.seizure_epilepsy, details: anamnese.seizure_epilepsy_details },
        { label: 'Doença cardíaca', value: anamnese.heart_disease, details: anamnese.heart_disease_details },
        { label: 'Hipertensão', value: anamnese.hypertension },
        { label: 'Marca-passo', value: anamnese.pacemaker },
        { label: 'Doença infecciosa', value: anamnese.infectious_disease, details: anamnese.infectious_disease_details },
        { label: 'Artrite', value: anamnese.arthritis },
        { label: 'Gastrite ou refluxo', value: anamnese.gastritis_reflux },
    ];

    // Filtrar apenas os itens marcados como "sim" (true)
    const positiveItems = anamneseItems.filter(item => item.value === true);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <CalendarIcon className="w-5 h-5" />
                        Resumo da Anamnese
                    </DialogTitle>
                </DialogHeader>

                <ScrollArea className="max-h-[60vh] pr-4">
                    <div className="space-y-4">
                        {/* Data da anamnese */}
                        <div className="pb-2">
                            <p className="text-sm text-muted-foreground mb-1">Data da anamnese</p>
                            <p className="font-medium">{formatDate(anamnese.date)}</p>
                        </div>

                        <Separator />

                        {/* Itens marcados como "sim" */}
                        {positiveItems.length > 0 ? (
                            <div className="space-y-4">
                                <h3 className="font-semibold text-foreground">Itens identificados</h3>
                                {positiveItems.map((item, index) => (
                                    <div key={index} className="space-y-1">
                                        <p className="font-medium text-foreground">{item.label}</p>
                                        {item.details && item.details.trim() && (
                                            <div className="pl-4 border-l-2 border-primary/20">
                                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                                    {item.details}
                                                </p>
                                            </div>
                                        )}
                                        {index < positiveItems.length - 1 && <Separator className="my-2" />}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                <p>Nenhum item foi marcado como "sim" nesta anamnese.</p>
                            </div>
                        )}

                        {/* Observações */}
                        {anamnese.notes && anamnese.notes.trim() && (
                            <>
                                <Separator />
                                <div className="space-y-2">
                                    <h3 className="font-semibold text-foreground">Queixa Principal</h3>
                                    <div className="pl-4 border-l-2 border-primary/20">
                                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                            {anamnese.notes}
                                        </p>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Observações */}
                        {anamnese.observations && anamnese.observations.trim() && (
                            <>
                                <Separator />
                                <div className="space-y-2">
                                    <h3 className="font-semibold text-foreground">Observações</h3>
                                    <div className="pl-4 border-l-2 border-primary/20">
                                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                            {anamnese.observations}
                                        </p>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}


