import { CheckCircle2, AlertCircle, Clock, PenLine, ShieldCheck } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useRecordSignatures } from '@/hooks/useClinicalSignatures';
import type { RecordType } from '@/types/clinicalSignature';

interface RecordSignatureBadgeProps {
  recordType: RecordType;
  recordId: string;
  compact?: boolean;
}

export function RecordSignatureBadge({ recordType, recordId, compact = false }: RecordSignatureBadgeProps) {
  const { data: signatures, isLoading } = useRecordSignatures(recordType, recordId);

  if (isLoading || !signatures) return null;

  const patientSig = signatures.find(s => s.signer_type === 'patient');
  const dentistSig = signatures.find(s => s.signer_type === 'dentist');

  if (!patientSig && !dentistSig) {
    if (compact) return null;
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
        <Clock className="w-3 h-3" />
        Sem assinatura
      </span>
    );
  }

  // Both signed
  if (patientSig && dentistSig) {
    const hasOtp = patientSig.otp_method === 'email';
    const hashVerified = patientSig.content_hash_verified && dentistSig.content_hash_verified;
    const isIcp = !!dentistSig.batch_document_id;

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
            {isIcp ? <ShieldCheck className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
            {compact ? '' : 'Assinado'}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1 text-xs">
            <p><strong>Paciente:</strong> {patientSig.signer_name}</p>
            <p>Assinado em {new Date(patientSig.signed_at).toLocaleString('pt-BR')}</p>
            {hasOtp && <p className="text-green-600">OTP verificado ({patientSig.otp_email_masked})</p>}
            <hr className="my-1" />
            <p><strong>Dentista:</strong> {dentistSig.signer_name}</p>
            <p>Assinado em {new Date(dentistSig.signed_at).toLocaleString('pt-BR')}</p>
            {isIcp && <p className="text-green-600">ICP-Brasil ({dentistSig.batch_document_id})</p>}
            {hashVerified && <p className="text-green-600">Hash SHA-256 verificado</p>}
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  // Only patient signed
  if (patientSig) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
            <PenLine className="w-3 h-3" />
            {compact ? '' : 'Paciente assinou'}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top">
          <div className="space-y-1 text-xs">
            <p><strong>Paciente:</strong> {patientSig.signer_name}</p>
            <p>Em {new Date(patientSig.signed_at).toLocaleString('pt-BR')}</p>
            {patientSig.otp_method === 'email' && (
              <p className="text-green-600">OTP verificado</p>
            )}
            <p className="text-amber-600">Aguardando assinatura do dentista</p>
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  // Only dentist signed
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-700">
          <ShieldCheck className="w-3 h-3" />
          {compact ? '' : 'Dentista assinou'}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top">
        <div className="space-y-1 text-xs">
          <p><strong>Dentista:</strong> {dentistSig!.signer_name}</p>
          <p>Em {new Date(dentistSig!.signed_at).toLocaleString('pt-BR')}</p>
          {dentistSig!.batch_document_id && (
            <p className="text-green-600">ICP-Brasil</p>
          )}
          <p className="text-amber-600">Aguardando assinatura do paciente</p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
