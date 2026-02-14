import type { ProsthesisOrder, ProsthesisStatus, ProsthesisChecklist, KanbanColumn } from '@/types/prosthesis';
import { KANBAN_COLUMNS } from '@/types/prosthesis';
import type { ToothEntry } from '@/utils/budgetUtils';

const STATUS_FLOW: ProsthesisStatus[] = ['pre_lab', 'in_lab', 'in_clinic', 'completed'];

const STATUS_LABELS: Record<string, string> = {
  pre_lab: 'Pré-laboratório',
  in_lab: 'No Laboratório',
  in_clinic: 'Na Clínica (Prova)',
  installation: 'Instalação',
  completed: 'Concluído',
  // Legacy labels (for history display)
  sent: 'Primeiro Envio',
  try_in: 'Segundo Envio',
  adjustment: 'Ajuste/Retrabalho',
};

const STATUS_DATE_FIELDS: Record<ProsthesisStatus, keyof ProsthesisOrder | null> = {
  pre_lab: 'date_ordered',
  in_lab: null,
  in_clinic: null,
  completed: 'date_completed',
};

export function getStatusLabel(status: string): string {
  return STATUS_LABELS[status] || status;
}

export function getStatusDateField(status: ProsthesisStatus): string | null {
  return STATUS_DATE_FIELDS[status] as string | null;
}

export function getNextStatus(current: ProsthesisStatus): ProsthesisStatus | null {
  const idx = STATUS_FLOW.indexOf(current);
  return idx < STATUS_FLOW.length - 1 ? STATUS_FLOW[idx + 1] : null;
}

export function getPreviousStatus(current: ProsthesisStatus): ProsthesisStatus | null {
  const idx = STATUS_FLOW.indexOf(current);
  return idx > 0 ? STATUS_FLOW[idx - 1] : null;
}

export function getDaysElapsed(order: ProsthesisOrder): number {
  // Find the most recent status change date
  const dateField = STATUS_DATE_FIELDS[order.status];
  const dateValue = dateField ? (order[dateField] as string | null) : null;
  // For in_lab/in_clinic the date is tracked via shipments, fallback to updated_at or created_at
  const referenceDate = dateValue || order.updated_at || order.created_at;
  const diff = Date.now() - new Date(referenceDate).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function getUrgencyColor(order: ProsthesisOrder): { bg: string; text: string; label: string } {
  // If past estimated delivery date
  if (order.estimated_delivery_date && order.status !== 'completed') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const estimated = new Date(order.estimated_delivery_date + 'T00:00:00');
    if (estimated < today) {
      return { bg: 'bg-red-100', text: 'text-red-700', label: 'Atrasado' };
    }
  }

  const days = getDaysElapsed(order);
  if (days <= 5) return { bg: 'bg-green-100', text: 'text-green-700', label: `${days}d` };
  if (days <= 10) return { bg: 'bg-yellow-100', text: 'text-yellow-700', label: `${days}d` };
  return { bg: 'bg-red-100', text: 'text-red-700', label: `${days}d` };
}

export function calculateMargin(order: ProsthesisOrder): { value: number; percentage: number } | null {
  if (order.lab_cost == null || order.patient_price == null) return null;
  const value = order.patient_price - order.lab_cost;
  const percentage = order.patient_price > 0 ? (value / order.patient_price) * 100 : 0;
  return { value, percentage };
}

export function isChecklistComplete(order: ProsthesisChecklist): boolean {
  return (
    order.checklist_color_defined &&
    order.checklist_material_defined &&
    order.checklist_cementation_defined &&
    order.checklist_photos_attached &&
    order.checklist_observations_added
  );
}

export function getChecklistItems(order: ProsthesisChecklist): { key: keyof ProsthesisChecklist; label: string; checked: boolean }[] {
  return [
    { key: 'checklist_color_defined', label: 'Cor definida', checked: order.checklist_color_defined },
    { key: 'checklist_material_defined', label: 'Material definido', checked: order.checklist_material_defined },
    { key: 'checklist_cementation_defined', label: 'Tipo de cimentação definido', checked: order.checklist_cementation_defined },
    { key: 'checklist_photos_attached', label: 'Fotos anexadas', checked: order.checklist_photos_attached },
    { key: 'checklist_observations_added', label: 'Observações adicionadas', checked: order.checklist_observations_added },
  ];
}

// ==================== Budget Integration ====================

/** Map budget treatment names to prosthesis type keys */
export const TREATMENT_TO_PROSTHESIS_TYPE: Record<string, string> = {
  'Bloco': 'onlay',
  'Coroa': 'coroa',
  'Faceta': 'faceta',
  'Implante': 'implante',
  'Pino': 'pino',
  'Prótese Removível': 'protese_removivel',
};

/** Budget treatments that are prosthetic */
export const PROSTHETIC_TREATMENTS = Object.keys(TREATMENT_TO_PROSTHESIS_TYPE);

/** Check if any treatment in the list is prosthetic */
export function isProstheticTreatment(treatments: string[]): boolean {
  return treatments.some(t => PROSTHETIC_TREATMENTS.includes(t));
}

/** Get the prosthesis type key for a list of treatments (first match) */
export function getProsthesisTypeFromTreatments(treatments: string[]): string | null {
  for (const t of treatments) {
    if (TREATMENT_TO_PROSTHESIS_TYPE[t]) return TREATMENT_TO_PROSTHESIS_TYPE[t];
  }
  return null;
}

/** Check if a tooth entry has at least one prosthetic treatment marked for lab.
 *  Backwards-compatible: if labTreatments is missing, treats all prosthetic treatments as lab-bound. */
export function hasLabTreatment(tooth: ToothEntry): boolean {
  const prostheticInItem = tooth.treatments.filter(t => PROSTHETIC_TREATMENTS.includes(t));
  if (prostheticInItem.length === 0) return false;
  // If labTreatments not set (old data), default to true
  if (!tooth.labTreatments) return true;
  return prostheticInItem.some(t => tooth.labTreatments![t] !== false);
}

/** Get the Kanban column config for a given status */
export function getKanbanColumn(status: ProsthesisStatus): KanbanColumn | undefined {
  return KANBAN_COLUMNS.find(c => c.id === status);
}
