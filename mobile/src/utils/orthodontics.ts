import type { OrthodonticStatus, OrthodonticCase, PatientCompliance } from '../types/orthodontics';
import { STATUS_LABELS_FULL, TREATMENT_TYPE_LABELS, COMPLIANCE_LABELS } from '../types/orthodontics';

// ==================== Status Flow ====================

const STATUS_FLOW: OrthodonticStatus[] = [
  'awaiting_documentation', 'documentation_received', 'evaluation',
  'prior_treatment', 'active', 'completed',
];

export function getNextStatus(current: OrthodonticStatus): OrthodonticStatus | null {
  if (current === 'paused') return null;
  const idx = STATUS_FLOW.indexOf(current);
  return idx >= 0 && idx < STATUS_FLOW.length - 1 ? STATUS_FLOW[idx + 1] : null;
}

export function getPreviousStatus(current: OrthodonticStatus): OrthodonticStatus | null {
  if (current === 'paused') return null;
  const idx = STATUS_FLOW.indexOf(current);
  return idx > 0 ? STATUS_FLOW[idx - 1] : null;
}

// ==================== Labels ====================

export function getStatusLabel(status: string): string {
  return STATUS_LABELS_FULL[status as OrthodonticStatus] || status;
}

export function getStatusColor(status: OrthodonticStatus): { bg: string; text: string; color: string } {
  const colors: Record<OrthodonticStatus, { bg: string; text: string; color: string }> = {
    awaiting_documentation: { bg: '#dbeafe', text: '#1d4ed8', color: '#1d4ed8' },
    documentation_received: { bg: '#cffafe', text: '#0e7490', color: '#0e7490' },
    evaluation: { bg: '#e0e7ff', text: '#4338ca', color: '#4338ca' },
    prior_treatment: { bg: '#ffedd5', text: '#c2410c', color: '#c2410c' },
    active: { bg: '#dcfce7', text: '#15803d', color: '#15803d' },
    completed: { bg: '#ccfbf1', text: '#0f766e', color: '#0f766e' },
    paused: { bg: '#f3f4f6', text: '#374151', color: '#374151' },
  };
  return colors[status] || colors.awaiting_documentation;
}

export function getTreatmentTypeLabel(type: string): string {
  return TREATMENT_TYPE_LABELS[type as keyof typeof TREATMENT_TYPE_LABELS] || type;
}

export function getComplianceLabel(compliance: string): string {
  return COMPLIANCE_LABELS[compliance as PatientCompliance] || compliance;
}

export function getComplianceColor(compliance: PatientCompliance): string {
  const colors: Record<PatientCompliance, string> = {
    excellent: '#16a34a',
    good: '#2563eb',
    fair: '#d97706',
    poor: '#dc2626',
  };
  return colors[compliance] || '#6b7280';
}

// ==================== Appointment Helpers ====================

export function getDaysUntilNextAppointment(nextAppointmentAt: string | null): number | null {
  if (!nextAppointmentAt) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const next = new Date(nextAppointmentAt);
  next.setHours(0, 0, 0, 0);
  return Math.ceil((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function getOverdueStatus(orthoCase: OrthodonticCase): 'overdue' | 'due_soon' | 'ok' | 'no_appointment' {
  if (orthoCase.status === 'completed' || orthoCase.status === 'paused') return 'ok';
  const days = getDaysUntilNextAppointment(orthoCase.next_appointment_at);
  if (days === null) return 'no_appointment';
  if (days < 0) return 'overdue';
  if (days <= 3) return 'due_soon';
  return 'ok';
}

// ==================== Maintenance Alert ====================

export type MaintenanceAlertLevel = 'ok' | 'late' | 'very_late' | 'absent';

export interface MaintenanceAlert {
  level: MaintenanceAlertLevel;
  daysSince: number;
}

export function getMaintenanceAlert(orthoCase: OrthodonticCase): MaintenanceAlert | null {
  if (orthoCase.status !== 'active' || !orthoCase.last_session_at) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const lastSession = new Date(orthoCase.last_session_at);
  lastSession.setHours(0, 0, 0, 0);
  const daysSince = Math.floor((today.getTime() - lastSession.getTime()) / (1000 * 60 * 60 * 24));
  const freq = orthoCase.return_frequency_days || 30;

  let level: MaintenanceAlertLevel;
  if (daysSince <= freq) {
    level = 'ok';
  } else if (daysSince <= freq + 14) {
    level = 'late';
  } else if (daysSince <= freq + 30) {
    level = 'very_late';
  } else {
    level = 'absent';
  }

  return { level, daysSince };
}

export function getMaintenanceAlertInfo(level: MaintenanceAlertLevel): { label: string; color: string; bg: string } {
  const map: Record<MaintenanceAlertLevel, { label: string; color: string; bg: string }> = {
    ok: { label: 'Em dia', color: '#15803d', bg: '#dcfce7' },
    late: { label: 'Atrasado', color: '#d97706', bg: '#fef3c7' },
    very_late: { label: 'Muito atrasado', color: '#ea580c', bg: '#ffedd5' },
    absent: { label: 'Ausente', color: '#dc2626', bg: '#fef2f2' },
  };
  return map[level];
}

// ==================== Progress ====================

export function getTreatmentProgress(orthoCase: OrthodonticCase): number | null {
  if (!orthoCase.estimated_duration_months || !orthoCase.started_at) return null;
  const startDate = new Date(orthoCase.started_at);
  const monthsElapsed = (Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
  const progress = Math.min(100, Math.round((monthsElapsed / orthoCase.estimated_duration_months) * 100));
  return Math.max(0, progress);
}

export function getAlignerProgress(orthoCase: OrthodonticCase): number | null {
  if (!orthoCase.total_aligners || orthoCase.total_aligners === 0) return null;
  const current = orthoCase.current_aligner_number || 0;
  return Math.min(100, Math.round((current / orthoCase.total_aligners) * 100));
}

// ==================== Formatting ====================

export function formatDuration(months: number): string {
  if (months < 1) return 'Menos de 1 mes';
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  if (years === 0) return `${remainingMonths} ${remainingMonths === 1 ? 'mes' : 'meses'}`;
  if (remainingMonths === 0) return `${years} ${years === 1 ? 'ano' : 'anos'}`;
  return `${years} ${years === 1 ? 'ano' : 'anos'} e ${remainingMonths} ${remainingMonths === 1 ? 'mes' : 'meses'}`;
}

export function formatCurrency(val: number | null | undefined): string {
  if (!val && val !== 0) return '-';
  return `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}
