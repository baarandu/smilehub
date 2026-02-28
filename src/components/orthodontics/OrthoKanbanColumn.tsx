import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ScrollArea } from '@/components/ui/scroll-area';
import { OrthoKanbanCard } from './OrthoKanbanCard';
import type { OrthodonticCase } from '@/types/orthodontics';
import type { OrthoKanbanColumn as ColumnType } from '@/types/orthodontics';

interface OrthoKanbanColumnProps {
  column: ColumnType;
  cases: OrthodonticCase[];
  onCardClick: (orthoCase: OrthodonticCase) => void;
  patientAppointments?: Record<string, string>;
  onAdvanceStatus?: (orthoCase: OrthodonticCase) => void;
  onRetreatStatus?: (orthoCase: OrthodonticCase) => void;
  isFirst?: boolean;
  isLast?: boolean;
}

export function OrthoKanbanColumn({ column, cases, onCardClick, patientAppointments, onAdvanceStatus, onRetreatStatus, isFirst, isLast }: OrthoKanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const caseIds = cases.map(c => c.id);

  return (
    <div className={`flex flex-col rounded-lg border ${column.borderColor} ${column.bgColor} min-w-0 flex-1`}>
      <div className={`px-3 py-2.5 border-b ${column.borderColor} flex items-center justify-between`}>
        <h3 className={`text-xs font-semibold ${column.color} truncate`}>{column.title}</h3>
        <span className={`text-xs font-medium ${column.color} bg-white/60 rounded-full px-2 py-0.5 shrink-0`}>
          {cases.length}
        </span>
      </div>

      <div ref={setNodeRef} className="flex-1 min-h-0">
        <ScrollArea className="h-[calc(100vh-260px)]">
          <SortableContext items={caseIds} strategy={verticalListSortingStrategy}>
            <div className={`p-2 space-y-2 min-h-[60px] transition-colors ${isOver ? 'bg-primary/5' : ''}`}>
              {cases.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhum caso</p>
              ) : (
                cases.map(c => (
                  <OrthoKanbanCard
                    key={c.id}
                    orthoCase={c}
                    onClick={() => onCardClick(c)}
                    scheduledDate={patientAppointments?.[c.patient_id]}
                    onMoveLeft={!isFirst && onRetreatStatus ? () => onRetreatStatus(c) : undefined}
                    onMoveRight={!isLast && onAdvanceStatus ? () => onAdvanceStatus(c) : undefined}
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
