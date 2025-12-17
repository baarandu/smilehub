import { supabase } from '@/lib/supabase';
import type { Exam, ExamInsert } from '@/types/database';

export const examsService = {
  async getByPatient(patientId: string): Promise<Exam[]> {
    const { data, error } = await supabase
      .from('exams')
      .select('*')
      .eq('patient_id', patientId)
      .order('order_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async create(exam: ExamInsert): Promise<Exam> {
    // Get user's clinic_id
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: clinicUser, error: clinicError } = await supabase
      .from('clinic_users')
      .select('clinic_id')
      .eq('user_id', user.id)
      .single();

    if (clinicError || !clinicUser) throw new Error('Clinic not found');

    // Ensure required fields are populated
    const examData = {
      ...exam,
      clinic_id: clinicUser.clinic_id,
      // Add required fields if missing (table requires title, date, name, order_date as NOT NULL)
      title: (exam as any).title || (exam as any).name || 'Exame',
      date: (exam as any).date || (exam as any).order_date || new Date().toISOString().split('T')[0],
    };

    const { data, error } = await supabase
      .from('exams')
      .insert(examData as any)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, exam: Partial<ExamInsert>): Promise<Exam> {
    const { data, error } = await (supabase
      .from('exams') as any)
      .update(exam)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('exams')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};


