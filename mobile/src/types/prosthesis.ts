export type ProsthesisStatus = 'pre_lab' | 'in_lab' | 'in_clinic' | 'completed';
export type ProsthesisType = 'coroa' | 'ponte' | 'protese_total' | 'protese_parcial' | 'protese_removivel' | 'faceta' | 'onlay' | 'inlay' | 'pino' | 'provisorio' | 'nucleo' | 'outro';
export type ProsthesisMaterial = 'zirconia' | 'porcelana' | 'resina' | 'metal' | 'emax' | 'acrilico' | 'metalceramica' | 'fibra_vidro' | 'outro';

export interface ProsthesisOrder {
  id: string;
  clinic_id: string;
  patient_id: string;
  dentist_id: string | null;
  lab_id: string | null;
  type: ProsthesisType;
  material: ProsthesisMaterial | string | null;
  tooth_numbers: string[] | null;
  color: string | null;
  shade_details: string | null;
  cementation_type: string | null;
  lab_cost: number | null;
  patient_price: number | null;
  status: ProsthesisStatus;
  position: number;
  current_shipment_number: number;
  date_ordered: string | null;
  date_sent: string | null;
  date_received: string | null;
  date_completed: string | null;
  estimated_delivery_date: string | null;
  notes: string | null;
  special_instructions: string | null;
  checklist_color: boolean;
  checklist_material: boolean;
  checklist_cementation: boolean;
  checklist_photos: boolean;
  checklist_observations: boolean;
  budget_id: string | null;
  budget_tooth_index: number | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  patient_name?: string;
  patient_phone?: string;
  dentist_name?: string;
  lab_name?: string;
}

export interface ProsthesisLab {
  id: string;
  clinic_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  contact_person: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ProsthesisShipment {
  id: string;
  order_id: string;
  shipment_number: number;
  sent_to_lab_at: string | null;
  returned_to_clinic_at: string | null;
  notes: string | null;
}

export interface ProsthesisOrderHistory {
  id: string;
  order_id: string;
  from_status: ProsthesisStatus | null;
  to_status: ProsthesisStatus;
  changed_by: string | null;
  changed_by_name?: string;
  created_at: string;
  notes: string | null;
}

export interface ProsthesisOrderFilters {
  status?: ProsthesisStatus;
  dentistId?: string;
  labId?: string;
  type?: ProsthesisType;
  search?: string;
}

export const PROSTHESIS_TYPE_LABELS: Record<ProsthesisType, string> = {
  coroa: 'Coroa', ponte: 'Ponte', protese_total: 'Prótese Total',
  protese_parcial: 'Prótese Parcial', protese_removivel: 'Prótese Removível',
  faceta: 'Faceta', onlay: 'Onlay', inlay: 'Inlay', pino: 'Pino',
  provisorio: 'Provisório', nucleo: 'Núcleo', outro: 'Outro',
};

export const PROSTHESIS_MATERIAL_LABELS: Record<ProsthesisMaterial, string> = {
  zirconia: 'Zircônia', porcelana: 'Porcelana', resina: 'Resina',
  metal: 'Metal', emax: 'E-max', acrilico: 'Acrílico',
  metalceramica: 'Metalocerâmica', fibra_vidro: 'Fibra de Vidro', outro: 'Outro',
};

export const STATUS_LABELS: Record<ProsthesisStatus, string> = {
  pre_lab: 'Pré-Lab', in_lab: 'No Laboratório', in_clinic: 'Na Clínica', completed: 'Concluído',
};

export const STATUS_COLORS: Record<ProsthesisStatus, { bg: string; text: string; color: string }> = {
  pre_lab: { bg: 'bg-blue-100', text: 'text-blue-800', color: '#1E40AF' },
  in_lab: { bg: 'bg-orange-100', text: 'text-orange-800', color: '#C2410C' },
  in_clinic: { bg: 'bg-purple-100', text: 'text-purple-800', color: '#7C3AED' },
  completed: { bg: 'bg-green-100', text: 'text-green-800', color: '#15803D' },
};
