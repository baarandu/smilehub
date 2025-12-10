import { supabase } from '../lib/supabase';
import type { ReturnAlert } from '../types/database';

export const consultationsService = {
  async getReturnAlerts(): Promise<ReturnAlert[]> {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('consultations')
      .select(`
        patient_id,
        suggested_return_date,
        patients (name, phone)
      `)
      .not('suggested_return_date', 'is', null)
      .gte('suggested_return_date', today)
      .order('suggested_return_date');
    
    if (error) throw error;
    
    const alerts: ReturnAlert[] = (data || []).map((item: any) => {
      const returnDate = new Date(item.suggested_return_date);
      const todayDate = new Date(today);
      const diffTime = returnDate.getTime() - todayDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return {
        patient_id: item.patient_id,
        patient_name: item.patients.name,
        phone: item.patients.phone,
        suggested_return_date: item.suggested_return_date,
        days_until_return: diffDays
      };
    });
    
    return alerts;
  },

  async countPendingReturns(): Promise<number> {
    const today = new Date().toISOString().split('T')[0];
    const { count, error } = await supabase
      .from('consultations')
      .select('*', { count: 'exact', head: true })
      .not('suggested_return_date', 'is', null)
      .gte('suggested_return_date', today);
    
    if (error) throw error;
    return count || 0;
  }
};

