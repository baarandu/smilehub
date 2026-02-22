import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from '@/components/ui/badge';
import { CalendarClock, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { ProsthesisOrder } from '@/types/prosthesis';
import { PROSTHESIS_TYPE_LABELS } from '@/types/prosthesis';
import { getUrgencyColor } from '@/utils/prosthesis';

interface KanbanCardProps {
  order: ProsthesisOrder;
  onClick: () => void;
  isDragging?: boolean;
}

export function KanbanCard({ order, onClick, isDragging }: KanbanCardProps) {
  const navigate = useNavigate();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: order.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
  };

  const urgency = getUrgencyColor(order);
  const teethStr = order.tooth_numbers?.length > 0 ? order.tooth_numbers.join(', ') : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`bg-white rounded-lg border p-3 cursor-pointer hover:shadow-md transition-shadow ${isDragging ? 'shadow-lg ring-2 ring-primary/20' : 'shadow-sm'
        }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-sm text-foreground truncate flex-1">
          {order.patient_name || 'Paciente'}
        </p>
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${urgency.bg} ${urgency.text}`}>
          {urgency.label}
        </span>
      </div>

      <div className="mt-1.5 flex flex-wrap gap-1">
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
          {PROSTHESIS_TYPE_LABELS[order.type] || order.type}
        </Badge>
        {teethStr && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {teethStr}
          </Badge>
        )}
        {order.current_shipment_number > 0 && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-orange-50 text-orange-700 border-orange-200">
            {order.current_shipment_number}o envio
          </Badge>
        )}
      </div>

      {order.status === 'in_clinic' && (
        <div className="mt-2 flex flex-col gap-1.5">
          <div
            className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5 cursor-pointer hover:bg-amber-100 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              navigate('/agenda', { state: { openNewAppointment: true, patientId: order.patient_id, patientName: order.patient_name } });
            }}
          >
            <CalendarClock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="text-[10px] font-medium text-amber-700">Agendar com paciente</span>
          </div>
          {order.patient_phone && (
            <a
              href={`https://wa.me/55${order.patient_phone.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-md px-2 py-1.5 cursor-pointer hover:bg-green-100 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <MessageCircle className="w-3.5 h-3.5 text-green-600 shrink-0" />
              <span className="text-[10px] font-medium text-green-700">WhatsApp do paciente</span>
            </a>
          )}
        </div>
      )}
    </div>
  );
}

// Simplified version for DragOverlay (no sortable hooks)
export function KanbanCardOverlay({ order }: { order: ProsthesisOrder }) {
  const urgency = getUrgencyColor(order);
  const teethStr = order.tooth_numbers?.length > 0 ? order.tooth_numbers.join(', ') : null;

  return (
    <div className="bg-white rounded-lg border p-3 shadow-lg ring-2 ring-primary/20 w-[250px]">
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-sm text-foreground truncate flex-1">
          {order.patient_name || 'Paciente'}
        </p>
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${urgency.bg} ${urgency.text}`}>
          {urgency.label}
        </span>
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1">
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
          {PROSTHESIS_TYPE_LABELS[order.type] || order.type}
        </Badge>
        {teethStr && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {teethStr}
          </Badge>
        )}
      </div>
    </div>
  );
}
