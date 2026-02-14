import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Calendar, FileText, DollarSign, Bell, MessageCircle, Package,
  Award, Stethoscope, Mic, Calculator, Bot, Sparkles, BarChart3,
  Headphones, UserCog, CheckCircle, FileSignature, GripVertical,
  type LucideIcon,
} from 'lucide-react';
import type { FeatureDefinition } from '@/types/featureDefinition';

const lucideIconMap: Record<string, LucideIcon> = {
  Calendar, FileText, DollarSign, Bell, MessageCircle, Package,
  Award, Stethoscope, Mic, Calculator, Bot, Sparkles, BarChart3,
  Headphones, UserCog, CheckCircle, FileSignature,
};

interface PlanFeatureAssignerProps {
  allFeatures: FeatureDefinition[];
  assignedKeys: string[];
  onChange: (keys: string[]) => void;
}

function DroppableColumn({ id, children, title }: { id: string; children: React.ReactNode; title: string }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`flex-1 border rounded-xl p-3 min-h-[200px] transition-colors ${isOver ? 'bg-[#fef2f2] border-[#a03f3d]/30' : 'bg-gray-50 border-gray-200'}`}
    >
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{title}</p>
      <div className="space-y-1.5">
        {children}
      </div>
    </div>
  );
}

function SortableFeatureChip({ feature, showGrip }: { feature: FeatureDefinition; showGrip?: boolean }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: feature.key });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const Icon = lucideIconMap[feature.icon] || CheckCircle;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-gray-200 cursor-grab active:cursor-grabbing shadow-sm hover:shadow text-sm"
    >
      {showGrip && <GripVertical className="w-3.5 h-3.5 text-gray-300 shrink-0" />}
      <Icon className="w-4 h-4 text-[#a03f3d] shrink-0" />
      <span className="truncate">{feature.label}</span>
    </div>
  );
}

function FeatureChipOverlay({ feature }: { feature: FeatureDefinition }) {
  const Icon = lucideIconMap[feature.icon] || CheckCircle;
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border-2 border-[#a03f3d] shadow-lg text-sm">
      <Icon className="w-4 h-4 text-[#a03f3d] shrink-0" />
      <span className="truncate">{feature.label}</span>
    </div>
  );
}

export function PlanFeatureAssigner({ allFeatures, assignedKeys, onChange }: PlanFeatureAssignerProps) {
  const [activeFeature, setActiveFeature] = useState<FeatureDefinition | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const assignedFeatures = assignedKeys
    .map(key => allFeatures.find(f => f.key === key))
    .filter((f): f is FeatureDefinition => !!f);

  const availableFeatures = allFeatures.filter(f => !assignedKeys.includes(f.key));

  const findContainer = (featureKey: string): 'available' | 'assigned' | null => {
    if (assignedKeys.includes(featureKey)) return 'assigned';
    if (availableFeatures.some(f => f.key === featureKey)) return 'available';
    return null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    const feature = allFeatures.find(f => f.key === event.active.id);
    setActiveFeature(feature || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveFeature(null);
    const { active, over } = event;
    if (!over) return;

    const activeKey = active.id as string;
    const overId = over.id as string;
    const sourceContainer = findContainer(activeKey);

    // Determine target container
    let targetContainer: 'available' | 'assigned' | null = null;
    if (overId === 'available' || overId === 'assigned') {
      targetContainer = overId;
    } else {
      targetContainer = findContainer(overId);
    }

    if (!sourceContainer || !targetContainer) return;

    if (sourceContainer === targetContainer) {
      // Reorder within the same container (only meaningful for assigned)
      if (sourceContainer === 'assigned') {
        const oldIndex = assignedKeys.indexOf(activeKey);
        const newIndex = assignedKeys.indexOf(overId);
        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          onChange(arrayMove(assignedKeys, oldIndex, newIndex));
        }
      }
      return;
    }

    // Moving between containers
    if (sourceContainer === 'available' && targetContainer === 'assigned') {
      // Add to assigned — insert at the position of the over item, or at end
      const newKeys = [...assignedKeys];
      const overIndex = newKeys.indexOf(overId);
      if (overIndex !== -1) {
        newKeys.splice(overIndex, 0, activeKey);
      } else {
        newKeys.push(activeKey);
      }
      onChange(newKeys);
    } else if (sourceContainer === 'assigned' && targetContainer === 'available') {
      // Remove from assigned
      onChange(assignedKeys.filter(k => k !== activeKey));
    }
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-4">
        <DroppableColumn id="available" title="Features Disponíveis">
          <SortableContext items={availableFeatures.map(f => f.key)} strategy={verticalListSortingStrategy}>
            {availableFeatures.map(feature => (
              <SortableFeatureChip key={feature.key} feature={feature} />
            ))}
          </SortableContext>
          {availableFeatures.length === 0 && (
            <p className="text-xs text-gray-400 italic text-center py-4">Todas as features foram atribuídas</p>
          )}
        </DroppableColumn>

        <DroppableColumn id="assigned" title="Features do Plano">
          <SortableContext items={assignedKeys} strategy={verticalListSortingStrategy}>
            {assignedFeatures.map(feature => (
              <SortableFeatureChip key={feature.key} feature={feature} showGrip />
            ))}
          </SortableContext>
          {assignedFeatures.length === 0 && (
            <p className="text-xs text-gray-400 italic text-center py-4">Arraste features para cá</p>
          )}
        </DroppableColumn>
      </div>

      <DragOverlay>
        {activeFeature ? <FeatureChipOverlay feature={activeFeature} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
