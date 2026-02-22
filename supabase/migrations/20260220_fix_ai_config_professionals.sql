-- =====================================================
-- Fix: Include all active professionals in AI secretary config
-- Previously filtered by google_calendar_id IS NOT NULL,
-- which excluded professionals without Google Calendar.
-- The WhatsApp webhook uses system RPCs, not Google Calendar.
-- =====================================================

CREATE OR REPLACE FUNCTION get_ai_secretary_config(p_instance_name TEXT)
RETURNS JSON AS $$
DECLARE
    v_config JSON;
    v_clinic_id UUID;
BEGIN
    -- Get clinic_id from instance name
    SELECT clinic_id INTO v_clinic_id
    FROM ai_secretary_settings
    WHERE evolution_instance_name = p_instance_name
    AND is_active = true;

    IF v_clinic_id IS NULL THEN
        RETURN json_build_object(
            'error', 'Clinic not found or AI Secretary not active for instance: ' || p_instance_name,
            'found', false
        );
    END IF;

    -- Build complete config
    SELECT json_build_object(
        'found', true,
        'clinic_id', c.id,
        'clinic_name', c.name,

        -- Settings
        'settings', json_build_object(
            'tone', s.tone,
            'work_hours_start', s.work_hours_start,
            'work_hours_end', s.work_hours_end,
            'work_days', s.work_days,
            'min_advance_hours', s.min_advance_hours,
            'interval_minutes', s.interval_minutes,
            'message_limit_per_conversation', s.message_limit_per_conversation,
            'human_keywords', s.human_keywords,
            'greeting_message', s.greeting_message,
            'confirmation_message', s.confirmation_message,
            'reminder_message', s.reminder_message,
            'out_of_hours_message', s.out_of_hours_message
        ),

        -- Contact info
        'contact', json_build_object(
            'phone', s.clinic_phone,
            'whatsapp', s.whatsapp_phone_number,
            'email', s.clinic_email,
            'website', s.clinic_website,
            'address', s.clinic_address
        ),

        -- Payment
        'payment', json_build_object(
            'methods', s.payment_methods,
            'insurance', s.accepted_insurance
        ),

        -- Notifications
        'notifications', json_build_object(
            'telegram_chat_id', s.notification_telegram_chat_id,
            'email', s.notification_email
        ),

        -- All active professionals (removed google_calendar_id filter)
        'professionals', (
            SELECT COALESCE(json_agg(
                json_build_object(
                    'id', p.id,
                    'name', p.title || ' ' || p.name,
                    'specialty', p.specialty,
                    'profession', p.profession,
                    'google_calendar_id', p.google_calendar_id,
                    'appointment_duration', p.default_appointment_duration
                )
            ), '[]'::json)
            FROM clinic_professionals p
            WHERE p.clinic_id = v_clinic_id
            AND p.is_active = true
        ),

        -- Procedures catalog (empty array - this project uses procedures as patient records)
        'procedures', '[]'::json,

        -- Blocked numbers
        'blocked_numbers', (
            SELECT COALESCE(json_agg(bn.phone_number), '[]'::json)
            FROM ai_secretary_blocked_numbers bn
            WHERE bn.clinic_id = v_clinic_id
        ),

        -- Locations
        'locations', (
            SELECT COALESCE(json_agg(
                json_build_object(
                    'id', l.id,
                    'name', l.name,
                    'address', l.address
                )
            ), '[]'::json)
            FROM locations l
            WHERE l.clinic_id = v_clinic_id
        ),

        -- Behavior settings (using actual column names from ai_secretary_behavior)
        'behavior', (
            SELECT CASE WHEN b.id IS NOT NULL THEN
                json_build_object(
                    'send_typing_indicator', COALESCE(b.send_typing_indicator, true),
                    'send_recording_indicator', COALESCE(b.send_recording_indicator, false),
                    'mark_messages_read', COALESCE(b.mark_as_read, true),
                    'enable_reactions', COALESCE(b.react_to_messages, false),
                    'reaction_on_appointment', b.reaction_on_appointment,
                    'reaction_on_cancel', b.reaction_on_cancel,
                    'reaction_on_greeting', b.reaction_on_greeting,
                    'response_delay_min', COALESCE(b.response_delay_min_ms, 1000),
                    'response_delay_max', COALESCE(b.response_delay_max_ms, 3000),
                    'typing_speed_cpm', COALESCE(b.typing_speed_cpm, 600),
                    'message_wait_timeout', COALESCE(b.wait_timeout_ms, 0),
                    'accept_audio_messages', COALESCE(b.receive_audio_enabled, true),
                    'transcribe_audio', COALESCE(b.transcribe_audio, true),
                    'audio_transcription_provider', COALESCE(b.audio_transcription_provider, 'openai'),
                    'send_appointment_reminders', COALESCE(b.send_appointment_reminders, true),
                    'reminder_times', COALESCE(b.reminder_times, '{24, 2}'),
                    'reminder_include_address', COALESCE(b.reminder_include_address, true),
                    'reminder_include_professional', COALESCE(b.reminder_include_professional, true),
                    'reminder_ask_confirmation', COALESCE(b.reminder_ask_confirmation, true),
                    'send_cancellation_alerts', COALESCE(b.send_cancellation_alerts, true),
                    'offer_reschedule_on_cancel', COALESCE(b.offer_reschedule_on_cancel, true)
                )
            ELSE
                json_build_object(
                    'send_typing_indicator', true,
                    'send_recording_indicator', false,
                    'mark_messages_read', true,
                    'enable_reactions', false,
                    'response_delay_min', 1000,
                    'response_delay_max', 3000,
                    'typing_speed_cpm', 600,
                    'message_wait_timeout', 0,
                    'accept_audio_messages', true,
                    'transcribe_audio', true,
                    'audio_transcription_provider', 'openai',
                    'send_appointment_reminders', true,
                    'reminder_times', '{24, 2}',
                    'reminder_include_address', true,
                    'reminder_include_professional', true,
                    'reminder_ask_confirmation', true,
                    'send_cancellation_alerts', true,
                    'offer_reschedule_on_cancel', true
                )
            END
            FROM (SELECT 1) AS dummy
            LEFT JOIN ai_secretary_behavior b ON b.clinic_id = v_clinic_id
        )
    ) INTO v_config
    FROM clinics c
    JOIN ai_secretary_settings s ON s.clinic_id = c.id
    WHERE c.id = v_clinic_id;

    RETURN v_config;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
