import { supabase } from '@/lib/supabase';
import type {
  OrthodonticCase,
  CaseInsert,
  OrthodonticSession,
  SessionInsert,
  CaseHistory,
  CaseFilters,
  OrthodonticStatus,
} from '@/types/orthodontics';

const CASE_SELECT = `
  *,
  patients!inner(name, phone),
  profiles!orthodontic_cases_dentist_id_fkey(full_name)
`;

function mapCase(row: any): OrthodonticCase {
  return {
    ...row,
    patient_name: row.patients?.name,
    patient_phone: row.patients?.phone ?? null,
    dentist_name: row.profiles?.full_name,
    patients: undefined,
    profiles: undefined,
  };
}

export const orthodonticsService = {
  // ==================== Cases ====================

  async getCases(clinicId: string, filters?: CaseFilters): Promise<OrthodonticCase[]> {
    let query = supabase
      .from('orthodontic_cases')
      .select(CASE_SELECT)
      .eq('clinic_id', clinicId)
      .order('position', { ascending: true })
      .order('updated_at', { ascending: false });

    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.treatmentType) query = query.eq('treatment_type', filters.treatmentType);
    if (filters?.dentistId) query = query.eq('dentist_id', filters.dentistId);
    if (filters?.search) query = query.ilike('patients.name', `%${filters.search}%`);

    const { data, error } = await query;
    if (error) throw error;

    let cases = (data || []).map(mapCase);

    // Client-side filter for overdue
    if (filters?.overdueOnly) {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      cases = cases.filter(c => {
        if (c.status === 'completed' || c.status === 'paused') return false;
        if (!c.next_appointment_at) return false;
        return new Date(c.next_appointment_at) < now;
      });
    }

    return cases;
  },

  async getCaseById(id: string): Promise<OrthodonticCase> {
    const { data, error } = await supabase
      .from('orthodontic_cases')
      .select(CASE_SELECT)
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Caso não encontrado');
    return mapCase(data);
  },

  async createCase(data: CaseInsert): Promise<OrthodonticCase> {
    const { data: created, error } = await supabase
      .from('orthodontic_cases')
      .insert(data)
      .select(CASE_SELECT)
      .single();

    if (error) throw error;
    if (!created) throw new Error('Falha ao criar caso');

    // Create initial history entry
    await supabase.from('orthodontic_case_history').insert({
      case_id: created.id,
      from_status: null,
      to_status: 'awaiting_documentation',
      changed_by: data.created_by,
      notes: 'Caso criado',
    });

    return mapCase(created);
  },

  async updateCase(id: string, updates: Partial<OrthodonticCase>): Promise<OrthodonticCase> {
    const { patient_name, dentist_name, patient_phone, ...cleanUpdates } = updates;

    const { data, error } = await supabase
      .from('orthodontic_cases')
      .update(cleanUpdates)
      .eq('id', id)
      .select(CASE_SELECT)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Falha ao atualizar caso');
    return mapCase(data);
  },

  async changeStatus(
    caseId: string,
    newStatus: OrthodonticStatus,
    userId: string,
    notes?: string
  ): Promise<OrthodonticCase> {
    // Get current case
    const { data: current, error: fetchError } = await supabase
      .from('orthodontic_cases')
      .select('status')
      .eq('id', caseId)
      .single();

    if (fetchError) throw fetchError;
    if (!current) throw new Error('Caso não encontrado');

    const oldStatus = current.status as OrthodonticStatus;

    // Build update
    const updateData: Record<string, any> = { status: newStatus };

    // Auto-set dates
    if (newStatus === 'documentation_received' && oldStatus !== 'documentation_received') {
      updateData.documentation_received_at = new Date().toISOString();
    }
    if (newStatus === 'active' && oldStatus !== 'active') {
      updateData.started_at = new Date().toISOString();
    }
    if (newStatus === 'completed') {
      updateData.completed_at = new Date().toISOString();
    }

    const { data: updated, error: updateError } = await supabase
      .from('orthodontic_cases')
      .update(updateData)
      .eq('id', caseId)
      .select(CASE_SELECT)
      .single();

    if (updateError) throw updateError;
    if (!updated) throw new Error('Falha ao atualizar status');

    // Create history entry
    await supabase.from('orthodontic_case_history').insert({
      case_id: caseId,
      from_status: oldStatus,
      to_status: newStatus,
      changed_by: userId,
      notes: notes || null,
    });

    return mapCase(updated);
  },

  async getCasesByPatient(patientId: string): Promise<OrthodonticCase[]> {
    const { data, error } = await supabase
      .from('orthodontic_cases')
      .select(CASE_SELECT)
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapCase);
  },

  async batchUpdatePositions(updates: { id: string; position: number }[]): Promise<void> {
    const promises = updates.map(({ id, position }) =>
      supabase.from('orthodontic_cases').update({ position }).eq('id', id)
    );
    await Promise.all(promises);
  },

  // ==================== Sessions ====================

  async getSessions(caseId: string): Promise<OrthodonticSession[]> {
    const { data, error } = await supabase
      .from('orthodontic_sessions')
      .select('*')
      .eq('case_id', caseId)
      .order('appointment_date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async createSession(data: SessionInsert): Promise<OrthodonticSession> {
    const { data: session, error } = await supabase
      .from('orthodontic_sessions')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    if (!session) throw new Error('Falha ao criar sessão');

    // Update case: last_session_at, arch wires, aligner number
    const caseUpdates: Record<string, any> = {
      last_session_at: new Date().toISOString(),
    };
    if (data.upper_arch_wire_after) caseUpdates.upper_arch_wire = data.upper_arch_wire_after;
    if (data.lower_arch_wire_after) caseUpdates.lower_arch_wire = data.lower_arch_wire_after;
    if (data.aligner_number_after != null) caseUpdates.current_aligner_number = data.aligner_number_after;

    await supabase
      .from('orthodontic_cases')
      .update(caseUpdates)
      .eq('id', data.case_id);

    return session;
  },

  async updateSession(id: string, updates: Partial<OrthodonticSession>): Promise<OrthodonticSession> {
    const { data, error } = await supabase
      .from('orthodontic_sessions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Falha ao atualizar sessão');
    return data;
  },

  async deleteSession(id: string): Promise<void> {
    const { error } = await supabase
      .from('orthodontic_sessions')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // ==================== History ====================

  async getCaseHistory(caseId: string): Promise<CaseHistory[]> {
    const { data, error } = await supabase
      .from('orthodontic_case_history')
      .select(`
        *,
        profiles!orthodontic_case_history_changed_by_fkey(full_name)
      `)
      .eq('case_id', caseId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map((row: any) => ({
      ...row,
      changed_by_name: row.profiles?.full_name ?? null,
      profiles: undefined,
    }));
  },
};
