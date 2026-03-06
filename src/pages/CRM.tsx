import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus, Kanban, List, TrendingUp, HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PipelineBoard } from './crm/PipelineBoard';
import { LeadsListTab } from './crm/LeadsListTab';
import { OpportunitiesTab } from './crm/OpportunitiesTab';
import { LeadFormDialog } from './crm/components/LeadFormDialog';

export default function CRM() {
  const [showNewLead, setShowNewLead] = useState(false);
  const [defaultStageId, setDefaultStageId] = useState<string | undefined>();

  const handleCreateLead = (stageId?: string) => {
    setDefaultStageId(stageId);
    setShowNewLead(true);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-indigo-100 rounded-xl">
            <Kanban className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground">CRM</h1>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs text-sm">
                    CRM (Customer Relationship Management) organiza e acompanha seus potenciais pacientes desde o primeiro contato até o fechamento do tratamento, ajudando a não perder nenhuma oportunidade.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <p className="text-muted-foreground mt-0.5 text-sm">Gestão de leads e pipeline de conversão</p>
          </div>
        </div>
        <Button size="sm" onClick={() => handleCreateLead()}>
          <Plus className="w-4 h-4 mr-1" />
          Novo Lead
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="pipeline">
        <TabsList>
          <TabsTrigger value="pipeline" className="gap-1.5">
            <Kanban className="w-4 h-4" />
            <span className="hidden sm:inline">Funil</span>
          </TabsTrigger>
          <TabsTrigger value="list" className="gap-1.5">
            <List className="w-4 h-4" />
            <span className="hidden sm:inline">Lista</span>
          </TabsTrigger>
          <TabsTrigger value="opportunities" className="gap-1.5">
            <TrendingUp className="w-4 h-4" />
            <span className="hidden sm:inline">Oportunidades</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="mt-4">
          <PipelineBoard onCreateLead={handleCreateLead} />
        </TabsContent>

        <TabsContent value="list" className="mt-4">
          <LeadsListTab />
        </TabsContent>

        <TabsContent value="opportunities" className="mt-4">
          <OpportunitiesTab />
        </TabsContent>
      </Tabs>

      <LeadFormDialog
        open={showNewLead}
        onOpenChange={setShowNewLead}
        defaultStageId={defaultStageId}
      />
    </div>
  );
}
