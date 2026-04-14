/**
 * Server-side plan/feature enforcement for Edge Functions.
 *
 * The frontend (`src/lib/planFeatures.ts`) gates UI visibility, but any logged-in
 * user can call Edge Functions directly. This helper validates that the caller's
 * clinic has an active subscription whose plan includes the required feature.
 *
 * Super admins bypass the check.
 *
 * Usage:
 *   await requirePlanFeature(supabase, { clinicId, userId, feature: "dentista_ia" });
 */

export class PlanRequiredError extends Error {
  public readonly statusCode = 403;
  public readonly feature: string;
  constructor(feature: string, message?: string) {
    super(message || `Feature '${feature}' não está disponível no seu plano.`);
    this.name = "PlanRequiredError";
    this.feature = feature;
  }
}

const PLAN_FEATURE_FALLBACK: Record<string, string[]> = {
  essencial: [
    "cadastro_pacientes", "agenda", "prontuario", "anamnese", "exames",
    "orcamentos", "plano_tratamento", "alertas", "financeiro", "estoque",
    "suporte_email",
  ],
  profissional_v2: [
    "cadastro_pacientes", "agenda", "prontuario", "anamnese", "exames",
    "orcamentos", "plano_tratamento", "alertas", "financeiro", "estoque",
    "suporte_email",
    "crm", "analytics", "assinatura_digital",
    "dentista_ia", "contabilidade_ia", "secretaria_ia", "consulta_voz",
    "central_protese", "central_ortodontia", "imposto_renda",
    "whatsapp_confirmacao", "multi_unidades", "suporte_chat",
  ],
};

interface GuardOptions {
  clinicId: string;
  userId: string;
  feature: string;
}

export async function requirePlanFeature(
  supabase: any,
  opts: GuardOptions,
): Promise<void> {
  const { clinicId, userId, feature } = opts;

  // Super admin bypass
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_super_admin")
    .eq("id", userId)
    .maybeSingle();
  if (profile?.is_super_admin) return;

  // Active subscription
  const { data: subs } = await supabase
    .from("subscriptions")
    .select("plan_id, status")
    .eq("clinic_id", clinicId)
    .in("status", ["active", "trialing"])
    .order("created_at", { ascending: false })
    .limit(1);

  const sub = subs?.[0];
  if (!sub) {
    throw new PlanRequiredError(
      feature,
      "Nenhuma assinatura ativa encontrada para esta clínica.",
    );
  }

  const { data: plan } = await supabase
    .from("subscription_plans")
    .select("slug, features")
    .eq("id", sub.plan_id)
    .maybeSingle();

  if (!plan) {
    throw new PlanRequiredError(feature, "Plano da assinatura não encontrado.");
  }

  const planFeatures: string[] = Array.isArray(plan.features) && plan.features.length > 0
    ? plan.features
    : PLAN_FEATURE_FALLBACK[plan.slug] || [];

  if (!planFeatures.includes(feature)) {
    throw new PlanRequiredError(feature);
  }
}
