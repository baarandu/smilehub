import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ScrollArea } from '@/components/ui/scroll-area';
import { KanbanCard } from './KanbanCard';
import type { ProsthesisOrder } from '@/types/prosthesis';
import type { KanbanColumn as KanbanColumnType } from '@/types/prosthesis';

interface KanbanColumnProps {
  column: KanbanColumnType;
  orders: ProsthesisOrder[];
  onCardClick: (order: ProsthesisOrder) => void;
}

export function KanbanColumn({ column, orders, onCardClick }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  const orderIds = orders.map(o => o.id);

  return (
    <div
      className={`flex flex-col rounded-lg border ${column.borderColor} ${column.bgColor} min-w-[260px] w-[260px] shrink-0`}
    >
      {/* Header */}
      <div className={`px-3 py-2.5 border-b ${column.borderColor} flex items-center justify-between`}>
        <h3 className={`text-sm font-semibold ${column.color}`}>{column.title}</h3>
        <span className={`text-xs font-medium ${column.color} bg-white/60 rounded-full px-2 py-0.5`}>
          {orders.length}
        </span>
      </div>

      {/* Cards area */}
      <div ref={setNodeRef} className="flex-1 min-h-0">
        <ScrollArea className="h-[calc(100vh-220px)]">
          <SortableContext items={orderIds} strategy={verticalListSortingStrategy}>
            <div
              className={`p-2 space-y-2 min-h-[60px] transition-colors ${
                isOver ? 'bg-primary/5' : ''
              }`}
            >
              {orders.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhum serviço</p>
              ) : (
                orders.map(order => (
                  <KanbanCard
                    key={order.id}
                    order={order}
                    onClick={() => onCardClick(order)}
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
