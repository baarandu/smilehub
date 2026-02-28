import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft,
  ArrowRight,
  Pause,
  Play,
  Edit2,
  Plus,
  Calendar,
  Clock,
  AlertTriangle,
  FileCheck,
  Wrench,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { useChangeStatus, useOrthodonticSessions } from '@/hooks/useOrthodontics';
import { StatusTimeline } from './StatusTimeline';
import { SessionFormDialog } from './SessionFormDialog';
import type { OrthodonticCase, OrthodonticStatus } from '@/types/orthodontics';
import { TREATMENT_TYPE_LABELS, SESSION_PROCEDURE_LABELS, COMPLIANCE_LABELS } from '@/types/orthodontics';
import {
  getStatusLabel,
  getStatusColor,
  getNextStatus,
  getPreviousStatus,
  getTreatmentProgress,
  getAlignerProgress,
  getDaysUntilNextAppointment,
  getOverdueStatus,
  getMaintenanceAlert,
  formatDuration,
  getComplianceColor,
} from '@/utils/orthodontics';

interface CaseDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orthoCase: OrthodonticCase | null;
  onEdit: (orthoCase: OrthodonticCase) => void;
}

export function CaseDetailDialog({ open, onOpenChange, orthoCase, onEdit }: CaseDetailDialogProps) {
  const { toast } = useToast();
  const changeStatus = useChangeStatus();
  const { data: sessions = [] } = useOrthodonticSessions(orthoCase?.id ?? null);
  const [showSessionForm, setShowSessionForm] = useState(false);

  if (!orthoCase) return null;

  const nextStatus = getNextStatus(orthoCase.status);
  const prevStatus = getPreviousStatus(orthoCase.status);
  const statusColor = getStatusColor(orthoCase.status);
  const isAligners = orthoCase.treatment_type === 'aligners';
  const treatmentProgress = getTreatmentProgress(orthoCase);
  const alignerProgress = getAlignerProgress(orthoCase);
  const overdueStatus = getOverdueStatus(orthoCase);
  const daysUntilNext = getDaysUntilNextAppointment(orthoCase.next_appointment_at);
  const maintenanceAlert = getMaintenanceAlert(orthoCase);

  const handleStatusChange = async (newStatus: OrthodonticStatus) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await changeStatus.mutateAsync({
        caseId: orthoCase.id,
        newStatus,
        userId: user?.id || '',
      });
      toast({ title: `Status alterado para ${getStatusLabel(newStatus)}` });
    } catch {
      toast({ title: 'Erro ao alterar status', variant: 'destructive' });
    }
  };

  const recentSessions = sessions.slice(0, 5);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] p-0">
          <DialogHeader className="px-6 pt-6 pb-2">
            <div className="flex items-start justify-between">
              <div>
                <DialogTitle className="text-lg">{orthoCase.patient_name}</DialogTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={`${statusColor.bg} ${statusColor.text} border ${statusColor.border}`}>
                    {getStatusLabel(orthoCase.status)}
                  </Badge>
                  <Badge variant="outline">
                    {TREATMENT_TYPE_LABELS[orthoCase.treatment_type] || orthoCase.treatment_type}
                  </Badge>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mr-6"
                onClick={() => { onOpenChange(false); onEdit(orthoCase); }}
              >
                <Edit2 className="w-4 h-4 mr-1" />
                Editar
              </Button>
            </div>
          </DialogHeader>

          <ScrollArea className="max-h-[calc(90vh-140px)]">
            <div className="px-6 pb-6 space-y-5">
              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                {orthoCase.dentist_name && (
                  <div>
                    <span className="text-xs text-muted-foreground">Dentista</span>
                    <p className="font-medium">{orthoCase.dentist_name}</p>
                  </div>
                )}
                {orthoCase.started_at && (
                  <div>
                    <span className="text-xs text-muted-foreground">Início</span>
                    <p className="font-medium">{new Date(orthoCase.started_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                )}
                {orthoCase.estimated_duration_months && (
                  <div>
                    <span className="text-xs text-muted-foreground">Duração Estimada</span>
                    <p className="font-medium">{formatDuration(orthoCase.estimated_duration_months)}</p>
                  </div>
                )}
                {orthoCase.return_frequency_days && (
                  <div>
                    <span className="text-xs text-muted-foreground">Frequência de Retorno</span>
                    <p className="font-medium">{orthoCase.return_frequency_days} dias</p>
                  </div>
                )}
                {orthoCase.maintenance_fee != null && orthoCase.maintenance_fee > 0 && (
                  <div>
                    <span className="text-xs text-muted-foreground">Valor Manutenção</span>
                    <p className="font-medium">
                      R$ {orthoCase.maintenance_fee.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                )}
                {maintenanceAlert && maintenanceAlert.level !== 'ok' && (
                  <div className="col-span-2">
                    <span className="text-xs text-muted-foreground">Alerta de Manutenção</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      {maintenanceAlert.level === 'late' && (
                        <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 text-xs">
                          <Clock className="w-3 h-3 mr-1" />
                          Manutenção atrasada (+{maintenanceAlert.daysSince - (orthoCase.return_frequency_days || 30)}d)
                        </Badge>
                      )}
                      {maintenanceAlert.level === 'very_late' && (
                        <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-xs">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Atrasado {maintenanceAlert.daysSince}d sem sessão
                        </Badge>
                      )}
                      {maintenanceAlert.level === 'absent' && (
                        <Badge variant="destructive" className="text-xs">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Ausente — {maintenanceAlert.daysSince}d sem sessão
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Next Appointment */}
                <div className="col-span-2">
                  <span className="text-xs text-muted-foreground">Próxima Consulta</span>
                  {orthoCase.next_appointment_at ? (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <p className="font-medium">
                        {new Date(orthoCase.next_appointment_at).toLocaleDateString('pt-BR')}
                      </p>
                      {overdueStatus === 'overdue' && (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                          <AlertTriangle className="w-3 h-3 mr-0.5" />
                          Atrasado ({Math.abs(daysUntilNext!)}d)
                        </Badge>
                      )}
                      {overdueStatus === 'due_soon' && (
                        <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px] px-1.5 py-0">
                          <Clock className="w-3 h-3 mr-0.5" />
                          Em {daysUntilNext}d
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">Não agendada</p>
                  )}
                </div>
              </div>

              {/* Treatment Info */}
              <Separator />
              <div>
                <h4 className="text-sm font-semibold mb-2">Tratamento</h4>

                {/* Arch Wires or Aligner Progress */}
                {isAligners ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Alinhador {orthoCase.current_aligner_number || 0} de {orthoCase.total_aligners || '?'}</span>
                      {alignerProgress != null && (
                        <span className="text-muted-foreground">{alignerProgress}%</span>
                      )}
                    </div>
                    {alignerProgress != null && (
                      <Progress value={alignerProgress} className="h-2" />
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-xs text-muted-foreground">Arco Superior</span>
                      <p className="font-medium">{orthoCase.upper_arch_wire || '—'}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Arco Inferior</span>
                      <p className="font-medium">{orthoCase.lower_arch_wire || '—'}</p>
                    </div>
                  </div>
                )}

                {/* Treatment Progress Bar */}
                {treatmentProgress != null && !isAligners && (
                  <div className="mt-3 space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progresso estimado</span>
                      <span className="text-muted-foreground">{treatmentProgress}%</span>
                    </div>
                    <Progress value={treatmentProgress} className="h-2" />
                  </div>
                )}

                {orthoCase.appliance_details && (
                  <div className="mt-3 text-sm">
                    <span className="text-xs text-muted-foreground">Aparelho</span>
                    <p>{orthoCase.appliance_details}</p>
                  </div>
                )}
              </div>

              {/* Diagnosis & Plan */}
              {(orthoCase.chief_complaint || orthoCase.initial_diagnosis || orthoCase.treatment_plan_notes) && (
                <>
                  <Separator />
                  <div className="space-y-2 text-sm">
                    {orthoCase.chief_complaint && (
                      <div>
                        <span className="text-xs text-muted-foreground">Queixa Principal</span>
                        <p>{orthoCase.chief_complaint}</p>
                      </div>
                    )}
                    {orthoCase.initial_diagnosis && (
                      <div>
                        <span className="text-xs text-muted-foreground">Diagnóstico</span>
                        <p>{orthoCase.initial_diagnosis}</p>
                      </div>
                    )}
                    {orthoCase.treatment_plan_notes && (
                      <div>
                        <span className="text-xs text-muted-foreground">Plano de Tratamento</span>
                        <p>{orthoCase.treatment_plan_notes}</p>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Recent Sessions */}
              <Separator />
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold">Sessões Recentes</h4>
                  {orthoCase.status !== 'completed' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSessionForm(true)}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Nova Sessão
                    </Button>
                  )}
                </div>

                {recentSessions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma sessão registrada.</p>
                ) : (
                  <div className="space-y-2">
                    {recentSessions.map(session => (
                      <div key={session.id} className="bg-muted/50 rounded-lg p-3 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">
                            {new Date(session.appointment_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                          </span>
                          {session.patient_compliance && (
                            <span className={`text-xs font-medium ${getComplianceColor(session.patient_compliance)}`}>
                              {COMPLIANCE_LABELS[session.patient_compliance]}
                            </span>
                          )}
                        </div>
                        {session.procedures_performed && session.procedures_performed.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {session.procedures_performed.map(proc => (
                              <Badge key={proc} variant="outline" className="text-[10px] px-1.5 py-0">
                                {SESSION_PROCEDURE_LABELS[proc] || proc}
                              </Badge>
                            ))}
                          </div>
                        )}
                        {session.procedure_details && (
                          <p className="text-xs text-muted-foreground mt-1">{session.procedure_details}</p>
                        )}
                        {session.next_steps && (
                          <p className="text-xs text-muted-foreground mt-1">
                            <span className="font-medium">Próx:</span> {session.next_steps}
                          </p>
                        )}
                      </div>
                    ))}
                    {sessions.length > 5 && (
                      <p className="text-xs text-muted-foreground text-center">
                        +{sessions.length - 5} sessões anteriores
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Status Timeline */}
              <Separator />
              <div>
                <h4 className="text-sm font-semibold mb-2">Histórico</h4>
                <StatusTimeline caseId={orthoCase.id} />
              </div>

              {/* Documentation Info */}
              {(orthoCase.status === 'awaiting_documentation' || orthoCase.status === 'documentation_received') && orthoCase.documentation_notes && (
                <>
                  <Separator />
                  <div className="text-sm">
                    <span className="text-xs text-muted-foreground">Documentação Solicitada</span>
                    <p>{orthoCase.documentation_notes}</p>
                    {orthoCase.documentation_received_at && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Recebida em {new Date(orthoCase.documentation_received_at).toLocaleDateString('pt-BR')}
                      </p>
                    )}
                  </div>
                </>
              )}

              {/* Prior Treatment Info */}
              {orthoCase.status === 'prior_treatment' && orthoCase.prior_treatments_needed && (
                <>
                  <Separator />
                  <div className="text-sm">
                    <span className="text-xs text-muted-foreground">Tratamentos Prévios Necessários</span>
                    <p>{orthoCase.prior_treatments_needed}</p>
                  </div>
                </>
              )}

              {/* Actions */}
              <Separator />
              <div className="flex flex-wrap gap-2">
                {prevStatus && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatusChange(prevStatus)}
                    disabled={changeStatus.isPending}
                  >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    {getStatusLabel(prevStatus)}
                  </Button>
                )}

                {orthoCase.status !== 'paused' && orthoCase.status !== 'completed' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatusChange('paused')}
                    disabled={changeStatus.isPending}
                  >
                    <Pause className="w-4 h-4 mr-1" />
                    Pausar
                  </Button>
                )}

                {orthoCase.status === 'paused' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatusChange('active')}
                    disabled={changeStatus.isPending}
                  >
                    <Play className="w-4 h-4 mr-1" />
                    Retomar
                  </Button>
                )}

                {/* Contextual next-status buttons */}
                {orthoCase.status === 'awaiting_documentation' && (
                  <Button
                    size="sm"
                    onClick={() => handleStatusChange('documentation_received')}
                    disabled={changeStatus.isPending}
                  >
                    <FileCheck className="w-4 h-4 mr-1" />
                    Documentação Recebida
                  </Button>
                )}

                {orthoCase.status === 'evaluation' && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStatusChange('prior_treatment')}
                      disabled={changeStatus.isPending}
                    >
                      <Wrench className="w-4 h-4 mr-1" />
                      Necessita Trat. Prévio
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleStatusChange('active')}
                      disabled={changeStatus.isPending}
                    >
                      Instalar Aparelho
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </>
                )}

                {orthoCase.status === 'prior_treatment' && (
                  <Button
                    size="sm"
                    onClick={() => handleStatusChange('active')}
                    disabled={changeStatus.isPending}
                  >
                    Instalar Aparelho
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                )}

                {(orthoCase.status === 'documentation_received' || orthoCase.status === 'active') && nextStatus && (
                  <Button
                    size="sm"
                    onClick={() => handleStatusChange(nextStatus)}
                    disabled={changeStatus.isPending}
                  >
                    {getStatusLabel(nextStatus)}
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
              </div>

              {orthoCase.notes && (
                <>
                  <Separator />
                  <div className="text-sm">
                    <span className="text-xs text-muted-foreground">Observações</span>
                    <p>{orthoCase.notes}</p>
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {showSessionForm && (
        <SessionFormDialog
          open={showSessionForm}
          onOpenChange={setShowSessionForm}
          orthoCase={orthoCase}
        />
      )}
    </>
  );
}
