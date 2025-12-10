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
      appointments: {
        Row: {
          id: string
          patient_id: string
          date: string
          time: string
          status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled'
          location: string | null
          notes: string | null
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
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      appointment_status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled'
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
