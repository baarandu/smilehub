import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Phone, MessageCircle, Calendar, X } from 'lucide-react';
import { useCrmLeads, useCrmStages, useCrmSources } from '@/hooks/useCRM';
import { LeadDetailSheet } from './components/LeadDetailSheet';
import type { CrmLead, CrmLeadFilters } from '@/types/crm';
import { getWhatsAppNumber } from '@/utils/formatters';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function LeadsListTab() {
  const [filters, setFilters] = useState<CrmLeadFilters>({});
  const { data: leads = [], isLoading } = useCrmLeads(filters);
  const { data: stages = [] } = useCrmStages();
  const { data: sources = [] } = useCrmSources();

  const [selectedLead, setSelectedLead] = useState<CrmLead | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const hasFilters = filters.search || filters.stageId || filters.sourceId;

  const handleCardClick = (lead: CrmLead) => {
    setSelectedLead(lead);
    setSheetOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome..."
            className="pl-9 h-9"
            value={filters.search || ''}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value || undefined }))}
          />
        </div>
        <Select value={filters.stageId || 'all'} onValueChange={v => setFilters(f => ({ ...f, stageId: v === 'all' ? undefined : v }))}>
          <SelectTrigger className="w-40 h-9">
            <SelectValue placeholder="Etapa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas etapas</SelectItem>
            {stages.map(s => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filters.sourceId || 'all'} onValueChange={v => setFilters(f => ({ ...f, sourceId: v === 'all' ? undefined : v }))}>
          <SelectTrigger className="w-36 h-9">
            <SelectValue placeholder="Origem" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas origens</SelectItem>
            {sources.map(s => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" className="h-9" onClick={() => setFilters({})}>
            <X className="w-4 h-4 mr-1" />
            Limpar
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-center py-8">Carregando...</p>
      ) : leads.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">Nenhum lead encontrado</p>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Etapa</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Próxima Ação</TableHead>
                  <TableHead>Criado</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map(lead => (
                  <TableRow key={lead.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleCardClick(lead)}>
                    <TableCell className="font-medium">
                      <div>
                        {lead.name}
                        {(lead.tags || []).length > 0 && (
                          <div className="flex gap-1 mt-0.5">
                            {lead.tags!.slice(0, 2).map(t => (
                              <Badge key={t.id} variant="outline" className="text-[9px] px-1 py-0" style={{ borderColor: t.color, color: t.color }}>
                                {t.name}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {lead.phone ? (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-muted-foreground" />
                          <span className="text-sm">{lead.phone}</span>
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs" style={{ backgroundColor: `${lead.stage_color}20`, color: lead.stage_color }}>
                        {lead.stage_name}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{lead.source_name || '-'}</TableCell>
                    <TableCell>
                      {lead.next_action ? (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-amber-600" />
                          <span className="text-sm text-amber-800 max-w-[150px] truncate">{lead.next_action}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Nenhuma</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true, locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      {lead.phone && (
                        <a
                          href={`https://wa.me/${getWhatsAppNumber(lead.phone)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                        >
                          <MessageCircle className="w-4 h-4 text-green-600 hover:text-green-700" />
                        </a>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {leads.map(lead => (
              <div
                key={lead.id}
                className="bg-white rounded-lg border p-3 shadow-sm"
                onClick={() => handleCardClick(lead)}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-sm">{lead.name}</p>
                  <Badge variant="secondary" className="text-[10px] shrink-0" style={{ backgroundColor: `${lead.stage_color}20`, color: lead.stage_color }}>
                    {lead.stage_name}
                  </Badge>
                </div>
                {lead.phone && (
                  <p className="text-xs text-muted-foreground mt-0.5">{lead.phone}</p>
                )}
                {lead.next_action && (
                  <p className="text-xs text-amber-700 mt-1">{lead.next_action}</p>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      <LeadDetailSheet
        lead={selectedLead}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  );
}
