import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';
import { getClinicContextSafe } from './clinicContext';

export type AuditLog = Database['public']['Tables']['audit_logs']['Row'];
export type AuditLogInsert = Database['public']['Tables']['audit_logs']['Insert'];

export const auditService = {
    async log(action: string, tableName: string, recordId?: string, details?: any) {
        try {
            const ctx = await getClinicContextSafe();
            if (!ctx) return;

            await supabase.from('audit_logs').insert({
                clinic_id: ctx.clinicId,
                user_id: ctx.userId,
                action,
                table_name: tableName,
                record_id: recordId,
                new_data: details || {}
            });
        } catch (error) {
            console.error('Failed to log action:', error);
            // Non-blocking error
        }
    },

    async getLogs(clinicId: string, limit = 50) {
        // 1. Fetch raw logs
        const { data: logs, error: logsError } = await supabase
            .from('audit_logs')
            .select('*')
            .eq('clinic_id', clinicId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (logsError) throw logsError;
        if (!logs || logs.length === 0) return [];

        const logsData = logs;

        // 2. Extract unique user IDs
        const userIds = [...new Set(logsData.map(log => log.user_id).filter(id => id !== null))];

        // 3. Fetch profiles for these users
        let profilesMap: Record<string, { full_name: string | null, email: string | null }> = {};

        if (userIds.length > 0) {
            const { data: profiles, error: profilesError } = await supabase
                .rpc('get_profiles_for_users', { user_ids: userIds });

            if (!profilesError && profiles) {
                profilesMap = (profiles || []).reduce((acc: Record<string, any>, profile: any) => {
                    acc[profile.id] = { full_name: profile.full_name, email: profile.email };
                    return acc;
                }, {} as Record<string, any>);
            }
        }

        // 4. Map profiles back to logs
        return logsData.map(log => ({
            ...log,
            profiles: log.user_id && profilesMap[log.user_id] ? profilesMap[log.user_id] : null
        })) as (AuditLog & { profiles: { full_name: string | null, email: string | null } | null })[];
    }
};
