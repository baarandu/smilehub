import { supabase } from '@/lib/supabase';
import type { Exam, ExamInsert } from '@/types/database';
import { getClinicContext } from './clinicContext';

export const examsService = {
  async getByPatient(patientId: string): Promise<Exam[]> {
    const { data, error } = await supabase
      .from('exams')
      .select('*')
      .eq('patient_id', patientId)
      .is('deleted_at', null)
      .order('order_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async create(exam: ExamInsert): Promise<Exam> {
    const { clinicId } = await getClinicContext();

    // Ensure required fields are populated
    const examData = {
      ...exam,
      clinic_id: clinicId,
      // Add required fields if missing (table requires title, date, name, order_date as NOT NULL)
      title: exam.title || exam.name || 'Exame',
      date: exam.date || exam.order_date || new Date().toISOString().split('T')[0],
    };

    const { data, error } = await supabase
      .from('exams')
      .insert(examData)
      .select()
      .single();

    if (error) {
      console.error('[examsService.create] Insert error:', error);
      throw error;
    }

    return data;
  },

  async update(id: string, exam: Partial<ExamInsert>): Promise<Exam> {
    const { data, error } = await supabase
      .from('exams')
      .update(exam)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('exams')
      .update({ deleted_at: new Date().toISOString(), deleted_by: user?.id })
      .eq('id', id);

    if (error) throw error;
  },
};






