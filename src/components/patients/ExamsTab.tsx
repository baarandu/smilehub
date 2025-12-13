import { useState } from 'react';
import { FileText, Plus, Calendar as CalendarIcon, Trash2, Eye, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useExams, useDeleteExam } from '@/hooks/useExams';
import { NewExamDialog } from './NewExamDialog';
import type { Exam } from '@/types/database';
import { toast } from 'sonner';

interface ExamsTabProps {
  patientId: string;
}

export function ExamsTab({ patientId }: ExamsTabProps) {
  const { data: exams, isLoading } = useExams(patientId);
  const deleteExam = useDeleteExam();
  const [showDialog, setShowDialog] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date + 'T00:00:00').toLocaleDateString('pt-BR');
  };

  const handleDelete = async (exam: Exam) => {
    if (!confirm('Tem certeza que deseja excluir este exame?')) return;

    try {
      await deleteExam.mutateAsync(exam.id);
      toast.success('Exame excluído com sucesso!');
    } catch (error) {
      console.error('Error deleting exam:', error);
      toast.error('Erro ao excluir exame');
    }
  };

  const handleView = (exam: Exam) => {
    if (exam.file_url) {
      window.open(exam.file_url, '_blank');
    } else {
      toast.info('Este exame não possui arquivo anexado');
    }
  };

  return (
    <>
      <div className="bg-card rounded-xl p-6 border border-border">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-semibold text-foreground">Exames Realizados</h3>
          <Button size="sm" className="gap-2" onClick={() => setShowDialog(true)}>
            <Plus className="w-4 h-4" />
            Novo Exame
          </Button>
        </div>
        
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : exams?.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-40" />
            <p>Nenhum exame registrado</p>
          </div>
        ) : (
          <div className="space-y-3">
            {exams?.map((exam) => (
              <div
                key={exam.id}
                className="p-4 bg-muted/50 rounded-lg border border-border"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground mb-2">{exam.name}</h4>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4" />
                        <span>Pedido: {formatDate(exam.order_date)}</span>
                      </div>
                      {exam.exam_date && (
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="w-4 h-4" />
                          <span>Realização: {formatDate(exam.exam_date)}</span>
                        </div>
                      )}
                      {exam.file_type && (
                        <span className="capitalize">
                          {exam.file_type === 'photo' ? 'Foto' : 'Documento'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {exam.file_url && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleView(exam)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(exam)}
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

      <NewExamDialog
        open={showDialog}
        onOpenChange={(open) => {
          setShowDialog(open);
          if (!open) setEditingExam(null);
        }}
        patientId={patientId}
        exam={editingExam}
      />
    </>
  );
}


