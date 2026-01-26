import { supabase } from '@/lib/supabase';

// Types
export interface AISecretarySettings {
    id?: string;
    clinic_id: string;
    is_active: boolean;
    whatsapp_connected: boolean;
    whatsapp_phone_number?: string;
    whatsapp_session_id?: string;

    // Evolution API / n8n integration
    evolution_instance_name?: string;

    // Behavior
    tone: 'casual' | 'formal';
    work_hours_start: string;
    work_hours_end: string;
    work_days: {
        seg: boolean;
        ter: boolean;
        qua: boolean;
        qui: boolean;
        sex: boolean;
        sab: boolean;
        dom: boolean;
    };
    min_advance_hours: number;
    interval_minutes: number;
    allowed_procedure_ids: string[];

    // Custom messages
    greeting_message: string;
    confirmation_message: string;
    reminder_message: string;
    out_of_hours_message: string;

    // Limits
    message_limit_per_conversation: number;
    human_keywords: string[];

    // Clinic contact info (used in AI prompt)
    clinic_phone?: string;
    clinic_address?: string;
    clinic_email?: string;
    clinic_website?: string;

    // Payment info
    accepted_insurance?: string[];
    payment_methods?: string[];

    // Notifications (for human escalation)
    notification_telegram_chat_id?: string;
    notification_email?: string;

    created_at?: string;
    updated_at?: string;
}

export interface BlockedNumber {
    id?: string;
    clinic_id: string;
    phone_number: string;
    reason?: string;
    blocked_by?: string;
    blocked_at?: string;
}

// Custom Messages
export interface CustomMessage {
    id?: string;
    clinic_id: string;
    message_key: string;
    title: string;
    message: string;
    is_active: boolean;
    is_predefined: boolean;
    created_at?: string;
    updated_at?: string;
}

// Predefined message situations
export const PREDEFINED_MESSAGE_TYPES = [
    { key: 'cancellation', title: 'Cancelamento', description: 'Quando paciente cancela consulta', defaultMessage: 'Lamentamos que você precise cancelar. Deseja remarcar para outro dia?' },
    { key: 'reschedule', title: 'Reagendamento', description: 'Quando consulta é reagendada', defaultMessage: 'Sua consulta foi reagendada para {data} às {hora}. Confirmado!' },
    { key: 'no_show', title: 'Falta/No-show', description: 'Quando paciente não comparece', defaultMessage: 'Notamos sua ausência na consulta de hoje. Está tudo bem? Podemos remarcar.' },
    { key: 'birthday', title: 'Aniversário', description: 'Mensagem de aniversário', defaultMessage: 'Feliz aniversário! 🎂 A equipe da clínica deseja um dia especial!' },
    { key: 'followup', title: 'Retorno/Follow-up', description: 'Lembrete de retorno', defaultMessage: 'Olá! Está na hora do seu retorno. Que tal agendar?' },
    { key: 'welcome', title: 'Boas-vindas', description: 'Primeiro contato do paciente', defaultMessage: 'Seja bem-vindo(a)! Estamos felizes em tê-lo(a) como paciente.' },
    { key: 'payment_pending', title: 'Pagamento Pendente', description: 'Lembrete de pagamento', defaultMessage: 'Olá! Identificamos um pagamento pendente. Podemos ajudar?' },
    { key: 'post_procedure', title: 'Pós-procedimento', description: 'Cuidados após procedimento', defaultMessage: 'Como está se sentindo após o procedimento? Lembre-se dos cuidados recomendados.' },
] as const;

export interface AISecretaryStats {
    total_conversations: number;
    total_appointments_created: number;
    transferred_conversations: number;
}

// =====================================================
// Behavior Settings Types
// =====================================================

export interface AISecretaryBehavior {
    id?: string;
    clinic_id: string;

