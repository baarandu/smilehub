import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { CalendarPlus, CalendarCheck, Loader2 } from 'lucide-react';
import { addDays, format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/components/ui/use-toast';
import { useClinic } from '@/contexts/ClinicContext';
import { supabase } from '@/lib/supabase';
import { useCreateSession, useUpdateSession } from '@/hooks/useOrthodontics';
import { appointmentsService } from '@/services/appointments';
import { orthodonticsService } from '@/services/orthodontics';
import { financialService } from '@/services/financial';
import { useQueryClient } from '@tanstack/react-query';
import type {
  OrthodonticCase,
  OrthodonticSession,
  SessionFormData,
  SessionProcedure,
  PatientCompliance,
} from '@/types/orthodontics';
import { SESSION_PROCEDURE_LABELS, COMPLIANCE_LABELS } from '@/types/orthodontics';

interface SessionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orthoCase: OrthodonticCase;
  session?: OrthodonticSession | null;
}

const ALL_PROCEDURES = Object.keys(SESSION_PROCEDURE_LABELS) as SessionProcedure[];

const emptyForm: SessionFormData = {
  appointmentDate: new Date().toISOString().split('T')[0],
  proceduresPerformed: [],
  procedureDetails: '',
  upperArchWireAfter: '',
  lowerArchWireAfter: '',
  elasticsPrescribed: '',
  alignerNumberAfter: '',
  patientCompliance: '',
  complianceNotes: '',
  nextSteps: '',
  observations: '',
};

