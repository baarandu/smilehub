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
        return new Date(date).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    };

    const handleCardClick = (anamnese: Anamnese) => {
        setSelectedAnamnese(anamnese);
        setShowSummaryDialog(true);
    };

    const getAnamnesePreview = (anamnese: Anamnese) => {
        const items: string[] = [];
        
        if (anamnese.medical_treatment) items.push('Em tratamento');
        if (anamnese.current_medication) items.push('Medicação');
        if (anamnese.pregnant_or_breastfeeding) items.push('Gestante/Lactante');
        if (anamnese.anesthesia_reaction) items.push('Reação anestesia');
        if (anamnese.healing_problems) items.push('Cicatrização');
        if (anamnese.diabetes) items.push('Diabetes');
        if (anamnese.heart_disease) items.push('Doença cardíaca');
        if (anamnese.hypertension) items.push('Hipertensão');
        if (anamnese.infectious_disease) items.push('Doença infecciosa');
        
        if (items.length === 0) {
            return 'Sem alertas';
        }
        
        return items.slice(0, 3).join(', ') + (items.length > 3 ? '...' : '');
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
                                            <p className="text-sm text-muted-foreground">
                                                {getAnamnesePreview(anamnese)}
                                            </p>
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
