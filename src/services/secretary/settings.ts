// Settings CRUD for AI Secretary

import { supabase } from '@/lib/supabase';
import type { AISecretarySettings, AISecretaryStats } from './types';
import { DEFAULT_SETTINGS } from './constants';
import { logger } from '@/utils/logger';

// Get settings for current clinic - returns null if table doesn't exist or no data
export async function getSecretarySettings(clinicId: string): Promise<AISecretarySettings | null> {
    try {
        const { data, error } = await supabase
            .from('ai_secretary_settings')
            .select('*')
            .eq('clinic_id', clinicId)
            .single();

        if (error) {
            // PGRST116 = no rows, 42P01 = table doesn't exist
            if (error.code === 'PGRST116' || error.code === '42P01' || error.message?.includes('does not exist')) {
                return null;
            }
            logger.warn('Error fetching secretary settings:', error);
            return null;
        }

        return data as unknown as AISecretarySettings;
    } catch (error) {
        logger.warn('Error in getSecretarySettings:', error);
        return null;
    }
}

// Create or update settings
export async function saveSecretarySettings(
    clinicId: string,
    settings: Partial<AISecretarySettings>
): Promise<AISecretarySettings | null> {
    try {
        const existing = await getSecretarySettings(clinicId);

        if (existing) {
            const { data, error } = await (supabase
                .from('ai_secretary_settings') as any)
                .update(settings)
                .eq('clinic_id', clinicId)
                .select()
                .single();

            if (error) throw error;
            return data as AISecretarySettings;
        } else {
            const { data, error } = await (supabase
                .from('ai_secretary_settings') as any)
                .insert({
                    clinic_id: clinicId,
                    ...DEFAULT_SETTINGS,
                    ...settings,
                })
                .select()
                .single();

            if (error) throw error;
            return data as AISecretarySettings;
        }
    } catch (error) {
        logger.error('Error saving secretary settings:', error);
        return null;
    }
}

// Update a single field
export async function updateSecretarySetting(
    clinicId: string,
    field: keyof AISecretarySettings,
    value: any
): Promise<boolean> {
    try {
        const existing = await getSecretarySettings(clinicId);

        if (!existing) {
            await saveSecretarySettings(clinicId, { [field]: value } as Partial<AISecretarySettings>);
            return true;
        }

        const { error } = await (supabase
            .from('ai_secretary_settings') as any)
            .update({ [field]: value })
            .eq('clinic_id', clinicId);

        if (error) throw error;
        return true;
    } catch (error) {
        logger.error(`Error updating ${field}:`, error);
        return false;
    }
}

// Stats (for current month) - returns zeros if table doesn't exist
export async function getSecretaryStats(clinicId: string): Promise<AISecretaryStats> {
    const defaultStats = {
        total_conversations: 0,
        total_appointments_created: 0,
        transferred_conversations: 0,
    };

    try {
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

        // Make each call individually to handle table not existing
        let totalConversations = 0;
        let appointmentsCreated = 0;
        let transferred = 0;

        try {
            const result = await supabase
                .from('ai_secretary_conversations')
                .select('*', { count: 'exact', head: true })
                .eq('clinic_id', clinicId)
                .gte('started_at', firstDayOfMonth)
                .lte('started_at', lastDayOfMonth);
            totalConversations = result.count || 0;
        } catch (e) {
            logger.warn('ai_secretary_conversations table may not exist');
        }

        try {
            const result = await supabase
                .from('ai_secretary_conversations')
                .select('*', { count: 'exact', head: true })
                .eq('clinic_id', clinicId)
                .eq('appointment_created', true)
                .gte('started_at', firstDayOfMonth)
                .lte('started_at', lastDayOfMonth);
            appointmentsCreated = result.count || 0;
        } catch (e) {
            // ignore
        }

        try {
            const result = await supabase
                .from('ai_secretary_conversations')
                .select('*', { count: 'exact', head: true })
                .eq('clinic_id', clinicId)
                .eq('status', 'transferred')
                .gte('started_at', firstDayOfMonth)
                .lte('started_at', lastDayOfMonth);
            transferred = result.count || 0;
        } catch (e) {
            // ignore
        }

        return {
            total_conversations: totalConversations,
            total_appointments_created: appointmentsCreated,
            transferred_conversations: transferred,
        };
    } catch (error) {
        logger.error('Error fetching stats:', error);
        return defaultStats;
    }
}

