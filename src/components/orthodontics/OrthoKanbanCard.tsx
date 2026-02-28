import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, AlertTriangle, Clock } from 'lucide-react';
import type { OrthodonticCase } from '@/types/orthodontics';
import { TREATMENT_TYPE_LABELS } from '@/types/orthodontics';
import { getOverdueStatus, getDaysUntilNextAppointment } from '@/utils/orthodontics';

interface OrthoKanbanCardProps {
  orthoCase: OrthodonticCase;
  onClick: () => void;
  onMoveLeft?: () => void;
  onMoveRight?: () => void;
}

export function OrthoKanbanCard({ orthoCase, onClick, onMoveLeft, onMoveRight }: OrthoKanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: orthoCase.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const overdueStatus = getOverdueStatus(orthoCase);
  const daysUntil = getDaysUntilNextAppointment(orthoCase.next_appointment_at);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`group relative bg-white rounded-lg border p-3 cursor-pointer hover:shadow-md transition-shadow ${
        isDragging ? 'shadow-lg ring-2 ring-primary/20' : 'shadow-sm'
      }`}
    >
      {onMoveLeft && (
        <button
          onClick={(e) => { e.stopPropagation(); onMoveLeft(); }}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 w-6 h-6 rounded-full bg-white border shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-70 hover:!opacity-100 transition-opacity"
        >
          <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      )}
      {onMoveRight && (
        <button
          onClick={(e) => { e.stopPropagation(); onMoveRight(); }}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 w-6 h-6 rounded-full bg-white border shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-70 hover:!opacity-100 transition-opacity"
        >
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      )}

      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-sm text-foreground truncate flex-1">
          {orthoCase.patient_name || 'Paciente'}
        </p>
        {overdueStatus === 'overdue' && (
          <Badge variant="destructive" className="text-[10px] px-1.5 py-0 shrink-0">
            <AlertTriangle className="w-3 h-3 mr-0.5" />
            Atrasado
          </Badge>
        )}
        {overdueStatus === 'due_soon' && daysUntil != null && (
          <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px] px-1.5 py-0 shrink-0">
            <Clock className="w-3 h-3 mr-0.5" />
            Em {daysUntil}d
          </Badge>
        )}
      </div>

      {orthoCase.dentist_name && (
        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{orthoCase.dentist_name}</p>
      )}

      <div className="mt-1.5 flex flex-wrap gap-1">
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
          {TREATMENT_TYPE_LABELS[orthoCase.treatment_type] || orthoCase.treatment_type}
        </Badge>
      </div>
    </div>
  );
}

export function OrthoKanbanCardOverlay({ orthoCase }: { orthoCase: OrthodonticCase }) {
  return (
    <div className="bg-white rounded-lg border p-3 shadow-lg ring-2 ring-primary/20 w-[220px]">
      <p className="font-medium text-sm text-foreground truncate">
        {orthoCase.patient_name || 'Paciente'}
      </p>
      {orthoCase.dentist_name && (
        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{orthoCase.dentist_name}</p>
      )}
      <div className="mt-1.5">
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
          {TREATMENT_TYPE_LABELS[orthoCase.treatment_type] || orthoCase.treatment_type}
        </Badge>
      </div>
    </div>
  );
}
