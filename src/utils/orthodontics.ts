import type { OrthodonticStatus, OrthodonticCase, PatientCompliance } from '@/types/orthodontics';
import { STATUS_LABELS, TREATMENT_TYPE_LABELS, COMPLIANCE_LABELS } from '@/types/orthodontics';

// ==================== Status Flow ====================

const STATUS_FLOW: OrthodonticStatus[] = [
  'awaiting_documentation', 'documentation_received', 'evaluation',
  'prior_treatment', 'active', 'completed',
];
// 'paused' is a side-branch — not in the main flow

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
  return STATUS_LABELS[status as OrthodonticStatus] || status;
}

export function getStatusColor(status: OrthodonticStatus): { bg: string; text: string; border: string } {
  const colors: Record<OrthodonticStatus, { bg: string; text: string; border: string }> = {
    awaiting_documentation: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    documentation_received: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
    evaluation: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
    prior_treatment: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
    active: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
    completed: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    paused: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
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
    excellent: 'text-green-600',
    good: 'text-blue-600',
    fair: 'text-amber-600',
    poor: 'text-red-600',
  };
  return colors[compliance] || 'text-gray-600';
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
  if (months < 1) return 'Menos de 1 mês';
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  if (years === 0) return `${remainingMonths} ${remainingMonths === 1 ? 'mês' : 'meses'}`;
  if (remainingMonths === 0) return `${years} ${years === 1 ? 'ano' : 'anos'}`;
  return `${years} ${years === 1 ? 'ano' : 'anos'} e ${remainingMonths} ${remainingMonths === 1 ? 'mês' : 'meses'}`;
}
