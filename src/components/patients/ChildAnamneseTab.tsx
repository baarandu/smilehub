import { useState } from 'react';
import { ClipboardList, Plus, Calendar as CalendarIcon, Edit3, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useChildAnamneses, useDeleteChildAnamnesis } from '@/hooks/useChildAnamneses';
import { ChildAnamneseSummaryDialog } from './ChildAnamneseSummaryDialog';
import { NewChildAnamneseDialog } from './NewChildAnamneseDialog';
import { toast } from 'sonner';
import type { ChildAnamnesis } from '@/types/childAnamnesis';

interface ChildAnamneseTabProps {
  patientId: string;
}

export function ChildAnamneseTab({ patientId }: ChildAnamneseTabProps) {
  const { data: anamneses, isLoading } = useChildAnamneses(patientId);
  const deleteAnamnesis = useDeleteChildAnamnesis();
  const [selectedAnamnesis, setSelectedAnamnesis] = useState<ChildAnamnesis | null>(null);
  const [showSummaryDialog, setShowSummaryDialog] = useState(false);
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [editingAnamnesis, setEditingAnamnesis] = useState<ChildAnamnesis | null>(null);

  const formatDate = (date: string) => {
    if (!date) return '';
    const [year, month, day] = date.split('-');
    return `${day}/${month}/${year}`;
  };

  const handleCardClick = (anamnesis: ChildAnamnesis) => {
    setSelectedAnamnesis(anamnesis);
    setShowSummaryDialog(true);
  };

  const getBadges = (a: ChildAnamnesis) => {
    const badges = [
      { condition: a.chronic_disease, label: 'Doença Crônica', color: 'bg-red-100 text-red-800' },
      { condition: a.drug_allergy, label: 'Alergia Medicamentosa', color: 'bg-red-100 text-red-800' },
      { condition: a.food_allergy, label: 'Alergia Alimentar', color: 'bg-red-100 text-red-800' },
      { condition: a.cardiopathy, label: 'Cardiopatia', color: 'bg-red-100 text-red-800' },
      { condition: a.respiratory_problems, label: 'Prob. Respiratórios', color: 'bg-orange-100 text-orange-800' },
      { condition: a.continuous_medication, label: 'Medicação Contínua', color: 'bg-blue-100 text-blue-800' },
      { condition: a.dental_trauma, label: 'Trauma Dental', color: 'bg-orange-100 text-orange-800' },
      { condition: a.mouth_breathing, label: 'Respirador Bucal', color: 'bg-yellow-100 text-yellow-800' },
      { condition: a.thumb_sucking, label: 'Chupa Dedo', color: 'bg-purple-100 text-purple-800' },
      { condition: a.prolonged_pacifier, label: 'Chupeta Prolongada', color: 'bg-purple-100 text-purple-800' },
      { condition: a.teeth_grinding, label: 'Bruxismo', color: 'bg-orange-100 text-orange-800' },
      { condition: a.nail_biting, label: 'Rói Unhas', color: 'bg-gray-100 text-gray-800' },
      { condition: a.sugar_before_bed, label: 'Açúcar Noturno', color: 'bg-yellow-100 text-yellow-800' },
      { condition: a.currently_uses_bottle, label: 'Usa Mamadeira', color: 'bg-blue-100 text-blue-800' },
    ];
    return badges.filter(b => b.condition);
  };

  const handleAdd = () => {
    setEditingAnamnesis(null);
    setShowFormDialog(true);
  };

  const handleEdit = (e: React.MouseEvent, anamnesis: ChildAnamnesis) => {
    e.stopPropagation();
    setEditingAnamnesis(anamnesis);
    setShowFormDialog(true);
  };

  const handleDelete = async (e: React.MouseEvent, anamnesis: ChildAnamnesis) => {
    e.stopPropagation();
    if (!confirm('Tem certeza que deseja excluir esta anamnese infantil?')) return;
    try {
      await deleteAnamnesis.mutateAsync(anamnesis.id);
      toast.success('Anamnese infantil excluída com sucesso!');
    } catch (error) {
      console.error('Error deleting child anamnesis:', error);
      toast.error('Erro ao excluir anamnese infantil');
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg font-semibold">Anamnese Infantil</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" className="gap-2" onClick={handleAdd}>
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Adicionar</span>
            </Button>
          </div>
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
              <p className="text-muted-foreground">Nenhuma anamnese infantil registrada</p>
            </div>
          ) : (
            <div className="space-y-3">
              {anamneses?.map((anamnesis) => (
                <div
                  key={anamnesis.id}
                  onClick={() => handleCardClick(anamnesis)}
                  className="p-4 bg-muted/50 rounded-lg border border-border cursor-pointer hover:bg-muted/70 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium text-foreground">
                          {formatDate(anamnesis.date)}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {getBadges(anamnesis).length > 0 ? (
                          getBadges(anamnesis).slice(0, 3).map((badge, index) => (
                            <span key={index} className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
                              {badge.label}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">Sem alertas</span>
                        )}
                        {getBadges(anamnesis).length > 3 && (
                          <span className="text-xs text-muted-foreground self-center">
                            +{getBadges(anamnesis).length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => handleEdit(e, anamnesis)}
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={(e) => handleDelete(e, anamnesis)}
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

      {selectedAnamnesis && (
        <ChildAnamneseSummaryDialog
          open={showSummaryDialog}
          onOpenChange={setShowSummaryDialog}
          anamnesis={selectedAnamnesis}
        />
      )}

      <NewChildAnamneseDialog
        open={showFormDialog}
        onOpenChange={(open) => {
          setShowFormDialog(open);
          if (!open) setEditingAnamnesis(null);
        }}
        patientId={patientId}
        anamnesis={editingAnamnesis}
      />
    </>
  );
}
