-- CRM Tables for Lead/Patient Pipeline Management
-- Phase 1: Stages, Leads, Activities, Tags

-- ============================================================
-- 1. Pipeline Stages (customizable per clinic)
-- ============================================================
CREATE TABLE IF NOT EXISTS crm_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  position INTEGER NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_crm_stages_clinic ON crm_stages(clinic_id);

ALTER TABLE crm_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY crm_stages_select ON crm_stages FOR SELECT
  USING (clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()));
CREATE POLICY crm_stages_insert ON crm_stages FOR INSERT
  WITH CHECK (clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()));
CREATE POLICY crm_stages_update ON crm_stages FOR UPDATE
  USING (clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()));
CREATE POLICY crm_stages_delete ON crm_stages FOR DELETE
  USING (clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()));

-- ============================================================
-- 2. Lead Sources
-- ============================================================
CREATE TABLE IF NOT EXISTS crm_lead_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_crm_lead_sources_clinic ON crm_lead_sources(clinic_id);

ALTER TABLE crm_lead_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY crm_lead_sources_select ON crm_lead_sources FOR SELECT
  USING (clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()));
CREATE POLICY crm_lead_sources_insert ON crm_lead_sources FOR INSERT
  WITH CHECK (clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()));
CREATE POLICY crm_lead_sources_update ON crm_lead_sources FOR UPDATE
  USING (clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()));
CREATE POLICY crm_lead_sources_delete ON crm_lead_sources FOR DELETE
  USING (clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()));

-- ============================================================
-- 3. Leads
-- ============================================================
CREATE TABLE IF NOT EXISTS crm_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  stage_id UUID NOT NULL REFERENCES crm_stages(id),
  source_id UUID REFERENCES crm_lead_sources(id),
  patient_id UUID REFERENCES patients(id),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  notes TEXT,
  next_action TEXT,
  next_action_date DATE,
  assigned_to UUID REFERENCES auth.users(id),
  lost_reason TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_crm_leads_clinic ON crm_leads(clinic_id);
CREATE INDEX idx_crm_leads_stage ON crm_leads(stage_id);
CREATE INDEX idx_crm_leads_patient ON crm_leads(patient_id);
CREATE INDEX idx_crm_leads_assigned ON crm_leads(assigned_to);

ALTER TABLE crm_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY crm_leads_select ON crm_leads FOR SELECT
  USING (clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()));
CREATE POLICY crm_leads_insert ON crm_leads FOR INSERT
  WITH CHECK (clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()));
CREATE POLICY crm_leads_update ON crm_leads FOR UPDATE
  USING (clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()));
CREATE POLICY crm_leads_delete ON crm_leads FOR DELETE
  USING (clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()));

-- ============================================================
-- 4. Activities (timeline)
-- ============================================================
CREATE TABLE IF NOT EXISTS crm_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('note', 'call', 'whatsapp', 'email', 'meeting', 'stage_change', 'task')),
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_crm_activities_lead ON crm_activities(lead_id);
CREATE INDEX idx_crm_activities_clinic ON crm_activities(clinic_id);

ALTER TABLE crm_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY crm_activities_select ON crm_activities FOR SELECT
  USING (clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()));
CREATE POLICY crm_activities_insert ON crm_activities FOR INSERT
  WITH CHECK (clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()));

-- ============================================================
-- 5. Tags
-- ============================================================
CREATE TABLE IF NOT EXISTS crm_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(clinic_id, name)
);

CREATE INDEX idx_crm_tags_clinic ON crm_tags(clinic_id);

ALTER TABLE crm_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY crm_tags_select ON crm_tags FOR SELECT
  USING (clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()));
CREATE POLICY crm_tags_insert ON crm_tags FOR INSERT
  WITH CHECK (clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()));
CREATE POLICY crm_tags_delete ON crm_tags FOR DELETE
  USING (clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()));

-- ============================================================
-- 6. Lead-Tag junction
-- ============================================================
CREATE TABLE IF NOT EXISTS crm_lead_tags (
  lead_id UUID NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES crm_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (lead_id, tag_id)
);

ALTER TABLE crm_lead_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY crm_lead_tags_select ON crm_lead_tags FOR SELECT
  USING (lead_id IN (SELECT id FROM crm_leads WHERE clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid())));
CREATE POLICY crm_lead_tags_insert ON crm_lead_tags FOR INSERT
  WITH CHECK (lead_id IN (SELECT id FROM crm_leads WHERE clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid())));
CREATE POLICY crm_lead_tags_delete ON crm_lead_tags FOR DELETE
  USING (lead_id IN (SELECT id FROM crm_leads WHERE clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid())));

-- ============================================================
-- 7. Automations (schema only, execution in Phase 4)
-- ============================================================
CREATE TABLE IF NOT EXISTS crm_automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('stage_change', 'days_without_action', 'lead_created')),
  trigger_config JSONB NOT NULL DEFAULT '{}',
  action_type TEXT NOT NULL CHECK (action_type IN ('send_whatsapp', 'create_task', 'move_stage', 'notify_team')),
  action_config JSONB NOT NULL DEFAULT '{}',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE crm_automations ENABLE ROW LEVEL SECURITY;

CREATE POLICY crm_automations_select ON crm_automations FOR SELECT
  USING (clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()));
CREATE POLICY crm_automations_insert ON crm_automations FOR INSERT
  WITH CHECK (clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()));
CREATE POLICY crm_automations_update ON crm_automations FOR UPDATE
  USING (clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()));

-- ============================================================
-- 8. Seed default stages function (called on first CRM access)
-- ============================================================
CREATE OR REPLACE FUNCTION seed_crm_default_stages(p_clinic_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only seed if clinic has no stages yet
  IF EXISTS (SELECT 1 FROM crm_stages WHERE clinic_id = p_clinic_id) THEN
    RETURN;
  END IF;

  INSERT INTO crm_stages (clinic_id, name, color, position, is_default) VALUES
    (p_clinic_id, 'Novo Lead', '#3b82f6', 0, true),
    (p_clinic_id, 'Contato Feito', '#f59e0b', 1, false),
    (p_clinic_id, 'Agendou', '#8b5cf6', 2, false),
    (p_clinic_id, 'Em Tratamento', '#10b981', 3, false),
    (p_clinic_id, 'Fidelizado', '#06b6d4', 4, false),
    (p_clinic_id, 'Perdido', '#ef4444', 5, false);

  -- Seed default sources
  INSERT INTO crm_lead_sources (clinic_id, name, icon) VALUES
    (p_clinic_id, 'Instagram', 'instagram'),
    (p_clinic_id, 'Google', 'search'),
    (p_clinic_id, 'Indicação', 'users'),
    (p_clinic_id, 'WhatsApp', 'message-circle'),
    (p_clinic_id, 'Presencial', 'map-pin'),
    (p_clinic_id, 'Outro', 'help-circle');
END;
$$;
