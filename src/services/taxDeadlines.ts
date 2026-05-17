import { supabase } from '@/lib/supabase';
import { getClinicContext } from './clinicContext';
import type {
  TaxDeadlineRule,
  DeadlineOccurrence,
  DeadlineCompletionInput,
  DeadlineUrgency,
} from '@/types/taxDeadline';

function fmt(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function daysBetween(a: Date, b: Date): number {
  const ms = b.getTime() - a.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

export function classifyUrgency(
  occurrence: DeadlineOccurrence,
  today = new Date(),
): DeadlineUrgency {
  const due = new Date(occurrence.occurrence_date + 'T12:00:00');
  const todayMidnight = new Date(today);
  todayMidnight.setHours(0, 0, 0, 0);

  const diff = daysBetween(todayMidnight, due);

  let urgency: DeadlineUrgency['urgency'];
  if (occurrence.is_completed) {
    urgency = 'completed';
  } else if (diff < 0) {
    urgency = 'overdue';
  } else if (diff === 0) {
    urgency = 'today';
  } else if (diff <= 7) {
    urgency = 'this-week';
  } else {
    urgency = 'upcoming';
  }

  return { occurrence, daysUntilDue: diff, urgency };
}

export const taxDeadlinesService = {
  // ---------------------------------------
  // Rules
  // ---------------------------------------
  async listRules(): Promise<TaxDeadlineRule[]> {
    const { clinicId } = await getClinicContext();
    const { data, error } = await supabase
      .from('tax_deadlines')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('day_of_month', { ascending: true });
    if (error) throw error;
    return (data || []) as TaxDeadlineRule[];
  },

  async createRule(input: Partial<TaxDeadlineRule>): Promise<TaxDeadlineRule> {
    const { clinicId } = await getClinicContext();
    const { data, error } = await supabase
      .from('tax_deadlines')
      .insert({ ...input, clinic_id: clinicId, is_system: false } as any)
      .select()
      .single();
    if (error) throw error;
    return data as TaxDeadlineRule;
  },

  async updateRule(id: string, patch: Partial<TaxDeadlineRule>): Promise<void> {
    const { error } = await supabase
      .from('tax_deadlines')
      .update(patch)
      .eq('id', id);
    if (error) throw error;
  },

  async toggleActive(id: string, isActive: boolean): Promise<void> {
    return this.updateRule(id, { is_active: isActive });
  },

  async deleteRule(id: string): Promise<void> {
    const { error } = await supabase.from('tax_deadlines').delete().eq('id', id);
    if (error) throw error;
  },

  async seedDefaults(): Promise<number> {
    const { clinicId } = await getClinicContext();
    const { data, error } = await supabase.rpc('seed_default_tax_deadlines', {
      p_clinic_id: clinicId,
    });
    if (error) throw error;
    return (data as number) ?? 0;
  },

  // ---------------------------------------
  // Occurrences (generated)
  // ---------------------------------------
  async getOccurrences(
    startDate: Date | string,
    endDate: Date | string,
  ): Promise<DeadlineOccurrence[]> {
    const { clinicId } = await getClinicContext();
    const start = typeof startDate === 'string' ? startDate : fmt(startDate);
    const end = typeof endDate === 'string' ? endDate : fmt(endDate);

    const { data, error } = await supabase.rpc('generate_deadline_occurrences', {
      p_clinic_id: clinicId,
      p_start_date: start,
      p_end_date: end,
    });
    if (error) throw error;
    return (data || []) as DeadlineOccurrence[];
  },

  /**
   * Returns the next N days of upcoming + recently overdue deadlines.
   */
  async getUpcoming(daysAhead = 60, daysBehind = 14): Promise<DeadlineOccurrence[]> {
    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() - daysBehind);
    const end = new Date(today);
    end.setDate(end.getDate() + daysAhead);

    const list = await this.getOccurrences(start, end);
    return list.sort((a, b) => a.occurrence_date.localeCompare(b.occurrence_date));
  },

  // ---------------------------------------
  // Completions
  // ---------------------------------------
  async markComplete(input: DeadlineCompletionInput): Promise<void> {
    const { clinicId, userId } = await getClinicContext();
    const { error } = await supabase
      .from('tax_deadline_completions')
      .upsert(
        {
          clinic_id: clinicId,
          deadline_id: input.deadline_id,
          occurrence_date: input.occurrence_date,
          status: input.status ?? 'done',
          completed_by: userId,
          notes: input.notes ?? null,
          amount_paid: input.amount_paid ?? null,
        } as any,
        { onConflict: 'deadline_id,occurrence_date' },
      );
    if (error) throw error;
  },

  async unmarkComplete(deadlineId: string, occurrenceDate: string): Promise<void> {
    const { error } = await supabase
      .from('tax_deadline_completions')
      .delete()
      .eq('deadline_id', deadlineId)
      .eq('occurrence_date', occurrenceDate);
    if (error) throw error;
  },
};
