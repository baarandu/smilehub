import { supabase } from '../lib/supabase';
import type { Exam, ExamInsert } from '../types/database';

export const examsService = {
  async getByPatient(patientId: string): Promise<Exam[]> {
    const { data, error } = await supabase
      .from('exams')
      .select('*')
      .eq('patient_id', patientId)
      .order('order_date', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async create(exam: ExamInsert): Promise<Exam> {
    const { data, error } = await supabase
      .from('exams')
      .insert(exam)
      .select()
      .single();
    
    if (error) throw error;
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
    const { error } = await supabase
      .from('exams')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },
};

