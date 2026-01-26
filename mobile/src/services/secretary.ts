import { supabase } from '../lib/supabase';

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

// Get settings for current clinic
export async function getSecretarySettings(clinicId: string): Promise<AISecretarySettings | null> {
    try {
        const { data, error } = await supabase
            .from('ai_secretary_settings')
            .select('*')
            .eq('clinic_id', clinicId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                // No settings found, return null (will create on first save)
                return null;
            }
            console.error('Error fetching secretary settings:', error);
            throw error;
        }

        return data as AISecretarySettings;
    } catch (error) {
        console.error('Error in getSecretarySettings:', error);
        return null;
    }
}

// Create or update settings
export async function saveSecretarySettings(
    clinicId: string,
    settings: Partial<AISecretarySettings>
): Promise<AISecretarySettings | null> {
    try {
        // First check if settings exist
        const existing = await getSecretarySettings(clinicId);

        if (existing) {
            // Update existing
            const { data, error } = await (supabase
                .from('ai_secretary_settings') as any)
                .update(settings)
                .eq('clinic_id', clinicId)
                .select()
                .single();

            if (error) throw error;
            return data as AISecretarySettings;
        } else {
            // Insert new with defaults
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
        // Check if record exists, if not create it first
        const existing = await getSecretarySettings(clinicId);

        if (!existing) {
            // Create with default values plus this field
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

// Stats (for current month)
export async function getSecretaryStats(clinicId: string): Promise<AISecretaryStats> {
    try {
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

        // Get conversations count
        const { count: totalConversations } = await supabase
            .from('ai_secretary_conversations')
            .select('*', { count: 'exact', head: true })
            .eq('clinic_id', clinicId)
            .gte('started_at', firstDayOfMonth)
            .lte('started_at', lastDayOfMonth);

        // Get appointments created count
        const { count: appointmentsCreated } = await supabase
            .from('ai_secretary_conversations')
            .select('*', { count: 'exact', head: true })
            .eq('clinic_id', clinicId)
            .eq('appointment_created', true)
            .gte('started_at', firstDayOfMonth)
            .lte('started_at', lastDayOfMonth);

        // Get transferred count
        const { count: transferred } = await supabase
            .from('ai_secretary_conversations')
            .select('*', { count: 'exact', head: true })
            .eq('clinic_id', clinicId)
            .eq('status', 'transferred')
            .gte('started_at', firstDayOfMonth)
            .lte('started_at', lastDayOfMonth);

        return {
            total_conversations: totalConversations || 0,
            total_appointments_created: appointmentsCreated || 0,
            transferred_conversations: transferred || 0,
        };
    } catch (error) {
        console.error('Error fetching stats:', error);
        return {
            total_conversations: 0,
            total_appointments_created: 0,
            transferred_conversations: 0,
        };
    }
}

// =====================================================
// Schedule Entries (per-day/per-location)
// =====================================================

export interface ScheduleEntry {
    id?: string;
    clinic_id: string;
    day_of_week: number; // 0 = Sunday, 1 = Monday, ... 6 = Saturday
    location_id?: string | null;
    location_name?: string; // Joined from locations table
    start_time: string; // "HH:MM"
    end_time: string;   // "HH:MM"
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
}

// Day names in Portuguese
export const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
export const DAY_NAMES_FULL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

// Get all schedule entries for a clinic
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

        // Map location name
        return (data || []).map((entry: any) => ({
            ...entry,
            location_name: entry.locations?.name || null,
        }));
    } catch (error) {
        console.error('Error fetching schedule:', error);
        return [];
    }
}

// Add a new schedule entry
export async function addScheduleEntry(
    clinicId: string,
    dayOfWeek: number,
    startTime: string,
    endTime: string,
    locationId?: string | null
): Promise<ScheduleEntry | null> {
    try {
        const { data, error } = await (supabase
            .from('ai_secretary_schedule') as any)
            .insert({
                clinic_id: clinicId,
                day_of_week: dayOfWeek,
                location_id: locationId || null,
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

// Update a schedule entry
export async function updateScheduleEntry(
    id: string,
    updates: Partial<Pick<ScheduleEntry, 'start_time' | 'end_time' | 'location_id' | 'is_active'>>
): Promise<boolean> {
    try {
        const { error } = await (supabase
            .from('ai_secretary_schedule') as any)
            .update(updates)
            .eq('id', id);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error updating schedule entry:', error);
        return false;
    }
}

// Delete a schedule entry
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

// Create default schedule (Mon-Fri, 8-18, all locations)
export async function createDefaultSchedule(clinicId: string): Promise<boolean> {
    try {
        const entries = [];
        // Monday (1) to Friday (5)
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

// =====================================================
// Clinic Professionals (for Google Calendar integration)
// =====================================================

export interface ClinicProfessional {
    id?: string;
    clinic_id: string;
    user_id?: string;
    name: string;
    title: string; // Dr., Dra., etc.
    specialty: string;
    profession: string; // Dentista, Médico, etc.
    google_calendar_id?: string;
    default_appointment_duration: number;
    is_active: boolean;
    accepts_new_patients: boolean;
    created_at?: string;
    updated_at?: string;
}

// Get all professionals for a clinic
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

// Add a new professional
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

// Update a professional
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

// Delete a professional
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
// n8n Integration helpers
// =====================================================

// Connect WhatsApp via Evolution API
export async function connectWhatsApp(
    clinicId: string,
    evolutionInstanceName: string,
    phoneNumber: string
): Promise<boolean> {
    try {
        const { error } = await (supabase
            .from('ai_secretary_settings') as any)
            .update({
                evolution_instance_name: evolutionInstanceName,
                whatsapp_phone_number: phoneNumber,
                whatsapp_connected: true,
            })
            .eq('clinic_id', clinicId);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error connecting WhatsApp:', error);
        return false;
    }
}

// Disconnect WhatsApp
export async function disconnectWhatsApp(clinicId: string): Promise<boolean> {
    try {
        const { error } = await (supabase
            .from('ai_secretary_settings') as any)
            .update({
                whatsapp_connected: false,
            })
            .eq('clinic_id', clinicId);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error disconnecting WhatsApp:', error);
        return false;
    }
}

// Update clinic contact info (for AI prompt)
export async function updateClinicContactInfo(
    clinicId: string,
    contactInfo: {
        clinic_phone?: string;
        clinic_address?: string;
        clinic_email?: string;
        clinic_website?: string;
        accepted_insurance?: string[];
        payment_methods?: string[];
    }
): Promise<boolean> {
    try {
        const { error } = await (supabase
            .from('ai_secretary_settings') as any)
            .update(contactInfo)
            .eq('clinic_id', clinicId);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error updating clinic contact info:', error);
        return false;
    }
}

// Update notification settings (for human escalation)
export async function updateNotificationSettings(
    clinicId: string,
    settings: {
        notification_telegram_chat_id?: string;
        notification_email?: string;
    }
): Promise<boolean> {
    try {
        const { error } = await (supabase
            .from('ai_secretary_settings') as any)
            .update(settings)
            .eq('clinic_id', clinicId);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error updating notification settings:', error);
        return false;
    }
}

// =====================================================
// Behavior Settings CRUD
// =====================================================

// Get behavior settings for a clinic
export async function getBehaviorSettings(clinicId: string): Promise<AISecretaryBehavior | null> {
    try {
        const { data, error } = await supabase
            .from('ai_secretary_behavior')
            .select('*')
            .eq('clinic_id', clinicId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                // No settings found, return null (will create on first save)
                return null;
            }
            console.error('Error fetching behavior settings:', error);
            throw error;
        }

        return data as AISecretaryBehavior;
    } catch (error) {
        console.error('Error in getBehaviorSettings:', error);
        return null;
    }
}

// Create or update behavior settings
export async function saveBehaviorSettings(
    clinicId: string,
    settings: Partial<AISecretaryBehavior>
): Promise<AISecretaryBehavior | null> {
    try {
        // First check if settings exist
        const existing = await getBehaviorSettings(clinicId);

        if (existing) {
            // Update existing
            const { data, error } = await (supabase
                .from('ai_secretary_behavior') as any)
                .update(settings)
                .eq('clinic_id', clinicId)
                .select()
                .single();

            if (error) throw error;
            return data as AISecretaryBehavior;
        } else {
            // Insert new with defaults
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

// Update a single behavior setting field
export async function updateBehaviorSetting(
    clinicId: string,
    field: keyof AISecretaryBehavior,
    value: any
): Promise<boolean> {
    try {
        // Check if record exists, if not create it first
        const existing = await getBehaviorSettings(clinicId);

        if (!existing) {
            // Create with default values plus this field
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

// Update multiple behavior settings at once
export async function updateBehaviorSettings(
    clinicId: string,
    updates: Partial<AISecretaryBehavior>
): Promise<boolean> {
    try {
        // Check if record exists, if not create it first
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

