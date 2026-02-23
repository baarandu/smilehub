import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { anonymizePatient } from '@/services/patients';

interface AnonymizePatientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  clinicId: string;
  patientName: string;
  onSuccess: () => void;
}

export function AnonymizePatientDialog({
  open,
  onOpenChange,
  patientId,
  clinicId,
  patientName,
  onSuccess,
}: AnonymizePatientDialogProps) {
  const [understood, setUnderstood] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState('');
  const [overrideRetention, setOverrideRetention] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [retentionError, setRetentionError] = useState(false);

  const expectedCode = patientName.replace(/\s+/g, '').substring(0, 4).toUpperCase();

  const handleAnonymize = async () => {
    if (confirmationCode.toUpperCase() !== expectedCode) {
      toast.error('Código de confirmação incorreto');
      return;
    }

    try {
      setLoading(true);
      setRetentionError(false);
      await anonymizePatient(
        patientId,
        clinicId,
        confirmationCode,
        overrideRetention || undefined,
        overrideRetention ? overrideReason : undefined
      );
      toast.success('Dados anonimizados com sucesso');
      onOpenChange(false);
      resetState();
      onSuccess();
    } catch (error: any) {
      const msg = error?.message || String(error);
      if (msg.includes('retenção legal')) {
        setRetentionError(true);
        toast.error('Dados protegidos por retenção legal. Use o override se necessário.');
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const resetState = () => {
    setUnderstood(false);
    setConfirmationCode('');
    setOverrideRetention(false);
    setOverrideReason('');
    setRetentionError(false);
  };

  const canSubmit = understood && confirmationCode.length >= 4 && (!overrideRetention || overrideReason.length >= 10);

  return (
    <AlertDialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetState(); }}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="w-5 h-5" />
            Anonimizar Dados do Paciente
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left space-y-2">
            <p>
              Esta ação irá <strong>anonimizar permanentemente</strong> todos os dados pessoais identificáveis
              de <strong>{patientName}</strong>, incluindo nome, CPF, RG, telefone, e-mail,
              endereço, transcrições de voz e consentimentos.
            </p>
            <p className="text-red-600 font-medium">
              Esta ação é irreversível e não pode ser desfeita.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-2">
          {/* Step 1: Understanding */}
          <div className="flex items-start gap-3">
            <Checkbox
              id="understood"
              checked={understood}
              onCheckedChange={(checked) => setUnderstood(checked === true)}
            />
            <Label htmlFor="understood" className="text-sm leading-5 cursor-pointer">
              Compreendo que esta ação é irreversível e todos os dados pessoais serão permanentemente anonimizados
            </Label>
          </div>

          {/* Step 2: Confirmation code */}
          {understood && (
            <div className="space-y-2">
              <Label htmlFor="confirmCode" className="text-sm">
                Digite as 4 primeiras letras do nome do paciente para confirmar:
              </Label>
              <Input
                id="confirmCode"
                value={confirmationCode}
                onChange={(e) => setConfirmationCode(e.target.value.toUpperCase())}
                placeholder={`Ex: ${expectedCode}`}
                maxLength={4}
                className="uppercase"
              />
            </div>
          )}

          {/* Retention override (shown if retention error or proactively) */}
          {(retentionError || overrideRetention) && understood && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-3">
              <div className="flex items-center gap-3">
                <Switch
                  id="overrideRetention"
                  checked={overrideRetention}
                  onCheckedChange={setOverrideRetention}
                />
                <Label htmlFor="overrideRetention" className="text-sm text-amber-800">
                  Override de retenção legal
                </Label>
              </div>
              {overrideRetention && (
                <div className="space-y-2">
                  <Label htmlFor="overrideReason" className="text-xs text-amber-700">
                    Justificativa (mínimo 10 caracteres):
                  </Label>
                  <Textarea
                    id="overrideReason"
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    placeholder="Justifique o motivo do override..."
                    className="text-sm"
                    rows={3}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleAnonymize}
            disabled={!canSubmit || loading}
          >
            {loading ? 'Anonimizando...' : 'Anonimizar Dados'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
