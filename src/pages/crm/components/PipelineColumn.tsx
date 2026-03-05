import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PipelineCard } from './PipelineCard';
import type { CrmLead, CrmStage } from '@/types/crm';

interface PipelineColumnProps {
  stage: CrmStage;
  leads: CrmLead[];
  onCardClick: (lead: CrmLead) => void;
  onMoveLeft?: (lead: CrmLead) => void;
  onMoveRight?: (lead: CrmLead) => void;
  isFirst?: boolean;
  isLast?: boolean;
}

export function PipelineColumn({ stage, leads, onCardClick, onMoveLeft, onMoveRight, isFirst, isLast }: PipelineColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const leadIds = leads.map(l => l.id);

  return (
    <div className="flex flex-col rounded-lg border min-w-0 flex-1" style={{ borderColor: `${stage.color}40` }}>
      <div className="px-3 py-2.5 border-b flex items-center justify-between" style={{ borderColor: `${stage.color}40`, backgroundColor: `${stage.color}10` }}>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
          <h3 className="text-sm font-semibold" style={{ color: stage.color }}>{stage.name}</h3>
        </div>
        <span className="text-xs font-medium rounded-full px-2 py-0.5 bg-white/60" style={{ color: stage.color }}>
          {leads.length}
        </span>
      </div>

      <div ref={setNodeRef} className="flex-1 min-h-0">
        <ScrollArea className="h-[calc(100vh-260px)]">
          <SortableContext items={leadIds} strategy={verticalListSortingStrategy}>
            <div className={`p-2 px-3 space-y-2 min-h-[60px] transition-colors ${isOver ? 'bg-primary/5' : ''}`}>
              {leads.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhum lead</p>
              ) : (
                leads.map(lead => (
                  <PipelineCard
                    key={lead.id}
                    lead={lead}
                    onClick={() => onCardClick(lead)}
                    onMoveLeft={!isFirst && onMoveLeft ? () => onMoveLeft(lead) : undefined}
                    onMoveRight={!isLast && onMoveRight ? () => onMoveRight(lead) : undefined}
                  />
                ))
              )}
            </div>
          </SortableContext>
        </ScrollArea>
      </div>
    </div>
  );
}
