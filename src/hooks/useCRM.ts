import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useClinic } from '@/contexts/ClinicContext';
import { crmService } from '@/services/crm';
import { crmMetricsService } from '@/services/crmMetrics';
import type { CrmLeadInsert, CrmLeadFilters, CrmActivityType } from '@/types/crm';
import { supabase } from '@/lib/supabase';

const KEYS = {
  stages: (clinicId: string) => ['crm-stages', clinicId] as const,
  leads: (clinicId: string) => ['crm-leads', clinicId] as const,
  lead: (id: string) => ['crm-lead', id] as const,
  sources: (clinicId: string) => ['crm-sources', clinicId] as const,
  tags: (clinicId: string) => ['crm-tags', clinicId] as const,
  activities: (leadId: string) => ['crm-activities', leadId] as const,
};

export function useCrmStages() {
  const { clinicId } = useClinic();
  return useQuery({
    queryKey: KEYS.stages(clinicId!),
    queryFn: async () => {
      // Seed defaults on first access
      await crmService.seedDefaultStages(clinicId!);
      return crmService.getStages(clinicId!);
    },
    enabled: !!clinicId,
  });
}

export function useCrmLeads(filters?: CrmLeadFilters) {
  const { clinicId } = useClinic();
  return useQuery({
    queryKey: [...KEYS.leads(clinicId!), filters],
    queryFn: () => crmService.getLeads(clinicId!, filters),
    enabled: !!clinicId,
  });
}

export function useCrmSources() {
  const { clinicId } = useClinic();
  const { data: stages } = useCrmStages(); // ensure seed ran first
  return useQuery({
    queryKey: KEYS.sources(clinicId!),
    queryFn: () => crmService.getSources(clinicId!),
    enabled: !!clinicId && !!stages,
  });
}

export function useCrmTags() {
  const { clinicId } = useClinic();
  const { data: stages } = useCrmStages(); // ensure seed ran first
  return useQuery({
    queryKey: KEYS.tags(clinicId!),
    queryFn: () => crmService.getTags(clinicId!),
    enabled: !!clinicId && !!stages,
  });
}

export function useCrmActivities(leadId: string | null) {
  return useQuery({
    queryKey: KEYS.activities(leadId!),
    queryFn: () => crmService.getActivities(leadId!),
    enabled: !!leadId,
  });
}

export function useCreateLead() {
  const qc = useQueryClient();
  const { clinicId } = useClinic();

  return useMutation({
    mutationFn: (lead: CrmLeadInsert) => crmService.createLead(lead),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.leads(clinicId!) });
    },
  });
}

export function useUpdateLead() {
  const qc = useQueryClient();
  const { clinicId } = useClinic();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<CrmLeadInsert> }) =>
      crmService.updateLead(id, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.leads(clinicId!) });
    },
  });
}

export function useMoveLead() {
  const qc = useQueryClient();
  const { clinicId } = useClinic();

  return useMutation({
    mutationFn: async ({ id, stageId, position, oldStageId }: { id: string; stageId: string; position: number; oldStageId?: string }) => {
      await crmService.moveLead(id, stageId, position);
      // Log stage change activity
      if (oldStageId && oldStageId !== stageId) {
        const { data: { user } } = await supabase.auth.getUser();
        await crmService.createActivity({
          clinic_id: clinicId!,
          lead_id: id,
          type: 'stage_change',
          title: 'Etapa alterada',
          metadata: { from_stage_id: oldStageId, to_stage_id: stageId },
          created_by: user?.id,
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.leads(clinicId!) });
    },
  });
}

export function useDeleteLead() {
  const qc = useQueryClient();
  const { clinicId } = useClinic();

  return useMutation({
    mutationFn: (id: string) => crmService.deleteLead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.leads(clinicId!) });
    },
  });
}

export function useCreateActivity() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (activity: {
      clinic_id: string;
      lead_id: string;
      type: CrmActivityType;
      title: string;
      description?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      return crmService.createActivity({ ...activity, created_by: user?.id });
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: KEYS.activities(vars.lead_id) });
    },
  });
}

export function useCreateTag() {
  const qc = useQueryClient();
  const { clinicId } = useClinic();

  return useMutation({
    mutationFn: (tag: { name: string; color: string }) =>
      crmService.createTag({ clinic_id: clinicId!, ...tag }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.tags(clinicId!) });
    },
  });
}

export function useCrmOpportunities(period?: import('@/services/crmMetrics').CrmMetricsPeriod) {
  const { clinicId } = useClinic();
  return useQuery({
    queryKey: ['crm-opportunities', clinicId, period?.start, period?.end],
    queryFn: () => crmMetricsService.getOpportunityCards(clinicId!, period),
    enabled: !!clinicId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCrmFunnel(period?: import('@/services/crmMetrics').CrmMetricsPeriod) {
  const { clinicId } = useClinic();
  return useQuery({
    queryKey: ['crm-funnel', clinicId, period?.start, period?.end],
    queryFn: () => crmMetricsService.getFunnelData(clinicId!, period),
    enabled: !!clinicId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useToggleLeadTag() {
  const qc = useQueryClient();
  const { clinicId } = useClinic();

  return useMutation({
    mutationFn: async ({ leadId, tagId, remove }: { leadId: string; tagId: string; remove?: boolean }) => {
      if (remove) {
        await crmService.removeTagFromLead(leadId, tagId);
      } else {
        await crmService.addTagToLead(leadId, tagId);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.leads(clinicId!) });
    },
  });
}
