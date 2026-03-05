import { supabase } from '@/lib/supabase';
import type {
  CrmStage,
  CrmLead,
  CrmLeadInsert,
  CrmLeadSource,
  CrmActivity,
  CrmActivityType,
  CrmTag,
  CrmLeadFilters,
} from '@/types/crm';

const LEAD_SELECT = `
  *,
  crm_stages(name, color),
  crm_lead_sources(name),
  crm_lead_tags(crm_tags(id, name, color))
`;

function mapLead(row: any): CrmLead {
  return {
    ...row,
    stage_name: row.crm_stages?.name,
    stage_color: row.crm_stages?.color,
    source_name: row.crm_lead_sources?.name,
    tags: row.crm_lead_tags?.map((lt: any) => lt.crm_tags).filter(Boolean) ?? [],
    crm_stages: undefined,
    crm_lead_sources: undefined,
    crm_lead_tags: undefined,
  };
}

export const crmService = {
  // ==================== Stages ====================

  async getStages(clinicId: string): Promise<CrmStage[]> {
    const { data, error } = await supabase
      .from('crm_stages')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('position');

    if (error) throw error;
    return data || [];
  },

  async seedDefaultStages(clinicId: string): Promise<void> {
    const { error } = await supabase.rpc('seed_crm_default_stages', { p_clinic_id: clinicId });
    if (error) throw error;
  },

  async createStage(data: { clinic_id: string; name: string; color: string; position: number }): Promise<CrmStage> {
    const { data: stage, error } = await supabase
      .from('crm_stages')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return stage;
  },

  async updateStage(id: string, updates: Partial<CrmStage>): Promise<CrmStage> {
    const { data, error } = await supabase
      .from('crm_stages')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteStage(id: string): Promise<void> {
    const { error } = await supabase.from('crm_stages').delete().eq('id', id);
    if (error) throw error;
  },

  // ==================== Lead Sources ====================

  async getSources(clinicId: string): Promise<CrmLeadSource[]> {
    const { data, error } = await supabase
      .from('crm_lead_sources')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('name');

    if (error) throw error;
    return data || [];
  },

  // ==================== Leads ====================

  async getLeads(clinicId: string, filters?: CrmLeadFilters): Promise<CrmLead[]> {
    let query = supabase
      .from('crm_leads')
      .select(LEAD_SELECT)
      .eq('clinic_id', clinicId)
      .order('position');

    if (filters?.stageId) query = query.eq('stage_id', filters.stageId);
    if (filters?.sourceId) query = query.eq('source_id', filters.sourceId);
    if (filters?.assignedTo) query = query.eq('assigned_to', filters.assignedTo);
    if (filters?.search) query = query.ilike('name', `%${filters.search}%`);

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(mapLead);
  },

  async getLead(id: string): Promise<CrmLead> {
    const { data, error } = await supabase
      .from('crm_leads')
      .select(LEAD_SELECT)
      .eq('id', id)
      .single();

    if (error) throw error;
    return mapLead(data);
  },

  async createLead(lead: CrmLeadInsert): Promise<CrmLead> {
    const { data, error } = await supabase
      .from('crm_leads')
      .insert(lead)
      .select(LEAD_SELECT)
      .single();

    if (error) throw error;
    return mapLead(data);
  },

  async updateLead(id: string, updates: Partial<CrmLead>): Promise<CrmLead> {
    const { data, error } = await supabase
      .from('crm_leads')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(LEAD_SELECT)
      .single();

    if (error) throw error;
    return mapLead(data);
  },

  async moveLead(id: string, stageId: string, position: number): Promise<void> {
    const { error } = await supabase
      .from('crm_leads')
      .update({ stage_id: stageId, position, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  },

  async deleteLead(id: string): Promise<void> {
    const { error } = await supabase.from('crm_leads').delete().eq('id', id);
    if (error) throw error;
  },

  // ==================== Activities ====================

  async getActivities(leadId: string): Promise<CrmActivity[]> {
    const { data, error } = await supabase
      .from('crm_activities')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async createActivity(activity: {
    clinic_id: string;
    lead_id: string;
    type: CrmActivityType;
    title: string;
    description?: string;
    metadata?: Record<string, any>;
    created_by?: string;
  }): Promise<CrmActivity> {
    const { data, error } = await supabase
      .from('crm_activities')
      .insert(activity)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // ==================== Tags ====================

  async getTags(clinicId: string): Promise<CrmTag[]> {
    const { data, error } = await supabase
      .from('crm_tags')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('name');

    if (error) throw error;
    return data || [];
  },

  async createTag(data: { clinic_id: string; name: string; color: string }): Promise<CrmTag> {
    const { data: tag, error } = await supabase
      .from('crm_tags')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return tag;
  },

  async addTagToLead(leadId: string, tagId: string): Promise<void> {
    const { error } = await supabase
      .from('crm_lead_tags')
      .insert({ lead_id: leadId, tag_id: tagId });

    if (error && !error.message.includes('duplicate')) throw error;
  },

  async removeTagFromLead(leadId: string, tagId: string): Promise<void> {
    const { error } = await supabase
      .from('crm_lead_tags')
      .delete()
      .eq('lead_id', leadId)
      .eq('tag_id', tagId);

    if (error) throw error;
  },
};
