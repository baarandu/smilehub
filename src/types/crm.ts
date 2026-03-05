export interface CrmStage {
  id: string;
  clinic_id: string;
  name: string;
  color: string;
  position: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface CrmLeadSource {
  id: string;
  clinic_id: string;
  name: string;
  icon: string | null;
  created_at: string;
}

export interface CrmLead {
  id: string;
  clinic_id: string;
  stage_id: string;
  source_id: string | null;
  patient_id: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  next_action: string | null;
  next_action_date: string | null;
  assigned_to: string | null;
  lost_reason: string | null;
  position: number;
  created_at: string;
  updated_at: string;
  // Joined fields
  source_name?: string;
  stage_name?: string;
  stage_color?: string;
  assigned_name?: string;
  tags?: CrmTag[];
}

export interface CrmLeadInsert {
  clinic_id: string;
  stage_id: string;
  source_id?: string | null;
  patient_id?: string | null;
  name: string;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  next_action?: string | null;
  next_action_date?: string | null;
  assigned_to?: string | null;
}

export type CrmActivityType = 'note' | 'call' | 'whatsapp' | 'email' | 'meeting' | 'stage_change' | 'task';

export interface CrmActivity {
  id: string;
  clinic_id: string;
  lead_id: string;
  type: CrmActivityType;
  title: string;
  description: string | null;
  metadata: Record<string, any> | null;
  created_by: string | null;
  created_at: string;
  // Joined
  created_by_name?: string;
}

export interface CrmTag {
  id: string;
  clinic_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface CrmLeadFilters {
  search?: string;
  stageId?: string;
  sourceId?: string;
  assignedTo?: string;
  hasNextAction?: boolean;
}
