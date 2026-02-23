import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';

interface UpgradePromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature: string;
  description?: string;
}

export function UpgradePrompt({ open, onOpenChange, feature, description }: UpgradePromptProps) {
  const navigate = useNavigate();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-2xl max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[#fef2f2] mx-auto mb-2">
            <Sparkles className="w-6 h-6 text-[#a03f3d]" />
          </div>
          <AlertDialogTitle className="text-center">
            Recurso do Plano Profissional
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center space-y-3">
            <p>
              <strong>{feature}</strong> está disponível no plano <strong>Profissional</strong>.
            </p>
            {description && (
              <p className="text-sm text-gray-500">{description}</p>
            )}
            <div className="bg-gradient-to-r from-[#fef2f2] to-[#fdf8f7] rounded-xl p-4 text-left">
              <p className="text-sm font-medium text-gray-900 mb-1">Plano Profissional inclui:</p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#a03f3d]" />
                  Assinatura digital de prontuários
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#a03f3d]" />
                  Importação inteligente de materiais
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#a03f3d]" />
                  IA: Dentista e Contabilidade
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#a03f3d]" />
                  Comissões, próteses e muito mais
                </li>
              </ul>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-col gap-2">
          <Button
            className="w-full bg-[#a03f3d] hover:bg-[#8b3634] rounded-xl"
            onClick={() => {
              onOpenChange(false);
              navigate('/planos');
            }}
          >
            Ver planos
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <AlertDialogCancel className="w-full rounded-xl mt-0">
            Agora não
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
