import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useClinic } from '@/contexts/ClinicContext';
import { supabase } from '@/lib/supabase';
import { useCreateCase, useUpdateCase } from '@/hooks/useOrthodontics';
import { usePatientSearch } from '@/hooks/usePatients';
import { useDebounce } from '@/hooks/useDebounce';
import type { OrthodonticCase, CaseFormData, OrthodonticTreatmentType } from '@/types/orthodontics';
import { TREATMENT_TYPE_LABELS } from '@/types/orthodontics';

interface CaseFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orthoCase?: OrthodonticCase | null;
}

interface DentistOption {
  id: string;
  full_name: string;
}

const emptyForm: CaseFormData = {
  patientId: '',
  dentistId: '',
  treatmentType: 'fixed_metallic',
  chiefComplaint: '',
  initialDiagnosis: '',
  treatmentPlanNotes: '',
  estimatedDurationMonths: '',
  returnFrequencyDays: '30',
  applianceDetails: '',
  totalAligners: '',
  maintenanceFee: '',
  nextAppointmentAt: '',
  documentationNotes: '',
  notes: '',
};

export function CaseFormSheet({ open, onOpenChange, orthoCase }: CaseFormSheetProps) {
  const { clinicId } = useClinic();
  const { toast } = useToast();
  const createCase = useCreateCase();
  const updateCase = useUpdateCase();
  const [form, setForm] = useState<CaseFormData>(emptyForm);
  const [dentists, setDentists] = useState<DentistOption[]>([]);
  const [patientSearch, setPatientSearch] = useState('');
  const debouncedPatientSearch = useDebounce(patientSearch, 300);
  const { data: filteredPatients = [] } = usePatientSearch(debouncedPatientSearch);
  const [showPatientList, setShowPatientList] = useState(false);
  const [selectedPatientName, setSelectedPatientName] = useState('');

  const isEditing = !!orthoCase;
  const isAligners = form.treatmentType === 'aligners';

  // Load dentists
  useEffect(() => {
    if (!clinicId || !open) return;
    const loadDentists = async () => {
      const { data, error } = await (supabase
        .from('clinic_users') as any)
        .select('user_id, role')
        .eq('clinic_id', clinicId);

      if (error || !data) return;

      const dentistUsers = (data as any[]).filter((d: any) =>
        ['admin', 'dentist'].includes(d.role)
      );

      if (dentistUsers.length === 0) { setDentists([]); return; }

      const userIds = dentistUsers.map((d: any) => d.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      const nameMap: Record<string, string> = {};
      (profiles || []).forEach((p: any) => { nameMap[p.id] = p.full_name; });

      setDentists(
        dentistUsers.map((d: any) => ({
          id: d.user_id,
          full_name: nameMap[d.user_id] || d.user_id,
        }))
      );
    };
    loadDentists();
  }, [clinicId, open]);

  // Populate form when editing
  useEffect(() => {
    if (open && orthoCase) {
      setForm({
        patientId: orthoCase.patient_id,
        dentistId: orthoCase.dentist_id,
        treatmentType: orthoCase.treatment_type,
        chiefComplaint: orthoCase.chief_complaint || '',
        initialDiagnosis: orthoCase.initial_diagnosis || '',
        treatmentPlanNotes: orthoCase.treatment_plan_notes || '',
        estimatedDurationMonths: orthoCase.estimated_duration_months != null ? String(orthoCase.estimated_duration_months) : '',
        returnFrequencyDays: orthoCase.return_frequency_days != null ? String(orthoCase.return_frequency_days) : '30',
        maintenanceFee: orthoCase.maintenance_fee != null ? String(orthoCase.maintenance_fee) : '',
        applianceDetails: orthoCase.appliance_details || '',
        totalAligners: orthoCase.total_aligners != null ? String(orthoCase.total_aligners) : '',
        nextAppointmentAt: orthoCase.next_appointment_at ? orthoCase.next_appointment_at.split('T')[0] : '',
        documentationNotes: orthoCase.documentation_notes || '',
        notes: orthoCase.notes || '',
      });
      setSelectedPatientName(orthoCase.patient_name || '');
    } else if (open) {
      setForm(emptyForm);
      setSelectedPatientName('');
      setPatientSearch('');
    }
  }, [open, orthoCase]);

  useEffect(() => {
    if (showPatientList) {
      const handler = () => setShowPatientList(false);
      document.addEventListener('click', handler);
      return () => document.removeEventListener('click', handler);
    }
  }, [showPatientList]);

  const handleSelectPatient = (patient: { id: string; name: string }) => {
    setForm(prev => ({ ...prev, patientId: patient.id }));
    setSelectedPatientName(patient.name);
    setPatientSearch('');
    setShowPatientList(false);
  };

  const updateField = (field: keyof CaseFormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!form.patientId || !form.dentistId || !form.treatmentType) {
      toast({ title: 'Preencha paciente, dentista e tipo de tratamento', variant: 'destructive' });
      return;
    }

    try {
      if (isEditing && orthoCase) {
        await updateCase.mutateAsync({
          id: orthoCase.id,
          updates: {
            patient_id: form.patientId,
            dentist_id: form.dentistId,
            treatment_type: form.treatmentType,
            chief_complaint: form.chiefComplaint || null,
            initial_diagnosis: form.initialDiagnosis || null,
            treatment_plan_notes: form.treatmentPlanNotes || null,
            estimated_duration_months: form.estimatedDurationMonths ? parseInt(form.estimatedDurationMonths) : null,
            return_frequency_days: form.returnFrequencyDays ? parseInt(form.returnFrequencyDays) : null,
            maintenance_fee: form.maintenanceFee ? parseFloat(form.maintenanceFee) : null,
            appliance_details: form.applianceDetails || null,
            total_aligners: form.totalAligners ? parseInt(form.totalAligners) : null,
            next_appointment_at: form.nextAppointmentAt ? new Date(form.nextAppointmentAt).toISOString() : null,
            documentation_notes: form.documentationNotes || null,
            notes: form.notes || null,
          },
        });
        toast({ title: 'Caso atualizado' });
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        await createCase.mutateAsync({
          clinic_id: clinicId!,
          patient_id: form.patientId,
          dentist_id: form.dentistId,
          treatment_type: form.treatmentType,
          chief_complaint: form.chiefComplaint || null,
          initial_diagnosis: form.initialDiagnosis || null,
          treatment_plan_notes: form.treatmentPlanNotes || null,
          estimated_duration_months: form.estimatedDurationMonths ? parseInt(form.estimatedDurationMonths) : null,
          return_frequency_days: form.returnFrequencyDays ? parseInt(form.returnFrequencyDays) : null,
          maintenance_fee: form.maintenanceFee ? parseFloat(form.maintenanceFee) : null,
          appliance_details: form.applianceDetails || null,
          total_aligners: form.totalAligners ? parseInt(form.totalAligners) : null,
          next_appointment_at: form.nextAppointmentAt ? new Date(form.nextAppointmentAt).toISOString() : null,
          documentation_notes: form.documentationNotes || null,
          notes: form.notes || null,
          created_by: user?.id || null,
        });
        toast({ title: 'Caso criado com sucesso' });
      }
      onOpenChange(false);
    } catch {
      toast({ title: 'Erro ao salvar caso', variant: 'destructive' });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{isEditing ? 'Editar Caso' : 'Novo Caso Ortodôntico'}</SheetTitle>
          <SheetDescription>
            {isEditing ? 'Atualize os dados do caso' : 'Preencha os dados para iniciar um novo caso'}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-160px)] mt-4">
          <div className="space-y-4 pr-4">
            {/* Patient */}
            <div className="space-y-2">
              <Label>Paciente *</Label>
              {form.patientId ? (
                <div className="flex items-center gap-2 p-2.5 bg-muted rounded-lg">
                  <span className="flex-1 text-sm font-medium">{selectedPatientName}</span>
                  {!isEditing && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => {
                        updateField('patientId', '');
                        setSelectedPatientName('');
                      }}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              ) : (
                <div className="relative" onClick={e => e.stopPropagation()}>
                  <Input
                    placeholder="Buscar paciente..."
                    value={patientSearch}
                    onChange={e => {
                      setPatientSearch(e.target.value);
                      setShowPatientList(e.target.value.length >= 2);
                    }}
                    onFocus={() => patientSearch.length >= 2 && setShowPatientList(true)}
                  />
                  {showPatientList && filteredPatients.length > 0 && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                      {filteredPatients.map((p: any) => (
                        <button
                          key={p.id}
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                          onClick={() => handleSelectPatient(p)}
                        >
                          {p.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Dentist */}
            <div className="space-y-2">
              <Label>Dentista *</Label>
              <Select value={form.dentistId} onValueChange={v => updateField('dentistId', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o dentista" />
                </SelectTrigger>
                <SelectContent>
                  {dentists.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Treatment Type */}
            <div className="space-y-2">
              <Label>Tipo de Tratamento *</Label>
              <Select
                value={form.treatmentType}
                onValueChange={v => updateField('treatmentType', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(TREATMENT_TYPE_LABELS) as [OrthodonticTreatmentType, string][]).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Chief Complaint */}
            <div className="space-y-2">
              <Label>Queixa Principal</Label>
              <Textarea
                placeholder="Queixa principal do paciente..."
                value={form.chiefComplaint}
                onChange={e => updateField('chiefComplaint', e.target.value)}
                rows={2}
              />
            </div>

            {/* Initial Diagnosis */}
            <div className="space-y-2">
              <Label>Diagnóstico Inicial</Label>
              <Textarea
                placeholder="Diagnóstico e classificação..."
                value={form.initialDiagnosis}
                onChange={e => updateField('initialDiagnosis', e.target.value)}
                rows={2}
              />
            </div>

            {/* Treatment Plan Notes */}
            <div className="space-y-2">
              <Label>Plano de Tratamento</Label>
              <Textarea
                placeholder="Descrição do plano de tratamento..."
                value={form.treatmentPlanNotes}
                onChange={e => updateField('treatmentPlanNotes', e.target.value)}
                rows={3}
              />
            </div>

            {/* Duration + Frequency */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Duração Estimada (meses)</Label>
                <Input
                  type="number"
                  min={1}
                  placeholder="Ex: 24"
                  value={form.estimatedDurationMonths}
                  onChange={e => updateField('estimatedDurationMonths', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Frequência de Retorno (dias)</Label>
                <Input
                  type="number"
                  min={1}
                  placeholder="Ex: 30"
                  value={form.returnFrequencyDays}
                  onChange={e => updateField('returnFrequencyDays', e.target.value)}
                />
              </div>
            </div>

            {/* Maintenance Fee */}
            <div className="space-y-2">
              <Label>Valor da Manutenção (R$)</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                placeholder="Ex: 200.00"
                value={form.maintenanceFee}
                onChange={e => updateField('maintenanceFee', e.target.value)}
              />
            </div>

            {/* Appliance Details */}
            <div className="space-y-2">
              <Label>Detalhes do Aparelho</Label>
              <Input
                placeholder="Ex: Bráquete Roth .022 slot"
                value={form.applianceDetails}
                onChange={e => updateField('applianceDetails', e.target.value)}
              />
            </div>

            {/* Total Aligners (conditional) */}
            {isAligners && (
              <div className="space-y-2">
                <Label>Total de Alinhadores</Label>
                <Input
                  type="number"
                  min={1}
                  placeholder="Ex: 30"
                  value={form.totalAligners}
                  onChange={e => updateField('totalAligners', e.target.value)}
                />
              </div>
            )}

            {/* Next Appointment */}
            <div className="space-y-2">
              <Label>Próxima Consulta</Label>
              <Input
                type="date"
                value={form.nextAppointmentAt}
                onChange={e => updateField('nextAppointmentAt', e.target.value)}
              />
            </div>

            {/* Documentation Notes */}
            <div className="space-y-2">
              <Label>Notas de Documentação</Label>
              <Textarea
                placeholder="Documentação solicitada ao paciente..."
                value={form.documentationNotes}
                onChange={e => updateField('documentationNotes', e.target.value)}
                rows={2}
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                placeholder="Observações gerais..."
                value={form.notes}
                onChange={e => updateField('notes', e.target.value)}
                rows={3}
              />
            </div>

            {/* Submit */}
            <div className="flex gap-2 pt-2 pb-4">
              <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                className="flex-1"
                onClick={handleSubmit}
                disabled={createCase.isPending || updateCase.isPending}
              >
                {createCase.isPending || updateCase.isPending
                  ? 'Salvando...'
                  : isEditing ? 'Atualizar' : 'Criar Caso'}
              </Button>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
