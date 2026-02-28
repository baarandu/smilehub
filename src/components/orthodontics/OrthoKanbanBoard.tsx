import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowRight, CalendarCheck, CalendarClock, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useChangeStatus, useBatchUpdatePositions } from '@/hooks/useOrthodontics';
import type { OrthodonticCase, OrthodonticStatus, CaseFilters } from '@/types/orthodontics';
import { ORTHO_KANBAN_COLUMNS } from '@/types/orthodontics';
import { getStatusLabel, getNextStatus, getPreviousStatus } from '@/utils/orthodontics';
import { OrthoKanbanColumn } from './OrthoKanbanColumn';
import { OrthoKanbanCardOverlay } from './OrthoKanbanCard';
import { MaintenanceScheduleDialog } from './MaintenanceScheduleDialog';

interface OrthoKanbanBoardProps {
  cases: OrthodonticCase[];
  isLoading: boolean;
  onCardClick: (orthoCase: OrthodonticCase) => void;
}

export function OrthoKanbanBoard({ cases, isLoading, onCardClick }: OrthoKanbanBoardProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const changeStatus = useChangeStatus();
  const batchUpdatePositions = useBatchUpdatePositions();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [scheduleCase, setScheduleCase] = useState<OrthodonticCase | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // Fetch future appointments for documentation_received + active patients
  const [patientAppointments, setPatientAppointments] = useState<Record<string, string>>({});
  const appointmentCheckPatientIds = useMemo(
    () => [...new Set(
      cases
        .filter(c => c.status === 'documentation_received' || c.status === 'active')
        .map(c => c.patient_id)
    )],
    [cases]
  );

  useEffect(() => {
    if (appointmentCheckPatientIds.length === 0) {
      setPatientAppointments({});
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    supabase.from('appointments')
      .select('patient_id, date')
      .in('patient_id', appointmentCheckPatientIds)
      .gte('date', today)
      .not('status', 'in', '("cancelled","no_show")')
      .order('date', { ascending: true })
      .then(({ data }) => {
        const map: Record<string, string> = {};
        (data || []).forEach(a => {
          if (!map[a.patient_id]) {
            map[a.patient_id] = format(parseISO(a.date), "dd/MM", { locale: ptBR });
          }
        });
        setPatientAppointments(map);
      });
  }, [appointmentCheckPatientIds, refreshKey]);

  // Group cases by status (excluding paused from Kanban)
  const casesByStatus = useMemo(() => {
    const grouped: Record<string, OrthodonticCase[]> = {};
    ORTHO_KANBAN_COLUMNS.forEach(col => { grouped[col.id] = []; });
    cases.forEach(c => {
      if (c.status === 'paused') return;
      if (grouped[c.status]) grouped[c.status].push(c);
    });
    // Sort each column by position
    Object.values(grouped).forEach(arr =>
      arr.sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    );
    return grouped;
  }, [cases]);

  const activeCase = activeId ? cases.find(c => c.id === activeId) ?? null : null;

  const getUserId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || '';
  };

  const handleMoveCase = useCallback(async (orthoCase: OrthodonticCase, newStatus: OrthodonticStatus) => {
    const userId = await getUserId();
    try {
      await changeStatus.mutateAsync({
        caseId: orthoCase.id,
        newStatus,
        userId,
      });
    } catch {
      toast({ title: 'Erro ao mover caso', variant: 'destructive' });
    }
  }, [changeStatus, toast]);

  const handleAdvanceStatus = useCallback((orthoCase: OrthodonticCase) => {
    const next = getNextStatus(orthoCase.status);
    if (next) handleMoveCase(orthoCase, next);
  }, [handleMoveCase]);

  const handleRetreatStatus = useCallback((orthoCase: OrthodonticCase) => {
    const prev = getPreviousStatus(orthoCase.status);
    if (prev) handleMoveCase(orthoCase, prev);
  }, [handleMoveCase]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || !active) return;

    const draggedCase = cases.find(c => c.id === active.id);
    if (!draggedCase) return;

    const overId = over.id as string;
    const isColumn = ORTHO_KANBAN_COLUMNS.some(c => c.id === overId);
    const targetStatus = isColumn
      ? (overId as OrthodonticStatus)
      : cases.find(c => c.id === overId)?.status ?? draggedCase.status;

    if (targetStatus === 'paused') return;

    if (targetStatus !== draggedCase.status) {
      await handleMoveCase(draggedCase, targetStatus);
    } else {
      // Reorder within same column
      const columnCases = casesByStatus[targetStatus].filter(c => c.id !== draggedCase.id);
      const overIndex = columnCases.findIndex(c => c.id === overId);
      const newIndex = overIndex >= 0 ? overIndex : columnCases.length;
      columnCases.splice(newIndex, 0, draggedCase);
      const updates = columnCases.map((c, idx) => ({ id: c.id, position: idx }));
      batchUpdatePositions.mutate(updates);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop: Horizontal Kanban */}
      <div className="hidden md:block">
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-2 pb-4 overflow-x-auto">
            {ORTHO_KANBAN_COLUMNS.map((column, idx) => (
              <OrthoKanbanColumn
                key={column.id}
                column={column}
                cases={casesByStatus[column.id] || []}
                onCardClick={onCardClick}
                patientAppointments={
                  (column.id === 'documentation_received' || column.id === 'active')
                    ? patientAppointments : undefined
                }
                onAdvanceStatus={handleAdvanceStatus}
                onRetreatStatus={handleRetreatStatus}
                onSchedule={column.id === 'active' ? setScheduleCase : undefined}
                isFirst={idx === 0}
                isLast={idx === ORTHO_KANBAN_COLUMNS.length - 1}
              />
            ))}
          </div>
          <DragOverlay>
            {activeCase ? <OrthoKanbanCardOverlay orthoCase={activeCase} /> : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Mobile: Tabs */}
      <div className="md:hidden">
        <Tabs defaultValue="awaiting_documentation">
          <TabsList className="w-full overflow-x-auto flex">
            {ORTHO_KANBAN_COLUMNS.map(col => (
              <TabsTrigger key={col.id} value={col.id} className="text-[10px] px-1.5 shrink-0">
                {col.title.split(' ')[0]} ({(casesByStatus[col.id] || []).length})
              </TabsTrigger>
            ))}
          </TabsList>
          {ORTHO_KANBAN_COLUMNS.map(col => (
            <TabsContent key={col.id} value={col.id}>
              <div className="space-y-2">
                {(casesByStatus[col.id] || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhum caso</p>
                ) : (
                  (casesByStatus[col.id] || []).map(orthoCase => {
                    const next = getNextStatus(orthoCase.status);
                    const showActions = orthoCase.status === 'documentation_received' || orthoCase.status === 'active';
                    const isActive = orthoCase.status === 'active';
                    return (
                      <div
                        key={orthoCase.id}
                        className="bg-white rounded-lg border p-3 shadow-sm"
                        onClick={() => onCardClick(orthoCase)}
                      >
                        <p className="font-medium text-sm">{orthoCase.patient_name}</p>
                        {orthoCase.dentist_name && (
                          <p className="text-xs text-muted-foreground">{orthoCase.dentist_name}</p>
                        )}
                        {showActions && (
                          <div className="mt-1.5 flex gap-1.5">
                            {patientAppointments[orthoCase.patient_id] ? (
                              <div className="flex-1 flex items-center justify-center gap-1 bg-emerald-50 border border-emerald-200 rounded-md px-1.5 py-1">
                                <CalendarCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                                <span className="text-[9px] font-medium text-emerald-700">
                                  Agendado {patientAppointments[orthoCase.patient_id]}
                                </span>
                              </div>
                            ) : (
                              <div
                                className="flex-1 flex items-center justify-center gap-1 bg-amber-50 border border-amber-200 rounded-md px-1.5 py-1 cursor-pointer hover:bg-amber-100 transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isActive) {
                                    setScheduleCase(orthoCase);
                                  } else {
                                    navigate('/agenda');
                                  }
                                }}
                              >
                                <CalendarClock className="w-3 h-3 text-amber-600 shrink-0" />
                                <span className="text-[9px] font-medium text-amber-700">Agendar</span>
                              </div>
                            )}
                            {orthoCase.patient_phone && (
                              <a
                                href={`https://wa.me/55${orthoCase.patient_phone.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 flex items-center justify-center gap-1 bg-green-50 border border-green-200 rounded-md px-1.5 py-1 cursor-pointer hover:bg-green-100 transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MessageCircle className="w-3 h-3 text-green-600 shrink-0" />
                                <span className="text-[9px] font-medium text-green-700">WhatsApp</span>
                              </a>
                            )}
                          </div>
                        )}
                        {next && (
                          <div className="mt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={e => { e.stopPropagation(); handleAdvanceStatus(orthoCase); }}
                            >
                              <ArrowRight className="w-3 h-3 mr-1" />
                              {getStatusLabel(next)}
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {scheduleCase && (
        <MaintenanceScheduleDialog
          open={!!scheduleCase}
          onOpenChange={(open) => { if (!open) setScheduleCase(null); }}
          orthoCase={scheduleCase}
          onSuccess={() => setRefreshKey(k => k + 1)}
        />
      )}
    </>
  );
}