    // Module 1: Message Behavior
    send_typing_indicator: boolean;
    send_recording_indicator: boolean;
    mark_as_read: boolean;
    react_to_messages: boolean;
    reaction_on_appointment: string;
    reaction_on_cancel: string;
    reaction_on_greeting: string;
    response_cadence_enabled: boolean;
    response_delay_min_ms: number;
    response_delay_max_ms: number;
    typing_speed_cpm: number;
    wait_for_complete_message: boolean;
    wait_timeout_ms: number;

    // Module 2: Audio & TTS
    receive_audio_enabled: boolean;
    transcribe_audio: boolean;
    audio_transcription_provider: 'openai' | 'google' | 'local';
    wait_for_audio_complete: boolean;
    audio_wait_timeout_ms: number;
    respond_with_audio: boolean;
    tts_provider: 'openai' | 'elevenlabs' | 'google';
    tts_voice_id: string;
    tts_speed: number;
    audio_response_mode: 'always' | 'when_patient_sends_audio' | 'never';

    // Module 3: Payments
    send_payment_links: boolean;
    payment_provider: 'pix' | 'stripe' | 'mercadopago' | null;
    pix_enabled: boolean;
    pix_key: string | null;
    pix_key_type: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random' | null;
    pix_beneficiary_name: string | null;
    notify_payment_received: boolean;
    auto_confirm_payment: boolean;
    send_payment_reminders: boolean;
    payment_reminder_hours: number;
    payment_link_message: string;
    payment_received_message: string;
    payment_reminder_message: string;

    // Module 4: Reminders & Alerts
    send_appointment_reminders: boolean;
    reminder_times: number[];
    reminder_include_address: boolean;
    reminder_include_professional: boolean;
    reminder_ask_confirmation: boolean;
    send_cancellation_alerts: boolean;
    offer_reschedule_on_cancel: boolean;
    reminder_message_24h: string;
    reminder_message_2h: string;
    cancellation_alert_message: string;
    reschedule_offer_message: string;
    send_post_appointment_message: boolean;
    post_appointment_message: string;
    post_appointment_delay_hours: number;

    created_at?: string;
    updated_at?: string;
}

// Default behavior settings
export const DEFAULT_BEHAVIOR_SETTINGS: Omit<AISecretaryBehavior, 'id' | 'clinic_id' | 'created_at' | 'updated_at'> = {
    // Message behavior
    send_typing_indicator: true,
    send_recording_indicator: true,
    mark_as_read: true,
    react_to_messages: false,
    reaction_on_appointment: '✅',
    reaction_on_cancel: '😢',
    reaction_on_greeting: '👋',
    response_cadence_enabled: true,
    response_delay_min_ms: 1500,
    response_delay_max_ms: 4000,
    typing_speed_cpm: 300,
    wait_for_complete_message: true,
    wait_timeout_ms: 8000,

    // Audio
    receive_audio_enabled: true,
    transcribe_audio: true,
    audio_transcription_provider: 'openai',
    wait_for_audio_complete: true,
    audio_wait_timeout_ms: 30000,
    respond_with_audio: false,
    tts_provider: 'openai',
    tts_voice_id: 'shimmer',
    tts_speed: 1.0,
    audio_response_mode: 'never',

    // Payments
    send_payment_links: false,
    payment_provider: null,
    pix_enabled: false,
    pix_key: null,
    pix_key_type: null,
    pix_beneficiary_name: null,
    notify_payment_received: true,
    auto_confirm_payment: false,
    send_payment_reminders: false,
    payment_reminder_hours: 24,
    payment_link_message: 'Segue o link para pagamento da sua consulta:',
    payment_received_message: 'Pagamento recebido com sucesso! ✅',
    payment_reminder_message: 'Lembrete: você tem um pagamento pendente.',

    // Reminders
    send_appointment_reminders: true,
    reminder_times: [24, 2],
    reminder_include_address: true,
    reminder_include_professional: true,
    reminder_ask_confirmation: true,
    send_cancellation_alerts: true,
    offer_reschedule_on_cancel: true,
    reminder_message_24h: 'Olá! Lembrete: você tem consulta amanhã às {hora} com {profissional}.',
    reminder_message_2h: 'Sua consulta é em 2 horas! Endereço: {endereco}',
    cancellation_alert_message: 'Sua consulta de {data} foi cancelada.',
    reschedule_offer_message: 'Deseja remarcar para outro dia?',
    send_post_appointment_message: false,
    post_appointment_message: 'Como foi sua consulta? Sua opinião é importante para nós!',
    post_appointment_delay_hours: 2,
};

