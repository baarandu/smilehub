import type { ProsthesisOrder, ProsthesisStatus, ProsthesisChecklist } from '@/types/prosthesis';

const STATUS_FLOW: ProsthesisStatus[] = ['pre_lab', 'sent', 'in_lab', 'try_in', 'adjustment', 'installation', 'completed'];

const STATUS_LABELS: Record<ProsthesisStatus, string> = {
  pre_lab: 'Pré-laboratório',
  sent: 'Envio',
  in_lab: 'Laboratório',
  try_in: 'Prova',
  adjustment: 'Ajuste/Retrabalho',
  installation: 'Instalação',
  completed: 'Concluído',
};

const STATUS_DATE_FIELDS: Record<ProsthesisStatus, keyof ProsthesisOrder | null> = {
  pre_lab: 'date_ordered',
  sent: 'date_sent',
  in_lab: 'date_received',
  try_in: 'date_try_in',
  adjustment: 'date_adjustment',
  installation: 'date_installation',
  completed: 'date_completed',
};

export function getStatusLabel(status: ProsthesisStatus): string {
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
  const referenceDate = dateValue || order.created_at;
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
