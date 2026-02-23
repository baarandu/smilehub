import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { ShieldCheck } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface MinorConsentBadgeProps {
  patientId: string;
  clinicId: string;
  guardianNameDefault?: string;
}

export function MinorConsentBadge({ patientId, clinicId, guardianNameDefault }: MinorConsentBadgeProps) {
  const [hasConsent, setHasConsent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [guardianName, setGuardianName] = useState(guardianNameDefault || '');
  const [showGuardianInput, setShowGuardianInput] = useState(false);

  useEffect(() => {
    loadConsent();
  }, [patientId, clinicId]);

  const loadConsent = async () => {
    try {
      const { data } = await supabase
        .from('patient_consents')
        .select('granted, guardian_name')
        .eq('patient_id', patientId)
        .eq('clinic_id', clinicId)
        .eq('consent_type', 'minor_data_processing')
        .is('revoked_at', null)
        .maybeSingle();

      setHasConsent(data?.granted === true);
      if (data?.guardian_name) {
        setGuardianName(data.guardian_name);
      }
    } catch {
      // Table may not have columns yet
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (granted: boolean) => {
    if (granted) {
      setShowGuardianInput(true);
    } else {
      revokeConsent();
    }
  };

  const confirmConsent = async () => {
    if (!guardianName.trim()) {
      toast.error('Informe o nome do responsável legal');
      return;
    }

    try {
      setToggling(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('patient_consents')
        .upsert({
          patient_id: patientId,
          clinic_id: clinicId,
          consent_type: 'minor_data_processing',
          granted: true,
          granted_by: user.id,
          granted_at: new Date().toISOString(),
          revoked_at: null,
          guardian_name: guardianName.trim(),
          notes: `Consentimento do responsável legal: ${guardianName.trim()}`,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'patient_id,clinic_id,consent_type',
        });

      if (error) throw error;
      setHasConsent(true);
      setShowGuardianInput(false);
      toast.success('Consentimento do responsável registrado');
    } catch {
      toast.error('Erro ao registrar consentimento');
    } finally {
      setToggling(false);
    }
  };

  const revokeConsent = async () => {
    try {
      setToggling(true);
      const { error } = await supabase
        .from('patient_consents')
        .update({
          granted: false,
          revoked_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('patient_id', patientId)
        .eq('clinic_id', clinicId)
        .eq('consent_type', 'minor_data_processing');

      if (error) throw error;
      setHasConsent(false);
      toast.success('Consentimento do responsável revogado');
    } catch {
      toast.error('Erro ao revogar consentimento');
    } finally {
      setToggling(false);
    }
  };

  if (loading) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="space-y-2">
            <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-amber-50/50 border border-amber-200">
              <ShieldCheck className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <Label htmlFor="minor-consent" className="text-sm text-amber-800 cursor-pointer flex-1">
                Consentimento do Responsável
              </Label>
              <Switch
                id="minor-consent"
                checked={hasConsent}
                onCheckedChange={handleToggle}
                disabled={toggling}
              />
            </div>
            {showGuardianInput && !hasConsent && (
              <div className="flex items-center gap-2 px-4">
                <Input
                  placeholder="Nome do responsável legal"
                  value={guardianName}
                  onChange={(e) => setGuardianName(e.target.value)}
                  className="text-sm h-8"
                  onKeyDown={(e) => e.key === 'Enter' && confirmConsent()}
                />
                <button
                  onClick={confirmConsent}
                  disabled={toggling}
                  className="text-xs bg-amber-600 text-white px-3 py-1.5 rounded hover:bg-amber-700 disabled:opacity-50 whitespace-nowrap"
                >
                  Confirmar
                </button>
                <button
                  onClick={() => setShowGuardianInput(false)}
                  className="text-xs text-gray-500 hover:text-gray-700 whitespace-nowrap"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-center">
          <p>Art. 14 LGPD — O tratamento de dados pessoais de crianças e adolescentes requer consentimento específico do responsável legal.</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
