import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ExternalLink, Loader2, CheckCircle2 } from 'lucide-react';
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
  const [iframeFailed, setIframeFailed] = useState(false);
  const [signed, setSigned] = useState(false);
  const refreshStatus = useRefreshSignatureStatus();

  // Poll status while modal is open
  useEffect(() => {
    if (!open || signed) return;

    const interval = setInterval(async () => {
      try {
        const result = await refreshStatus.mutateAsync(signatureId);
        if (result.dentist_status === 'SIGNED') {
          setSigned(true);
          toast.success('Documento assinado com sucesso!');
        }
      } catch {
        // Silent fail on polling
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [open, signed, signatureId]);

  const handleOpenExternal = useCallback(() => {
    window.open(signingUrl, '_blank', 'width=800,height=600');
  }, [signingUrl]);

  const handleClose = () => {
    setSigned(false);
    setIframeFailed(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {signed ? (
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            ) : (
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            )}
            {signed ? 'Documento Assinado' : `Assinar: ${title}`}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 relative">
          {signed ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <CheckCircle2 className="w-16 h-16 text-green-500" />
              <p className="text-lg font-medium text-green-700">Assinatura concluída!</p>
              <p className="text-sm text-muted-foreground">O documento foi assinado com sucesso.</p>
              <Button onClick={handleClose}>Fechar</Button>
            </div>
          ) : iframeFailed ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <p className="text-sm text-muted-foreground">
                Aguardando assinatura na janela externa...
              </p>
              <Button variant="outline" onClick={handleOpenExternal}>
                <ExternalLink className="w-4 h-4 mr-2" />
                Reabrir janela de assinatura
              </Button>
            </div>
          ) : (
            <>
              <iframe
                src={signingUrl}
                className="w-full h-full border rounded-lg"
                onError={() => {
                  setIframeFailed(true);
                  handleOpenExternal();
                }}
                allow="camera"
              />
              <div className="absolute bottom-2 right-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleOpenExternal}
                  className="text-xs text-muted-foreground"
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  Abrir em nova aba
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