export function SessionFormDialog({ open, onOpenChange, orthoCase, session }: SessionFormDialogProps) {
  const { clinicId } = useClinic();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createSession = useCreateSession();
  const updateSession = useUpdateSession();

  const [form, setForm] = useState<SessionFormData>(emptyForm);
  const [registerPayment, setRegisterPayment] = useState(true);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [step, setStep] = useState<'form' | 'schedule'>('form');
  const [nextDate, setNextDate] = useState('');
  const [nextTime, setNextTime] = useState('09:00');
  const [scheduling, setScheduling] = useState(false);
  const isEditing = !!session;
  const isAligners = orthoCase.treatment_type === 'aligners';
  const showPaymentSection = !isEditing && orthoCase.maintenance_fee != null && orthoCase.maintenance_fee > 0;

  const frequencyDays = orthoCase.return_frequency_days || 30;

  useEffect(() => {
    if (open && session) {
      setStep('form');
      setForm({
        appointmentDate: session.appointment_date,
        proceduresPerformed: session.procedures_performed || [],
        procedureDetails: session.procedure_details || '',
        upperArchWireAfter: session.upper_arch_wire_after || '',
        lowerArchWireAfter: session.lower_arch_wire_after || '',
        elasticsPrescribed: session.elastics_prescribed || '',
        alignerNumberAfter: session.aligner_number_after != null ? String(session.aligner_number_after) : '',
        patientCompliance: session.patient_compliance || '',
        complianceNotes: session.compliance_notes || '',
        nextSteps: session.next_steps || '',
        observations: session.observations || '',
      });
    } else if (open) {
      setStep('form');
      setForm({
        ...emptyForm,
        upperArchWireAfter: orthoCase.upper_arch_wire || '',
        lowerArchWireAfter: orthoCase.lower_arch_wire || '',
        alignerNumberAfter: orthoCase.current_aligner_number != null
          ? String((orthoCase.current_aligner_number || 0) + 1)
          : '',
      });
      setRegisterPayment(true);
      setPaymentAmount(orthoCase.maintenance_fee != null ? String(orthoCase.maintenance_fee) : '');
      setPaymentMethod('pix');
    }
  }, [open, session, orthoCase]);

  const toggleProcedure = (proc: SessionProcedure) => {
    setForm(prev => ({
      ...prev,
      proceduresPerformed: prev.proceduresPerformed.includes(proc)
        ? prev.proceduresPerformed.filter(p => p !== proc)
        : [...prev.proceduresPerformed, proc],
    }));
  };

  const handleSubmit = async () => {
    if (!form.appointmentDate) {
      toast({ title: 'Informe a data da sessão', variant: 'destructive' });
      return;
    }

    try {
      if (isEditing && session) {
        await updateSession.mutateAsync({
          id: session.id,
          updates: {
            appointment_date: form.appointmentDate,
            procedures_performed: form.proceduresPerformed,
            procedure_details: form.procedureDetails || null,
            upper_arch_wire_after: form.upperArchWireAfter || null,
            lower_arch_wire_after: form.lowerArchWireAfter || null,
            elastics_prescribed: form.elasticsPrescribed || null,
            aligner_number_after: form.alignerNumberAfter ? parseInt(form.alignerNumberAfter) : null,
            patient_compliance: (form.patientCompliance || null) as PatientCompliance | null,
            compliance_notes: form.complianceNotes || null,
            next_steps: form.nextSteps || null,
            observations: form.observations || null,
          },
        });
        toast({ title: 'Sessão atualizada' });
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        await createSession.mutateAsync({
          case_id: orthoCase.id,
          clinic_id: clinicId!,
          appointment_date: form.appointmentDate,
          procedures_performed: form.proceduresPerformed,
          procedure_details: form.procedureDetails || null,
          upper_arch_wire_after: form.upperArchWireAfter || null,
          lower_arch_wire_after: form.lowerArchWireAfter || null,
          elastics_prescribed: form.elasticsPrescribed || null,
          aligner_number_after: form.alignerNumberAfter ? parseInt(form.alignerNumberAfter) : null,
          patient_compliance: (form.patientCompliance || null) as PatientCompliance | null,
          compliance_notes: form.complianceNotes || null,
          next_steps: form.nextSteps || null,
          observations: form.observations || null,
          created_by: user?.id || null,
        });

        // Register maintenance payment if enabled
        if (showPaymentSection && registerPayment && paymentAmount) {
          const amount = parseFloat(paymentAmount);
          if (amount > 0) {
            try {
              await financialService.createTransaction({
                type: 'income',
                amount,
                description: `Manutenção Orto — ${orthoCase.patient_name || 'Paciente'}`,
                category: 'Manutenção Ortodôntica',
                patient_id: orthoCase.patient_id,
                payment_method: paymentMethod,
                date: form.appointmentDate,
                related_entity_id: orthoCase.id,
              } as any);
            } catch {
              toast({ title: 'Sessão registrada, mas erro ao registrar pagamento', variant: 'destructive' });
              onOpenChange(false);
              return;
            }
          }
        }

        toast({ title: 'Sessão registrada' });

        // Show step 2: schedule next appointment
        const suggestedDate = format(addDays(parseISO(form.appointmentDate), frequencyDays), 'yyyy-MM-dd');
        setNextDate(suggestedDate);
        setNextTime('09:00');
        setStep('schedule');
        return;
      }
      onOpenChange(false);
    } catch {
      toast({ title: 'Erro ao salvar sessão', variant: 'destructive' });
    }
  };

  const handleScheduleNext = async () => {
    if (!nextDate || !nextTime) return;
    setScheduling(true);
    try {
      await appointmentsService.create({
        patient_id: orthoCase.patient_id,
        clinic_id: clinicId,
        date: nextDate,
        time: nextTime,
        status: 'scheduled',
        procedure_name: 'Manutenção Ortodôntica',
        dentist_id: orthoCase.dentist_id,
        notes: 'Manutenção ortodôntica',
      });

      await orthodonticsService.updateCase(orthoCase.id, {
        next_appointment_at: nextDate,
      });

      await queryClient.invalidateQueries({ queryKey: ['orthodontic-cases'] });

      toast({
        title: 'Próximo retorno agendado',
        description: `${format(parseISO(nextDate), "dd/MM/yyyy (EEEE)", { locale: ptBR })} às ${nextTime}`,
      });
      onOpenChange(false);
    } catch {
      toast({ title: 'Erro ao agendar retorno', variant: 'destructive' });
    } finally {
      setScheduling(false);
    }
  };

  const suggestedDateFormatted = nextDate
    ? format(parseISO(nextDate), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] p-0">
        {step === 'schedule' ? (
          <>
            <DialogHeader className="px-6 pt-6 pb-2">
              <DialogTitle className="flex items-center gap-2">
                <CalendarPlus className="w-5 h-5" />
                Agendar Próximo Retorno
              </DialogTitle>
              <DialogDescription>
                {orthoCase.patient_name} — Retorno a cada {frequencyDays} dias
              </DialogDescription>
            </DialogHeader>
            <div className="px-6 pb-6 space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <p className="text-sm text-emerald-700">
                  Sessão registrada com sucesso! Agende o próximo retorno.
                </p>
              </div>

              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <p className="text-muted-foreground">
                  Data sugerida: <strong className="text-foreground">{suggestedDateFormatted}</strong>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm">Data</Label>
                  <Input
                    type="date"
                    value={nextDate}
                    onChange={(e) => setNextDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Horário</Label>
                  <Input
                    type="time"
                    value={nextTime}
                    onChange={(e) => setNextTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => onOpenChange(false)}
                  disabled={scheduling}
                >
                  Pular
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleScheduleNext}
                  disabled={scheduling || !nextDate || !nextTime}
                >
                  {scheduling ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CalendarPlus className="w-4 h-4 mr-2" />
                  )}
                  Agendar Retorno
                </Button>
              </div>
            </div>
          </>
        ) : (
        <>
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>{isEditing ? 'Editar Sessão' : 'Nova Sessão'}</DialogTitle>
          <DialogDescription>
            {orthoCase.patient_name} — {isEditing ? 'Atualize os dados da sessão' : 'Registre a manutenção/consulta'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-140px)]">
          <div className="px-6 pb-6 space-y-4">
            {/* Date */}
            <div className="space-y-2">
              <Label>Data *</Label>
              <Input
                type="date"
                value={form.appointmentDate}
                onChange={e => setForm(prev => ({ ...prev, appointmentDate: e.target.value }))}
              />
            </div>

            {/* Procedures */}
            <div className="space-y-2">
              <Label>Procedimentos Realizados</Label>
              <div className="grid grid-cols-2 gap-2">
                {ALL_PROCEDURES.map(proc => (
                  <label
                    key={proc}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <Checkbox
                      checked={form.proceduresPerformed.includes(proc)}
                      onCheckedChange={() => toggleProcedure(proc)}
                    />
                    {SESSION_PROCEDURE_LABELS[proc]}
                  </label>
                ))}
              </div>
            </div>

            {/* Procedure Details */}
            <div className="space-y-2">
              <Label>Detalhes dos Procedimentos</Label>
              <Textarea
                placeholder="Descreva o que foi realizado..."
                value={form.procedureDetails}
                onChange={e => setForm(prev => ({ ...prev, procedureDetails: e.target.value }))}
                rows={2}
              />
            </div>

            {/* Arch Wires */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Arco Superior (após)</Label>
                <Input
                  placeholder="Ex: NiTi .016"
                  value={form.upperArchWireAfter}
                  onChange={e => setForm(prev => ({ ...prev, upperArchWireAfter: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Arco Inferior (após)</Label>
                <Input
                  placeholder="Ex: SS .019x.025"
                  value={form.lowerArchWireAfter}
                  onChange={e => setForm(prev => ({ ...prev, lowerArchWireAfter: e.target.value }))}
                />
              </div>
            </div>

            {/* Elastics */}
            <div className="space-y-2">
              <Label>Elásticos Prescritos</Label>
              <Input
                placeholder="Ex: Classe II 3/16 médio"
                value={form.elasticsPrescribed}
                onChange={e => setForm(prev => ({ ...prev, elasticsPrescribed: e.target.value }))}
              />
            </div>

            {/* Aligner Number (conditional) */}
            {isAligners && (
              <div className="space-y-2">
                <Label>Alinhador N° (após)</Label>
                <Input
                  type="number"
                  min={1}
                  placeholder={orthoCase.total_aligners ? `de ${orthoCase.total_aligners}` : 'Número'}
                  value={form.alignerNumberAfter}
                  onChange={e => setForm(prev => ({ ...prev, alignerNumberAfter: e.target.value }))}
                />
              </div>
            )}

            {/* Compliance */}
            <div className="space-y-2">
              <Label>Colaboração do Paciente</Label>
              <Select
                value={form.patientCompliance || 'none'}
                onValueChange={v => setForm(prev => ({ ...prev, patientCompliance: v === 'none' ? '' : v as PatientCompliance }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Não informado</SelectItem>
                  {(Object.entries(COMPLIANCE_LABELS) as [PatientCompliance, string][]).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Compliance Notes */}
            {form.patientCompliance && (
              <div className="space-y-2">
                <Label>Observações sobre Colaboração</Label>
                <Input
                  placeholder="Detalhes sobre colaboração..."
                  value={form.complianceNotes}
                  onChange={e => setForm(prev => ({ ...prev, complianceNotes: e.target.value }))}
                />
              </div>
            )}

            {/* Next Steps */}
            <div className="space-y-2">
              <Label>Próximos Passos</Label>
              <Textarea
                placeholder="O que fazer na próxima sessão..."
                value={form.nextSteps}
                onChange={e => setForm(prev => ({ ...prev, nextSteps: e.target.value }))}
                rows={2}
              />
            </div>

            {/* Observations */}
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                placeholder="Observações gerais..."
                value={form.observations}
                onChange={e => setForm(prev => ({ ...prev, observations: e.target.value }))}
                rows={2}
              />
            </div>

            {/* Maintenance Payment */}
            {showPaymentSection && (
              <>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">Pagamento da Manutenção</Label>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="register-payment" className="text-xs text-muted-foreground">
                        Registrar pagamento
                      </Label>
                      <Switch
                        id="register-payment"
                        checked={registerPayment}
                        onCheckedChange={setRegisterPayment}
                      />
                    </div>
                  </div>
                  {registerPayment && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs">Valor (R$)</Label>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={paymentAmount}
                          onChange={e => setPaymentAmount(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Forma de Pagamento</Label>
                        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pix">Pix</SelectItem>
                            <SelectItem value="dinheiro">Dinheiro</SelectItem>
                            <SelectItem value="credito">Cartão Crédito</SelectItem>
                            <SelectItem value="debito">Cartão Débito</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Submit */}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                className="flex-1"
                onClick={handleSubmit}
                disabled={createSession.isPending || updateSession.isPending}
              >
                {createSession.isPending || updateSession.isPending
                  ? 'Salvando...'
                  : isEditing ? 'Atualizar' : 'Registrar Sessão'}
              </Button>
            </div>
          </div>
        </ScrollArea>
        </>
        )}
      </DialogContent>
    </Dialog>
  );
}
