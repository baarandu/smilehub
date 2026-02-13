import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, RefreshCw, PenTool, ExternalLink, FileSignature } from 'lucide-react';
import { usePatientSignatures, useSigningUrl } from '@/hooks/useDigitalSignatures';
import { SignatureStatusBadge, SignatoryStatusLabel } from './SignatureStatusBadge';
import { SigningModal } from './SigningModal';
import type { DigitalSignature } from '@/types/digitalSignature';

interface SignaturesPanelProps {
  patientId: string;
}

export function SignaturesPanel({ patientId }: SignaturesPanelProps) {
  const { data: signatures, isLoading, refetch } = usePatientSignatures(patientId);
  const signingUrl = useSigningUrl();
  const [signingModal, setSigningModal] = useState<{
    open: boolean;
    url: string;
    signatureId: string;
    title: string;
  }>({ open: false, url: '', signatureId: '', title: '' });

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!signatures || signatures.length === 0) return null;

  const handleSign = async (sig: DigitalSignature) => {
    try {
      const result = await signingUrl.mutateAsync(sig.id);
      setSigningModal({
        open: true,
        url: result.signing_url,
        signatureId: sig.id,
        title: sig.title,
      });
    } catch {
      // Error handled by mutation
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <FileSignature className="w-4 h-4 text-[#a03f3d]" />
              Assinaturas Digitais
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {signatures.map((sig) => (
            <div
              key={sig.id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm truncate">{sig.title}</p>
                  <SignatureStatusBadge status={sig.status} />
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-muted-foreground">
                    {formatDate(sig.created_at)}
                  </span>
                  <SignatoryStatusLabel
                    status={sig.dentist_status}
                    label="Dentista"
                  />
                  {sig.patient_status && (
                    <SignatoryStatusLabel
                      status={sig.patient_status}
                      label="Paciente"
                    />
                  )}
                </div>
              </div>

              <div className="flex gap-2 ml-2">
                {sig.status === 'COMPLETED' && sig.signed_pdf_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                  >
                    <a href={sig.signed_pdf_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-3 h-3 mr-1" />
                      Ver
                    </a>
                  </Button>
                )}
                {sig.dentist_status !== 'SIGNED' && sig.status !== 'COMPLETED' && sig.status !== 'ERROR' && sig.status !== 'EXPIRED' && sig.status !== 'VOIDED' && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleSign(sig)}
                    disabled={signingUrl.isPending}
                  >
                    {signingUrl.isPending ? (
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    ) : (
                      <PenTool className="w-3 h-3 mr-1" />
                    )}
                    Assinar
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <SigningModal
        open={signingModal.open}
        onClose={() => {
          setSigningModal({ open: false, url: '', signatureId: '', title: '' });
          refetch();
        }}
        signingUrl={signingModal.url}
        signatureId={signingModal.signatureId}
        title={signingModal.title}
      />
    </>
  );
}
