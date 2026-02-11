import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Shield } from 'lucide-react';

interface PatientAiConsentProps {
  patientId: string;
  clinicId: string;
}

export function PatientAiConsent({ patientId, clinicId }: PatientAiConsentProps) {
  const [hasConsent, setHasConsent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    loadConsent();
  }, [patientId, clinicId]);

  const loadConsent = async () => {
    try {
      const { data } = await supabase
        .from('patient_consents')
        .select('granted')
        .eq('patient_id', patientId)
        .eq('clinic_id', clinicId)
        .eq('consent_type', 'ai_analysis')
        .is('revoked_at', null)
        .maybeSingle();

      setHasConsent(data?.granted === true);
    } catch {
      // Consent table may not exist yet
    } finally {
      setLoading(false);
    }
  };

  const toggleConsent = async (granted: boolean) => {
    try {
      setToggling(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (granted) {
        // Upsert consent record
        const { error } = await supabase
          .from('patient_consents')
          .upsert({
            patient_id: patientId,
            clinic_id: clinicId,
            consent_type: 'ai_analysis',
            granted: true,
            granted_by: user.id,
            granted_at: new Date().toISOString(),
            revoked_at: null,
            notes: 'Consentimento registrado via sistema',
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'patient_id,clinic_id,consent_type',
          });

        if (error) throw error;
        setHasConsent(true);
        toast.success('Consentimento para IA registrado');
      } else {
        // Revoke consent
        const { error } = await supabase
          .from('patient_consents')
          .update({
            granted: false,
            revoked_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('patient_id', patientId)
          .eq('clinic_id', clinicId)
          .eq('consent_type', 'ai_analysis');

        if (error) throw error;
        setHasConsent(false);
        toast.success('Consentimento revogado');
      }
    } catch {
      toast.error('Erro ao atualizar consentimento');
    } finally {
      setToggling(false);
    }
  };

  if (loading) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-muted/50 border border-border">
      <Shield className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      <Label htmlFor="ai-consent" className="text-sm text-muted-foreground cursor-pointer flex-1">
        Consentimento IA
      </Label>
      <Switch
        id="ai-consent"
        checked={hasConsent}
        onCheckedChange={toggleConsent}
        disabled={toggling}
      />
    </div>
  );
}
