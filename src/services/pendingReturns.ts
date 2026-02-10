import { supabase } from '@/lib/supabase';
import type { Procedure, Patient } from '@/types/database';

export interface PendingReturn {
    procedure: Procedure;
    patient: Pick<Patient, 'id' | 'name' | 'phone'>;
    daysSinceUpdate: number;
}

/**
 * Get procedures with pending returns
 * Returns procedures that are:
 * - Status = 'pending' OR 'in_progress' AND procedure date > 30 days ago
 * These are patients who have stale procedures (not completed and scheduled long ago)
 */
export async function getPendingReturns(): Promise<PendingReturn[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0]; // Just the date part (YYYY-MM-DD)

    // Fetch pending or in_progress procedures with date older than 30 days
    const { data, error } = await supabase
        .from('procedures')
        .select(`
      *,
      patients:patient_id (id, name, phone)
    `)
        .in('status', ['pending', 'in_progress'])
        .lt('date', thirtyDaysAgoStr)
        .order('date', { ascending: true });

    if (error) {
        console.error('Error fetching pending returns:', error);
        throw error;
    }

    return (data || []).map((item: any) => ({
        procedure: {
            id: item.id,
            patient_id: item.patient_id,
            date: item.date,
            description: item.description,
            value: item.value,
            payment_method: item.payment_method,
            installments: item.installments,
            location: item.location,
            status: item.status,
            created_at: item.created_at,
            updated_at: item.updated_at,
            clinic_id: item.clinic_id,
            created_by: item.created_by,
        },
        patient: item.patients,
        daysSinceUpdate: Math.floor(
            (Date.now() - new Date(item.date).getTime()) / (1000 * 60 * 60 * 24)
        ),
    }));
}

/**
 * Mark a procedure as completed (removes from pending)
 */
export async function markProcedureCompleted(procedureId: string): Promise<void> {
    const { error } = await supabase
        .from('procedures')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', procedureId);

    if (error) {
        console.error('Error marking procedure as completed:', error);
        throw error;
    }
}

/**
 * Get count of pending returns
 */
export async function getPendingReturnsCount(): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0]; // Just the date part (YYYY-MM-DD)

    // Count pending or in_progress procedures with date older than 30 days
    const { count, error } = await supabase
        .from('procedures')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'in_progress'])
        .lt('date', thirtyDaysAgoStr);

    if (error) {
        console.error('Error counting pending returns:', error);
        return 0;
    }

    return count || 0;
}