// TTS Voice options for UI
export const TTS_VOICES = {
    openai: [
        { id: 'alloy', name: 'Alloy', description: 'Neutra e equilibrada' },
        { id: 'echo', name: 'Echo', description: 'Masculina e grave' },
        { id: 'fable', name: 'Fable', description: 'Expressiva e britânica' },
        { id: 'onyx', name: 'Onyx', description: 'Profunda e autoritária' },
        { id: 'nova', name: 'Nova', description: 'Jovem e energética' },
        { id: 'shimmer', name: 'Shimmer', description: 'Feminina e suave' },
    ],
    elevenlabs: [
        { id: 'custom', name: 'Personalizada', description: 'Configure no ElevenLabs' },
    ],
    google: [
        { id: 'pt-BR-Standard-A', name: 'Standard A', description: 'Feminina padrão' },
        { id: 'pt-BR-Standard-B', name: 'Standard B', description: 'Masculina padrão' },
        { id: 'pt-BR-Wavenet-A', name: 'Wavenet A', description: 'Feminina neural' },
        { id: 'pt-BR-Wavenet-B', name: 'Wavenet B', description: 'Masculina neural' },
    ],
};

// Personality tone labels
export const PERSONALITY_TONES = {
    friendly: { label: 'Amigável', description: 'Descontraída e acolhedora' },
    professional: { label: 'Profissional', description: 'Cordial e objetiva' },
    formal: { label: 'Formal', description: 'Séria e respeitosa' },
};

export const EMOJI_OPTIONS = {
    yes: { label: 'Sim', description: 'Usa emojis frequentemente' },
    moderate: { label: 'Moderado', description: 'Usa emojis ocasionalmente' },
    no: { label: 'Não', description: 'Não usa emojis' },
};

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

// Default behavior prompt for AI Secretary
export const DEFAULT_BEHAVIOR_PROMPT = `Você é uma secretária virtual simpática e profissional de uma clínica odontológica.

PERSONALIDADE:
- Seja acolhedora, educada e prestativa
- Use linguagem clara e acessível
- Demonstre empatia com as necessidades do paciente
- Mantenha um tom amigável mas profissional

FUNÇÕES PRINCIPAIS:
- Agendar consultas verificando a disponibilidade na agenda
- Responder dúvidas sobre procedimentos e valores
- Confirmar e remarcar consultas
- Enviar lembretes de consultas

DIRETRIZES:
- Sempre confirme os dados antes de finalizar um agendamento
- Se não souber responder algo, ofereça transferir para um atendente humano
- Não invente informações sobre preços ou procedimentos
- Seja breve e objetiva nas respostas
- Use emojis com moderação para tornar a conversa mais leve`;

// Default settings
const DEFAULT_SETTINGS: Partial<AISecretarySettings> = {
    is_active: false,
    whatsapp_connected: false,
    tone: 'casual',
    work_hours_start: '08:00',
    work_hours_end: '18:00',
    work_days: { seg: true, ter: true, qua: true, qui: true, sex: true, sab: false, dom: false },
    min_advance_hours: 2,
    interval_minutes: 30,
    allowed_procedure_ids: [],
    greeting_message: 'Olá! Sou a assistente virtual. Como posso ajudar?',
    confirmation_message: 'Sua consulta foi agendada com sucesso!',
    reminder_message: 'Lembrete: Você tem uma consulta amanhã às {hora}.',
    out_of_hours_message: 'Olá! Nosso atendimento é das {inicio} às {fim}. Retornaremos em breve!',
    message_limit_per_conversation: 20,
    human_keywords: ['atendente', 'humano', 'pessoa', 'falar com alguém'],
    payment_methods: ['PIX', 'Dinheiro', 'Cartão de Débito', 'Cartão de Crédito'],
    accepted_insurance: [],
};

