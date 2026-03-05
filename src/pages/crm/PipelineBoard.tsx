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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { useCrmStages, useCrmLeads, useMoveLead } from '@/hooks/useCRM';
import { PipelineColumn } from './components/PipelineColumn';
import { PipelineCardOverlay } from './components/PipelineCard';
import { LeadDetailSheet } from './components/LeadDetailSheet';
import type { CrmLead, CrmStage } from '@/types/crm';
import { toast } from 'sonner';

interface PipelineBoardProps {
  onCreateLead: (stageId?: string) => void;
}

export function PipelineBoard({ onCreateLead }: PipelineBoardProps) {
  const { data: stages = [], isLoading: stagesLoading } = useCrmStages();
  const { data: leads = [], isLoading: leadsLoading } = useCrmLeads();
  const moveLead = useMoveLead();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<CrmLead | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // Group leads by stage
  const leadsByStage = useMemo(() => {
    const grouped: Record<string, CrmLead[]> = {};
    stages.forEach(s => { grouped[s.id] = []; });
    leads.forEach(l => {
      if (grouped[l.stage_id]) grouped[l.stage_id].push(l);
    });
    return grouped;
  }, [stages, leads]);

  const activeLead = activeId ? leads.find(l => l.id === activeId) ?? null : null;

  const handleMove = useCallback(async (lead: CrmLead, newStageId: string) => {
    if (lead.stage_id === newStageId) return;
    const targetLeads = leadsByStage[newStageId] || [];
    try {
      await moveLead.mutateAsync({
        id: lead.id,
        stageId: newStageId,
        position: targetLeads.length,
        oldStageId: lead.stage_id,
      });
    } catch {
      toast.error('Erro ao mover lead');
    }
  }, [leadsByStage, moveLead]);

  const handleAdvance = (lead: CrmLead) => {
    const idx = stages.findIndex(s => s.id === lead.stage_id);
    if (idx < stages.length - 1) handleMove(lead, stages[idx + 1].id);
  };

  const handleRetreat = (lead: CrmLead) => {
    const idx = stages.findIndex(s => s.id === lead.stage_id);
    if (idx > 0) handleMove(lead, stages[idx - 1].id);
  };

  const handleCardClick = (lead: CrmLead) => {
    setSelectedLead(lead);
    setSheetOpen(true);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || !active) return;

    const draggedLead = leads.find(l => l.id === active.id);
    if (!draggedLead) return;

    const overId = over.id as string;
    const isStage = stages.some(s => s.id === overId);
    const targetStageId = isStage
      ? overId
      : leads.find(l => l.id === overId)?.stage_id ?? draggedLead.stage_id;

    if (targetStageId !== draggedLead.stage_id) {
      await handleMove(draggedLead, targetStageId);
    }
  };

  const isLoading = stagesLoading || leadsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop Kanban */}
      <div className="hidden md:block">
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-3 pb-4">
            {stages.map((stage, idx) => (
              <PipelineColumn
                key={stage.id}
                stage={stage}
                leads={leadsByStage[stage.id] || []}
                onCardClick={handleCardClick}
                onMoveLeft={idx > 0 ? handleRetreat : undefined}
                onMoveRight={idx < stages.length - 1 ? handleAdvance : undefined}
                isFirst={idx === 0}
                isLast={idx === stages.length - 1}
              />
            ))}
          </div>
          <DragOverlay>
            {activeLead ? <PipelineCardOverlay lead={activeLead} /> : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Mobile: Tabs per stage */}
      <div className="md:hidden">
        <Tabs defaultValue={stages[0]?.id}>
          <TabsList className="w-full overflow-x-auto flex">
            {stages.map(s => (
              <TabsTrigger key={s.id} value={s.id} className="text-xs px-2 shrink-0">
                {s.name} ({(leadsByStage[s.id] || []).length})
              </TabsTrigger>
            ))}
          </TabsList>
          {stages.map((stage, idx) => (
            <TabsContent key={stage.id} value={stage.id}>
              <div className="space-y-2">
                {(leadsByStage[stage.id] || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhum lead</p>
                ) : (
                  (leadsByStage[stage.id] || []).map(lead => {
                    const hasNext = idx < stages.length - 1;
                    return (
                      <div
                        key={lead.id}
                        className="bg-white rounded-lg border p-3 shadow-sm"
                        onClick={() => handleCardClick(lead)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-sm">{lead.name}</p>
                          {lead.source_name && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 shrink-0">
                              {lead.source_name}
                            </span>
                          )}
                        </div>
                        {lead.next_action && (
                          <p className="text-xs text-amber-700 mt-1">{lead.next_action}</p>
                        )}
                        {hasNext && (
                          <div className="mt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={e => {
                                e.stopPropagation();
                                handleAdvance(lead);
                              }}
                            >
                              <ArrowRight className="w-3 h-3 mr-1" />
                              Avançar
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

      <LeadDetailSheet
        lead={selectedLead}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </>
  );
}
