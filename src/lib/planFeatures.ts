/**
 * Check if a plan's feature list includes a given feature key.
 * Features are stored explicitly per plan in subscription_plans.features.
 */
export function planHasFeature(planFeatures: string[] | null | undefined, feature: string): boolean {
  if (!planFeatures || !Array.isArray(planFeatures)) return false;
  return planFeatures.includes(feature);
}

// Plan hierarchy — 2 plans only
const PLAN_HIERARCHY = ['essencial', 'profissional_v2'] as const;

const PLAN_FEATURES: Record<string, string[]> = {
  essencial: [
    'agenda', 'prontuario', 'anamnese', 'orcamentos', 'alertas',
    'financeiro', 'estoque', 'suporte_email',
  ],
  profissional_v2: [
    'estoque_importacao', 'assinatura_digital',
    'dentista_ia', 'contabilidade_ia',
    'comissoes', 'central_protese', 'imposto_renda',
    'whatsapp_confirmacao', 'multi_unidades', 'relatorios_avancados',
    'suporte_chat',
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