// Schedule Entry Types
export interface ScheduleEntry {
    id?: string;
    clinic_id: string;
    day_of_week: number;
    location_id?: string | null;
    location_name?: string;
    professional_id?: string | null;
    professional_ids?: string[] | null;
    professional_name?: string;
    professional_names?: string[];
    start_time: string;
    end_time: string;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
}

// Day names in Portuguese
export const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
export const DAY_NAMES_FULL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

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
            console.warn('Error fetching secretary settings:', error);
            return null;
        }

        return data as AISecretarySettings;
    } catch (error) {
        console.warn('Error in getSecretarySettings:', error);
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
        console.error('Error saving secretary settings:', error);
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
        console.error(`Error updating ${field}:`, error);
        return false;
    }
}

// Blocked Numbers
export async function getBlockedNumbers(clinicId: string): Promise<BlockedNumber[]> {
    try {
        const { data, error } = await supabase
            .from('ai_secretary_blocked_numbers')
            .select('*')
            .eq('clinic_id', clinicId)
            .order('blocked_at', { ascending: false });

        if (error) throw error;
        return (data || []) as BlockedNumber[];
    } catch (error) {
        console.error('Error fetching blocked numbers:', error);
        return [];
    }
}

export async function addBlockedNumber(
    clinicId: string,
    phoneNumber: string,
    reason?: string
): Promise<BlockedNumber | null> {
    try {
        const { data: { user } } = await supabase.auth.getUser();

        const { data, error } = await (supabase
            .from('ai_secretary_blocked_numbers') as any)
            .insert({
                clinic_id: clinicId,
                phone_number: phoneNumber,
                reason,
                blocked_by: user?.id,
            })
            .select()
            .single();

        if (error) throw error;
        return data as BlockedNumber;
    } catch (error) {
        console.error('Error adding blocked number:', error);
        return null;
    }
}

export async function removeBlockedNumber(id: string): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('ai_secretary_blocked_numbers')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error removing blocked number:', error);
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
            console.warn('ai_secretary_conversations table may not exist');
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
        console.error('Error fetching stats:', error);
        return defaultStats;
    }
}

// Schedule Entries
export async function getScheduleEntries(clinicId: string): Promise<ScheduleEntry[]> {
    try {
        const { data, error } = await supabase
            .from('ai_secretary_schedule')
            .select(`
                *,
                locations:location_id (name)
            `)
            .eq('clinic_id', clinicId)
            .order('day_of_week', { ascending: true })
            .order('start_time', { ascending: true });

        if (error) throw error;

        return (data || []).map((entry: any) => ({
            ...entry,
            location_name: entry.locations?.name || null,
        }));
    } catch (error) {
        console.error('Error fetching schedule:', error);
        return [];
    }
}

export async function addScheduleEntry(
    clinicId: string,
    dayOfWeek: number,
    startTime: string,
    endTime: string,
    locationId?: string | null,
    professionalIds?: string[] | null
): Promise<ScheduleEntry | null> {
    try {
        const { data, error } = await (supabase
            .from('ai_secretary_schedule') as any)
            .insert({
                clinic_id: clinicId,
                day_of_week: dayOfWeek,
                location_id: locationId || null,
                professional_ids: professionalIds || null,
                start_time: startTime,
                end_time: endTime,
                is_active: true,
            })
            .select()
            .single();

        if (error) throw error;
        return data as ScheduleEntry;
    } catch (error) {
        console.error('Error adding schedule entry:', error);
        return null;
    }
}

export async function updateScheduleEntry(
    id: string,
    updates: {
        day_of_week?: number;
        start_time?: string;
        end_time?: string;
        location_id?: string | null;
        professional_ids?: string[] | null;
    }
): Promise<ScheduleEntry | null> {
    try {
        const { data, error } = await (supabase
            .from('ai_secretary_schedule') as any)
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data as ScheduleEntry;
    } catch (error) {
        console.error('Error updating schedule entry:', error);
        return null;
    }
}

