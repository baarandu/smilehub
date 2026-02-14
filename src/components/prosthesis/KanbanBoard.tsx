import { useState, useMemo, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Plus, Building2, ArrowRight, CalendarClock, RotateCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { useClinic } from '@/contexts/ClinicContext';
import {
  useProsthesisOrders,
  useMoveOrder,
  useBatchUpdatePositions,
  useActiveProsthesisLabs,
} from '@/hooks/useProsthesis';
import type {
  ProsthesisOrder,
  ProsthesisOrderFilters,
  ProsthesisStatus,
} from '@/types/prosthesis';
import { KANBAN_COLUMNS } from '@/types/prosthesis';
import { getNextStatus, getPreviousStatus } from '@/utils/prosthesis';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCardOverlay } from './KanbanCard';
import { OrderFilters } from './OrderFilters';
import { OrderFormSheet } from './OrderFormSheet';
import { OrderDetailDialog } from './OrderDetailDialog';
import { LabManagementSheet } from './LabManagementSheet';
import { CompletionDialog } from './CompletionDialog';

export function KanbanBoard() {
  const { clinicId } = useClinic();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<ProsthesisOrderFilters>({});
  const { data: orders = [], isLoading } = useProsthesisOrders(filters.search || filters.dentistId || filters.labId || filters.type ? filters : undefined);
  const { data: labs = [] } = useActiveProsthesisLabs();
  const moveOrder = useMoveOrder();
  const batchUpdatePositions = useBatchUpdatePositions();


  // Dialogs state
  const [labSheetOpen, setLabSheetOpen] = useState(false);
  const [orderFormOpen, setOrderFormOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<ProsthesisOrder | null>(null);
  const [detailOrder, setDetailOrder] = useState<ProsthesisOrder | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const [completionOrder, setCompletionOrder] = useState<ProsthesisOrder | null>(null);
  const [completionOpen, setCompletionOpen] = useState(false);

  // DnD state
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // Dentists for filters (extracted from orders)
  const dentists = useMemo(() => {
    const map = new Map<string, string>();
    orders.forEach(o => {
      if (o.dentist_id && o.dentist_name) map.set(o.dentist_id, o.dentist_name);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [orders]);

  // Group orders by status
  const ordersByStatus = useMemo(() => {
    const grouped: Record<ProsthesisStatus, ProsthesisOrder[]> = {
      pre_lab: [], in_lab: [], in_clinic: [], completed: [],
    };
    orders.forEach(o => {
      if (grouped[o.status]) grouped[o.status].push(o);
    });
    // Sort each column by position
    Object.values(grouped).forEach(arr => arr.sort((a, b) => a.position - b.position));
    return grouped;
  }, [orders]);

  const activeOrder = activeId ? orders.find(o => o.id === activeId) ?? null : null;

  const getUserId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || '';
  };

  const handleMoveOrder = useCallback(async (order: ProsthesisOrder, newStatus: ProsthesisStatus) => {
    // Intercept completion to show CompletionDialog
    if (newStatus === 'completed') {
      setCompletionOrder(order);
      setCompletionOpen(true);
      return;
    }

    const targetOrders = ordersByStatus[newStatus];
    const newPosition = targetOrders.length;
    const userId = await getUserId();

    try {
      await moveOrder.mutateAsync({
        orderId: order.id,
        newStatus,
        newPosition,
        userId,
      });
    } catch {
      toast({ title: 'Erro ao mover ordem', variant: 'destructive' });
    }
  }, [ordersByStatus, moveOrder, toast]);

  // DnD handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || !active) return;

    const draggedOrder = orders.find(o => o.id === active.id);
    if (!draggedOrder) return;

    const overId = over.id as string;

    // Check if dropped on a column
    const isColumn = KANBAN_COLUMNS.some(c => c.id === overId);
    const targetStatus = isColumn
      ? (overId as ProsthesisStatus)
      : orders.find(o => o.id === overId)?.status ?? draggedOrder.status;

    if (targetStatus !== draggedOrder.status) {
      // Moving to different column
      await handleMoveOrder(draggedOrder, targetStatus);
    } else {
      // Reordering within same column — find new position
      const columnOrders = ordersByStatus[targetStatus].filter(o => o.id !== draggedOrder.id);
      const overIndex = columnOrders.findIndex(o => o.id === overId);
      const newIndex = overIndex >= 0 ? overIndex : columnOrders.length;

      columnOrders.splice(newIndex, 0, draggedOrder);
      const updates = columnOrders.map((o, idx) => ({ id: o.id, position: idx }));
      batchUpdatePositions.mutate(updates);
    }
  };

  const handleAdvanceStatus = (order: ProsthesisOrder) => {
    const next = getNextStatus(order.status);
    if (next) handleMoveOrder(order, next);
  };

  const handleRetreatStatus = (order: ProsthesisOrder) => {
    const prev = getPreviousStatus(order.status);
    if (prev) handleMoveOrder(order, prev);
  };

  const handleCardClick = (order: ProsthesisOrder) => {
    setDetailOrder(order);
    setDetailOpen(true);
  };

  const handleEditFromDetail = (order: ProsthesisOrder) => {
    setEditingOrder(order);
    setOrderFormOpen(true);
  };

  const handleOpenCreateForm = () => {
    setEditingOrder(null);
    setOrderFormOpen(true);
  };

  const handleCompleteOnly = async () => {
    if (!completionOrder) return;
    const targetOrders = ordersByStatus['completed'];
    const newPosition = targetOrders.length;
    const userId = await getUserId();
    try {
      await moveOrder.mutateAsync({
        orderId: completionOrder.id,
        newStatus: 'completed',
        newPosition,
        userId,
      });
      toast({ title: 'Serviço concluído' });
    } catch {
      toast({ title: 'Erro ao concluir', variant: 'destructive' });
    }
    setCompletionOpen(false);
    setCompletionOrder(null);
  };

  const handleCompleteAndRegister = async () => {
    if (!completionOrder) return;
    const targetOrders = ordersByStatus['completed'];
    const newPosition = targetOrders.length;
    const userId = await getUserId();
    try {
      await moveOrder.mutateAsync({
        orderId: completionOrder.id,
        newStatus: 'completed',
        newPosition,
        userId,
      });
      toast({
        title: 'Serviço concluído',
        description: 'Registre o procedimento clínico na aba de procedimentos do paciente.',
      });
    } catch {
      toast({ title: 'Erro ao concluir', variant: 'destructive' });
    }
    setCompletionOpen(false);
    setCompletionOrder(null);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-foreground">Central de Prótese</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setLabSheetOpen(true)}>
            <Building2 className="w-4 h-4 mr-1" />
            Laboratórios
          </Button>
          <Button size="sm" onClick={handleOpenCreateForm}>
            <Plus className="w-4 h-4 mr-1" />
            Criar Serviço
          </Button>
        </div>
      </div>

      {/* Filters */}
      <OrderFilters
        filters={filters}
        onFiltersChange={setFilters}
        labs={labs}
        dentists={dentists}
      />

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      ) : (
        <>
          {/* Desktop: Horizontal Kanban */}
          <div className="hidden md:block">
            <DndContext
              sensors={sensors}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div className="flex gap-3 pb-4">
                {KANBAN_COLUMNS.map(column => (
                  <KanbanColumn
                    key={column.id}
                    column={column}
                    orders={ordersByStatus[column.id]}
                    onCardClick={handleCardClick}
                  />
                ))}
              </div>
              <DragOverlay>
                {activeOrder ? <KanbanCardOverlay order={activeOrder} /> : null}
              </DragOverlay>
            </DndContext>
          </div>

          {/* Mobile: Tabs */}
          <div className="md:hidden">
            <Tabs defaultValue="pre_lab">
              <TabsList className="w-full overflow-x-auto flex">
                {KANBAN_COLUMNS.map(col => (
                  <TabsTrigger
                    key={col.id}
                    value={col.id}
                    className="text-xs px-2 shrink-0"
                  >
                    {col.title} ({ordersByStatus[col.id].length})
                  </TabsTrigger>
                ))}
              </TabsList>
              {KANBAN_COLUMNS.map(col => (
                <TabsContent key={col.id} value={col.id}>
                  <div className="space-y-2">
                    {ordersByStatus[col.id].length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">Nenhum serviço</p>
                    ) : (
                      ordersByStatus[col.id].map(order => {
                        const next = getNextStatus(order.status);
                        return (
                          <div
                            key={order.id}
                            className="bg-white rounded-lg border p-3 shadow-sm"
                            onClick={() => handleCardClick(order)}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-medium text-sm">{order.patient_name}</p>
                              {order.current_shipment_number > 0 && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 shrink-0">
                                  {order.current_shipment_number}o envio
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {order.tooth_numbers?.join(', ')}
                            </p>
                            {order.status === 'in_clinic' && (
                              <div
                                className="mt-1.5 flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5 cursor-pointer hover:bg-amber-100 transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate('/agenda');
                                }}
                              >
                                <CalendarClock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span className="text-[10px] font-medium text-amber-700">Agendar com paciente</span>
                              </div>
                            )}
                            <div className="mt-2 flex gap-1.5">
                              {order.status === 'in_clinic' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={e => {
                                    e.stopPropagation();
                                    handleMoveOrder(order, 'in_lab');
                                  }}
                                >
                                  <RotateCw className="w-3 h-3 mr-1" />
                                  Reenviar ao Lab
                                </Button>
                              )}
                              {next && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={e => {
                                    e.stopPropagation();
                                    handleAdvanceStatus(order);
                                  }}
                                >
                                  <ArrowRight className="w-3 h-3 mr-1" />
                                  Avançar
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </>
      )}

      {/* Dialogs & Sheets */}
      <LabManagementSheet open={labSheetOpen} onOpenChange={setLabSheetOpen} />
      <OrderFormSheet
        open={orderFormOpen}
        onOpenChange={setOrderFormOpen}
        order={editingOrder}
        onLabsClick={() => setLabSheetOpen(true)}
      />
      <OrderDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        order={detailOrder}
        onEdit={handleEditFromDetail}
        onAdvanceStatus={handleAdvanceStatus}
        onRetreatStatus={handleRetreatStatus}
        onResendToLab={(order) => handleMoveOrder(order, 'in_lab')}
      />
      <CompletionDialog
        open={completionOpen}
        onOpenChange={setCompletionOpen}
        order={completionOrder}
        onCompleteOnly={handleCompleteOnly}
        onCompleteAndRegister={handleCompleteAndRegister}
        isLoading={moveOrder.isPending}
      />
    </div>
  );
}
