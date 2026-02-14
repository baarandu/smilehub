-- Migration: Plan Feature Definitions
-- Creates a master table of feature definitions that maps to subscription_plans.features
-- Enables dynamic feature management from admin without code changes

-- 1. Create plan_feature_definitions table
CREATE TABLE plan_feature_definitions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'CheckCircle',
  description TEXT,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. RLS: public read, writes via service role only (admin Edge Functions)
ALTER TABLE plan_feature_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON plan_feature_definitions FOR SELECT USING (true);

-- 3. Seed all current features
INSERT INTO plan_feature_definitions (key, label, icon, sort_order) VALUES
  ('agenda',               'Agenda inteligente',        'Calendar',        1),
  ('prontuario',           'Prontuário digital',        'FileText',        2),
  ('anamnese',             'Anamnese completa',         'FileText',        3),
  ('orcamentos',           'Orçamentos',                'DollarSign',      4),
  ('alertas',              'Alertas e lembretes',       'Bell',            5),
  ('suporte_email',        'Suporte por e-mail',        'MessageCircle',   6),
  ('financeiro',           'Financeiro completo',       'DollarSign',      7),
  ('estoque',              'Estoque e materiais',       'Package',         8),
  ('imposto_renda',        'Imposto de Renda',          'FileText',        9),
  ('comissoes',            'Comissões de dentistas',    'Award',          10),
  ('central_protese',      'Central de Próteses',       'Stethoscope',    11),
  ('suporte_chat',         'Suporte por chat',          'MessageCircle',  12),
  ('consulta_voz',         'Consulta por Voz (IA)',     'Mic',            13),
  ('dentista_ia',          'Dentista IA',               'Stethoscope',    14),
  ('contabilidade_ia',     'Contabilidade IA',          'Calculator',     15),
  ('assinatura_digital',   'Assinatura Digital',        'FileSignature',  16),
  ('whatsapp_confirmacao', 'Confirmação WhatsApp',      'MessageCircle',  17),
  ('multi_unidades',       'Múltiplas unidades',        'BarChart3',      18),
  ('secretaria_ia',        'Secretária IA',             'Bot',            19),
  ('whitelabel',           'White Label',               'Sparkles',       20),
  ('api',                  'API personalizada',         'Sparkles',       21),
  ('relatorios_avancados', 'Relatórios avançados',      'BarChart3',      22),
  ('suporte_telefone',     'Suporte por telefone',      'Headphones',     23),
  ('gerente_dedicado',     'Gestor dedicado',           'UserCog',        24);

-- 4. Migrate subscription_plans.features from display names to feature keys
-- Each plan stores the COMPLETE list of features it includes (no inheritance)
UPDATE subscription_plans SET features = '["agenda","prontuario","anamnese","orcamentos","alertas","suporte_email"]'::jsonb
  WHERE slug = 'basico';

UPDATE subscription_plans SET features = '["agenda","prontuario","anamnese","orcamentos","alertas","suporte_email","financeiro","estoque","imposto_renda","comissoes","central_protese","suporte_chat"]'::jsonb
  WHERE slug = 'profissional';

UPDATE subscription_plans SET features = '["agenda","prontuario","anamnese","orcamentos","alertas","suporte_email","financeiro","estoque","imposto_renda","comissoes","central_protese","suporte_chat","consulta_voz","dentista_ia","contabilidade_ia","assinatura_digital","whatsapp_confirmacao","multi_unidades"]'::jsonb
  WHERE slug = 'premium';

UPDATE subscription_plans SET features = '["agenda","prontuario","anamnese","orcamentos","alertas","suporte_email","financeiro","estoque","imposto_renda","comissoes","central_protese","suporte_chat","consulta_voz","dentista_ia","contabilidade_ia","assinatura_digital","whatsapp_confirmacao","multi_unidades","secretaria_ia","whitelabel","api","relatorios_avancados","suporte_telefone","gerente_dedicado"]'::jsonb
  WHERE slug = 'enterprise';
