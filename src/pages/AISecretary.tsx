import { useState, useEffect, useMemo } from 'react';
import { Bot, MessageCircle, Calendar, Bell, Sparkles, Clock, Settings, Zap, Mic, CreditCard, Shield, BarChart3, ChevronDown, Loader2, Plus, Trash2, MapPin } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { WhatsAppSettings } from '@/components/settings/WhatsAppSettings';
import { MessageBehaviorSection, AudioSettingsSection, ReminderSettingsSection, PaymentSettingsSection } from '@/components/secretary';
import { useToast } from '@/hooks/use-toast';
import { useClinic } from '@/contexts/ClinicContext';
import {
  getSecretarySettings,
  saveSecretarySettings,
  updateSecretarySetting,
  getBehaviorSettings,
  updateBehaviorSetting,
  updateBehaviorSettings,
  getSecretaryStats,
  getScheduleEntries,
  addScheduleEntry,
  deleteScheduleEntry,
  createDefaultSchedule,
  AISecretarySettings,
  AISecretaryBehavior,
  AISecretaryStats,
  ScheduleEntry,
  DEFAULT_BEHAVIOR_SETTINGS,
  DAY_NAMES_FULL,
} from '@/services/secretary';
import { cn } from '@/lib/utils';

// Collapsible Section Component
function CollapsibleSection({
  title,
  icon: Icon,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger className="w-full">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-violet-100 rounded-lg">
                  <Icon className="w-4 h-4 text-violet-600" />
                </div>
                <CardTitle className="text-base">{title}</CardTitle>
              </div>
              <ChevronDown
                className={cn(
                  "w-5 h-5 text-muted-foreground transition-transform",
                  isOpen && "rotate-180"
                )}
              />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">{children}</CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export default function AISecretary() {
  const { toast } = useToast();
  const { clinicId, loading: clinicLoading } = useClinic();

  // Loading state
  const [isLoading, setIsLoading] = useState(true);

  // Core Settings
  const [settings, setSettings] = useState<AISecretarySettings | null>(null);
  const [behavior, setBehavior] = useState<AISecretaryBehavior | null>(null);
  const [stats, setStats] = useState<AISecretaryStats>({
    total_conversations: 0,
    total_appointments_created: 0,
    transferred_conversations: 0,
  });

  // Schedule
  const [scheduleEntries, setScheduleEntries] = useState<ScheduleEntry[]>([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [newScheduleDay, setNewScheduleDay] = useState(1);
  const [newScheduleStart, setNewScheduleStart] = useState('08:00');
  const [newScheduleEnd, setNewScheduleEnd] = useState('18:00');

  // Group schedule by day
  const scheduleByDay = useMemo(() => {
    const grouped: Record<number, ScheduleEntry[]> = {};
    scheduleEntries.forEach(entry => {
      if (!grouped[entry.day_of_week]) {
        grouped[entry.day_of_week] = [];
      }
      grouped[entry.day_of_week].push(entry);
    });
    return grouped;
  }, [scheduleEntries]);

  // Load data on mount
  useEffect(() => {
    if (clinicLoading) return;

    if (clinicId) {
      loadData();
    } else {
      // No clinicId available, stop loading and show defaults
      setIsLoading(false);
      setSettings({
        clinic_id: '',
        is_active: false,
        whatsapp_connected: false,
        tone: 'casual',
        work_hours_start: '08:00',
        work_hours_end: '18:00',
        work_days: { seg: true, ter: true, qua: true, qui: true, sex: true, sab: false, dom: false },
        min_advance_hours: 2,
        interval_minutes: 30,
        allowed_procedure_ids: [],
        greeting_message: 'Olá! Sou a assistente virtual. Como posso ajudar?',
        confirmation_message: 'Sua consulta foi agendada com sucesso! ✅',
        reminder_message: 'Lembrete: Você tem uma consulta amanhã às {hora}.',
        out_of_hours_message: 'Olá! Nosso atendimento é das {inicio} às {fim}. Retornaremos em breve!',
        message_limit_per_conversation: 20,
        human_keywords: ['atendente', 'humano', 'pessoa'],
      });
      setBehavior({
        clinic_id: '',
        ...DEFAULT_BEHAVIOR_SETTINGS,
      } as AISecretaryBehavior);
    }
  }, [clinicId, clinicLoading]);

  const loadData = async () => {
    if (!clinicId) return;

    setIsLoading(true);
    try {
      // Safe loader that returns default on error
      const safeLoad = async <T,>(fn: () => Promise<T>, defaultValue: T): Promise<T> => {
        try {
          return await fn();
        } catch (e) {
          console.warn('Safe load error:', e);
          return defaultValue;
        }
      };

      const [settingsData, statsData, behaviorData, scheduleData] = await Promise.all([
        safeLoad(() => getSecretarySettings(clinicId), null),
        safeLoad(() => getSecretaryStats(clinicId), { total_conversations: 0, total_appointments_created: 0, transferred_conversations: 0 }),
        safeLoad(() => getBehaviorSettings(clinicId), null),
        safeLoad(() => getScheduleEntries(clinicId), []),
      ]);

      if (settingsData) {
        setSettings(settingsData);
      } else {
        setSettings({
          clinic_id: clinicId,
          is_active: false,
          whatsapp_connected: false,
          tone: 'casual',
          work_hours_start: '08:00',
          work_hours_end: '18:00',
          work_days: { seg: true, ter: true, qua: true, qui: true, sex: true, sab: false, dom: false },
          min_advance_hours: 2,
          interval_minutes: 30,
          allowed_procedure_ids: [],
          greeting_message: 'Olá! Sou a assistente virtual. Como posso ajudar?',
          confirmation_message: 'Sua consulta foi agendada com sucesso! ✅',
          reminder_message: 'Lembrete: Você tem uma consulta amanhã às {hora}.',
          out_of_hours_message: 'Olá! Nosso atendimento é das {inicio} às {fim}. Retornaremos em breve!',
          message_limit_per_conversation: 20,
          human_keywords: ['atendente', 'humano', 'pessoa'],
        });
      }

      setStats(statsData);
      setScheduleEntries(scheduleData);

      if (behaviorData) {
        setBehavior(behaviorData);
      } else {
        setBehavior({
          clinic_id: clinicId,
          ...DEFAULT_BEHAVIOR_SETTINGS,
        } as AISecretaryBehavior);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível carregar as configurações.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Update a single setting
  const updateSetting = async <K extends keyof AISecretarySettings>(field: K, value: AISecretarySettings[K]) => {
    if (!clinicId || !settings) return;

    const previousSettings = settings;
    setSettings(prev => prev ? { ...prev, [field]: value } : null);

    const success = await updateSecretarySetting(clinicId, field, value);
    if (!success) {
      setSettings(previousSettings);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível salvar a configuração.',
      });
    }
  };

  // Behavior update handlers
  const handleBehaviorUpdate = async (field: keyof AISecretaryBehavior, value: any) => {
    if (!clinicId || !behavior) return;

    const previousBehavior = behavior;
    setBehavior(prev => prev ? { ...prev, [field]: value } : null);

    try {
      const success = await updateBehaviorSetting(clinicId, field, value);
      if (!success) {
        setBehavior(previousBehavior);
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Não foi possível salvar. Verifique se a tabela de comportamento existe.',
        });
      }
    } catch (e) {
      console.error('Error updating behavior:', e);
      setBehavior(previousBehavior);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Tabela de comportamento não encontrada.',
      });
    }
  };

  const handleBehaviorUpdateMultiple = async (updates: Partial<AISecretaryBehavior>) => {
    if (!clinicId || !behavior) return;

    const previousBehavior = behavior;
    setBehavior(prev => prev ? { ...prev, ...updates } : null);

    try {
      const success = await updateBehaviorSettings(clinicId, updates);
      if (!success) {
        setBehavior(previousBehavior);
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Não foi possível salvar.',
        });
      }
    } catch (e) {
      console.error('Error updating behavior:', e);
      setBehavior(previousBehavior);
    }
  };

  // Schedule handlers
  const handleAddScheduleEntry = async () => {
    console.log('handleAddScheduleEntry called', { clinicId, newScheduleDay, newScheduleStart, newScheduleEnd });
    if (!clinicId) {
      console.log('No clinicId, returning');
      toast({ variant: 'destructive', title: 'Erro', description: 'Clínica não identificada.' });
      return;
    }

    const result = await addScheduleEntry(clinicId, newScheduleDay, newScheduleStart, newScheduleEnd);
    console.log('addScheduleEntry result:', result);
    if (result) {
      setScheduleEntries(prev => [...prev, result]);
      setShowScheduleModal(false);
      setNewScheduleDay(1);
      setNewScheduleStart('08:00');
      setNewScheduleEnd('18:00');
      toast({ title: 'Horário adicionado' });
    } else {
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível adicionar o horário.' });
    }
  };

  const handleDeleteScheduleEntry = async (id: string) => {
    const success = await deleteScheduleEntry(id);
    if (success) {
      setScheduleEntries(prev => prev.filter(e => e.id !== id));
      toast({ title: 'Horário removido' });
    } else {
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível remover.' });
    }
  };

  const handleCreateDefaultSchedule = async () => {
    if (!clinicId) return;

    const success = await createDefaultSchedule(clinicId);
    if (success) {
      const entries = await getScheduleEntries(clinicId);
      setScheduleEntries(entries);
      toast({ title: 'Horário padrão criado' });
    } else {
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível criar horário padrão.' });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-violet-600 mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl shadow-lg">
            <Bot className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Secretária IA</h1>
            <p className="text-muted-foreground mt-1">Automatize o atendimento e comunicação com pacientes</p>
          </div>
        </div>
        <Badge variant="secondary" className="bg-violet-100 text-violet-700 border-violet-200">
          <Sparkles className="w-3 h-3 mr-1" />
          Beta
        </Badge>
      </div>

      {/* Main Toggle */}
      {settings && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-lg",
                  settings.is_active ? "bg-green-100" : "bg-muted"
                )}>
                  <Zap className={cn(
                    "w-5 h-5",
                    settings.is_active ? "text-green-600" : "text-muted-foreground"
                  )} />
                </div>
                <div>
                  <Label className="text-base font-semibold">Status do Agente</Label>
                  <p className="text-sm text-muted-foreground">
                    {settings.is_active ? 'Respondendo mensagens' : 'Agente pausado'}
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.is_active}
                onCheckedChange={(value) => updateSetting('is_active', value)}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* WhatsApp Integration */}
      <WhatsAppSettings />

      {/* Schedule */}
      <CollapsibleSection title="Horários e Disponibilidade" icon={Clock} defaultOpen>
        {scheduleEntries.length === 0 ? (
          <div className="text-center py-6">
            <Clock className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground mb-4">Nenhum horário configurado</p>
            <Button onClick={handleCreateDefaultSchedule}>
              Criar Horário Padrão (Seg-Sex, 8h-18h)
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5, 6, 0].map(day => {
              const entries = scheduleByDay[day] || [];
              return (
                <div key={day}>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-2">{DAY_NAMES_FULL[day]}</h4>
                  {entries.length === 0 ? (
                    <p className="text-xs text-muted-foreground/60 italic">Sem atendimento</p>
                  ) : (
                    <div className="space-y-2">
                      {entries.map(entry => (
                        <div key={entry.id} className="flex items-center justify-between bg-muted/50 p-3 rounded-lg border">
                          <div className="flex items-center gap-3">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">{entry.start_time} - {entry.end_time}</span>
                            {entry.location_name && (
                              <Badge variant="secondary" className="text-xs">
                                <MapPin className="w-3 h-3 mr-1" />
                                {entry.location_name}
                              </Badge>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => entry.id && handleDeleteScheduleEntry(entry.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <Button
          variant="outline"
          className="w-full mt-4"
          onClick={() => setShowScheduleModal(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Horário
        </Button>
      </CollapsibleSection>

      {/* Schedule Modal */}
      <Dialog open={showScheduleModal} onOpenChange={setShowScheduleModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Horário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Dia da Semana</Label>
              <Select value={String(newScheduleDay)} onValueChange={(v) => setNewScheduleDay(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 0].map(day => (
                    <SelectItem key={day} value={String(day)}>{DAY_NAMES_FULL[day]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">Início</Label>
                <Input
                  type="time"
                  value={newScheduleStart}
                  onChange={(e) => setNewScheduleStart(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-sm font-medium mb-2 block">Fim</Label>
                <Input
                  type="time"
                  value={newScheduleEnd}
                  onChange={(e) => setNewScheduleEnd(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowScheduleModal(false)}>Cancelar</Button>
            <Button onClick={handleAddScheduleEntry}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Statistics */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-100 rounded-lg">
              <BarChart3 className="w-4 h-4 text-violet-600" />
            </div>
            <CardTitle className="text-base">Relatórios (Este Mês)</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-violet-50 border border-violet-100 rounded-xl text-center">
              <p className="text-3xl font-bold text-violet-700">{stats.total_appointments_created}</p>
              <p className="text-xs text-violet-600 mt-1">Agendamentos</p>
            </div>
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-center">
              <p className="text-3xl font-bold text-blue-700">{stats.total_conversations}</p>
              <p className="text-xs text-blue-600 mt-1">Conversas</p>
            </div>
            <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-center">
              <p className="text-3xl font-bold text-amber-700">{stats.transferred_conversations}</p>
              <p className="text-xs text-amber-600 mt-1">Transferências</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Behavior Settings */}
      {settings && (
        <CollapsibleSection title="Tom de Voz" icon={Settings} defaultOpen>
          <div className="space-y-4">
            <Label className="text-sm font-medium text-muted-foreground">Como a IA deve se comunicar?</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => updateSetting('tone', 'casual')}
                className={cn(
                  "p-4 rounded-xl border text-center transition-colors",
                  settings.tone === 'casual'
                    ? "bg-violet-50 border-violet-300"
                    : "bg-background hover:bg-muted/50"
                )}
              >
                <span className="text-2xl block mb-1">😊</span>
                <span className={cn(
                  "font-medium",
                  settings.tone === 'casual' ? "text-violet-700" : "text-foreground"
                )}>Casual</span>
              </button>
              <button
                onClick={() => updateSetting('tone', 'formal')}
                className={cn(
                  "p-4 rounded-xl border text-center transition-colors",
                  settings.tone === 'formal'
                    ? "bg-violet-50 border-violet-300"
                    : "bg-background hover:bg-muted/50"
                )}
              >
                <span className="text-2xl block mb-1">👔</span>
                <span className={cn(
                  "font-medium",
                  settings.tone === 'formal' ? "text-violet-700" : "text-foreground"
                )}>Formal</span>
              </button>
            </div>
          </div>
        </CollapsibleSection>
      )}

      {/* Scheduling Rules */}
      {settings && (
        <CollapsibleSection title="Regras de Agendamento" icon={Calendar}>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Antecedência Mínima (horas)</Label>
              <Input
                type="number"
                value={settings.min_advance_hours}
                onChange={(e) => updateSetting('min_advance_hours', parseInt(e.target.value) || 0)}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">Tempo mínimo antes de permitir agendamento</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Intervalo entre Consultas (minutos)</Label>
              <Input
                type="number"
                value={settings.interval_minutes}
                onChange={(e) => updateSetting('interval_minutes', parseInt(e.target.value) || 0)}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">Intervalo padrão entre consultas</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Limite de Mensagens por Conversa</Label>
              <Input
                type="number"
                value={settings.message_limit_per_conversation}
                onChange={(e) => updateSetting('message_limit_per_conversation', parseInt(e.target.value) || 20)}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">Após esse limite, transfere para humano</p>
            </div>
          </div>
        </CollapsibleSection>
      )}

      {/* Control & Limits */}
      {settings && (
        <CollapsibleSection title="Controle e Limites" icon={Shield}>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Palavras-chave para Humano</Label>
              <div className="flex flex-wrap gap-2">
                {settings.human_keywords?.map((kw, idx) => (
                  <Badge key={idx} variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200">
                    "{kw}"
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">Quando o paciente usar essas palavras, transfere para atendente humano</p>
            </div>
          </div>
        </CollapsibleSection>
      )}

      {/* Message Behavior */}
      {behavior && (
        <CollapsibleSection title="Comportamento de Mensagens" icon={MessageCircle}>
          <MessageBehaviorSection
            behavior={behavior}
            onUpdate={handleBehaviorUpdate}
            onUpdateMultiple={handleBehaviorUpdateMultiple}
          />
        </CollapsibleSection>
      )}

      {/* Audio Settings */}
      {behavior && (
        <CollapsibleSection title="Áudio e Voz" icon={Mic}>
          <AudioSettingsSection
            behavior={behavior}
            onUpdate={handleBehaviorUpdate}
            onUpdateMultiple={handleBehaviorUpdateMultiple}
          />
        </CollapsibleSection>
      )}

      {/* Reminders */}
      {behavior && (
        <CollapsibleSection title="Lembretes e Alertas" icon={Bell}>
          <ReminderSettingsSection
            behavior={behavior}
            onUpdate={handleBehaviorUpdate}
            onUpdateMultiple={handleBehaviorUpdateMultiple}
          />
        </CollapsibleSection>
      )}

      {/* Payments */}
      {behavior && (
        <CollapsibleSection title="Pagamentos" icon={CreditCard}>
          <PaymentSettingsSection
            behavior={behavior}
            onUpdate={handleBehaviorUpdate}
            onUpdateMultiple={handleBehaviorUpdateMultiple}
          />
        </CollapsibleSection>
      )}

      {/* Help Card */}
      <Card className="bg-blue-50 border-blue-100">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Bot className="w-5 h-5 text-blue-600 shrink-0" />
            <div>
              <h4 className="font-semibold text-blue-800 mb-1">Como funciona?</h4>
              <p className="text-sm text-blue-600">
                A secretária utiliza IA para responder mensagens no WhatsApp, consultar sua agenda e agendar consultas automaticamente. Todas as configurações são salvas no servidor.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