// Function to generate behavior prompt from structured fields
export function generateBehaviorPrompt(settings: Partial<AISecretarySettings>): string {
    const name = settings.secretary_name || 'assistente virtual';
    const clinicName = settings.clinic_name || 'nossa clínica';
    const specialty = settings.clinic_specialty || 'odontológica';

    // Tone description
    let toneDesc = '';
    switch (settings.personality_tone) {
        case 'friendly':
            toneDesc = `Seja simpática, acolhedora e descontraída. Use linguagem informal e próxima, como se estivesse conversando com um amigo. Demonstre entusiasmo ao ajudar.`;
            break;
        case 'formal':
            toneDesc = `Seja formal, respeitosa e cortês. Use linguagem culta e tratamento formal (senhor/senhora). Mantenha um tom sério e profissional em todas as interações.`;
            break;
        case 'professional':
        default:
            toneDesc = `Seja profissional, cordial e objetiva. Use linguagem clara e educada, mantendo equilíbrio entre proximidade e profissionalismo.`;
            break;
    }

    // Emoji instruction
    let emojiInst = '';
    switch (settings.use_emojis) {
        case 'yes':
            emojiInst = `Use emojis com frequência para tornar a conversa mais expressiva e acolhedora (😊, ✅, 📅, 🦷, etc).`;
            break;
        case 'no':
            emojiInst = `NÃO use emojis nas mensagens. Mantenha o texto limpo e profissional.`;
            break;
        case 'moderate':
        default:
            emojiInst = `Use emojis com moderação, apenas para confirmar ações importantes (✅) ou em saudações (😊).`;
            break;
    }

    // Parse procedures
    let proceduresSection = '';
    if (settings.procedures_list) {
        try {
            const procedures = JSON.parse(settings.procedures_list);
            if (procedures.length > 0) {
                proceduresSection = `\n\nPROCEDIMENTOS E VALORES:\n${procedures.map((p: any) => `- ${p.name}: R$ ${p.price}`).join('\n')}`;
            }
        } catch {
            if (settings.procedures_list.trim()) {
                proceduresSection = `\n\nPROCEDIMENTOS E VALORES:\n${settings.procedures_list}`;
            }
        }
    }

    // Payment methods
    let paymentSection = '';
    if (settings.payment_methods && settings.payment_methods.length > 0) {
        paymentSection = `\n\nFORMAS DE PAGAMENTO: ${settings.payment_methods.join(', ')}`;
    }

    // Insurance
    let insuranceSection = '';
    if (settings.accepted_insurance && settings.accepted_insurance.length > 0) {
        insuranceSection = `\n\nCONVÊNIOS ACEITOS: ${settings.accepted_insurance.join(', ')}`;
    }

    // Special rules
    let rulesSection = '';
    if (settings.special_rules && settings.special_rules.trim()) {
        rulesSection = `\n\nREGRAS ESPECIAIS:\n${settings.special_rules}`;
    }

    // Additional info
    let additionalSection = '';
    if (settings.additional_info && settings.additional_info.trim()) {
        additionalSection = `\n\nINFORMAÇÕES ADICIONAIS:\n${settings.additional_info}`;
    }

    // Contact info
    let contactSection = '';
    const contacts = [];
    if (settings.clinic_phone) contacts.push(`Telefone: ${settings.clinic_phone}`);
    if (settings.clinic_address) contacts.push(`Endereço: ${settings.clinic_address}`);
    if (settings.clinic_email) contacts.push(`Email: ${settings.clinic_email}`);
    if (settings.clinic_website) contacts.push(`Site: ${settings.clinic_website}`);
    if (contacts.length > 0) {
        contactSection = `\n\nCONTATO DA CLÍNICA:\n${contacts.join('\n')}`;
    }

    return `Você é ${name}, secretária virtual da ${clinicName}, uma clínica ${specialty}.

PERSONALIDADE E TOM:
${toneDesc}
${emojiInst}

SUAS FUNÇÕES:
- Agendar consultas verificando disponibilidade na agenda
- Responder dúvidas sobre procedimentos e valores
- Confirmar e remarcar consultas existentes
- Fornecer informações sobre a clínica
- Enviar lembretes de consultas

DIRETRIZES IMPORTANTES:
- Sempre confirme nome, data e horário antes de finalizar um agendamento
- Se não souber responder algo, ofereça transferir para um atendente humano
- NUNCA invente informações sobre preços ou procedimentos não listados
- Seja breve e objetiva nas respostas
- Ao agendar, sempre pergunte se é a primeira consulta do paciente${proceduresSection}${paymentSection}${insuranceSection}${contactSection}${rulesSection}${additionalSection}`;
}
