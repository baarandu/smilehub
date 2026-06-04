import { supabase } from '@/lib/supabase';
import { getClinicContext } from './clinicContext';

export interface PatientCredit {
  id: string;
  clinic_id: string;
  patient_id: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  related_transaction_id: string | null;
  created_by: string | null;
  created_at: string;
}

export const patientCreditsService = {
  /**
   * Obtém o histórico completo de créditos/débitos de um paciente,
   * e também calcula o saldo atual (sum(credit) - sum(debit)).
   */
  async getByPatient(patientId: string): Promise<{ balance: number; history: PatientCredit[] }> {
    const { clinicId } = await getClinicContext();

    const { data, error } = await supabase
      .from('patient_credits')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const history = (data as PatientCredit[]) || [];
    
    let balance = 0;
    history.forEach(item => {
      if (item.type === 'credit') balance += Number(item.amount);
      if (item.type === 'debit') balance -= Number(item.amount);
    });

    return { balance, history };
  },

  /**
   * Adiciona crédito ou consome crédito (débito) para um paciente.
   */
  async addTransaction(input: {
    patientId: string;
    type: 'credit' | 'debit';
    amount: number;
    description: string;
    relatedTransactionId?: string | null;
  }): Promise<PatientCredit> {
    const { clinicId, userId } = await getClinicContext();

    if (input.amount <= 0) {
      throw new Error('O valor deve ser maior que zero.');
    }

    const { data, error } = await supabase
      .from('patient_credits')
      .insert({
        clinic_id: clinicId,
        patient_id: input.patientId,
        type: input.type,
        amount: input.amount,
        description: input.description,
        related_transaction_id: input.relatedTransactionId || null,
        created_by: userId
      } as any)
      .select()
      .single();

    if (error) throw error;
    return data as PatientCredit;
  }
};
