import type { ProsthesisOrder, ProsthesisStatus } from '../types/prosthesis';

export function getNextStatus(current: ProsthesisStatus): ProsthesisStatus | null {
  const flow: Record<ProsthesisStatus, ProsthesisStatus | null> = {
    pre_lab: 'in_lab', in_lab: 'in_clinic', in_clinic: 'completed', completed: null,
  };
  return flow[current];
}

export function getPreviousStatus(current: ProsthesisStatus): ProsthesisStatus | null {
  const flow: Record<ProsthesisStatus, ProsthesisStatus | null> = {
    pre_lab: null, in_lab: 'pre_lab', in_clinic: 'in_lab', completed: 'in_clinic',
  };
  return flow[current];
}

export function getDaysElapsed(order: ProsthesisOrder): number {
  const ref = order.updated_at || order.created_at;
  return Math.floor((Date.now() - new Date(ref).getTime()) / (1000 * 60 * 60 * 24));
}

export function getUrgencyInfo(order: ProsthesisOrder): { bg: string; text: string; label: string } {
  if (order.status === 'completed') return { bg: 'bg-green-100', text: 'text-green-800', label: 'Concluído' };

  if (order.estimated_delivery_date) {
    const daysUntil = Math.floor((new Date(order.estimated_delivery_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysUntil < 0) return { bg: 'bg-red-100', text: 'text-red-800', label: `${Math.abs(daysUntil)}d atrasado` };
    if (daysUntil <= 3) return { bg: 'bg-orange-100', text: 'text-orange-800', label: `${daysUntil}d restantes` };
    return { bg: 'bg-green-100', text: 'text-green-800', label: `${daysUntil}d restantes` };
  }

  const days = getDaysElapsed(order);
  if (days > 10) return { bg: 'bg-red-100', text: 'text-red-800', label: `${days}d` };
  if (days > 5) return { bg: 'bg-yellow-100', text: 'text-yellow-800', label: `${days}d` };
  return { bg: 'bg-green-100', text: 'text-green-800', label: `${days}d` };
}

export function isChecklistComplete(order: ProsthesisOrder): boolean {
  return order.checklist_color && order.checklist_material && order.checklist_cementation && order.checklist_photos && order.checklist_observations;
}

export function getChecklistItems(order: ProsthesisOrder) {
  return [
    { key: 'checklist_color', label: 'Cor conferida', checked: order.checklist_color },
    { key: 'checklist_material', label: 'Material conferido', checked: order.checklist_material },
    { key: 'checklist_cementation', label: 'Cimentação conferida', checked: order.checklist_cementation },
    { key: 'checklist_photos', label: 'Fotos registradas', checked: order.checklist_photos },
    { key: 'checklist_observations', label: 'Observações registradas', checked: order.checklist_observations },
  ];
}
