import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from '@/components/ui/badge';
import { Phone, Calendar, ChevronLeft, ChevronRight, MessageCircle } from 'lucide-react';
import type { CrmLead } from '@/types/crm';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getWhatsAppNumber } from '@/utils/formatters';

interface PipelineCardProps {
  lead: CrmLead;
  onClick: () => void;
  onMoveLeft?: () => void;
  onMoveRight?: () => void;
}

export function PipelineCard({ lead, onClick, onMoveLeft, onMoveRight }: PipelineCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lead.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const timeAgo = formatDistanceToNow(new Date(lead.created_at), { addSuffix: true, locale: ptBR });

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
        <p className="font-medium text-sm text-foreground truncate flex-1">{lead.name}</p>
        {lead.source_name && (
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 shrink-0">
            {lead.source_name}
          </span>
        )}
      </div>

      {lead.phone && (
        <div className="flex items-center gap-1 mt-1">
          <Phone className="w-3 h-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{lead.phone}</span>
        </div>
      )}

      {lead.next_action && (
        <div className="mt-2 flex items-start gap-1.5 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5">
          <Calendar className="w-3 h-3 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-[11px] font-medium text-amber-800 leading-tight">{lead.next_action}</p>
            {lead.next_action_date && (
              <p className="text-[10px] text-amber-600">{lead.next_action_date}</p>
            )}
          </div>
        </div>
      )}

      <div className="mt-2 flex items-center justify-between">
        <div className="flex flex-wrap gap-1">
          {(lead.tags || []).slice(0, 3).map(tag => (
            <Badge
              key={tag.id}
              variant="outline"
              className="text-[9px] px-1.5 py-0"
              style={{ borderColor: tag.color, color: tag.color }}
            >
              {tag.name}
            </Badge>
          ))}
        </div>
        <span className="text-[10px] text-muted-foreground">{timeAgo}</span>
      </div>

      {lead.phone && (
        <div className="mt-2 flex gap-1.5">
          <a
            href={`https://wa.me/${getWhatsAppNumber(lead.phone)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1 bg-green-50 border border-green-200 rounded-md px-1.5 py-1 cursor-pointer hover:bg-green-100 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <MessageCircle className="w-3 h-3 text-green-600 shrink-0" />
            <span className="text-[9px] font-medium text-green-700">WhatsApp</span>
          </a>
        </div>
      )}
    </div>
  );
}

export function PipelineCardOverlay({ lead }: { lead: CrmLead }) {
  return (
    <div className="bg-white rounded-lg border p-3 shadow-lg ring-2 ring-primary/20 w-[250px]">
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-sm text-foreground truncate flex-1">{lead.name}</p>
        {lead.source_name && (
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 shrink-0">
            {lead.source_name}
          </span>
        )}
      </div>
      {lead.next_action && (
        <p className="text-xs text-amber-700 mt-1">{lead.next_action}</p>
      )}
    </div>
  );
}
