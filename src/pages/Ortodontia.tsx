import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Plus, List, Columns3 } from 'lucide-react';
import { useClinic } from '@/contexts/ClinicContext';
import { supabase } from '@/lib/supabase';
import { useOrthodonticCases } from '@/hooks/useOrthodontics';
import {
  CaseList,
  CaseFilters,
  CaseFormSheet,
  CaseDetailDialog,
  OrthoKanbanBoard,
} from '@/components/orthodontics';
import type { OrthodonticCase, CaseFilters as Filters } from '@/types/orthodontics';

interface DentistOption {
  id: string;
  name: string;
}

export default function Ortodontia() {
  const { clinicId } = useClinic();
  const [filters, setFilters] = useState<Filters>({});
  const { data: cases = [], isLoading } = useOrthodonticCases(filters);

  const [showFormSheet, setShowFormSheet] = useState(false);
  const [editingCase, setEditingCase] = useState<OrthodonticCase | null>(null);
  const [selectedCase, setSelectedCase] = useState<OrthodonticCase | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [dentists, setDentists] = useState<DentistOption[]>([]);

  // Load dentists for filter
  useEffect(() => {
    if (!clinicId) return;
    const load = async () => {
      const { data } = await (supabase.from('clinic_users') as any)
        .select('user_id, role')
        .eq('clinic_id', clinicId);
      if (!data) return;
      const dentistUsers = (data as any[]).filter((d: any) =>
        ['admin', 'dentist'].includes(d.role)
      );
      if (dentistUsers.length === 0) { setDentists([]); return; }
      const userIds = dentistUsers.map((d: any) => d.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);
      const nameMap: Record<string, string> = {};
      (profiles || []).forEach((p: any) => { nameMap[p.id] = p.full_name; });
      setDentists(
        dentistUsers.map((d: any) => ({
          id: d.user_id,
          name: nameMap[d.user_id] || d.user_id,
        }))
      );
    };
    load();
  }, [clinicId]);

  const handleCaseClick = (orthoCase: OrthodonticCase) => {
    setSelectedCase(orthoCase);
    setShowDetail(true);
  };

  const handleEdit = (orthoCase: OrthodonticCase) => {
    setEditingCase(orthoCase);
    setShowFormSheet(true);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Central de Ortodontia</h1>
        <Button onClick={() => { setEditingCase(null); setShowFormSheet(true); }}>
          <Plus className="w-4 h-4 mr-1" />
          Novo Caso
        </Button>
      </div>

      {/* Filters */}
      <CaseFilters
        filters={filters}
        onFiltersChange={setFilters}
        dentists={dentists}
      />

      {/* Tabs: Lista / Kanban */}
      <Tabs defaultValue="list">
        <TabsList className="grid w-full max-w-[240px] grid-cols-2">
          <TabsTrigger value="list" className="text-xs">
            <List className="w-4 h-4 mr-1" />
            Lista
          </TabsTrigger>
          <TabsTrigger value="kanban" className="text-xs">
            <Columns3 className="w-4 h-4 mr-1" />
            Kanban
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <CaseList
            cases={cases}
            isLoading={isLoading}
            onCaseClick={handleCaseClick}
          />
        </TabsContent>

        <TabsContent value="kanban">
          <OrthoKanbanBoard
            cases={cases}
            isLoading={isLoading}
            onCardClick={handleCaseClick}
          />
        </TabsContent>
      </Tabs>

      {/* Form Sheet */}
      <CaseFormSheet
        open={showFormSheet}
        onOpenChange={v => { setShowFormSheet(v); if (!v) setEditingCase(null); }}
        orthoCase={editingCase}
      />

      {/* Detail Dialog */}
      <CaseDetailDialog
        open={showDetail}
        onOpenChange={v => { setShowDetail(v); if (!v) setSelectedCase(null); }}
        orthoCase={selectedCase}
        onEdit={handleEdit}
      />
    </div>
  );
}
