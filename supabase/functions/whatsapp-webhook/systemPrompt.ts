/**
 * WhatsApp Webhook - System Prompt Builder
 * Uses the RPC generate_ai_secretary_prompt() which already builds
 * the complete prompt with clinic info, professionals, procedures, SOPs.
 * We add WhatsApp-specific rules and replace placeholders.
 */

const WHATSAPP_RULES = `

## REGRAS PARA WHATSAPP

1. **Formatação**: NÃO use Markdown (sem **, ##, [], etc). Use texto simples.
2. **Comprimento**: Respostas curtas e diretas. Máximo 3-4 parágrafos curtos.
3. **Listas**: Use números (1, 2, 3) ou hífens simples ao invés de bullets markdown.
4. **Negrito/Itálico**: Use *texto* para negrito no WhatsApp (apenas quando necessário).
5. **Links**: Envie URLs simples, sem formatação markdown.
6. **Parágrafos**: Separe blocos de informação com uma linha em branco.
7. **Horários**: Sempre use formato HH:MM (ex: 14:30).
8. **Datas**: Use formato DD/MM (ex: 25/02) e mencione o dia da semana.
9. **Confirmação**: Sempre confirme os dados antes de executar agendamento/cancelamento.
10. **Não mencione** que é um assistente virtual ou IA.
`;

export async function buildSystemPrompt(
  supabase: any,
  instanceName: string,
  phone: string
): Promise<string> {
  // Call the RPC that generates the complete prompt with all clinic data
  const { data: prompt, error } = await supabase.rpc(
    "generate_ai_secretary_prompt",
    { p_instance_name: instanceName }
  );

  if (error) {
    throw new Error(`Erro ao gerar prompt: ${error.message}`);
  }

  if (!prompt || prompt.startsWith("ERROR:")) {
    throw new Error(prompt || "Prompt não gerado");
  }

  // Replace dynamic placeholders
  const now = new Date();
  const dateStr = now.toLocaleDateString("pt-BR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Format phone for display: remove 55 prefix, format as (XX) XXXXX-XXXX
  const cleanPhone = phone.replace(/\D/g, "");
  const displayPhone = formatPhoneForDisplay(cleanPhone);

  let finalPrompt = prompt
    .replace("{data_atual}", dateStr)
    .replace("{telefone_paciente}", displayPhone);

  // Append WhatsApp-specific rules
  finalPrompt += WHATSAPP_RULES;

  return finalPrompt;
}

function formatPhoneForDisplay(phone: string): string {
  // Remove country code (55) if present
  let p = phone;
  if (p.startsWith("55") && p.length >= 12) {
    p = p.substring(2);
  }

  // Format as (XX) XXXXX-XXXX or (XX) XXXX-XXXX
  if (p.length === 11) {
    return `(${p.substring(0, 2)}) ${p.substring(2, 7)}-${p.substring(7)}`;
  }
  if (p.length === 10) {
    return `(${p.substring(0, 2)}) ${p.substring(2, 6)}-${p.substring(6)}`;
  }
  return p;
}
