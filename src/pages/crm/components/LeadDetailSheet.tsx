import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Phone, Mail, Calendar, MessageCircle, FileText,
  PhoneCall, Users, MapPin, Clock, Send, Pencil, Check, X, Trash2,
} from 'lucide-react';
import { useClinic } from '@/contexts/ClinicContext';
import {
  useUpdateLead, useDeleteLead, useCreateActivity, useCrmActivities,
  useCrmStages, useCrmSources, useCrmTags, useToggleLeadTag,
} from '@/hooks/useCRM';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import type { CrmLead, CrmActivityType } from '@/types/crm';
import { formatDistanceToNow, format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

const ACTIVITY_ICONS: Record<CrmActivityType, typeof Phone> = {
  note: FileText,
  call: PhoneCall,
  whatsapp: MessageCircle,
  email: Mail,
  meeting: Users,
  stage_change: MapPin,
  task: Calendar,
};

const ACTIVITY_LABELS: Record<CrmActivityType, string> = {
  note: 'Nota',
  call: 'Ligação',
  whatsapp: 'WhatsApp',
  email: 'Email',
  meeting: 'Reunião',
  stage_change: 'Etapa',
  task: 'Tarefa',
};

interface LeadDetailSheetProps {
  lead: CrmLead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LeadDetailSheet({ lead, open, onOpenChange }: LeadDetailSheetProps) {
  const { clinicId } = useClinic();
  const { data: stages = [] } = useCrmStages();
  const { data: sources = [] } = useCrmSources();
  const { data: tags = [] } = useCrmTags();
  const { data: activities = [] } = useCrmActivities(lead?.id ?? null);
  const updateLead = useUpdateLead();
  const deleteLead = useDeleteLead();
  const createActivity = useCreateActivity();
  const toggleTag = useToggleLeadTag();
  const { confirm, ConfirmDialog } = useConfirmDialog();

  const [editingAction, setEditingAction] = useState(false);
  const [nextAction, setNextAction] = useState('');
  const [nextActionDate, setNextActionDate] = useState('');

  // New activity form
  const [activityType, setActivityType] = useState<CrmActivityType>('note');
  const [activityTitle, setActivityTitle] = useState('');

  if (!lead) return null;

  const handleSaveNextAction = async () => {
    await updateLead.mutateAsync({
      id: lead.id,
      updates: {
        next_action: nextAction.trim() || null,
        next_action_date: nextActionDate || null,
      },
    });
    setEditingAction(false);
    toast.success('Próxima ação atualizada');
  };

  const handleAddActivity = async () => {
    if (!activityTitle.trim() || !clinicId) return;
    await createActivity.mutateAsync({
      clinic_id: clinicId,
      lead_id: lead.id,
      type: activityType,
      title: activityTitle.trim(),
    });
    setActivityTitle('');
    toast.success('Atividade registrada');
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: 'Excluir lead',
      description: `Tem certeza que deseja excluir "${lead.name}"? Esta ação não pode ser desfeita.`,
      confirmText: 'Excluir',
      variant: 'destructive',
    });
    if (ok) {
      await deleteLead.mutateAsync(lead.id);
      onOpenChange(false);
      toast.success('Lead excluído');
    }
  };

  const handleChangeStage = async (stageId: string) => {
    await updateLead.mutateAsync({ id: lead.id, updates: { stage_id: stageId } });
    toast.success('Etapa atualizada');
  };

  const leadTagIds = new Set((lead.tags || []).map(t => t.id));

  return (
    <>
      <ConfirmDialog />
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <span className="truncate">{lead.name}</span>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={handleDelete}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </SheetTitle>
          </SheetHeader>

          <div className="mt-4 space-y-4">
            {/* Contact info */}
            <div className="flex flex-wrap gap-2">
              {lead.phone && (
                <a href={`tel:${lead.phone}`} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
                  <Phone className="w-3.5 h-3.5" />
                  {lead.phone}
                </a>
              )}
              {lead.email && (
                <a href={`mailto:${lead.email}`} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
                  <Mail className="w-3.5 h-3.5" />
                  {lead.email}
                </a>
              )}
            </div>

            {/* Stage & Source */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Etapa</p>
                <Select value={lead.stage_id} onValueChange={handleChangeStage}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {stages.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                          {s.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Origem</p>
                <p className="text-sm">{lead.source_name || '-'}</p>
              </div>
            </div>

            {/* Tags */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Tags</p>
              <div className="flex flex-wrap gap-1.5">
                {tags.map(tag => {
                  const active = leadTagIds.has(tag.id);
                  return (
                    <Badge
                      key={tag.id}
                      variant={active ? 'default' : 'outline'}
                      className="cursor-pointer text-xs"
                      style={active ? { backgroundColor: tag.color, borderColor: tag.color } : { borderColor: tag.color, color: tag.color }}
                      onClick={() => toggleTag.mutate({ leadId: lead.id, tagId: tag.id, remove: active })}
                    >
                      {tag.name}
                    </Badge>
                  );
                })}
              </div>
            </div>

            {/* Next action */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold text-amber-800">Próxima ação</p>
                {!editingAction && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => {
                      setNextAction(lead.next_action || '');
                      setNextActionDate(lead.next_action_date || '');
                      setEditingAction(true);
                    }}
                  >
                    <Pencil className="w-3 h-3 text-amber-700" />
                  </Button>
                )}
              </div>
              {editingAction ? (
                <div className="space-y-2">
                  <Input
                    value={nextAction}
                    onChange={e => setNextAction(e.target.value)}
                    placeholder="Descreva a próxima ação..."
                    className="h-8 text-sm"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Input type="date" value={nextActionDate} onChange={e => setNextActionDate(e.target.value)} className="h-8 text-sm flex-1" />
                    <Button size="icon" className="h-8 w-8" onClick={handleSaveNextAction}>
                      <Check className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingAction(false)}>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-amber-900">
                  {lead.next_action || <span className="text-amber-600 italic">Nenhuma ação definida</span>}
                  {lead.next_action_date && (
                    <span className="text-xs text-amber-600 ml-2">({lead.next_action_date})</span>
                  )}
                </p>
              )}
            </div>

            {/* Quick actions */}
            {lead.phone && (
              <div className="flex gap-2">
                <a
                  href={`https://wa.me/55${lead.phone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1"
                >
                  <Button variant="outline" size="sm" className="w-full text-green-700 border-green-300 hover:bg-green-50">
                    <MessageCircle className="w-4 h-4 mr-1.5" />
                    WhatsApp
                  </Button>
                </a>
                <a href={`tel:${lead.phone}`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full">
                    <Phone className="w-4 h-4 mr-1.5" />
                    Ligar
                  </Button>
                </a>
              </div>
            )}

            {/* Tabs: Timeline */}
            <Tabs defaultValue="timeline" className="mt-2">
              <TabsList className="w-full">
                <TabsTrigger value="timeline" className="flex-1 text-xs">Timeline</TabsTrigger>
                <TabsTrigger value="notes" className="flex-1 text-xs">Notas</TabsTrigger>
              </TabsList>

              <TabsContent value="timeline" className="space-y-3 mt-3">
                {/* Add activity form */}
                <div className="flex gap-2">
                  <Select value={activityType} onValueChange={(v) => setActivityType(v as CrmActivityType)}>
                    <SelectTrigger className="w-28 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(['note', 'call', 'whatsapp', 'email', 'meeting', 'task'] as CrmActivityType[]).map(t => (
                        <SelectItem key={t} value={t}>{ACTIVITY_LABELS[t]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={activityTitle}
                    onChange={e => setActivityTitle(e.target.value)}
                    placeholder="Descrever atividade..."
                    className="h-8 text-sm flex-1"
                    onKeyDown={e => e.key === 'Enter' && handleAddActivity()}
                  />
                  <Button size="icon" className="h-8 w-8 shrink-0" onClick={handleAddActivity} disabled={!activityTitle.trim()}>
                    <Send className="w-3.5 h-3.5" />
                  </Button>
                </div>

                {/* Activity list */}
                <div className="space-y-2">
                  {activities.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Nenhuma atividade registrada</p>
                  ) : (
                    activities.map(activity => {
                      const Icon = ACTIVITY_ICONS[activity.type] || FileText;
                      return (
                        <div key={activity.id} className="flex gap-3 p-2 rounded-lg hover:bg-muted/50">
                          <div className="mt-0.5 p-1.5 rounded-md bg-muted shrink-0">
                            <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{activity.title}</p>
                            {activity.description && (
                              <p className="text-xs text-muted-foreground mt-0.5">{activity.description}</p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <Clock className="w-3 h-3 text-muted-foreground" />
                              <span className="text-[10px] text-muted-foreground">
                                {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true, locale: ptBR })}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </TabsContent>

              <TabsContent value="notes" className="mt-3">
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-sm whitespace-pre-wrap">{lead.notes || 'Nenhuma observação.'}</p>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
