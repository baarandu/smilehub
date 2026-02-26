/** Human-readable labels for feature keys (pt-BR) */
export const FEATURE_LABELS: Record<string, string> = {
  agenda: 'Agenda inteligente',
  prontuario: 'Prontuário digital',
  anamnese: 'Anamnese completa',
  orcamentos: 'Orçamentos',
  alertas: 'Alertas e lembretes',
  suporte_email: 'Suporte por e-mail',
  financeiro: 'Financeiro completo',
  estoque: 'Estoque e materiais',
  imposto_renda: 'Imposto de Renda',
  comissoes: 'Comissões de dentistas',
  central_protese: 'Central de Próteses',
  suporte_chat: 'Suporte por chat',
  consulta_voz: 'Consulta por Voz (IA)',
  dentista_ia: 'Dentista IA',
  contabilidade_ia: 'Contabilidade IA',
  assinatura_digital: 'Assinatura Digital',
  whatsapp_confirmacao: 'Confirmação WhatsApp',
  multi_unidades: 'Múltiplas unidades',
  secretaria_ia: 'Secretária IA',
  whitelabel: 'White Label',
  api: 'API personalizada',
  relatorios_avancados: 'Relatórios avançados',
  suporte_telefone: 'Suporte por telefone',
  gerente_dedicado: 'Gestor dedicado',
  estoque_importacao: 'Importação de estoque',
  protese: 'Próteses',
};

/** Translate a feature key to its label, falling back to the key itself */
export function featureLabel(key: string): string {
  return FEATURE_LABELS[key] || key;
}

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
