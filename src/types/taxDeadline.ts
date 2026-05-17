export type DeadlineCategory = 'payment' | 'submission' | 'closure' | 'declaration';
export type DeadlineResponsible = 'client' | 'accountant' | 'shared';
export type DeadlineFrequency = 'monthly' | 'annually';

export interface TaxDeadlineRule {
  id: string;
  clinic_id: string;
  name: string;
  description: string | null;
  category: DeadlineCategory;
  responsible: DeadlineResponsible;
  frequency: DeadlineFrequency;
  day_of_month: number;
  month_of_year: number | null;
  due_in_next_month: boolean;
  applies_to_regime: string[] | null;
  requires_employees: boolean;
  is_system: boolean;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeadlineOccurrence {
  deadline_id: string;
  occurrence_date: string;
  deadline_name: string;
  deadline_description: string | null;
  category: DeadlineCategory;
  responsible: DeadlineResponsible;
  day_of_month: number;
  is_completed: boolean;
  completion_id: string | null;
  completion_status: 'done' | 'skipped' | null;
  completion_notes: string | null;
  amount_paid: number | null;
}

export interface DeadlineUrgency {
  occurrence: DeadlineOccurrence;
  daysUntilDue: number;
  urgency: 'overdue' | 'today' | 'this-week' | 'upcoming' | 'completed';
}

export interface DeadlineCompletionInput {
  deadline_id: string;
  occurrence_date: string;
  status?: 'done' | 'skipped';
  notes?: string;
  amount_paid?: number;
}
