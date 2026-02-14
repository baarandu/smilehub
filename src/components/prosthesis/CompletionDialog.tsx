import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle, FileText } from 'lucide-react';
import type { ProsthesisOrder } from '@/types/prosthesis';

interface CompletionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: ProsthesisOrder | null;
  onCompleteOnly: () => void;
  onCompleteAndRegister: () => void;
  isLoading?: boolean;
}

export function CompletionDialog({
  open,
  onOpenChange,
  order,
  onCompleteOnly,
  onCompleteAndRegister,
  isLoading,
}: CompletionDialogProps) {
  if (!order) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Concluir Serviço Protético
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left space-y-2">
            <p>
              O serviço de <strong>{order.patient_name}</strong> será marcado como concluído.
            </p>
            {order.budget_id && (
              <p>
                Deseja registrar o procedimento clínico (instalação) vinculado ao orçamento?
              </p>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            variant="outline"
            onClick={onCompleteOnly}
            disabled={isLoading}
            className="gap-1"
          >
            <CheckCircle className="w-4 h-4" />
            Apenas Concluir
          </Button>
          {order.budget_id && (
            <Button
              onClick={onCompleteAndRegister}
              disabled={isLoading}
              className="gap-1 bg-green-600 hover:bg-green-700"
            >
              <FileText className="w-4 h-4" />
              Concluir e Registrar
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
