export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      accounting_agent_conversations: {
        Row: {
          id: string
          clinic_id: string
          user_id: string
          title: string
          created_at: string | null
          updated_at: string | null
          last_message_at: string | null
          message_count: number | null
          tool_calls_count: number | null
        }
        Insert: {
          id?: string
          clinic_id: string
          user_id: string
          title: string
          created_at?: string | null
          updated_at?: string | null
          last_message_at?: string | null
          message_count?: number | null
          tool_calls_count?: number | null
        }
        Update: {
          id?: string
          clinic_id?: string
          user_id?: string
          title?: string
          created_at?: string | null
          updated_at?: string | null
          last_message_at?: string | null
          message_count?: number | null
          tool_calls_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "accounting_agent_conversations_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_agent_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_agent_messages: {
        Row: {
          id: string
          conversation_id: string
          role: "user" | "assistant" | "tool"
          content: string
          tool_calls: Json | null
          tool_call_id: string | null
          tool_name: string | null
          created_at: string | null
          tokens_used: number | null
        }
        Insert: {
          id?: string
          conversation_id: string
          role: "user" | "assistant" | "tool"
          content: string
          tool_calls?: Json | null
          tool_call_id?: string | null
          tool_name?: string | null
          created_at?: string | null
          tokens_used?: number | null
        }
        Update: {
          id?: string
          conversation_id?: string
          role?: "user" | "assistant" | "tool"
          content?: string
          tool_calls?: Json | null
          tool_call_id?: string | null
          tool_name?: string | null
          created_at?: string | null
          tokens_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "accounting_agent_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "accounting_agent_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_secretary_behavior: {
        Row: {
          audio_response_mode: string | null
          audio_transcription_provider: string | null
          audio_wait_timeout_ms: number | null
          auto_confirm_payment: boolean | null
          cancellation_alert_message: string | null
          clinic_id: string
          created_at: string | null
          id: string
          mark_as_read: boolean | null
          notify_payment_received: boolean | null
          offer_reschedule_on_cancel: boolean | null
          payment_link_message: string | null
          payment_provider: string | null
          payment_received_message: string | null
          payment_reminder_hours: number | null
          payment_reminder_message: string | null
          pix_beneficiary_name: string | null
          pix_enabled: boolean | null
          pix_key: string | null
          pix_key_type: string | null
          post_appointment_delay_hours: number | null
          post_appointment_message: string | null
          react_to_messages: boolean | null
          reaction_on_appointment: string | null
          reaction_on_cancel: string | null
          reaction_on_greeting: string | null
          receive_audio_enabled: boolean | null
          reminder_ask_confirmation: boolean | null
          reminder_include_address: boolean | null
          reminder_include_professional: boolean | null
          reminder_message_24h: string | null
          reminder_message_2h: string | null
          reminder_times: number[] | null
          reschedule_offer_message: string | null
          respond_with_audio: boolean | null
          response_cadence_enabled: boolean | null
          response_delay_max_ms: number | null
          response_delay_min_ms: number | null
          send_appointment_reminders: boolean | null
          send_cancellation_alerts: boolean | null
          send_payment_links: boolean | null
          send_payment_reminders: boolean | null
          send_post_appointment_message: boolean | null
          send_recording_indicator: boolean | null
          send_typing_indicator: boolean | null
          transcribe_audio: boolean | null
          tts_provider: string | null
          tts_speed: number | null
          tts_voice_id: string | null
          typing_speed_cpm: number | null
          updated_at: string | null
          wait_for_audio_complete: boolean | null
          wait_for_complete_message: boolean | null
          wait_timeout_ms: number | null
        }
        Insert: {
          audio_response_mode?: string | null
          audio_transcription_provider?: string | null
          audio_wait_timeout_ms?: number | null
          auto_confirm_payment?: boolean | null
          cancellation_alert_message?: string | null
          clinic_id: string
          created_at?: string | null
          id?: string
          mark_as_read?: boolean | null
          notify_payment_received?: boolean | null
          offer_reschedule_on_cancel?: boolean | null
          payment_link_message?: string | null
          payment_provider?: string | null
          payment_received_message?: string | null
          payment_reminder_hours?: number | null
          payment_reminder_message?: string | null
          pix_beneficiary_name?: string | null
          pix_enabled?: boolean | null
          pix_key?: string | null
          pix_key_type?: string | null
          post_appointment_delay_hours?: number | null
          post_appointment_message?: string | null
          react_to_messages?: boolean | null
          reaction_on_appointment?: string | null
          reaction_on_cancel?: string | null
          reaction_on_greeting?: string | null
          receive_audio_enabled?: boolean | null
          reminder_ask_confirmation?: boolean | null
          reminder_include_address?: boolean | null
          reminder_include_professional?: boolean | null
          reminder_message_24h?: string | null
          reminder_message_2h?: string | null
          reminder_times?: number[] | null
          reschedule_offer_message?: string | null
          respond_with_audio?: boolean | null
          response_cadence_enabled?: boolean | null
          response_delay_max_ms?: number | null
          response_delay_min_ms?: number | null
          send_appointment_reminders?: boolean | null
          send_cancellation_alerts?: boolean | null
          send_payment_links?: boolean | null
          send_payment_reminders?: boolean | null
          send_post_appointment_message?: boolean | null
          send_recording_indicator?: boolean | null
          send_typing_indicator?: boolean | null
          transcribe_audio?: boolean | null
          tts_provider?: string | null
          tts_speed?: number | null
          tts_voice_id?: string | null
          typing_speed_cpm?: number | null
          updated_at?: string | null
          wait_for_audio_complete?: boolean | null
          wait_for_complete_message?: boolean | null
          wait_timeout_ms?: number | null
        }
        Update: {
          audio_response_mode?: string | null
          audio_transcription_provider?: string | null
          audio_wait_timeout_ms?: number | null
          auto_confirm_payment?: boolean | null
          cancellation_alert_message?: string | null
          clinic_id?: string
          created_at?: string | null
          id?: string
          mark_as_read?: boolean | null
          notify_payment_received?: boolean | null
          offer_reschedule_on_cancel?: boolean | null
          payment_link_message?: string | null
          payment_provider?: string | null
          payment_received_message?: string | null
          payment_reminder_hours?: number | null
          payment_reminder_message?: string | null
          pix_beneficiary_name?: string | null
          pix_enabled?: boolean | null
          pix_key?: string | null
          pix_key_type?: string | null
          post_appointment_delay_hours?: number | null
          post_appointment_message?: string | null
          react_to_messages?: boolean | null
          reaction_on_appointment?: string | null
          reaction_on_cancel?: string | null
          reaction_on_greeting?: string | null
          receive_audio_enabled?: boolean | null
          reminder_ask_confirmation?: boolean | null
          reminder_include_address?: boolean | null
          reminder_include_professional?: boolean | null
          reminder_message_24h?: string | null
          reminder_message_2h?: string | null
          reminder_times?: number[] | null
          reschedule_offer_message?: string | null
          respond_with_audio?: boolean | null
          response_cadence_enabled?: boolean | null
          response_delay_max_ms?: number | null
          response_delay_min_ms?: number | null
          send_appointment_reminders?: boolean | null
          send_cancellation_alerts?: boolean | null
          send_payment_links?: boolean | null
          send_payment_reminders?: boolean | null
          send_post_appointment_message?: boolean | null
          send_recording_indicator?: boolean | null
          send_typing_indicator?: boolean | null
          transcribe_audio?: boolean | null
          tts_provider?: string | null
          tts_speed?: number | null
          tts_voice_id?: string | null
          typing_speed_cpm?: number | null
          updated_at?: string | null
          wait_for_audio_complete?: boolean | null
          wait_for_complete_message?: boolean | null
          wait_timeout_ms?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_secretary_behavior_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: true
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_secretary_blocked_numbers: {
        Row: {
          blocked_at: string | null
          blocked_by: string | null
          clinic_id: string
          id: string
          phone_number: string
          reason: string | null
        }
        Insert: {
          blocked_at?: string | null
          blocked_by?: string | null
          clinic_id: string
          id?: string
          phone_number: string
          reason?: string | null
        }
        Update: {
          blocked_at?: string | null
          blocked_by?: string | null
          clinic_id?: string
          id?: string
          phone_number?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_secretary_blocked_numbers_blocked_by_fkey"
            columns: ["blocked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_secretary_blocked_numbers_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_secretary_conversations: {
        Row: {
          ai_responses_count: number | null
          appointment_created: boolean | null
          appointment_id: string | null
          clinic_id: string
          contact_name: string | null
          ended_at: string | null
          id: string
          last_message_at: string | null
          messages_count: number | null
          patient_id: string | null
          phone_number: string
          started_at: string | null
          status: string | null
          transferred_reason: string | null
        }
        Insert: {
          ai_responses_count?: number | null
          appointment_created?: boolean | null
          appointment_id?: string | null
          clinic_id: string
          contact_name?: string | null
          ended_at?: string | null
          id?: string
          last_message_at?: string | null
          messages_count?: number | null
          patient_id?: string | null
          phone_number: string
          started_at?: string | null
          status?: string | null
          transferred_reason?: string | null
        }
        Update: {
          ai_responses_count?: number | null
          appointment_created?: boolean | null
          appointment_id?: string | null
          clinic_id?: string
          contact_name?: string | null
          ended_at?: string | null
          id?: string
          last_message_at?: string | null
          messages_count?: number | null
          patient_id?: string | null
          phone_number?: string
          started_at?: string | null
          status?: string | null
          transferred_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_secretary_conversations_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_secretary_conversations_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_secretary_conversations_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_secretary_custom_messages: {
        Row: {
          clinic_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          is_predefined: boolean | null
          message: string
          message_key: string
          title: string
          updated_at: string | null
        }
        Insert: {
          clinic_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_predefined?: boolean | null
          message: string
          message_key: string
          title: string
          updated_at?: string | null
        }
        Update: {
          clinic_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_predefined?: boolean | null
          message?: string
          message_key?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      ai_secretary_messages: {
        Row: {
          confidence_score: number | null
          content: string
          conversation_id: string
          id: string
          intent_detected: string | null
          sender: string
          sent_at: string | null
        }
        Insert: {
          confidence_score?: number | null
          content: string
          conversation_id: string
          id?: string
          intent_detected?: string | null
          sender: string
          sent_at?: string | null
        }
        Update: {
          confidence_score?: number | null
          content?: string
          conversation_id?: string
          id?: string
          intent_detected?: string | null
          sender?: string
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_secretary_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_secretary_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_secretary_schedule: {
        Row: {
          clinic_id: string
          created_at: string | null
          day_of_week: number
          end_time: string
          id: string
          is_active: boolean | null
          location_id: string | null
          professional_ids: string | null
          start_time: string
          updated_at: string | null
        }
        Insert: {
          clinic_id: string
          created_at?: string | null
          day_of_week: number
          end_time: string
          id?: string
          is_active?: boolean | null
          location_id?: string | null
          professional_ids?: string | null
          start_time: string
          updated_at?: string | null
        }
        Update: {
          clinic_id?: string
          created_at?: string | null
          day_of_week?: number
          end_time?: string
          id?: string
          is_active?: boolean | null
          location_id?: string | null
          professional_ids?: string | null
          start_time?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_secretary_schedule_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_secretary_schedule_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_secretary_settings: {
        Row: {
          accepted_insurance: string[] | null
          additional_info: string | null
          allowed_procedure_ids: string[] | null
          behavior_prompt: string | null
          clinic_address: string | null
          clinic_email: string | null
          clinic_id: string
          clinic_name: string | null
          clinic_phone: string | null
          clinic_specialty: string | null
          clinic_website: string | null
          confirmation_message: string | null
          created_at: string | null
          evolution_instance_name: string | null
          greeting_message: string | null
          human_keywords: string[] | null
          id: string
          interval_minutes: number | null
          is_active: boolean | null
          message_limit_per_conversation: number | null
          min_advance_hours: number | null
          notification_email: string | null
          notification_telegram_chat_id: string | null
          out_of_hours_message: string | null
          payment_methods: string[] | null
          personality_tone: string | null
          procedures_list: string | null
          reminder_message: string | null
          secretary_name: string | null
          special_rules: string | null
          tone: string | null
          updated_at: string | null
          use_emojis: string | null
          whatsapp_connected: boolean | null
          whatsapp_phone_number: string | null
          whatsapp_session_id: string | null
          work_days: Json | null
          work_hours_end: string | null
          work_hours_start: string | null
        }
        Insert: {
          accepted_insurance?: string[] | null
          additional_info?: string | null
          allowed_procedure_ids?: string[] | null
          behavior_prompt?: string | null
          clinic_address?: string | null
          clinic_email?: string | null
          clinic_id: string
          clinic_name?: string | null
          clinic_phone?: string | null
          clinic_specialty?: string | null
          clinic_website?: string | null
          confirmation_message?: string | null
          created_at?: string | null
          evolution_instance_name?: string | null
          greeting_message?: string | null
          human_keywords?: string[] | null
          id?: string
          interval_minutes?: number | null
          is_active?: boolean | null
          message_limit_per_conversation?: number | null
          min_advance_hours?: number | null
          notification_email?: string | null
          notification_telegram_chat_id?: string | null
          out_of_hours_message?: string | null
          payment_methods?: string[] | null
          personality_tone?: string | null
          procedures_list?: string | null
          reminder_message?: string | null
          secretary_name?: string | null
          special_rules?: string | null
          tone?: string | null
          updated_at?: string | null
          use_emojis?: string | null
          whatsapp_connected?: boolean | null
          whatsapp_phone_number?: string | null
          whatsapp_session_id?: string | null
          work_days?: Json | null
          work_hours_end?: string | null
          work_hours_start?: string | null
        }
        Update: {
          accepted_insurance?: string[] | null
          additional_info?: string | null
          allowed_procedure_ids?: string[] | null
          behavior_prompt?: string | null
          clinic_address?: string | null
          clinic_email?: string | null
          clinic_id?: string
          clinic_name?: string | null
          clinic_phone?: string | null
          clinic_specialty?: string | null
          clinic_website?: string | null
          confirmation_message?: string | null
          created_at?: string | null
          evolution_instance_name?: string | null
          greeting_message?: string | null
          human_keywords?: string[] | null
          id?: string
          interval_minutes?: number | null
          is_active?: boolean | null
          message_limit_per_conversation?: number | null
          min_advance_hours?: number | null
          notification_email?: string | null
          notification_telegram_chat_id?: string | null
          out_of_hours_message?: string | null
          payment_methods?: string[] | null
          personality_tone?: string | null
          procedures_list?: string | null
          reminder_message?: string | null
          secretary_name?: string | null
          special_rules?: string | null
          tone?: string | null
          updated_at?: string | null
          use_emojis?: string | null
          whatsapp_connected?: boolean | null
          whatsapp_phone_number?: string | null
          whatsapp_session_id?: string | null
          work_days?: Json | null
          work_hours_end?: string | null
          work_hours_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_secretary_settings_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: true
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_secretary_stats: {
        Row: {
          abandoned_conversations: number | null
          avg_messages_per_conversation: number | null
          avg_response_time_seconds: number | null
          clinic_id: string
          completed_conversations: number | null
          created_at: string | null
          id: string
          period_end: string
          period_start: string
          total_ai_responses: number | null
          total_appointments_cancelled: number | null
          total_appointments_created: number | null
          total_appointments_rescheduled: number | null
          total_conversations: number | null
          total_messages_received: number | null
          transferred_conversations: number | null
        }
        Insert: {
          abandoned_conversations?: number | null
          avg_messages_per_conversation?: number | null
          avg_response_time_seconds?: number | null
          clinic_id: string
          completed_conversations?: number | null
          created_at?: string | null
          id?: string
          period_end: string
          period_start: string
          total_ai_responses?: number | null
          total_appointments_cancelled?: number | null
          total_appointments_created?: number | null
          total_appointments_rescheduled?: number | null
          total_conversations?: number | null
          total_messages_received?: number | null
          transferred_conversations?: number | null
        }
        Update: {
          abandoned_conversations?: number | null
          avg_messages_per_conversation?: number | null
          avg_response_time_seconds?: number | null
          clinic_id?: string
          completed_conversations?: number | null
          created_at?: string | null
          id?: string
          period_end?: string
          period_start?: string
          total_ai_responses?: number | null
          total_appointments_cancelled?: number | null
          total_appointments_created?: number | null
          total_appointments_rescheduled?: number | null
          total_conversations?: number | null
          total_messages_received?: number | null
          transferred_conversations?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_secretary_stats_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_dismissals: {
        Row: {
          action_taken: string | null
          alert_date: string
          alert_type: string
          dismissed_at: string | null
          id: string
          patient_id: string
          user_id: string
        }
        Insert: {
          action_taken?: string | null
          alert_date: string
          alert_type: string
          dismissed_at?: string | null
          id?: string
          patient_id: string
          user_id: string
        }
        Update: {
          action_taken?: string | null
          alert_date?: string
          alert_type?: string
          dismissed_at?: string | null
          id?: string
          patient_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_dismissals_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      anamneses: {
        Row: {
          allergy: boolean | null
          allergy_details: string | null
          anesthesia_reaction: boolean | null
          anesthesia_reaction_details: string | null
          arthritis: boolean | null
          arthritis_details: string | null
          bruxism_dtm_orofacial_pain: boolean | null
          bruxism_dtm_orofacial_pain_details: string | null
          clinic_id: string | null
          continuous_medication: boolean | null
          continuous_medication_details: string | null
          created_at: string | null
          current_medication: boolean | null
          current_medication_details: string | null
          date: string
          depression_anxiety_panic: boolean | null
          depression_anxiety_panic_details: string | null
          diabetes: boolean | null
          diabetes_details: string | null
          drug_allergy: boolean | null
          drug_allergy_details: string | null
          fasting: boolean | null
          fasting_details: string | null
          gastritis_reflux: boolean | null
          gastritis_reflux_details: string | null
          healing_problems: boolean | null
          healing_problems_details: string | null
          heart_disease: boolean | null
          heart_disease_details: string | null
          hypertension: boolean | null
          hypertension_details: string | null
          id: string
          infectious_disease: boolean | null
          infectious_disease_details: string | null
          local_anesthesia_history: boolean | null
          local_anesthesia_history_details: string | null
          medical_treatment: boolean | null
          medical_treatment_details: string | null
          notes: string | null
          observations: string | null
          pacemaker: boolean | null
          pacemaker_details: string | null
          patient_id: string
          pregnant_or_breastfeeding: boolean | null
          pregnant_or_breastfeeding_details: string | null
          recent_surgery: boolean | null
          recent_surgery_details: string | null
          respiratory_problems: boolean | null
          respiratory_problems_details: string | null
          seizure_epilepsy: boolean | null
          seizure_epilepsy_details: string | null
          smoker_or_drinker: boolean | null
          smoker_or_drinker_details: string | null
          updated_at: string | null
        }
        Insert: {
          allergy?: boolean | null
          allergy_details?: string | null
          anesthesia_reaction?: boolean | null
          anesthesia_reaction_details?: string | null
          arthritis?: boolean | null
          arthritis_details?: string | null
          bruxism_dtm_orofacial_pain?: boolean | null
          bruxism_dtm_orofacial_pain_details?: string | null
          clinic_id?: string | null
          continuous_medication?: boolean | null
          continuous_medication_details?: string | null
          created_at?: string | null
          current_medication?: boolean | null
          current_medication_details?: string | null
          date?: string
          depression_anxiety_panic?: boolean | null
          depression_anxiety_panic_details?: string | null
          diabetes?: boolean | null
          diabetes_details?: string | null
          drug_allergy?: boolean | null
          drug_allergy_details?: string | null
          fasting?: boolean | null
          fasting_details?: string | null
          gastritis_reflux?: boolean | null
          gastritis_reflux_details?: string | null
          healing_problems?: boolean | null
          healing_problems_details?: string | null
          heart_disease?: boolean | null
          heart_disease_details?: string | null
          hypertension?: boolean | null
          hypertension_details?: string | null
          id?: string
          infectious_disease?: boolean | null
          infectious_disease_details?: string | null
          local_anesthesia_history?: boolean | null
          local_anesthesia_history_details?: string | null
          medical_treatment?: boolean | null
          medical_treatment_details?: string | null
          notes?: string | null
          observations?: string | null
          pacemaker?: boolean | null
          pacemaker_details?: string | null
          patient_id: string
          pregnant_or_breastfeeding?: boolean | null
          pregnant_or_breastfeeding_details?: string | null
          recent_surgery?: boolean | null
          recent_surgery_details?: string | null
          respiratory_problems?: boolean | null
          respiratory_problems_details?: string | null
          seizure_epilepsy?: boolean | null
          seizure_epilepsy_details?: string | null
          smoker_or_drinker?: boolean | null
          smoker_or_drinker_details?: string | null
          updated_at?: string | null
        }
        Update: {
          allergy?: boolean | null
          allergy_details?: string | null
          anesthesia_reaction?: boolean | null
          anesthesia_reaction_details?: string | null
          arthritis?: boolean | null
          arthritis_details?: string | null
          bruxism_dtm_orofacial_pain?: boolean | null
          bruxism_dtm_orofacial_pain_details?: string | null
          clinic_id?: string | null
          continuous_medication?: boolean | null
          continuous_medication_details?: string | null
          created_at?: string | null
          current_medication?: boolean | null
          current_medication_details?: string | null
          date?: string
          depression_anxiety_panic?: boolean | null
          depression_anxiety_panic_details?: string | null
          diabetes?: boolean | null
          diabetes_details?: string | null
          drug_allergy?: boolean | null
          drug_allergy_details?: string | null
          fasting?: boolean | null
          fasting_details?: string | null
          gastritis_reflux?: boolean | null
          gastritis_reflux_details?: string | null
          healing_problems?: boolean | null
          healing_problems_details?: string | null
          heart_disease?: boolean | null
          heart_disease_details?: string | null
          hypertension?: boolean | null
          hypertension_details?: string | null
          id?: string
          infectious_disease?: boolean | null
          infectious_disease_details?: string | null
          local_anesthesia_history?: boolean | null
          local_anesthesia_history_details?: string | null
          medical_treatment?: boolean | null
          medical_treatment_details?: string | null
          notes?: string | null
          observations?: string | null
          pacemaker?: boolean | null
          pacemaker_details?: string | null
          patient_id?: string
          pregnant_or_breastfeeding?: boolean | null
          pregnant_or_breastfeeding_details?: string | null
          recent_surgery?: boolean | null
          recent_surgery_details?: string | null
          respiratory_problems?: boolean | null
          respiratory_problems_details?: string | null
          seizure_epilepsy?: boolean | null
          seizure_epilepsy_details?: string | null
          smoker_or_drinker?: boolean | null
          smoker_or_drinker_details?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "anamneses_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anamneses_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      appointments: {
        Row: {
          clinic_id: string | null
          created_at: string | null
          date: string
          dentist_id: string | null
          id: string
          location: string | null
          notes: string | null
          patient_id: string
          procedure_name: string | null
          status: Database["public"]["Enums"]["appointment_status"] | null
          time: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          clinic_id?: string | null
          created_at?: string | null
          date: string
          dentist_id?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          patient_id: string
          procedure_name?: string | null
          status?: Database["public"]["Enums"]["appointment_status"] | null
          time: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          clinic_id?: string | null
          created_at?: string | null
          date?: string
          dentist_id?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          patient_id?: string
          procedure_name?: string | null
          status?: Database["public"]["Enums"]["appointment_status"] | null
          time?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          clinic_id: string | null
          created_at: string | null
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          clinic_id?: string | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          clinic_id?: string | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_items: {
        Row: {
          budget_id: string
          created_at: string | null
          faces: string[]
          id: string
          tooth: string
        }
        Insert: {
          budget_id: string
          created_at?: string | null
          faces?: string[]
          id?: string
          tooth: string
        }
        Update: {
          budget_id?: string
          created_at?: string | null
          faces?: string[]
          id?: string
          tooth?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_items_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          clinic_id: string | null
          created_at: string | null
          created_by: string | null
          date: string
          id: string
          location: string | null
          location_rate: number | null
          notes: string | null
          patient_id: string
          status: string | null
          treatment: string
          updated_at: string | null
          value: number
        }
        Insert: {
          clinic_id?: string | null
          created_at?: string | null
          created_by?: string | null
          date?: string
          id?: string
          location?: string | null
          location_rate?: number | null
          notes?: string | null
          patient_id: string
          status?: string | null
          treatment: string
          updated_at?: string | null
          value?: number
        }
        Update: {
          clinic_id?: string | null
          created_at?: string | null
          created_by?: string | null
          date?: string
          id?: string
          location?: string | null
          location_rate?: number | null
          notes?: string | null
          patient_id?: string
          status?: string | null
          treatment?: string
          updated_at?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "budgets_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      card_brands: {
        Row: {
          clinic_id: string
          created_at: string | null
          id: string
          is_default: boolean | null
          name: string
        }
        Insert: {
          clinic_id: string
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name: string
        }
        Update: {
          clinic_id?: string
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_brands_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      card_fee_config: {
        Row: {
          anticipation_rate: number | null
          brand: string
          created_at: string
          id: string
          installments: number | null
          payment_type: string
          rate: number
          user_id: string
        }
        Insert: {
          anticipation_rate?: number | null
          brand: string
          created_at?: string
          id?: string
          installments?: number | null
          payment_type: string
          rate: number
          user_id: string
        }
        Update: {
          anticipation_rate?: number | null
          brand?: string
          created_at?: string
          id?: string
          installments?: number | null
          payment_type?: string
          rate?: number
          user_id?: string
        }
        Relationships: []
      }
      categorias_ponto: {
        Row: {
          ativo: boolean
          cor: string
          created_at: string | null
          created_by: string | null
          fazenda_id: string
          icone: string
          id: string
          nome: string
          ordem: number
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean
          cor?: string
          created_at?: string | null
          created_by?: string | null
          fazenda_id: string
          icone?: string
          id?: string
          nome: string
          ordem?: number
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean
          cor?: string
          created_at?: string | null
          created_by?: string | null
          fazenda_id?: string
          icone?: string
          id?: string
          nome?: string
          ordem?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categorias_ponto_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_invites: {
        Row: {
          clinic_id: string
          created_at: string
          email: string
          id: string
          role: string
          status: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          email: string
          id?: string
          role: string
          status?: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          email?: string
          id?: string
          role?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_invites_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_professionals: {
        Row: {
          accepts_new_patients: boolean | null
          clinic_id: string
          created_at: string | null
          default_appointment_duration: number | null
          google_calendar_id: string | null
          id: string
          is_active: boolean | null
          name: string
          profession: string | null
          specialty: string
          title: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          accepts_new_patients?: boolean | null
          clinic_id: string
          created_at?: string | null
          default_appointment_duration?: number | null
          google_calendar_id?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          profession?: string | null
          specialty: string
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          accepts_new_patients?: boolean | null
          clinic_id?: string
          created_at?: string | null
          default_appointment_duration?: number | null
          google_calendar_id?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          profession?: string | null
          specialty?: string
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinic_professionals_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_settings: {
        Row: {
          created_at: string | null
          id: string
          letterhead_url: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          letterhead_url?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          letterhead_url?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      clinic_users: {
        Row: {
          clinic_id: string
          created_at: string | null
          id: string
          invited_by: string | null
          role: string
          user_id: string
        }
        Insert: {
          clinic_id: string
          created_at?: string | null
          id?: string
          invited_by?: string | null
          role?: string
          user_id: string
        }
        Update: {
          clinic_id?: string
          created_at?: string | null
          id?: string
          invited_by?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_users_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinics: {
        Row: {
          address: string | null
          city: string | null
          created_at: string | null
          email: string | null
          id: string
          logo_url: string | null
          name: string
          phone: string | null
          state: string | null
          updated_at: string | null
          whatsapp_instance_name: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name: string
          phone?: string | null
          state?: string | null
          updated_at?: string | null
          whatsapp_instance_name?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
          state?: string | null
          updated_at?: string | null
          whatsapp_instance_name?: string | null
        }
        Relationships: []
      }
      consultations: {
        Row: {
          created_at: string | null
          date: string
          id: string
          notes: string | null
          patient_id: string
          suggested_return_date: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          notes?: string | null
          patient_id: string
          suggested_return_date?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          notes?: string | null
          patient_id?: string
          suggested_return_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consultations_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_coupons: {
        Row: {
          applicable_plan_ids: string[] | null
          code: string
          created_at: string | null
          description: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean | null
          max_uses: number | null
          updated_at: string | null
          used_count: number | null
          valid_from: string
          valid_until: string
        }
        Insert: {
          applicable_plan_ids?: string[] | null
          code: string
          created_at?: string | null
          description?: string | null
          discount_type: string
          discount_value: number
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          updated_at?: string | null
          used_count?: number | null
          valid_from: string
          valid_until: string
        }
        Update: {
          applicable_plan_ids?: string[] | null
          code?: string
          created_at?: string | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          updated_at?: string | null
          used_count?: number | null
          valid_from?: string
          valid_until?: string
        }
        Relationships: []
      }
      document_templates: {
        Row: {
          content: string
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      exams: {
        Row: {
          clinic_id: string | null
          created_at: string | null
          date: string
          description: string | null
          exam_date: string | null
          file_type: string | null
          file_url: string | null
          file_urls: string[] | null
          id: string
          name: string
          order_date: string
          patient_id: string
          procedure_id: string | null
          title: string
          type: string | null
          updated_at: string | null
        }
        Insert: {
          clinic_id?: string | null
          created_at?: string | null
          date: string
          description?: string | null
          exam_date?: string | null
          file_type?: string | null
          file_url?: string | null
          file_urls?: string[] | null
          id?: string
          name: string
          order_date: string
          patient_id: string
          procedure_id?: string | null
          title: string
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          clinic_id?: string | null
          created_at?: string | null
          date?: string
          description?: string | null
          exam_date?: string | null
          file_type?: string | null
          file_url?: string | null
          file_urls?: string[] | null
          id?: string
          name?: string
          order_date?: string
          patient_id?: string
          procedure_id?: string | null
          title?: string
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exams_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_procedure_id_fkey"
            columns: ["procedure_id"]
            isOneToOne: false
            referencedRelation: "procedures"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_settings: {
        Row: {
          anticipation_rate: number | null
          created_at: string
          id: string
          tax_rate: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          anticipation_rate?: number | null
          created_at?: string
          id?: string
          tax_rate?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          anticipation_rate?: number | null
          created_at?: string
          id?: string
          tax_rate?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      financial_transactions: {
        Row: {
          amount: number
          anticipation_amount: number | null
          anticipation_rate: number | null
          card_fee_amount: number | null
          card_fee_rate: number | null
          category: string
          clinic_id: string | null
          commission_amount: number | null
          commission_rate: number | null
          created_at: string
          created_by: string | null
          date: string
          description: string
          id: string
          irrf_amount: number | null
          is_deductible: boolean | null
          location: string | null
          location_amount: number | null
          location_rate: number | null
          net_amount: number | null
          patient_id: string | null
          payer_cpf: string | null
          payer_is_patient: boolean | null
          payer_name: string | null
          payer_type: string | null
          payment_method: string | null
          pj_source_id: string | null
          receipt_attachment_url: string | null
          receipt_number: string | null
          recurrence_id: string | null
          related_entity_id: string | null
          supplier_cpf_cnpj: string | null
          supplier_name: string | null
          tax_amount: number | null
          tax_rate: number | null
          type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount: number
          anticipation_amount?: number | null
          anticipation_rate?: number | null
          card_fee_amount?: number | null
          card_fee_rate?: number | null
          category: string
          clinic_id?: string | null
          commission_amount?: number | null
          commission_rate?: number | null
          created_at?: string
          created_by?: string | null
          date: string
          description: string
          id?: string
          irrf_amount?: number | null
          is_deductible?: boolean | null
          location?: string | null
          location_amount?: number | null
          location_rate?: number | null
          net_amount?: number | null
          patient_id?: string | null
          payer_cpf?: string | null
          payer_is_patient?: boolean | null
          payer_name?: string | null
          payer_type?: string | null
          payment_method?: string | null
          pj_source_id?: string | null
          receipt_attachment_url?: string | null
          receipt_number?: string | null
          recurrence_id?: string | null
          related_entity_id?: string | null
          supplier_cpf_cnpj?: string | null
          supplier_name?: string | null
          tax_amount?: number | null
          tax_rate?: number | null
          type: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          anticipation_amount?: number | null
          anticipation_rate?: number | null
          card_fee_amount?: number | null
          card_fee_rate?: number | null
          category?: string
          clinic_id?: string | null
          commission_amount?: number | null
          commission_rate?: number | null
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string
          id?: string
          irrf_amount?: number | null
          is_deductible?: boolean | null
          location?: string | null
          location_amount?: number | null
          location_rate?: number | null
          net_amount?: number | null
          patient_id?: string | null
          payer_cpf?: string | null
          payer_is_patient?: boolean | null
          payer_name?: string | null
          payer_type?: string | null
          payment_method?: string | null
          pj_source_id?: string | null
          receipt_attachment_url?: string | null
          receipt_number?: string | null
          recurrence_id?: string | null
          related_entity_id?: string | null
          supplier_cpf_cnpj?: string | null
          supplier_name?: string | null
          tax_amount?: number | null
          tax_rate?: number | null
          type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_pj_source_id_fkey"
            columns: ["pj_source_id"]
            isOneToOne: false
            referencedRelation: "pj_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      fiscal_document_reminders: {
        Row: {
          category: string
          clinic_id: string
          created_at: string
          description: string | null
          due_date: string
          frequency: string
          id: string
          is_active: boolean | null
          subcategory: string | null
          tax_regime: string
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          clinic_id: string
          created_at?: string
          description?: string | null
          due_date: string
          frequency?: string
          id?: string
          is_active?: boolean | null
          subcategory?: string | null
          tax_regime: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          clinic_id?: string
          created_at?: string
          description?: string | null
          due_date?: string
          frequency?: string
          id?: string
          is_active?: boolean | null
          subcategory?: string | null
          tax_regime?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fiscal_document_reminders_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      fiscal_documents: {
        Row: {
          category: string
          clinic_id: string
          created_at: string
          description: string | null
          expiration_date: string | null
          file_size: number
          file_type: string
          file_url: string
          fiscal_year: number
          id: string
          name: string
          notes: string | null
          reference_month: number | null
          reminder_days_before: number | null
          reminder_enabled: boolean | null
          subcategory: string | null
          tax_regime: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          category: string
          clinic_id: string
          created_at?: string
          description?: string | null
          expiration_date?: string | null
          file_size?: number
          file_type?: string
          file_url: string
          fiscal_year: number
          id?: string
          name: string
          notes?: string | null
          reference_month?: number | null
          reminder_days_before?: number | null
          reminder_enabled?: boolean | null
          subcategory?: string | null
          tax_regime: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          category?: string
          clinic_id?: string
          created_at?: string
          description?: string | null
          expiration_date?: string | null
          file_size?: number
          file_type?: string
          file_url?: string
          fiscal_year?: number
          id?: string
          name?: string
          notes?: string | null
          reference_month?: number | null
          reminder_days_before?: number | null
          reminder_enabled?: boolean | null
          subcategory?: string | null
          tax_regime?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fiscal_documents_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiscal_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fiscal_profiles: {
        Row: {
          clinic_id: string
          created_at: string | null
          id: string
          pf_address: string | null
          pf_city: string | null
          pf_cpf: string | null
          pf_cro: string | null
          pf_enabled: boolean | null
          pf_state: string | null
          pf_uses_carne_leao: boolean | null
          pf_zip_code: string | null
          pj_cnae: string | null
          pj_cnpj: string | null
          pj_enabled: boolean | null
          pj_nome_fantasia: string | null
          pj_razao_social: string | null
          pj_regime_tributario: string | null
          simples_anexo: string | null
          simples_fator_r_mode: string | null
          simples_monthly_payroll: number | null
          updated_at: string | null
        }
        Insert: {
          clinic_id: string
          created_at?: string | null
          id?: string
          pf_address?: string | null
          pf_city?: string | null
          pf_cpf?: string | null
          pf_cro?: string | null
          pf_enabled?: boolean | null
          pf_state?: string | null
          pf_uses_carne_leao?: boolean | null
          pf_zip_code?: string | null
          pj_cnae?: string | null
          pj_cnpj?: string | null
          pj_enabled?: boolean | null
          pj_nome_fantasia?: string | null
          pj_razao_social?: string | null
          pj_regime_tributario?: string | null
          simples_anexo?: string | null
          simples_fator_r_mode?: string | null
          simples_monthly_payroll?: number | null
          updated_at?: string | null
        }
        Update: {
          clinic_id?: string
          created_at?: string | null
          id?: string
          pf_address?: string | null
          pf_city?: string | null
          pf_cpf?: string | null
          pf_cro?: string | null
          pf_enabled?: boolean | null
          pf_state?: string | null
          pf_uses_carne_leao?: boolean | null
          pf_zip_code?: string | null
          pj_cnae?: string | null
          pj_cnpj?: string | null
          pj_enabled?: boolean | null
          pj_nome_fantasia?: string | null
          pj_razao_social?: string | null
          pj_regime_tributario?: string | null
          simples_anexo?: string | null
          simples_fator_r_mode?: string | null
          simples_monthly_payroll?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fiscal_profiles_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: true
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      iss_municipal_rates: {
        Row: {
          city: string
          clinic_id: string
          created_at: string | null
          id: string
          is_default: boolean | null
          rate: number
          state: string
          updated_at: string | null
        }
        Insert: {
          city: string
          clinic_id: string
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          rate: number
          state: string
          updated_at?: string | null
        }
        Update: {
          city?: string
          clinic_id?: string
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          rate?: number
          state?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "iss_municipal_rates_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          address: string | null
          clinic_id: string | null
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          address?: string | null
          clinic_id?: string | null
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          address?: string | null
          clinic_id?: string | null
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "locations_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      n8n_fila_mensagens: {
        Row: {
          created_at: string | null
          id: number
          id_mensagem: string
          instancia: string
          mensagem: string
          telefone: string
          timestamp: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          id_mensagem: string
          instancia: string
          mensagem: string
          telefone: string
          timestamp: string
        }
        Update: {
          created_at?: string | null
          id?: number
          id_mensagem?: string
          instancia?: string
          mensagem?: string
          telefone?: string
          timestamp?: string
        }
        Relationships: []
      }
      n8n_historico_mensagens: {
        Row: {
          created_at: string | null
          id: number
          message: Json
          session_id: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          message: Json
          session_id: string
        }
        Update: {
          created_at?: string | null
          id?: number
          message?: Json
          session_id?: string
        }
        Relationships: []
      }
      patient_documents: {
        Row: {
          category: string | null
          clinic_id: string | null
          created_at: string | null
          description: string | null
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          name: string
          patient_id: string
          updated_at: string | null
          uploaded_at: string | null
        }
        Insert: {
          category?: string | null
          clinic_id?: string | null
          created_at?: string | null
          description?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          name: string
          patient_id: string
          updated_at?: string | null
          uploaded_at?: string | null
        }
        Update: {
          category?: string | null
          clinic_id?: string | null
          created_at?: string | null
          description?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          name?: string
          patient_id?: string
          updated_at?: string | null
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_patient_documents_clinic"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_documents_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          address: string | null
          allergies: string | null
          avatar_url: string | null
          birth_date: string | null
          city: string | null
          clinic_id: string | null
          cpf: string | null
          created_at: string | null
          email: string | null
          emergency_contact: string | null
          emergency_phone: string | null
          health_insurance: string | null
          health_insurance_number: string | null
          id: string
          medical_history: string | null
          medications: string | null
          name: string
          notes: string | null
          occupation: string | null
          phone: string
          return_alert_date: string | null
          return_alert_flag: boolean | null
          rg: string | null
          state: string | null
          updated_at: string | null
          user_id: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          allergies?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          city?: string | null
          clinic_id?: string | null
          cpf?: string | null
          created_at?: string | null
          email?: string | null
          emergency_contact?: string | null
          emergency_phone?: string | null
          health_insurance?: string | null
          health_insurance_number?: string | null
          id?: string
          medical_history?: string | null
          medications?: string | null
          name: string
          notes?: string | null
          occupation?: string | null
          phone: string
          return_alert_date?: string | null
          return_alert_flag?: boolean | null
          rg?: string | null
          state?: string | null
          updated_at?: string | null
          user_id?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          allergies?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          city?: string | null
          clinic_id?: string | null
          cpf?: string | null
          created_at?: string | null
          email?: string | null
          emergency_contact?: string | null
          emergency_phone?: string | null
          health_insurance?: string | null
          health_insurance_number?: string | null
          id?: string
          medical_history?: string | null
          medications?: string | null
          name?: string
          notes?: string | null
          occupation?: string | null
          phone?: string
          return_alert_date?: string | null
          return_alert_flag?: boolean | null
          rg?: string | null
          state?: string | null
          updated_at?: string | null
          user_id?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patients_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      pj_sources: {
        Row: {
          clinic_id: string
          cnpj: string
          created_at: string | null
          id: string
          is_active: boolean | null
          nome_fantasia: string | null
          razao_social: string
          updated_at: string | null
        }
        Insert: {
          clinic_id: string
          cnpj: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          nome_fantasia?: string | null
          razao_social: string
          updated_at?: string | null
        }
        Update: {
          clinic_id?: string
          cnpj?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          nome_fantasia?: string | null
          razao_social?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pj_sources_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      procedures: {
        Row: {
          clinic_id: string | null
          created_at: string | null
          created_by: string | null
          date: string
          description: string | null
          id: string
          installments: number | null
          location: string | null
          patient_id: string
          payment_method: string | null
          status: string | null
          updated_at: string | null
          value: number | null
        }
        Insert: {
          clinic_id?: string | null
          created_at?: string | null
          created_by?: string | null
          date: string
          description?: string | null
          id?: string
          installments?: number | null
          location?: string | null
          patient_id: string
          payment_method?: string | null
          status?: string | null
          updated_at?: string | null
          value?: number | null
        }
        Update: {
          clinic_id?: string | null
          created_at?: string | null
          created_by?: string | null
          date?: string
          description?: string | null
          id?: string
          installments?: number | null
          location?: string | null
          patient_id?: string
          payment_method?: string | null
          status?: string | null
          updated_at?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "procedures_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procedures_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          gender: string | null
          id: string
          is_super_admin: boolean | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          gender?: string | null
          id: string
          is_super_admin?: boolean | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          is_super_admin?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      reminders: {
        Row: {
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          is_active: boolean | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_active?: boolean | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_active?: boolean | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      shopping_orders: {
        Row: {
          clinic_id: string
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          id: string
          items: Json
          status: string
          total_amount: number
        }
        Insert: {
          clinic_id: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          items?: Json
          status?: string
          total_amount?: number
        }
        Update: {
          clinic_id?: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          items?: Json
          status?: string
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "shopping_orders_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          created_at: string | null
          description: string | null
          features: Json
          id: string
          is_active: boolean | null
          max_locations: number | null
          max_patients: number | null
          max_users: number
          name: string
          price_monthly: number
          price_yearly: number | null
          slug: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          features?: Json
          id?: string
          is_active?: boolean | null
          max_locations?: number | null
          max_patients?: number | null
          max_users?: number
          name: string
          price_monthly: number
          price_yearly?: number | null
          slug: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          features?: Json
          id?: string
          is_active?: boolean | null
          max_locations?: number | null
          max_patients?: number | null
          max_users?: number
          name?: string
          price_monthly?: number
          price_yearly?: number | null
          slug?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          clinic_id: string
          created_at: string | null
          current_period_end: string
          current_period_start: string
          id: string
          pending_plan_id: string | null
          plan_id: string
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string | null
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          clinic_id: string
          created_at?: string | null
          current_period_end: string
          current_period_start?: string
          id?: string
          pending_plan_id?: string | null
          plan_id: string
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
        }
        Update: {
          cancel_at_period_end?: boolean | null
          clinic_id?: string
          created_at?: string | null
          current_period_end?: string
          current_period_start?: string
          id?: string
          pending_plan_id?: string | null
          plan_id?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_pending_plan_id_fkey"
            columns: ["pending_plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_config: {
        Row: {
          created_at: string | null
          id: string
          name: string
          rate: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          rate: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          rate?: number
          user_id?: string
        }
        Relationships: []
      }
      tax_rate_brackets: {
        Row: {
          bracket_order: number
          created_at: string | null
          deduction: number | null
          id: string
          max_value: number | null
          min_value: number
          rate: number
          tax_configuration_id: string
          updated_at: string | null
        }
        Insert: {
          bracket_order: number
          created_at?: string | null
          deduction?: number | null
          id?: string
          max_value?: number | null
          min_value: number
          rate: number
          tax_configuration_id: string
          updated_at?: string | null
        }
        Update: {
          bracket_order?: number
          created_at?: string | null
          deduction?: number | null
          id?: string
          max_value?: number | null
          min_value?: number
          rate?: number
          tax_configuration_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tax_rate_brackets_tax_configuration_id_fkey"
            columns: ["tax_configuration_id"]
            isOneToOne: false
            referencedRelation: "tax_rate_configurations"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_rate_configurations: {
        Row: {
          clinic_id: string
          created_at: string | null
          description: string | null
          effective_from: string | null
          flat_rate: number | null
          id: string
          is_active: boolean | null
          presumption_rate: number | null
          rate_type: string
          tax_regime: string
          tax_type: string
          updated_at: string | null
        }
        Insert: {
          clinic_id: string
          created_at?: string | null
          description?: string | null
          effective_from?: string | null
          flat_rate?: number | null
          id?: string
          is_active?: boolean | null
          presumption_rate?: number | null
          rate_type: string
          tax_regime: string
          tax_type: string
          updated_at?: string | null
        }
        Update: {
          clinic_id?: string
          created_at?: string | null
          description?: string | null
          effective_from?: string | null
          flat_rate?: number | null
          id?: string
          is_active?: boolean | null
          presumption_rate?: number | null
          rate_type?: string
          tax_regime?: string
          tax_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tax_rate_configurations_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      vw_ai_secretary_schedule: {
        Row: {
          clinic_id: string | null
          day_of_week: number | null
          dia_semana: string | null
          horario_fim: string | null
          horario_inicio: string | null
          is_active: boolean | null
          local_endereco: string | null
          local_nome: string | null
          professional_ids: string | null
          schedule_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_secretary_schedule_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      admin_get_all_users_with_subscriptions: {
        Args: never
        Returns: {
          clinic_id: string
          clinic_name: string
          created_at: string
          email: string
          full_name: string
          id: string
          plan_name: string
          subscription_status: string
          trial_ends_at: string
        }[]
      }
      admin_get_overview_metrics: {
        Args: { p_end_date: string; p_start_date: string }
        Returns: Json
      }
      admin_get_recent_clinics: { Args: { p_limit?: number }; Returns: Json }
      ai_cancel_appointment:
        | {
            Args: { p_appointment_id: string; p_clinic_id: string }
            Returns: boolean
          }
        | {
            Args: {
              p_appointment_id: string
              p_clinic_id: string
              p_reason?: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_clinic_id: string
              p_date?: string
              p_patient_phone: string
            }
            Returns: Json
          }
      ai_confirm_appointment: {
        Args: { p_appointment_id: string; p_clinic_id: string }
        Returns: boolean
      }
      ai_create_appointment:
        | {
            Args: {
              p_clinic_id: string
              p_date: string
              p_notes?: string
              p_patient_id: string
              p_professional_id?: string
              p_time: string
            }
            Returns: string
          }
        | {
            Args: {
              p_clinic_id: string
              p_date: string
              p_notes?: string
              p_patient_id: string
              p_procedure_name?: string
              p_professional_id: string
              p_time: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_clinic_id: string
              p_date: string
              p_notes?: string
              p_patient_name: string
              p_patient_phone: string
              p_procedure_name?: string
              p_professional_user_id?: string
              p_time: string
            }
            Returns: Json
          }
      ai_create_patient:
        | {
            Args: { p_clinic_id: string; p_name: string; p_phone: string }
            Returns: string
          }
        | {
            Args: {
              p_birth_date?: string
              p_clinic_id: string
              p_email?: string
              p_name: string
              p_notes?: string
              p_phone: string
            }
            Returns: Json
          }
      ai_find_or_create_patient:
        | {
            Args: { p_clinic_id: string; p_name: string; p_phone: string }
            Returns: string
          }
        | {
            Args: {
              p_birth_date?: string
              p_clinic_id: string
              p_email?: string
              p_name: string
              p_phone: string
            }
            Returns: Json
          }
      ai_find_patient_by_phone: {
        Args: { p_clinic_id: string; p_phone: string }
        Returns: {
          patient_id: string
          patient_name: string
          patient_phone: string
        }[]
      }
      ai_get_available_slots:
        | {
            Args: {
              p_clinic_id: string
              p_date: string
              p_professional_id?: string
            }
            Returns: {
              is_available: boolean
              slot_time: string
              slot_time_str: string
            }[]
          }
        | {
            Args: {
              p_clinic_id: string
              p_date: string
              p_duration_minutes?: number
              p_professional_id: string
            }
            Returns: Json
          }
      ai_get_next_appointment:
        | {
            Args: { p_clinic_id: string; p_patient_id: string }
            Returns: {
              appointment_date: string
              appointment_id: string
              appointment_status: string
              appointment_time: string
            }[]
          }
        | { Args: { p_clinic_id: string; p_phone: string }; Returns: Json }
      ai_get_patient_appointments:
        | {
            Args: { p_clinic_id: string; p_patient_id: string }
            Returns: {
              appointment_date: string
              appointment_id: string
              appointment_status: string
              appointment_time: string
            }[]
          }
        | {
            Args: {
              p_clinic_id: string
              p_include_past?: boolean
              p_patient_id: string
            }
            Returns: Json
          }
        | {
            Args: { p_clinic_id: string; p_patient_phone: string }
            Returns: Json
          }
      ai_get_professionals: {
        Args: { p_clinic_id: string }
        Returns: {
          professional_id: string
          professional_name: string
          specialty: string
        }[]
      }
      ai_get_tomorrow_appointments: {
        Args: { p_clinic_id: string }
        Returns: {
          appointment_id: string
          appointment_time: string
          patient_name: string
          patient_phone: string
        }[]
      }
      ai_list_professionals: {
        Args: { p_clinic_id: string }
        Returns: {
          professional_id: string
          professional_name: string
          specialty: string
        }[]
      }
      ai_reschedule_appointment:
        | {
            Args: {
              p_appointment_id: string
              p_clinic_id: string
              p_new_date: string
              p_new_time: string
            }
            Returns: boolean
          }
        | {
            Args: {
              p_appointment_id: string
              p_clinic_id: string
              p_new_date: string
              p_new_time: string
              p_notes?: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_clinic_id: string
              p_new_date: string
              p_new_time: string
              p_old_date?: string
              p_patient_phone: string
            }
            Returns: Json
          }
      check_availability: {
        Args: {
          p_clinic_id: string
          p_date_str: string
          p_professional_id?: string
          p_time_str: string
        }
        Returns: {
          disponivel: boolean
          horario_configurado: boolean
          local_sugerido: string
          mensagem: string
          profissionais_disponiveis: string
        }[]
      }
      check_patient_access: { Args: { p_patient_id: string }; Returns: boolean }
      cleanup_old_history: { Args: never; Returns: undefined }
      cleanup_old_queue_messages: { Args: never; Returns: undefined }
      generate_ai_secretary_prompt:
        | { Args: { p_clinic_id: string }; Returns: string }
        | { Args: { p_instance_name: string }; Returns: string }
      get_ai_secretary_behavior: {
        Args: { p_clinic_id: string }
        Returns: Json
      }
      get_ai_secretary_config:
        | { Args: { p_clinic_id: string }; Returns: Json }
        | { Args: { p_instance_name: string }; Returns: Json }
      get_appointments_by_date: {
        Args: { p_clinic_id: string; p_date_str: string }
        Returns: {
          agendamento_id: string
          data: string
          hora: string
          local_nome: string
          paciente: string
          profissional: string
          status: string
        }[]
      }
      get_available_slots: {
        Args: {
          p_clinic_id: string
          p_date_str: string
          p_interval_minutes?: number
        }
        Returns: {
          horario: string
          local_nome: string
          profissionais: string
          status: string
        }[]
      }
      get_clinic_schedule: {
        Args: { p_clinic_id: string }
        Returns: {
          dia_semana: string
          horario_fim: string
          horario_inicio: string
          local_nome: string
          profissionais: string
          schedule_id: string
        }[]
      }
      get_profiles_for_users: {
        Args: { user_ids: string[] }
        Returns: {
          email: string
          full_name: string
          id: string
        }[]
      }
      get_user_clinic_id: { Args: never; Returns: string }
      get_user_clinic_ids: { Args: never; Returns: string[] }
      get_user_email_by_id: { Args: { p_user_id: string }; Returns: string }
      get_user_id_by_email: { Args: { p_email: string }; Returns: string }
      get_user_role: { Args: never; Returns: string }
      invite_or_add_user: {
        Args: { p_clinic_id: string; p_email: string; p_role: string }
        Returns: Json
      }
      is_phone_blocked:
        | { Args: { p_clinic_id: string; p_phone: string }; Returns: boolean }
        | {
            Args: { p_instance_name: string; p_phone: string }
            Returns: boolean
          }
      log_ai_message:
        | {
            Args: {
              p_content: string
              p_conversation_id: string
              p_role: string
            }
            Returns: string
          }
        | {
            Args: {
              p_confidence?: number
              p_content: string
              p_conversation_id: string
              p_intent?: string
              p_sender: string
            }
            Returns: string
          }
      seed_default_tax_rates: {
        Args: { p_clinic_id: string }
        Returns: undefined
      }
      start_ai_conversation:
        | {
            Args: {
              p_clinic_id: string
              p_patient_name?: string
              p_phone: string
            }
            Returns: string
          }
        | {
            Args: {
              p_contact_name?: string
              p_instance_name: string
              p_phone: string
            }
            Returns: string
          }
      transfer_to_human:
        | { Args: { p_conversation_id: string }; Returns: undefined }
        | {
            Args: { p_conversation_id: string; p_reason?: string }
            Returns: boolean
          }
      upsert_ai_secretary_behavior:
        | {
            Args: {
              p_away_message?: string
              p_behavior_rules?: Json
              p_clinic_id: string
              p_greeting_message?: string
              p_is_active?: boolean
              p_persona_name?: string
              p_quick_replies?: Json
              p_transfer_message?: string
            }
            Returns: string
          }
        | { Args: { p_clinic_id: string; p_settings: Json }; Returns: Json }
      user_can_edit: { Args: never; Returns: boolean }
      user_is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      appointment_status:
        | "scheduled"
        | "confirmed"
        | "completed"
        | "cancelled"
        | "no_show"
        | "rescheduled"
      subscription_status: "active" | "past_due" | "canceled" | "trialing"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      appointment_status: [
        "scheduled",
        "confirmed",
        "completed",
        "cancelled",
        "no_show",
        "rescheduled",
      ],
      subscription_status: ["active", "past_due", "canceled", "trialing"],
    },
  },
} as const

// Helper types for easier usage
export type Patient = Database['public']['Tables']['patients']['Row']
export type PatientInsert = Database['public']['Tables']['patients']['Insert']
export type PatientUpdate = Database['public']['Tables']['patients']['Update']

export type Consultation = Database['public']['Tables']['consultations']['Row']
export type ConsultationInsert = Database['public']['Tables']['consultations']['Insert']
export type ConsultationUpdate = Database['public']['Tables']['consultations']['Update']

export type Appointment = Database['public']['Tables']['appointments']['Row']
export type AppointmentInsert = Database['public']['Tables']['appointments']['Insert']
export type AppointmentUpdate = Database['public']['Tables']['appointments']['Update']

export type Procedure = Database['public']['Tables']['procedures']['Row']
export type ProcedureWithCreator = Procedure & {
  created_by_name?: string | null
}
export type ProcedureInsert = Database['public']['Tables']['procedures']['Insert']
export type ProcedureUpdate = Database['public']['Tables']['procedures']['Update']

export type Exam = Database['public']['Tables']['exams']['Row']
export type ExamInsert = Database['public']['Tables']['exams']['Insert']
export type ExamUpdate = Database['public']['Tables']['exams']['Update']

export type Anamnese = Database['public']['Tables']['anamneses']['Row']
export type AnamneseInsert = Database['public']['Tables']['anamneses']['Insert']
export type AnamneseUpdate = Database['public']['Tables']['anamneses']['Update']

export type Budget = Database['public']['Tables']['budgets']['Row']
export type BudgetInsert = Database['public']['Tables']['budgets']['Insert']
export type BudgetUpdate = Database['public']['Tables']['budgets']['Update']

export type BudgetWithItems = Budget & {
  budget_items?: Database['public']['Tables']['budget_items']['Row'][]
  created_by_name?: string | null
}

export type BudgetItem = Database['public']['Tables']['budget_items']['Row']
export type BudgetItemInsert = Database['public']['Tables']['budget_items']['Insert']
export type BudgetItemUpdate = Database['public']['Tables']['budget_items']['Update']

export type FinancialTransaction = Database['public']['Tables']['financial_transactions']['Row']
export type FinancialTransactionInsert = Database['public']['Tables']['financial_transactions']['Insert']
export type FinancialTransactionUpdate = Database['public']['Tables']['financial_transactions']['Update']

export type FinancialSettings = Database['public']['Tables']['financial_settings']['Row']
export type FinancialSettingsInsert = Database['public']['Tables']['financial_settings']['Insert']
export type FinancialSettingsUpdate = Database['public']['Tables']['financial_settings']['Update']

export type CardFeeConfig = Database['public']['Tables']['card_fee_config']['Row']
export type CardFeeConfigInsert = Database['public']['Tables']['card_fee_config']['Insert']
export type CardFeeConfigUpdate = Database['public']['Tables']['card_fee_config']['Update']

export type SubscriptionPlan = Database['public']['Tables']['subscription_plans']['Row']
export type SubscriptionPlanInsert = Database['public']['Tables']['subscription_plans']['Insert']
export type SubscriptionPlanUpdate = Database['public']['Tables']['subscription_plans']['Update']

export type DiscountCoupon = Database['public']['Tables']['discount_coupons']['Row']
export type DiscountCouponInsert = Database['public']['Tables']['discount_coupons']['Insert']
export type DiscountCouponUpdate = Database['public']['Tables']['discount_coupons']['Update']

export type TaxConfig = Database['public']['Tables']['tax_config']['Row']
export type TaxConfigInsert = Database['public']['Tables']['tax_config']['Insert']
export type TaxConfigUpdate = Database['public']['Tables']['tax_config']['Update']

// Extended types with relations
export type AppointmentWithPatient = Appointment & {
  patients: Pick<Patient, 'name' | 'phone'>
  clinic_professionals?: { name: string } | null
}

export type ConsultationWithPatient = Consultation & {
  patients: Pick<Patient, 'name'>
}

// Return alert type (computed from consultations)
export type ReturnAlert = {
  patient_id: string
  patient_name: string
  phone: string
  suggested_return_date: string
  days_until_return: number
}

// Form data type for patient registration
export type PatientFormData = {
  name: string
  phone: string
  email: string
  birthDate: string
  cpf: string
  rg: string
  address: string
  city: string
  state: string
  zipCode: string
  occupation: string
  emergencyContact: string
  emergencyPhone: string
  healthInsurance: string
  healthInsuranceNumber: string
  allergies: string
  medications: string
  medicalHistory: string
  notes: string
  // Child patient (odontopediatria) fields
  patientType: string
  gender: string
  birthplace: string
  school: string
  schoolGrade: string
  motherName: string
  motherOccupation: string
  motherPhone: string
  fatherName: string
  fatherOccupation: string
  fatherPhone: string
  legalGuardian: string
  hasSiblings: boolean
  siblingsCount: string
  siblingsAges: string
}

// Document Templates
export type DocumentTemplate = {
  id: string
  user_id: string
  name: string
  content: string
  created_at: string
  updated_at: string
}

export type DocumentTemplateInsert = {
  id?: string
  user_id: string
  name: string
  content: string
  created_at?: string
  updated_at?: string
}

export type DocumentTemplateUpdate = {
  name?: string
  content?: string
  updated_at?: string
}

// Patient Documents (for file uploads)
export type PatientDocument = {
  id: string
  patient_id: string
  name: string
  description: string | null
  file_url: string
  file_type: 'image' | 'pdf' | 'document'
  file_size: number
  category: 'exam' | 'xray' | 'photo' | 'document' | 'prescription' | null
  uploaded_at: string
  created_at: string
}

export type PatientDocumentInsert = {
  id?: string
  patient_id: string
  name: string
  description?: string | null
  file_url: string
  file_type?: 'image' | 'pdf' | 'document'
  file_size?: number
  category?: 'exam' | 'xray' | 'photo' | 'document' | 'prescription' | null
  uploaded_at?: string
  created_at?: string
}

// Fiscal/IR Types
export type FiscalProfile = Database['public']['Tables']['fiscal_profiles']['Row']
export type FiscalProfileInsert = Database['public']['Tables']['fiscal_profiles']['Insert']
export type FiscalProfileUpdate = Database['public']['Tables']['fiscal_profiles']['Update']

export type PJSource = Database['public']['Tables']['pj_sources']['Row']
export type PJSourceInsert = Database['public']['Tables']['pj_sources']['Insert']
export type PJSourceUpdate = Database['public']['Tables']['pj_sources']['Update']

// Transaction with IR relations
export type FinancialTransactionWithIR = FinancialTransaction & {
  patient?: Pick<Patient, 'name' | 'cpf'> | null
  pj_source?: PJSource | null
  created_by_name?: string | null
}
