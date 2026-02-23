import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { acceptTerms } from '@/services/terms';
import { toast } from 'sonner';

interface TermsAcceptanceModalProps {
  open: boolean;
  onAccepted: () => void;
}

export function TermsAcceptanceModal({ open, onAccepted }: TermsAcceptanceModalProps) {
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    if (!accepted) return;

    setLoading(true);
    try {
      await acceptTerms(undefined, navigator.userAgent);
      toast.success('Termos aceitos com sucesso.');
      onAccepted();
    } catch (error) {
      console.error('Error accepting terms:', error);
      toast.error('Erro ao registrar aceite dos termos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Aceite de Termos</DialogTitle>
          <DialogDescription>
            Para continuar usando a plataforma, você precisa aceitar nossos Termos de Uso e Política de Privacidade atualizados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="terms-accept"
              checked={accepted}
              onCheckedChange={(checked) => setAccepted(checked === true)}
            />
            <label htmlFor="terms-accept" className="text-sm text-gray-700 leading-relaxed cursor-pointer">
              Li e aceito os{' '}
              <a
                href="/termos"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline font-medium"
              >
                Termos de Uso
              </a>{' '}
              e a{' '}
              <a
                href="/privacidade"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline font-medium"
              >
                Política de Privacidade
              </a>.
            </label>
          </div>

          <Button
            onClick={handleAccept}
            disabled={!accepted || loading}
            className="w-full"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            Aceitar e Continuar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
