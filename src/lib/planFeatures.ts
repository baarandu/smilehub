// Feature gating by subscription plan
// Used to control access to features in the sidebar and throughout the app

export const PLAN_HIERARCHY = ['basico', 'profissional', 'premium', 'enterprise'] as const;

type PlanSlug = (typeof PLAN_HIERARCHY)[number];

const PLAN_FEATURES: Record<PlanSlug, string[]> = {
  basico: [
    'agenda',
    'prontuario',
    'anamnese',
    'orcamentos',
    'alertas',
    'suporte_email',
  ],
  profissional: [
    'financeiro',
    'estoque',
    'imposto_renda',
    'comissoes',
    'central_protese',
    'suporte_chat',
  ],
  premium: [
    'consulta_voz',
    'dentista_ia',
    'contabilidade_ia',
    'whatsapp_confirmacao',
    'multi_unidades',
  ],
  enterprise: [
    'secretaria_ia',
    'whitelabel',
    'api',
    'relatorios_avancados',
    'suporte_telefone',
    'gerente_dedicado',
  ],
};

/**
 * Returns the index of a plan in the hierarchy (-1 if not found).
 */
function planIndex(slug: string): number {
  return PLAN_HIERARCHY.indexOf(slug.toLowerCase() as PlanSlug);
}

/**
 * Check if a plan has access to a given feature.
 * Features accumulate — higher plans inherit all lower plan features.
 */
export function planHasFeature(planSlug: string | null | undefined, feature: string): boolean {
  if (!planSlug) return false;

  const idx = planIndex(planSlug);
  if (idx === -1) return false;

  // Check all tiers up to and including the current plan
  for (let i = 0; i <= idx; i++) {
    if (PLAN_FEATURES[PLAN_HIERARCHY[i]].includes(feature)) {
      return true;
    }
  }
  return false;
}

/**
 * Check if planA is at least at the level of planB.
 */
export function planIsAtLeast(planSlug: string | null | undefined, minimumPlan: string): boolean {
  if (!planSlug) return false;
  return planIndex(planSlug) >= planIndex(minimumPlan);
}
