/**
 * Check if a plan's feature list includes a given feature key.
 * Features are now stored explicitly per plan in subscription_plans.features.
 * No more hierarchy/inheritance — each plan lists all its features.
 */
export function planHasFeature(planFeatures: string[] | null | undefined, feature: string): boolean {
  if (!planFeatures || !Array.isArray(planFeatures)) return false;
  return planFeatures.includes(feature);
}

// Plan hierarchy and features — used as fallback when plan.features is not set
const PLAN_HIERARCHY = ['basico', 'profissional', 'premium', 'enterprise'] as const;

const PLAN_FEATURES: Record<string, string[]> = {
  basico: [
    'agenda', 'prontuario', 'anamnese', 'orcamentos', 'alertas', 'suporte_email',
  ],
  profissional: [
    'financeiro', 'estoque', 'imposto_renda', 'comissoes', 'central_protese', 'suporte_chat',
  ],
  premium: [
    'consulta_voz', 'dentista_ia', 'contabilidade_ia', 'whatsapp_confirmacao', 'multi_unidades',
  ],
  enterprise: [
    'secretaria_ia', 'whitelabel', 'api', 'relatorios_avancados', 'suporte_telefone', 'gerente_dedicado',
  ],
};

/**
 * Get all feature keys for a plan slug (with inheritance from lower tiers).
 * Used as fallback when plan.features is not stored in the database.
 */
export function getFeaturesForPlan(planSlug: string | null | undefined): string[] {
  if (!planSlug) return [];
  const idx = PLAN_HIERARCHY.indexOf(planSlug.toLowerCase() as typeof PLAN_HIERARCHY[number]);
  if (idx === -1) return [];
  const features: string[] = [];
  for (let i = 0; i <= idx; i++) {
    features.push(...PLAN_FEATURES[PLAN_HIERARCHY[i]]);
  }
  return features;
}
