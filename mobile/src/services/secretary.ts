import { supabase } from '../lib/supabase';

// Types
export interface AISecretarySettings {
    id?: string;
    clinic_id: string;
    is_active: boolean;
    whatsapp_connected: boolean;
    whatsapp_phone_number?: string;
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
    greeting_message: string;
    confirmation_message: string;
    reminder_message: string;
    out_of_hours_message: string;
    message_limit_per_conversation: number;
    human_keywords: string[];
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
    confirmation_message: 'Sua consulta foi agendada com sucesso! ✅',
    reminder_message: 'Lembrete: Você tem uma consulta amanhã às {hora}.',
    out_of_hours_message: 'Olá! Nosso atendimento é das {inicio} às {fim}. Retornaremos em breve!',
    message_limit_per_conversation: 20,
    human_keywords: ['atendente', 'humano', 'pessoa', 'falar com alguém'],
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

