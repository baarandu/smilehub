import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ExternalLink, CheckCircle2, Mail, PenTool } from 'lucide-react';
import { useRefreshSignatureStatus } from '@/hooks/useDigitalSignatures';
import { toast } from 'sonner';

interface SigningModalProps {
  open: boolean;
  onClose: () => void;
  signingUrl: string;
  signatureId: string;
  title: string;
}

export function SigningModal({ open, onClose, signingUrl, signatureId, title }: SigningModalProps) {
  const [signed, setSigned] = useState(false);
  const refreshStatus = useRefreshSignatureStatus();

  // Poll status while modal is open (every 10s)
  useEffect(() => {
    if (!open || signed || !signatureId) return;

    const interval = setInterval(async () => {
      try {
        const result = await refreshStatus.mutateAsync(signatureId);
        if (result.dentist_status === 'SIGNED' || result.status === 'COMPLETED') {
          setSigned(true);
          toast.success('Documento assinado com sucesso!');
        }
      } catch {
        // Silent fail on polling
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [open, signed, signatureId]);

  const handleOpenExternal = useCallback(() => {
    window.open(signingUrl, '_blank');
  }, [signingUrl]);

  const handleClose = () => {
    setSigned(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {signed ? (
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            ) : (
              <PenTool className="w-5 h-5 text-[#a03f3d]" />
            )}
            {signed ? 'Documento Assinado' : `Assinar: ${title}`}
          </DialogTitle>
        </DialogHeader>

        {signed ? (
          <div className="flex flex-col items-center py-6 gap-4">
            <CheckCircle2 className="w-16 h-16 text-green-500" />
            <p className="text-lg font-medium text-green-700">Assinatura concluída!</p>
            <p className="text-sm text-muted-foreground text-center">O documento foi assinado com sucesso.</p>
            <Button onClick={handleClose}>Fechar</Button>
          </div>
        ) : (
          <div className="flex flex-col items-center py-6 gap-5">
            <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center">
              <Mail className="w-7 h-7 text-green-600" />
            </div>

            <div className="text-center space-y-2">
              <p className="font-medium text-gray-900">Envelope criado com sucesso!</p>
              <p className="text-sm text-muted-foreground">
                Um email com as instruções de assinatura foi enviado. Você também pode assinar diretamente pelo botão abaixo.
              </p>
            </div>

            <Button onClick={handleOpenExternal} className="w-full">
              <ExternalLink className="w-4 h-4 mr-2" />
              Abrir página de assinatura
            </Button>

            <Button variant="outline" onClick={handleClose} className="w-full">
              Fechar
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              O status da assinatura será atualizado automaticamente.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
