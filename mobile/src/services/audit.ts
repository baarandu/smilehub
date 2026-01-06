import { supabase } from '../lib/supabase';
import { Database } from '../types/database';

export type AuditLog = {
    id: string;
    clinic_id: string;
    user_id: string | null;
    action: string;
    entity: string;
    entity_id: string | null;
    details: any;
    created_at: string;
};

export const auditService = {
    async log(action: string, entity: string, entityId?: string, details?: any) {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Get clinic_id for the user
            const { data: clinicUser } = await supabase
                .from('clinic_users')
                .select('clinic_id')
                .eq('user_id', user.id)
                .single();

            if (!clinicUser) return;

            await supabase.from('audit_logs').insert({
                clinic_id: clinicUser.clinic_id,
                user_id: user.id,
                action,
                entity,
                entity_id: entityId,
                details: details || {}
            } as any);
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

        const logsData = logs as any[];

        // 2. Extract unique user IDs
        const userIds = [...new Set(logsData.map(log => log.user_id).filter(id => id !== null))];
        console.log('[AuditService] Found User IDs in logs:', userIds);

        // 3. Fetch profiles for these users
        let profilesMap: Record<string, { full_name: string | null, email: string | null }> = {};

        if (userIds.length > 0) {
            const { data: profiles, error: profilesError } = await supabase
                .rpc('get_profiles_for_users', { user_ids: userIds });

            console.log('[AuditService] Fetched Profiles:', profiles);
            console.log('[AuditService] Profile Error:', profilesError);

            if (!profilesError && profiles) {
                profilesMap = (profiles as any[]).reduce((acc, profile) => {
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
