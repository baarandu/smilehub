export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      patients: {
        Row: {
          id: string
          name: string
          phone: string
          email: string | null
          birth_date: string | null
          cpf: string | null
          rg: string | null
          address: string | null
          city: string | null
          state: string | null
          zip_code: string | null
          occupation: string | null
          emergency_contact: string | null
          emergency_phone: string | null
          health_insurance: string | null
          health_insurance_number: string | null
          allergies: string | null
          medications: string | null
          medical_history: string | null
          avatar_url: string | null
          notes: string | null
          clinic_id: string | null
          user_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          phone: string
          email?: string | null
          birth_date?: string | null
          cpf?: string | null
          rg?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          zip_code?: string | null
          occupation?: string | null
          emergency_contact?: string | null
          emergency_phone?: string | null
          health_insurance?: string | null
          health_insurance_number?: string | null
          allergies?: string | null
          medications?: string | null
          medical_history?: string | null
          avatar_url?: string | null
          notes?: string | null
          clinic_id?: string | null
          user_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          phone?: string
          email?: string | null
          birth_date?: string | null
          cpf?: string | null
          rg?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          zip_code?: string | null
          occupation?: string | null
          emergency_contact?: string | null
          emergency_phone?: string | null
          health_insurance?: string | null
          health_insurance_number?: string | null
          allergies?: string | null
          medications?: string | null
          medical_history?: string | null
          avatar_url?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      consultations: {
        Row: {
          id: string
          patient_id: string
          date: string
          notes: string | null
          suggested_return_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          patient_id: string
          date: string
          notes?: string | null
          suggested_return_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          patient_id?: string
          date?: string
          notes?: string | null
          suggested_return_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      procedures: {
        Row: {
          id: string
          patient_id: string
          date: string
          description: string
          value: number
          payment_method: string | null
          installments: number | null
          location: string | null
          status: 'pending' | 'in_progress' | 'completed'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          patient_id: string
          date: string
          description: string
          value: number
          payment_method?: string | null
          installments?: number | null
          location?: string | null
          status?: 'pending' | 'in_progress' | 'completed'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          patient_id?: string
          date?: string
          description?: string
          value?: number
          payment_method?: string | null
          installments?: number | null
          location?: string | null
          status?: 'pending' | 'in_progress' | 'completed'
          created_at?: string
          updated_at?: string
        }
      }
      appointments: {
        Row: {
          id: string
          patient_id: string
          date: string
          time: string
          status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled'
          location: string | null
          notes: string | null
          procedure_name: string | null
          clinic_id: string | null
          user_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          patient_id: string
          date: string
          time: string
          status?: 'scheduled' | 'confirmed' | 'completed' | 'cancelled'
          location?: string | null
          notes?: string | null
          procedure_name?: string | null
          clinic_id?: string | null
          user_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          patient_id?: string
          date?: string
          time?: string
          status?: 'scheduled' | 'confirmed' | 'completed' | 'cancelled'
          location?: string | null
          notes?: string | null
          procedure_name?: string | null
          clinic_id?: string | null
          user_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      anamneses: {
        Row: {
          id: string
          patient_id: string
          date: string
          medical_treatment: boolean
          medical_treatment_details: string | null
          recent_surgery: boolean
          recent_surgery_details: string | null
          healing_problems: boolean
          healing_problems_details: string | null
          current_medication: boolean
          current_medication_details: string | null
          local_anesthesia_history: boolean
          anesthesia_reaction: boolean
          anesthesia_reaction_details: string | null
          pregnant_or_breastfeeding: boolean
          smoker_or_drinker: boolean
          smoker_or_drinker_details: string | null
          fasting: boolean
          diabetes: boolean
          diabetes_details: string | null
          depression_anxiety_panic: boolean
          depression_anxiety_panic_details: string | null
          seizure_epilepsy: boolean
          seizure_epilepsy_details: string | null
          heart_disease: boolean
          heart_disease_details: string | null
          hypertension: boolean
          pacemaker: boolean
          infectious_disease: boolean
          infectious_disease_details: string | null
          arthritis: boolean
          gastritis_reflux: boolean
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          patient_id: string
          date: string
          medical_treatment?: boolean
          medical_treatment_details?: string | null
          recent_surgery?: boolean
          recent_surgery_details?: string | null
          healing_problems?: boolean
          healing_problems_details?: string | null
          current_medication?: boolean
          current_medication_details?: string | null
          local_anesthesia_history?: boolean
          anesthesia_reaction?: boolean
          anesthesia_reaction_details?: string | null
          pregnant_or_breastfeeding?: boolean
          smoker_or_drinker?: boolean
          smoker_or_drinker_details?: string | null
          fasting?: boolean
          diabetes?: boolean
          diabetes_details?: string | null
          depression_anxiety_panic?: boolean
          depression_anxiety_panic_details?: string | null
          seizure_epilepsy?: boolean
          seizure_epilepsy_details?: string | null
          heart_disease?: boolean
          heart_disease_details?: string | null
          hypertension?: boolean
          pacemaker?: boolean
          infectious_disease?: boolean
          infectious_disease_details?: string | null
          arthritis?: boolean
          gastritis_reflux?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          patient_id?: string
          date?: string
          medical_treatment?: boolean
          medical_treatment_details?: string | null
          recent_surgery?: boolean
          recent_surgery_details?: string | null
          healing_problems?: boolean
          healing_problems_details?: string | null
          current_medication?: boolean
          current_medication_details?: string | null
          local_anesthesia_history?: boolean
          anesthesia_reaction?: boolean
          anesthesia_reaction_details?: string | null
          pregnant_or_breastfeeding?: boolean
          smoker_or_drinker?: boolean
          smoker_or_drinker_details?: string | null
          fasting?: boolean
          diabetes?: boolean
          diabetes_details?: string | null
          depression_anxiety_panic?: boolean
          depression_anxiety_panic_details?: string | null
          seizure_epilepsy?: boolean
          seizure_epilepsy_details?: string | null
          heart_disease?: boolean
          heart_disease_details?: string | null
          hypertension?: boolean
          pacemaker?: boolean
          infectious_disease?: boolean
          infectious_disease_details?: string | null
          arthritis?: boolean
          gastritis_reflux?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      budgets: {
        Row: {
          id: string
          patient_id: string
          date: string
          treatment: string
          value: number
          status: 'pending' | 'approved' | 'rejected' | 'completed'
          notes: string | null
          location_rate: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          patient_id: string
          date: string
          treatment: string
          value: number
          status?: 'pending' | 'approved' | 'rejected' | 'completed'
          notes?: string | null
          location_rate?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          patient_id?: string
          date?: string
          treatment?: string
          value?: number
          status?: 'pending' | 'approved' | 'rejected' | 'completed'
          notes?: string | null
          location_rate?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      budget_items: {
        Row: {
          id: string
          budget_id: string
          tooth: string
          faces: string[]
          created_at: string
        }
        Insert: {
          id?: string
          budget_id: string
          tooth: string
          faces: string[]
          created_at?: string
        }
        Update: {
          id?: string
          budget_id?: string
          tooth?: string
          faces?: string[]
          created_at?: string
        }
      }
      exams: {
        Row: {
          id: string
          patient_id: string
          procedure_id: string | null
          title: string
          name: string
          date: string
          order_date: string
          description: string | null
          file_urls: string[]
          type: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          patient_id: string
          procedure_id?: string | null
          title: string
          name: string
          date: string
          order_date: string
          description?: string | null
          file_urls?: string[]
          type?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          patient_id?: string
          procedure_id?: string | null
          title?: string
          name?: string
          date?: string
          order_date?: string
          description?: string | null
          file_urls?: string[]
          type?: string
          created_at?: string
          updated_at?: string
        }
      }
      financial_transactions: {
        Row: {
          id: string
          type: 'income' | 'expense'
          amount: number
          description: string
          category: string
          date: string
          location: string | null
          patient_id: string | null
          related_entity_id: string | null
          user_id: string
          net_amount: number | null
          tax_rate: number | null
          tax_amount: number | null
          card_fee_rate: number | null
          card_fee_amount: number | null
          commission_rate: number | null
          commission_amount: number | null
          location_rate: number | null
          location_amount: number | null
          recurrence_id: string | null
          payment_method: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          type: 'income' | 'expense'
          amount: number
          description: string
          category: string
          date: string
          location?: string | null
          patient_id?: string | null
          related_entity_id?: string | null
          user_id?: string
          net_amount?: number | null
          tax_rate?: number | null
          tax_amount?: number | null
          card_fee_rate?: number | null
          card_fee_amount?: number | null
          commission_rate?: number | null
          commission_amount?: number | null
          location_rate?: number | null
          location_amount?: number | null
          recurrence_id?: string | null
          payment_method?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          type?: 'income' | 'expense'
          amount?: number
          description?: string
          category?: string
          date?: string
          location?: string | null
          patient_id?: string | null
          related_entity_id?: string | null
          net_amount?: number | null
          tax_rate?: number | null
          tax_amount?: number | null
          card_fee_rate?: number | null
          card_fee_amount?: number | null
          commission_rate?: number | null
          commission_amount?: number | null
          location_rate?: number | null
          location_amount?: number | null
          recurrence_id?: string | null
          payment_method?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      clinic_users: {
        Row: {
          id: string
          user_id: string
          clinic_id: string
          role: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          clinic_id: string
          role?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          clinic_id?: string
          role?: string
          created_at?: string
          updated_at?: string
        }
      }
      financial_settings: {
        Row: {
          id: string
          user_id: string
          tax_rate: number | null
          anticipation_rate: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          tax_rate?: number | null
          anticipation_rate?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          tax_rate?: number | null
          anticipation_rate?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      card_fee_config: {
        Row: {
          id: string
          user_id: string
          brand: string
          payment_type: string
          installments: number
          rate: number
          anticipation_rate: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          brand: string
          payment_type: string
          installments?: number
          rate: number
          anticipation_rate?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          brand?: string
          payment_type?: string
          installments?: number
          rate?: number
          anticipation_rate?: number | null
          created_at?: string
        }
      }
      tax_config: {
        Row: {
          id: string
          user_id: string
          name: string
          rate: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          rate: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          rate?: number
          created_at?: string
        }
      }
      document_templates: {
        Row: {
          id: string
          user_id: string
          name: string
          content: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          content: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          content?: string
          created_at?: string
          updated_at?: string
        }
      }
      clinic_settings: {
        Row: {
          id: string
          user_id: string
          letterhead_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          letterhead_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          letterhead_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      audit_logs: {
        Row: {
          id: string
          clinic_id: string
          user_id: string | null
          action: string
          entity: string
          entity_id: string | null
          details: Json
          created_at: string
        }
        Insert: {
          id?: string
          clinic_id: string
          user_id?: string | null
          action: string
          entity: string
          entity_id?: string | null
          details?: Json
          created_at?: string
        }
        Update: {
          id?: string
          clinic_id?: string
          user_id?: string | null
          action?: string
          entity?: string
          entity_id?: string | null
          details?: Json
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_profiles_for_users: {
        Args: { user_ids: string[] }
        Returns: {
          id: string
          email: string
          full_name: string
        }[]
      }
    }
    Enums: {
      appointment_status: 'scheduled' | 'confirmed' | 'completed' | 'no_show' | 'cancelled' | 'rescheduled'
    }
  }
}

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
export type FinancialSettings = Database['public']['Tables']['financial_settings']['Row']
export type CardFeeConfig = Database['public']['Tables']['card_fee_config']['Row']
export type CardFeeConfigInsert = Database['public']['Tables']['card_fee_config']['Insert']
export type Procedure = Database['public']['Tables']['procedures']['Row']
export type ProcedureInsert = Database['public']['Tables']['procedures']['Insert']
export type ProcedureUpdate = Database['public']['Tables']['procedures']['Update']

export type Anamnese = Database['public']['Tables']['anamneses']['Row']
export type AnamneseInsert = Database['public']['Tables']['anamneses']['Insert']
export type AnamneseUpdate = Database['public']['Tables']['anamneses']['Update']

export type Budget = Database['public']['Tables']['budgets']['Row']
export type BudgetInsert = Database['public']['Tables']['budgets']['Insert']
export type BudgetUpdate = Database['public']['Tables']['budgets']['Update']

export type BudgetItem = Database['public']['Tables']['budget_items']['Row']
export type BudgetItemInsert = Database['public']['Tables']['budget_items']['Insert']
export type BudgetItemUpdate = Database['public']['Tables']['budget_items']['Update']

export type FinancialTransaction = Database['public']['Tables']['financial_transactions']['Row']
export type FinancialTransactionInsert = Database['public']['Tables']['financial_transactions']['Insert']
export type FinancialTransactionUpdate = Database['public']['Tables']['financial_transactions']['Update']

export type Exam = Database['public']['Tables']['exams']['Row']
export type ExamInsert = Database['public']['Tables']['exams']['Insert']
export type ExamUpdate = Database['public']['Tables']['exams']['Update']

export type DocumentTemplate = Database['public']['Tables']['document_templates']['Row']
export type DocumentTemplateInsert = Database['public']['Tables']['document_templates']['Insert']
export type DocumentTemplateUpdate = Database['public']['Tables']['document_templates']['Update']

export type ClinicSettings = Database['public']['Tables']['clinic_settings']['Row']

export type FinancialTransactionWithPatient = FinancialTransaction & {
  patients: Pick<Patient, 'name'> | null
}

export type BudgetWithItems = Budget & {
  budget_items: BudgetItem[]
}

// Extended types with relations
export type AppointmentWithPatient = Appointment & {
  patients: Pick<Patient, 'name' | 'phone'>
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
}
