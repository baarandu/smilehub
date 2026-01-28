import { useState } from 'react';
import { ClipboardList, Plus, Calendar as CalendarIcon, Eye, Edit3, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAnamneses, useDeleteAnamnese } from '@/hooks/useAnamneses';
import { AnamneseSummaryDialog } from './AnamneseSummaryDialog';
import { NewAnamneseDialog } from './NewAnamneseDialog';
import { toast } from 'sonner';
import type { Anamnese } from '@/types/database';

interface AnamneseTabProps {
    patientId: string;
}

export function AnamneseTab({ patientId }: AnamneseTabProps) {
    const { data: anamneses, isLoading } = useAnamneses(patientId);
    const deleteAnamnese = useDeleteAnamnese();
    const [selectedAnamnese, setSelectedAnamnese] = useState<Anamnese | null>(null);
    const [showSummaryDialog, setShowSummaryDialog] = useState(false);
    const [showAnamneseDialog, setShowAnamneseDialog] = useState(false);
    const [editingAnamnese, setEditingAnamnese] = useState<Anamnese | null>(null);

    const formatDate = (date: string) => {
        if (!date) return '';
        // Handle YYYY-MM-DD string directly to avoid timezone issues
        const [year, month, day] = date.split('-');
        return `${day}/${month}/${year}`;
    };

    const handleCardClick = (anamnese: Anamnese) => {
        setSelectedAnamnese(anamnese);
        setShowSummaryDialog(true);
    };

    const getBadges = (anamnese: Anamnese) => {
        const badges = [
            { condition: anamnese.medical_treatment, label: 'Em Tratamento Médico', color: 'bg-blue-100 text-blue-800' },
            { condition: anamnese.pregnant_or_breastfeeding, label: 'Gestante/Lactante', color: 'bg-pink-100 text-pink-800' },
            { condition: anamnese.diabetes, label: 'Diabetes', color: 'bg-red-100 text-red-800' },
            { condition: anamnese.hypertension, label: 'Hipertensão', color: 'bg-red-100 text-red-800' },
            { condition: anamnese.heart_disease, label: 'Doença Cardíaca', color: 'bg-red-100 text-red-800' },
            { condition: anamnese.pacemaker, label: 'Marcapasso', color: 'bg-purple-100 text-purple-800' },
            { condition: anamnese.infectious_disease, label: 'Doença Infecciosa', color: 'bg-yellow-100 text-yellow-800' },
            { condition: anamnese.anesthesia_reaction, label: 'Reação a Anestesia', color: 'bg-red-100 text-red-800' },
            { condition: anamnese.smoker_or_drinker, label: 'Fumante/Etilista', color: 'bg-gray-100 text-gray-800' },
            { condition: anamnese.healing_problems, label: 'Prob. Cicatrização', color: 'bg-orange-100 text-orange-800' },
            { condition: anamnese.current_medication, label: 'Medicação em Uso', color: 'bg-blue-100 text-blue-800' },
            { condition: anamnese.recent_surgery, label: 'Cirurgia Recente', color: 'bg-orange-100 text-orange-800' },
            { condition: anamnese.depression_anxiety_panic, label: 'Ansiedade/Depressão', color: 'bg-purple-100 text-purple-800' },
            { condition: anamnese.seizure_epilepsy, label: 'Epilepsia', color: 'bg-purple-100 text-purple-800' },
            { condition: anamnese.arthritis, label: 'Artrite/Artrose', color: 'bg-orange-100 text-orange-800' },
            { condition: anamnese.gastritis_reflux, label: 'Gastrite/Refluxo', color: 'bg-yellow-100 text-yellow-800' },
            { condition: anamnese.local_anesthesia_history, label: 'Anestesia Local', color: 'bg-green-100 text-green-800' },
            { condition: anamnese.fasting, label: 'Jejum', color: 'bg-blue-100 text-blue-800' },
            { condition: anamnese.allergy, label: 'Alergia', color: 'bg-red-100 text-red-800' },
            { condition: anamnese.drug_allergy, label: 'Alergia Medicamentosa', color: 'bg-red-100 text-red-800' },
            { condition: (anamnese as any).bruxism_dtm_orofacial_pain, label: 'Bruxismo/DTM', color: 'bg-orange-100 text-orange-800' },
        ];

        return badges.filter(b => b.condition);
    };

    const handleAddAnamnese = () => {
        setEditingAnamnese(null);
        setShowAnamneseDialog(true);
    };

    const handleEditAnamnese = (e: React.MouseEvent, anamnese: Anamnese) => {
        e.stopPropagation();
        setEditingAnamnese(anamnese);
        setShowAnamneseDialog(true);
    };

    const handleDeleteAnamnese = async (e: React.MouseEvent, anamnese: Anamnese) => {
        e.stopPropagation();

        if (!confirm('Tem certeza que deseja excluir esta anamnese?')) return;

        try {
            await deleteAnamnese.mutateAsync(anamnese.id);
            toast.success('Anamnese excluída com sucesso!');
        } catch (error) {
            console.error('Error deleting anamnese:', error);
            toast.error('Erro ao excluir anamnese');
        }
    };

    return (
        <>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <CardTitle className="text-lg font-semibold">Anamnese do Paciente</CardTitle>
                    <Button size="sm" className="gap-2" onClick={handleAddAnamnese}>
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:inline">Adicionar</span>
                    </Button>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-3">
                            <Skeleton className="h-20 w-full" />
                            <Skeleton className="h-20 w-full" />
                        </div>
                    ) : anamneses?.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                                <ClipboardList className="w-8 h-8 text-muted-foreground" />
                            </div>
                            <p className="text-muted-foreground">Nenhuma anamnese registrada</p>
                            <p className="text-sm text-muted-foreground/60 mt-1">Funcionalidade em desenvolvimento</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {anamneses?.map((anamnese) => (
                                <div
                                    key={anamnese.id}
                                    onClick={() => handleCardClick(anamnese)}
                                    className="p-4 bg-muted/50 rounded-lg border border-border cursor-pointer hover:bg-muted/70 transition-colors"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                                                <span className="font-medium text-foreground">
                                                    {formatDate(anamnese.date)}
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                                {getBadges(anamnese).length > 0 ? (
                                                    getBadges(anamnese).slice(0, 3).map((badge, index) => (
                                                        <span key={index} className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
                                                            {badge.label}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-sm text-muted-foreground">Sem alertas</span>
                                                )}
                                                {getBadges(anamnese).length > 3 && (
                                                    <span className="text-xs text-muted-foreground self-center">
                                                        +{getBadges(anamnese).length - 3}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={(e) => handleEditAnamnese(e, anamnese)}
                                            >
                                                <Edit3 className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-destructive hover:text-destructive"
                                                onClick={(e) => handleDeleteAnamnese(e, anamnese)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {selectedAnamnese && (
                <AnamneseSummaryDialog
                    open={showSummaryDialog}
                    onOpenChange={setShowSummaryDialog}
                    anamnese={selectedAnamnese}
                />
            )}

            <NewAnamneseDialog
                open={showAnamneseDialog}
                onOpenChange={(open) => {
                    setShowAnamneseDialog(open);
                    if (!open) {
                        setEditingAnamnese(null);
                    }
                }}
                patientId={patientId}
                anamnese={editingAnamnese}
            />
        </>
    );
}