export async function deleteScheduleEntry(id: string): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('ai_secretary_schedule')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error deleting schedule entry:', error);
        return false;
    }
}

export async function createDefaultSchedule(clinicId: string): Promise<boolean> {
    try {
        const entries = [];
        for (let day = 1; day <= 5; day++) {
            entries.push({
                clinic_id: clinicId,
                day_of_week: day,
                location_id: null,
                start_time: '08:00',
                end_time: '18:00',
                is_active: true,
            });
        }

        const { error } = await (supabase
            .from('ai_secretary_schedule') as any)
            .insert(entries);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error creating default schedule:', error);
        return false;
    }
}

// Behavior Settings CRUD - returns null if table doesn't exist
export async function getBehaviorSettings(clinicId: string): Promise<AISecretaryBehavior | null> {
    try {
        const { data, error } = await supabase
            .from('ai_secretary_behavior')
            .select('*')
            .eq('clinic_id', clinicId)
            .single();

        if (error) {
            // PGRST116 = no rows, 42P01 = table doesn't exist
            if (error.code === 'PGRST116' || error.code === '42P01' || error.message?.includes('does not exist')) {
                return null;
            }
            console.warn('Error fetching behavior settings:', error);
            return null;
        }

        return data as AISecretaryBehavior;
    } catch (error) {
        console.warn('Error in getBehaviorSettings:', error);
        return null;
    }
}

export async function saveBehaviorSettings(
    clinicId: string,
    settings: Partial<AISecretaryBehavior>
): Promise<AISecretaryBehavior | null> {
    try {
        const existing = await getBehaviorSettings(clinicId);

        if (existing) {
            const { data, error } = await (supabase
                .from('ai_secretary_behavior') as any)
                .update(settings)
                .eq('clinic_id', clinicId)
                .select()
                .single();

            if (error) throw error;
            return data as AISecretaryBehavior;
        } else {
            const { data, error } = await (supabase
                .from('ai_secretary_behavior') as any)
                .insert({
                    clinic_id: clinicId,
                    ...DEFAULT_BEHAVIOR_SETTINGS,
                    ...settings,
                })
                .select()
                .single();

            if (error) throw error;
            return data as AISecretaryBehavior;
        }
    } catch (error) {
        console.error('Error saving behavior settings:', error);
        return null;
    }
}

export async function updateBehaviorSetting(
    clinicId: string,
    field: keyof AISecretaryBehavior,
    value: any
): Promise<boolean> {
    try {
        const existing = await getBehaviorSettings(clinicId);

        if (!existing) {
            await saveBehaviorSettings(clinicId, { [field]: value } as Partial<AISecretaryBehavior>);
            return true;
        }

        const { error } = await (supabase
            .from('ai_secretary_behavior') as any)
            .update({ [field]: value })
            .eq('clinic_id', clinicId);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error(`Error updating behavior ${field}:`, error);
        return false;
    }
}

export async function updateBehaviorSettings(
    clinicId: string,
    updates: Partial<AISecretaryBehavior>
): Promise<boolean> {
    try {
        const existing = await getBehaviorSettings(clinicId);

        if (!existing) {
            await saveBehaviorSettings(clinicId, updates);
            return true;
        }

        const { error } = await (supabase
            .from('ai_secretary_behavior') as any)
            .update(updates)
            .eq('clinic_id', clinicId);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error updating behavior settings:', error);
        return false;
    }
}

// =====================================================
// Clinic Professionals
// =====================================================

export interface ClinicProfessional {
    id?: string;
    clinic_id: string;
    user_id?: string;
    name: string;
    title: string;
    specialty: string;
    profession: string;
    google_calendar_id?: string;
    default_appointment_duration: number;
    is_active: boolean;
    accepts_new_patients: boolean;
    created_at?: string;
    updated_at?: string;
}

