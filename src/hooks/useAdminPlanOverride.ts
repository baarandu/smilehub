import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { plansService } from '@/services/admin/plans';

interface RpcResult {
    success: boolean;
    error?: string;
}

export function useActivePlans() {
    return useQuery({
        queryKey: ['admin', 'plans', 'active'],
        queryFn: plansService.getActive,
        staleTime: 5 * 60 * 1000,
    });
}

export function useSetClinicPlan() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ clinicId, planId, status = 'active' }: { clinicId: string; planId: string; status?: string }) => {
            const { data, error } = await supabase.rpc('admin_set_clinic_plan', {
                p_clinic_id: clinicId,
                p_plan_id: planId,
                p_status: status,
            });
            if (error) throw error;
            const result = data as RpcResult;
            if (!result?.success) throw new Error(result?.error || 'Falha ao definir plano');
            return result;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'user-activity'] });
        },
    });
}

export function useClearClinicPlanOverride() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ clinicId }: { clinicId: string }) => {
            const { data, error } = await supabase.rpc('admin_clear_clinic_plan_override', {
                p_clinic_id: clinicId,
            });
            if (error) throw error;
            const result = data as RpcResult;
            if (!result?.success) throw new Error(result?.error || 'Falha ao reverter override');
            return result;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'user-activity'] });
        },
    });
}
