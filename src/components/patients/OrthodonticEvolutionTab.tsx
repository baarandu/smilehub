import { useState } from 'react';
import { Sparkles, Plus, Calendar as CalendarIcon, SquarePen, Trash2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useOrthodonticEvolution, useDeleteOrthodonticEvolution } from '@/hooks/useOrthodonticEvolution';
import { NewOrthodonticEvolutionDialog } from './NewOrthodonticEvolutionDialog';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { toast } from 'sonner';
import type { OrthodonticEvolution } from '@/types/orthodonticEvolution';

interface OrthodonticEvolutionTabProps {
  patientId: string;
}

export function OrthodonticEvolutionTab({ patientId }: OrthodonticEvolutionTabProps) {
  const { data: entries, isLoading } = useOrthodonticEvolution(patientId);
  const deleteEntry = useDeleteOrthodonticEvolution();
  const [showDialog, setShowDialog] = useState(false);
  const [editingEntry, setEditingEntry] = useState<OrthodonticEvolution | null>(null);
  const { confirm, ConfirmDialog } = useConfirmDialog();

  const formatDate = (date: string) => {
    return new Date(date + 'T00:00:00').toLocaleDateString('pt-BR');
  };

  const handleEdit = (entry: OrthodonticEvolution) => {
    setEditingEntry(entry);
    setShowDialog(true);
  };

  const handleDelete = async (entry: OrthodonticEvolution) => {
    if (!await confirm({
      description: 'Tem certeza que deseja excluir esta evolução? Esta ação não pode ser desfeita.',
      variant: 'destructive',
      confirmLabel: 'Excluir',
    })) return;

    try {
      await deleteEntry.mutateAsync(entry.id);
      toast.success('Evolução excluída com sucesso!');
    } catch (error) {
      console.error('Error deleting orthodontic evolution:', error);
      toast.error('Erro ao excluir evolução');
    }
  };

  return (
    <>
      {ConfirmDialog}
      <div className="bg-card rounded-xl p-6 border border-border">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-semibold text-foreground">Evolução Ortodôntica</h3>
          <Button size="sm" className="gap-2" onClick={() => { setEditingEntry(null); setShowDialog(true); }}>
            <Plus className="w-4 h-4" />
            Nova Evolução
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : entries?.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-40" />
            <p>Nenhuma evolução registrada</p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries?.map((entry) => (
              <div
                key={entry.id}
                className="p-4 bg-muted/50 rounded-lg border border-border"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2 text-sm text-muted-foreground flex-wrap">
                      <div className="flex items-center gap-1">
                        <CalendarIcon className="w-3.5 h-3.5" />
                        <span className="font-medium text-foreground">{formatDate(entry.entry_date)}</span>
                      </div>
                      {entry.created_by_name && (
                        <div className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5" />
                          {entry.created_by_name}
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{entry.content}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleEdit(entry)}
                    >
                      <SquarePen className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(entry)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <NewOrthodonticEvolutionDialog
        open={showDialog}
        onOpenChange={(open) => {
          setShowDialog(open);
          if (!open) {
            setTimeout(() => setEditingEntry(null), 300);
          }
        }}
        patientId={patientId}
        entry={editingEntry}
      />
    </>
  );
}
