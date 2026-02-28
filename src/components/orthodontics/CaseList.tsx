import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AlertTriangle, Clock, Calendar } from 'lucide-react';
import type { OrthodonticCase } from '@/types/orthodontics';
import {
  getStatusLabel,
  getStatusColor,
  getTreatmentTypeLabel,
  getDaysUntilNextAppointment,
  getOverdueStatus,
  getAlignerProgress,
  formatDuration,
} from '@/utils/orthodontics';

interface CaseListProps {
  cases: OrthodonticCase[];
  isLoading: boolean;
  onCaseClick: (orthoCase: OrthodonticCase) => void;
}

export function CaseList({ cases, isLoading, onCaseClick }: CaseListProps) {

  const renderOverdueBadge = (orthoCase: OrthodonticCase) => {
    const status = getOverdueStatus(orthoCase);
    const days = getDaysUntilNextAppointment(orthoCase.next_appointment_at);

    if (status === 'overdue') {
      return (
        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
          <AlertTriangle className="w-3 h-3 mr-0.5" />
          Atrasado
        </Badge>
      );
    }
    if (status === 'due_soon') {
      return (
        <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px] px-1.5 py-0">
          <Clock className="w-3 h-3 mr-0.5" />
          Em {days}d
        </Badge>
      );
    }
    return null;
  };

  const renderTreatmentInfo = (orthoCase: OrthodonticCase) => {
    if (orthoCase.treatment_type === 'aligners') {
      const progress = getAlignerProgress(orthoCase);
      return (
        <span className="text-xs text-muted-foreground">
          Alinhador {orthoCase.current_aligner_number || 0}/{orthoCase.total_aligners || '?'}
          {progress != null && ` (${progress}%)`}
        </span>
      );
    }
    const wires = [orthoCase.upper_arch_wire, orthoCase.lower_arch_wire].filter(Boolean);
    if (wires.length > 0) {
      return <span className="text-xs text-muted-foreground">{wires.join(' / ')}</span>;
    }
    return <span className="text-xs text-muted-foreground">—</span>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {cases.length === 0 ? (
        <div className="text-center py-16 bg-muted/30 rounded-lg">
          <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <h3 className="text-lg font-semibold">Nenhum caso encontrado</h3>
          <p className="text-muted-foreground mt-1 text-sm">
            Crie o primeiro caso ortodôntico ou ajuste os filtros
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tratamento</TableHead>
                  <TableHead>Próxima Consulta</TableHead>
                  <TableHead>Duração</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cases.map(c => {
                  const statusColor = getStatusColor(c.status);
                  return (
                    <TableRow
                      key={c.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => onCaseClick(c)}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium">{c.patient_name}</p>
                          {c.dentist_name && (
                            <p className="text-xs text-muted-foreground">{c.dentist_name}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{getTreatmentTypeLabel(c.treatment_type)}</span>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${statusColor.bg} ${statusColor.text} border ${statusColor.border} text-xs`}>
                          {getStatusLabel(c.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>{renderTreatmentInfo(c)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {c.next_appointment_at ? (
                            <span className="text-sm">
                              {new Date(c.next_appointment_at).toLocaleDateString('pt-BR')}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                          {renderOverdueBadge(c)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {c.estimated_duration_months ? (
                          <span className="text-sm">{formatDuration(c.estimated_duration_months)}</span>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {cases.map(c => {
              const statusColor = getStatusColor(c.status);
              return (
                <div
                  key={c.id}
                  className="bg-card border rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => onCaseClick(c)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{c.patient_name}</p>
                      {c.dentist_name && (
                        <p className="text-xs text-muted-foreground">{c.dentist_name}</p>
                      )}
                    </div>
                    <Badge className={`${statusColor.bg} ${statusColor.text} border ${statusColor.border} text-[10px]`}>
                      {getStatusLabel(c.status)}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-[10px]">
                      {getTreatmentTypeLabel(c.treatment_type)}
                    </Badge>
                    {renderTreatmentInfo(c)}
                    {renderOverdueBadge(c)}
                  </div>
                  {c.next_appointment_at && (
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {new Date(c.next_appointment_at).toLocaleDateString('pt-BR')}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

    </div>
  );
}