export async function getClinicProfessionals(clinicId: string): Promise<ClinicProfessional[]> {
    try {
        const { data, error } = await supabase
            .from('clinic_professionals')
            .select('*')
            .eq('clinic_id', clinicId)
            .order('name', { ascending: true });

        if (error) throw error;
        return (data || []) as ClinicProfessional[];
    } catch (error) {
        console.error('Error fetching professionals:', error);
        return [];
    }
}

export async function addClinicProfessional(
    clinicId: string,
    professional: Omit<ClinicProfessional, 'id' | 'clinic_id' | 'created_at' | 'updated_at'>
): Promise<ClinicProfessional | null> {
    try {
        const { data, error } = await (supabase
            .from('clinic_professionals') as any)
            .insert({
                clinic_id: clinicId,
                ...professional,
            })
            .select()
            .single();

        if (error) throw error;
        return data as ClinicProfessional;
    } catch (error) {
        console.error('Error adding professional:', error);
        return null;
    }
}

export async function updateClinicProfessional(
    id: string,
    updates: Partial<Omit<ClinicProfessional, 'id' | 'clinic_id' | 'created_at' | 'updated_at'>>
): Promise<boolean> {
    try {
        const { error } = await (supabase
            .from('clinic_professionals') as any)
            .update(updates)
            .eq('id', id);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error updating professional:', error);
        return false;
    }
}

export async function deleteClinicProfessional(id: string): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('clinic_professionals')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error deleting professional:', error);
        return false;
    }
}

// =====================================================
// Custom Messages CRUD
// =====================================================

export async function getCustomMessages(clinicId: string): Promise<CustomMessage[]> {
    try {
        const { data, error } = await supabase
            .from('ai_secretary_custom_messages')
            .select('*')
            .eq('clinic_id', clinicId)
            .order('is_predefined', { ascending: false })
            .order('title', { ascending: true });

        if (error) {
            if (error.code === '42P01' || error.message?.includes('does not exist')) {
                return [];
            }
            console.warn('Error fetching custom messages:', error);
            return [];
        }

        return (data || []) as CustomMessage[];
    } catch (error) {
        console.warn('Error in getCustomMessages:', error);
        return [];
    }
}

export async function addCustomMessage(
    clinicId: string,
    messageKey: string,
    title: string,
    message: string,
    isPredefined: boolean = false
): Promise<CustomMessage | null> {
    try {
        const { data, error } = await (supabase
            .from('ai_secretary_custom_messages') as any)
            .insert({
                clinic_id: clinicId,
                message_key: messageKey,
                title: title,
                message: message,
                is_active: true,
                is_predefined: isPredefined,
            })
            .select()
            .single();

        if (error) throw error;
        return data as CustomMessage;
    } catch (error) {
        console.error('Error adding custom message:', error);
        return null;
    }
}

export async function updateCustomMessage(
    id: string,
    updates: Partial<Pick<CustomMessage, 'title' | 'message' | 'is_active'>>
): Promise<boolean> {
    try {
        const { error } = await (supabase
            .from('ai_secretary_custom_messages') as any)
            .update(updates)
            .eq('id', id);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error updating custom message:', error);
        return false;
    }
}

export async function deleteCustomMessage(id: string): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('ai_secretary_custom_messages')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error deleting custom message:', error);
        return false;
    }
}

export async function initializePredefinedMessages(clinicId: string): Promise<boolean> {
    try {
        const existing = await getCustomMessages(clinicId);
        if (existing.length > 0) {
            return true;
        }

        const messages = PREDEFINED_MESSAGE_TYPES.map(type => ({
            clinic_id: clinicId,
            message_key: type.key,
            title: type.title,
            message: type.defaultMessage,
            is_active: false,
            is_predefined: true,
        }));

        const { error } = await (supabase
            .from('ai_secretary_custom_messages') as any)
            .insert(messages);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error initializing predefined messages:', error);
        return false;
    }
}
