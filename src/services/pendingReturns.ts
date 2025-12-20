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
 * 1. Status = 'pending'
 * 2. Status = 'in_progress' AND updated_at > 30 days ago (auto-marked as pending)
 */
export async function getPendingReturns(): Promise<PendingReturn[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString();

    // First, auto-update in_progress procedures older than 30 days to pending
    await supabase
        .from('procedures')
        .update({ status: 'pending' })
        .eq('status', 'in_progress')
        .lt('updated_at', thirtyDaysAgoStr);

    // Now fetch all pending procedures
    const { data, error } = await supabase
        .from('procedures')
        .select(`
      *,
      patients:patient_id (id, name, phone)
    `)
        .eq('status', 'pending')
        .order('updated_at', { ascending: true });

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
        },
        patient: item.patients,
        daysSinceUpdate: Math.floor(
            (Date.now() - new Date(item.updated_at).getTime()) / (1000 * 60 * 60 * 24)
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
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString();

    // Count pending + in_progress older than 30 days
    const { count, error } = await supabase
        .from('procedures')
        .select('*', { count: 'exact', head: true })
        .or(`status.eq.pending,and(status.eq.in_progress,updated_at.lt.${thirtyDaysAgoStr})`);

    if (error) {
        console.error('Error counting pending returns:', error);
        return 0;
    }

    return count || 0;
}
