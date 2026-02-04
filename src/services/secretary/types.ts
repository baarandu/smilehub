// Types for AI Secretary Service

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

    // Extended fields for prompt generation
    secretary_name?: string;
    clinic_name?: string;
    clinic_specialty?: string;
    personality_tone?: 'friendly' | 'professional' | 'formal';
    use_emojis?: 'yes' | 'moderate' | 'no';
    procedures_list?: string;
    special_rules?: string;
    additional_info?: string;

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

export interface AISecretaryStats {
    total_conversations: number;
    total_appointments_created: number;
    transferred_conversations: number;
}

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

export interface PredefinedMessageType {
    key: string;
    title: string;
    description: string;
    defaultMessage: string;
}
