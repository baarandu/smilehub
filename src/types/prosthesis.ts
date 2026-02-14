// Status das 4 colunas do Kanban cíclico (in_lab ⇄ in_clinic)
export type ProsthesisStatus = 'pre_lab' | 'in_lab' | 'in_clinic' | 'completed';

export interface KanbanColumn {
  id: ProsthesisStatus;
  title: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

export const KANBAN_COLUMNS: KanbanColumn[] = [
  { id: 'pre_lab', title: 'Pré-laboratório', color: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
  { id: 'in_lab', title: 'No Laboratório', color: 'text-orange-700', bgColor: 'bg-orange-50', borderColor: 'border-orange-200' },
  { id: 'in_clinic', title: 'Na Clínica (Prova)', color: 'text-purple-700', bgColor: 'bg-purple-50', borderColor: 'border-purple-200' },
  { id: 'completed', title: 'Concluído', color: 'text-green-700', bgColor: 'bg-green-50', borderColor: 'border-green-200' },
];

export interface ProsthesisOrder {
  id: string;
  clinic_id: string;
  patient_id: string;
  dentist_id: string;
  lab_id: string | null;
  type: string;
  material: string | null;
  tooth_numbers: string[];
  color: string | null;
  shade_details: string | null;
  cementation_type: string | null;
  status: ProsthesisStatus;
  notes: string | null;
  special_instructions: string | null;
  lab_cost: number | null;
  patient_price: number | null;
  checklist_color_defined: boolean;
  checklist_material_defined: boolean;
  checklist_cementation_defined: boolean;
  checklist_photos_attached: boolean;
  checklist_observations_added: boolean;
  current_shipment_number: number;
  date_ordered: string | null;
  date_completed: string | null;
  estimated_delivery_date: string | null;
  position: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  budget_id: string | null;
  budget_tooth_index: number | null;
  // Joined fields
  patient_name?: string;
  dentist_name?: string;
  lab_name?: string;
}

export interface ProsthesisOrderInsert {
  clinic_id: string;
  patient_id: string;
  dentist_id: string;
  lab_id?: string | null;
  type: string;
  material?: string | null;
  tooth_numbers?: string[];
  color?: string | null;
  shade_details?: string | null;
  cementation_type?: string | null;
  notes?: string | null;
  special_instructions?: string | null;
  lab_cost?: number | null;
  patient_price?: number | null;
  estimated_delivery_date?: string | null;
  created_by?: string | null;
  budget_id?: string | null;
  budget_tooth_index?: number | null;
}

export interface ProsthesisOrderFormData {
  patientId: string;
  dentistId: string;
  labId: string | null;
  type: string;
  material: string;
  toothNumbers: string;
  color: string;
  shadeDetails: string;
  cementationType: string;
  labCost: string;
  patientPrice: string;
  estimatedDeliveryDate: string;
  notes: string;
  specialInstructions: string;
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
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProsthesisShipment {
  id: string;
  order_id: string;
  shipment_number: number;
  sent_to_lab_at: string;
  returned_to_clinic_at: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface ProsthesisOrderHistory {
  id: string;
  order_id: string;
  from_status: string | null; // string to support legacy statuses
  to_status: string;
  changed_by: string | null;
  changed_by_name?: string;
  notes: string | null;
  created_at: string;
}

export interface ProsthesisChecklist {
  checklist_color_defined: boolean;
  checklist_material_defined: boolean;
  checklist_cementation_defined: boolean;
  checklist_photos_attached: boolean;
  checklist_observations_added: boolean;
}

export interface ProsthesisOrderFilters {
  status?: ProsthesisStatus;
  dentistId?: string;
  labId?: string;
  type?: string;
  search?: string;
}

export const PROSTHESIS_TYPE_LABELS: Record<string, string> = {
  coroa: 'Coroa',
  ponte: 'Ponte',
  protese_total: 'Prótese Total',
  protese_parcial: 'Prótese Parcial',
  protese_removivel: 'Prótese Removível',
  faceta: 'Faceta',
  onlay: 'Onlay',
  inlay: 'Inlay',
  pino: 'Pino',
  provisorio: 'Provisório',
  nucleo: 'Núcleo',
  outro: 'Outro',
};

export const PROSTHESIS_MATERIAL_LABELS: Record<string, string> = {
  zirconia: 'Zircônia',
  porcelana: 'Porcelana',
  resina: 'Resina',
  metal: 'Metal',
  emax: 'E-max',
  acrilico: 'Acrílico',
  metalceramica: 'Metalocerâmica',
  outro: 'Outro',
};
