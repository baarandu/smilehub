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
      patient_documents: {
        Row: {
          id: string
          patient_id: string
          name: string
          description: string | null
          file_url: string
          file_type: string | null
          file_size: number | null
          category: 'exam' | 'xray' | 'photo' | 'document' | 'prescription' | null
          uploaded_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          patient_id: string
          name: string
          description?: string | null
          file_url: string
          file_type?: string | null
          file_size?: number | null
          category?: 'exam' | 'xray' | 'photo' | 'document' | 'prescription' | null
          uploaded_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          patient_id?: string
          name?: string
          description?: string | null
          file_url?: string
          file_type?: string | null
          file_size?: number | null
          category?: 'exam' | 'xray' | 'photo' | 'document' | 'prescription' | null
          uploaded_at?: string
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
      procedures: {
        Row: {
          id: string
          patient_id: string
          date: string
          location: string | null
          description: string | null
          value: number | null
          payment_method: 'cash' | 'debit' | 'credit' | null
          installments: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          patient_id: string
          date: string
          location?: string | null
          description?: string | null
          value?: number | null
          payment_method?: 'cash' | 'debit' | 'credit' | null
          installments?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          patient_id?: string
          date?: string
          location?: string | null
          description?: string | null
          value?: number | null
          payment_method?: 'cash' | 'debit' | 'credit' | null
          installments?: number
          created_at?: string
          updated_at?: string
        }
      }
      exams: {
        Row: {
          id: string
          patient_id: string
          name: string
          order_date: string
          exam_date: string | null
          file_url: string | null
          file_type: 'document' | 'photo' | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          patient_id: string
          name: string
          order_date: string
          exam_date?: string | null
          file_url?: string | null
          file_type?: 'document' | 'photo' | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          patient_id?: string
          name?: string
          order_date?: string
          exam_date?: string | null
          file_url?: string | null
          file_type?: 'document' | 'photo' | null
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
      document_category: 'exam' | 'xray' | 'photo' | 'document' | 'prescription'
    }
  }
}

// Helper types for easier usage
export type Patient = Database['public']['Tables']['patients']['Row']
export type PatientInsert = Database['public']['Tables']['patients']['Insert']
export type PatientUpdate = Database['public']['Tables']['patients']['Update']

export type PatientDocument = Database['public']['Tables']['patient_documents']['Row']
export type PatientDocumentInsert = Database['public']['Tables']['patient_documents']['Insert']
export type PatientDocumentUpdate = Database['public']['Tables']['patient_documents']['Update']

export type Consultation = Database['public']['Tables']['consultations']['Row']
export type ConsultationInsert = Database['public']['Tables']['consultations']['Insert']
export type ConsultationUpdate = Database['public']['Tables']['consultations']['Update']

export type Appointment = Database['public']['Tables']['appointments']['Row']
export type AppointmentInsert = Database['public']['Tables']['appointments']['Insert']
export type AppointmentUpdate = Database['public']['Tables']['appointments']['Update']

export type Procedure = Database['public']['Tables']['procedures']['Row']
export type ProcedureInsert = Database['public']['Tables']['procedures']['Insert']
export type ProcedureUpdate = Database['public']['Tables']['procedures']['Update']

export type Exam = Database['public']['Tables']['exams']['Row']
export type ExamInsert = Database['public']['Tables']['exams']['Insert']
export type ExamUpdate = Database['public']['Tables']['exams']['Update']

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
