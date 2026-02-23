import { useState } from 'react';
import { FileText, Plus, Calendar as CalendarIcon, Trash2, SquarePen, PenLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useExams, useDeleteExam } from '@/hooks/useExams';
import { NewExamDialog } from './NewExamDialog';
import { RecordSignatureBadge, SignaturePadDialog } from '@/components/clinical-signatures';
import { usePlanFeature } from '@/hooks/usePlanFeature';
import { UpgradePrompt } from '@/components/subscription/UpgradePrompt';
import type { Exam } from '@/types/database';
import { toast } from 'sonner';

import { getAccessibleUrl } from '@/lib/utils';

interface ExamsTabProps {
  patientId: string;
  patientName?: string;
  patientEmail?: string | null;
}

export function ExamsTab({ patientId, patientName, patientEmail }: ExamsTabProps) {
  const { data: exams, isLoading } = useExams(patientId);
  const deleteExam = useDeleteExam();
  const [showDialog, setShowDialog] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [signingExam, setSigningExam] = useState<Exam | null>(null);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const { hasFeature: hasSignature } = usePlanFeature('assinatura_digital');

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

  const handleView = async (exam: Exam) => {
    const url = exam.file_url || (exam.file_urls && exam.file_urls.length > 0 ? exam.file_urls[0] : null);

    if (url) {
      // Open window immediately to avoid popup blocker
      const newWindow = window.open('', '_blank');

      try {
        if (newWindow) {
          newWindow.document.write('Carregando documento...');
        }

        const signedUrl = await getAccessibleUrl(url);

        if (newWindow) {
          newWindow.location.href = signedUrl || url;
        }
      } catch (error) {
        console.error('Error opening document:', error);
        if (newWindow) newWindow.close();
        toast.error('Erro ao abrir documento');
      }
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
        ) : (
          <div className="space-y-3">
            {exams?.map((exam) => (
              <div
                key={exam.id}
                className="p-4 bg-muted/50 rounded-lg border border-border cursor-pointer hover:bg-muted/70 transition-colors"
                onClick={() => handleView(exam)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium text-foreground">{exam.name}</h4>
                      <RecordSignatureBadge recordType="exam" recordId={exam.id} compact />
                    </div>
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
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-primary hover:text-primary"
                      title="Coletar Assinatura"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!hasSignature) {
                          setShowUpgradePrompt(true);
                          return;
                        }
                        setSigningExam(exam);
                      }}
                    >
                      <PenLine className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingExam(exam);
                        setShowDialog(true);
                      }}
                    >
                      <SquarePen className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(exam);
                      }}
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

      {signingExam && (
        <SignaturePadDialog
          open={!!signingExam}
          onOpenChange={(open) => { if (!open) setSigningExam(null); }}
          patientId={patientId}
          patientName={patientName || ''}
          patientEmail={patientEmail}
          recordType="exam"
          recordId={signingExam.id}
          record={signingExam as unknown as Record<string, unknown>}
        />
      )}

      <UpgradePrompt
        open={showUpgradePrompt}
        onOpenChange={setShowUpgradePrompt}
        feature="Assinatura Digital"
        description="Assine digitalmente exames e outros registros clínicos com validade jurídica."
      />
    </>
  );
}






