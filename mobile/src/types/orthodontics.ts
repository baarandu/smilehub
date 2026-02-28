// ==================== Status & Enums ====================

export type OrthodonticStatus =
  | 'awaiting_documentation' | 'documentation_received' | 'evaluation'
  | 'prior_treatment' | 'active' | 'completed'
  | 'paused';

export type OrthodonticTreatmentType =
  | 'fixed_metallic' | 'fixed_ceramic' | 'fixed_self_ligating' | 'fixed_lingual'
  | 'aligners' | 'interceptive' | 'removable' | 'other';

export type SessionProcedure =
  | 'wire_change' | 'bracket_rebond' | 'elastic_placement' | 'ipr'
  | 'aligner_delivery' | 'chain_placement' | 'spring_activation'
  | 'band_placement' | 'separator_placement' | 'debonding'
  | 'retainer_placement' | 'other';

export type PatientCompliance = 'excellent' | 'good' | 'fair' | 'poor';

// ==================== Interfaces ====================

export interface OrthodonticCase {
  id: string;
  clinic_id: string;
  patient_id: string;
  dentist_id: string;
  status: OrthodonticStatus;
  treatment_type: OrthodonticTreatmentType;
  chief_complaint: string | null;
  initial_diagnosis: string | null;
  treatment_plan_notes: string | null;
  estimated_duration_months: number | null;
  return_frequency_days: number | null;
  appliance_details: string | null;
  upper_arch_wire: string | null;
  lower_arch_wire: string | null;
  current_aligner_number: number | null;
  total_aligners: number | null;
  started_at: string | null;
  completed_at: string | null;
  last_session_at: string | null;
  next_appointment_at: string | null;
  documentation_notes: string | null;
  documentation_received_at: string | null;
  prior_treatments_needed: string | null;
  needs_prior_treatment: boolean;
  position: number;
  notes: string | null;
  maintenance_fee: number | null;
  budget_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  patient_name?: string;
  patient_phone?: string | null;
  dentist_name?: string;
}

export interface CaseInsert {
  clinic_id: string;
  patient_id: string;
  dentist_id: string;
  treatment_type: OrthodonticTreatmentType;
  chief_complaint?: string | null;
  initial_diagnosis?: string | null;
  treatment_plan_notes?: string | null;
  estimated_duration_months?: number | null;
  return_frequency_days?: number | null;
  appliance_details?: string | null;
  upper_arch_wire?: string | null;
  lower_arch_wire?: string | null;
  total_aligners?: number | null;
  next_appointment_at?: string | null;
  documentation_notes?: string | null;
  maintenance_fee?: number | null;
  notes?: string | null;
  budget_id?: string | null;
  created_by?: string | null;
}

export interface OrthodonticSession {
  id: string;
  case_id: string;
  clinic_id: string;
  appointment_date: string;
  procedures_performed: SessionProcedure[];
  procedure_details: string | null;
  upper_arch_wire_after: string | null;
  lower_arch_wire_after: string | null;
  elastics_prescribed: string | null;
  aligner_number_after: number | null;
  patient_compliance: PatientCompliance | null;
  compliance_notes: string | null;
  next_steps: string | null;
  observations: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SessionInsert {
  case_id: string;
  clinic_id: string;
  appointment_date: string;
  procedures_performed?: SessionProcedure[];
  procedure_details?: string | null;
  upper_arch_wire_after?: string | null;
  lower_arch_wire_after?: string | null;
  elastics_prescribed?: string | null;
  aligner_number_after?: number | null;
  patient_compliance?: PatientCompliance | null;
  compliance_notes?: string | null;
  next_steps?: string | null;
  observations?: string | null;
  created_by?: string | null;
}

export interface CaseHistory {
  id: string;
  case_id: string;
  from_status: string | null;
  to_status: string;
  changed_by: string | null;
  changed_by_name?: string;
  notes: string | null;
  created_at: string;
}

export interface CaseFilters {
  search?: string;
  status?: OrthodonticStatus;
  treatmentType?: OrthodonticTreatmentType;
  dentistId?: string;
  overdueOnly?: boolean;
}

// ==================== Label Maps (pt-BR) ====================

export const STATUS_LABELS: Record<OrthodonticStatus, string> = {
  awaiting_documentation: 'Aguardando Doc.',
  documentation_received: 'Doc. Recebida',
  evaluation: 'Avaliacao',
  prior_treatment: 'Trat. Previo',
  active: 'Em Tratamento',
  completed: 'Alta',
  paused: 'Pausado',
};

export const STATUS_LABELS_FULL: Record<OrthodonticStatus, string> = {
  awaiting_documentation: 'Aguardando Documentacao',
  documentation_received: 'Documentacao Recebida',
  evaluation: 'Avaliacao',
  prior_treatment: 'Tratamento Previo',
  active: 'Em Tratamento',
  completed: 'Alta',
  paused: 'Pausado',
};

// ==================== Kanban Columns (mobile: hex colors) ====================

export interface OrthoKanbanColumn {
  id: OrthodonticStatus;
  title: string;
  color: string;
  bgColor: string;
}

export const ORTHO_KANBAN_COLUMNS: OrthoKanbanColumn[] = [
  { id: 'awaiting_documentation', title: 'Aguardando Doc.', color: '#1d4ed8', bgColor: '#dbeafe' },
  { id: 'documentation_received', title: 'Doc. Recebida', color: '#0e7490', bgColor: '#cffafe' },
  { id: 'evaluation', title: 'Avaliacao', color: '#4338ca', bgColor: '#e0e7ff' },
  { id: 'prior_treatment', title: 'Trat. Previo', color: '#c2410c', bgColor: '#ffedd5' },
  { id: 'active', title: 'Em Tratamento', color: '#15803d', bgColor: '#dcfce7' },
  { id: 'completed', title: 'Alta', color: '#0f766e', bgColor: '#ccfbf1' },
];

export const TREATMENT_TYPE_LABELS: Record<OrthodonticTreatmentType, string> = {
  fixed_metallic: 'Fixo Metalico',
  fixed_ceramic: 'Fixo Ceramico',
  fixed_self_ligating: 'Fixo Autoligado',
  fixed_lingual: 'Fixo Lingual',
  aligners: 'Alinhadores',
  interceptive: 'Interceptivo',
  removable: 'Removivel',
  other: 'Outro',
};

export const SESSION_PROCEDURE_LABELS: Record<SessionProcedure, string> = {
  wire_change: 'Troca de Fio',
  bracket_rebond: 'Recolagem de Braquete',
  elastic_placement: 'Colocacao de Elastico',
  ipr: 'Desgaste Interproximal (IPR)',
  aligner_delivery: 'Entrega de Alinhador',
  chain_placement: 'Cadeia Elastica',
  spring_activation: 'Ativacao de Mola',
  band_placement: 'Cimentacao de Banda',
  separator_placement: 'Colocacao de Separador',
  debonding: 'Remocao do Aparelho',
  retainer_placement: 'Instalacao de Contencao',
  other: 'Outro',
};

export const COMPLIANCE_LABELS: Record<PatientCompliance, string> = {
  excellent: 'Excelente',
  good: 'Bom',
  fair: 'Regular',
  poor: 'Ruim',
};
