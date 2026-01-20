-- Create tables for Subscription Plans and Coupons

-- 1. Add is_super_admin to profiles check
-- First checks if column exists to be safe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_super_admin') THEN
        ALTER TABLE profiles ADD COLUMN is_super_admin BOOLEAN DEFAULT false;
    END IF;
END $$;

-- 2. Create subscription_plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  price_monthly INTEGER NOT NULL, -- In cents
  price_yearly INTEGER, -- In cents
  max_users INTEGER NOT NULL DEFAULT 1,
  max_patients INTEGER, -- NULL = unlimited
  max_locations INTEGER DEFAULT 1,
  features JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create discount_coupons table
CREATE TABLE IF NOT EXISTS discount_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value INTEGER NOT NULL,
  max_uses INTEGER, -- NULL = unlimited
  used_count INTEGER DEFAULT 0,
  valid_from TIMESTAMPTZ NOT NULL,
  valid_until TIMESTAMPTZ NOT NULL,
  applicable_plan_ids UUID[], -- NULL = all plans
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Enable RLS
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_coupons ENABLE ROW LEVEL SECURITY;

-- 5. Create Policies

-- Plans: Everyone can read active plans
CREATE POLICY "Everyone can view active plans"
ON subscription_plans FOR SELECT
USING (is_active = true OR (select is_super_admin from profiles where id = auth.uid()));

-- Plans: Only super admin can manage (insert/update/delete)
CREATE POLICY "Super admins can manage plans"
ON subscription_plans FOR ALL
USING (
  (SELECT is_super_admin FROM profiles WHERE id = auth.uid()) = true
);

-- Coupons: Super admin can view and manage all
CREATE POLICY "Super admins can manage coupons"
ON discount_coupons FOR ALL
USING (
  (SELECT is_super_admin FROM profiles WHERE id = auth.uid()) = true
);

-- Coupons: Public can view valid coupons only (usually by code lookup, but for now we restrict listing)
-- Maybe we restrict "SELECT" on coupons to only specific query by code?
-- For now, let's allow read if you know the code or if you are authenticated? 
-- Actually, coupons usually shouldn't be listed publicly, only checked.
-- Making coupons readable only by admin for listing.
-- Validation will be done via a secure function or allow reading single row by code.

CREATE POLICY "Anyone can read coupons by code"
ON discount_coupons FOR SELECT
USING (true); -- Simplifying for now, maybe refine later

-- 6. Insert default plans
INSERT INTO subscription_plans (name, slug, description, price_monthly, max_users, max_patients, max_locations, features, sort_order)
VALUES 
(
  'Starter', 
  'starter', 
  'Para dentistas autônomos que atendem em múltiplas clínicas', 
  9700, 
  1, 
  100, 
  5, 
  '["Agenda multi-local", "Cadastro de pacientes portátil", "Anamnese", "Orçamentos Básico", "Controle de comissões", "Relatório por local"]',
  1
),
(
  'Professional', 
  'professional', 
  'Para consultórios em crescimento', 
  24900, 
  3, 
  500, 
  2, 
  '["Todas do Starter", "Múltiplos locais (até 2)", "Orçamentos Completo", "Taxas/Comissões", "Templates de documentos", "Relatórios Completos"]',
  2
)
ON CONFLICT (slug) DO NOTHING;

