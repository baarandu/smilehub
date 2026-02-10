import { useState, useEffect, useMemo } from 'react';
import { Bot, MessageCircle, Calendar, Bell, Sparkles, Clock, Settings, Zap, Mic, CreditCard, Shield, BarChart3, ChevronDown, Loader2, Plus, Trash2, Pencil, MapPin, User, Ban, Save } from 'lucide-react';
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
  updateScheduleEntry,
  deleteScheduleEntry,
  createDefaultSchedule,
  getClinicProfessionals,
  addClinicProfessional,
  updateClinicProfessional,
  deleteClinicProfessional,
  getCustomMessages,
  addCustomMessage,
  updateCustomMessage,
  deleteCustomMessage,
  getBlockedNumbers,
  addBlockedNumber,
  removeBlockedNumber,
  AISecretarySettings,
  AISecretaryBehavior,
  AISecretaryStats,
  ScheduleEntry,
  ClinicProfessional,
  CustomMessage,
  BlockedNumber,
  DEFAULT_BEHAVIOR_SETTINGS,
  DAY_NAMES_FULL,
  PREDEFINED_MESSAGE_TYPES,
} from '@/services/secretary';
import { cn } from '@/lib/utils';

// Format time to HH:MM (removes seconds if present)
const formatTime = (time: string) => time?.slice(0, 5) || time;

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
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Icon className="w-4 h-4 text-primary" />
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

  // Edit schedule
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ScheduleEntry | null>(null);
  const [editScheduleDay, setEditScheduleDay] = useState(1);
  const [editScheduleStart, setEditScheduleStart] = useState('08:00');
  const [editScheduleEnd, setEditScheduleEnd] = useState('18:00');

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);

  // Professionals
  const [professionals, setProfessionals] = useState<ClinicProfessional[]>([]);
  const [showProfessionalModal, setShowProfessionalModal] = useState(false);
  const [editingProfessional, setEditingProfessional] = useState<ClinicProfessional | null>(null);
  const [profName, setProfName] = useState('');
  const [profTitle, setProfTitle] = useState('Dr.');
  const [profSpecialty, setProfSpecialty] = useState('');

  // Custom Messages
  const [customMessages, setCustomMessages] = useState<CustomMessage[]>([]);
  const [showCustomMessageModal, setShowCustomMessageModal] = useState(false);
  const [editingCustomMessage, setEditingCustomMessage] = useState<CustomMessage | null>(null);
  const [newMessageTitle, setNewMessageTitle] = useState('');
  const [newMessageContent, setNewMessageContent] = useState('');
  const [newMessageKey, setNewMessageKey] = useState('');

  // Blocked Numbers
  const [blockedNumbers, setBlockedNumbers] = useState<BlockedNumber[]>([]);
  const [showBlockedNumberModal, setShowBlockedNumberModal] = useState(false);
  const [newBlockedNumber, setNewBlockedNumber] = useState('');

  // Human Keywords
  const [showKeywordModal, setShowKeywordModal] = useState(false);
  const [editingKeywordIndex, setEditingKeywordIndex] = useState<number | null>(null);
  const [newKeyword, setNewKeyword] = useState('');

  // Scheduling Rules (local state with save button)
  const [localMinAdvanceHours, setLocalMinAdvanceHours] = useState('2');
  const [localIntervalMinutes, setLocalIntervalMinutes] = useState('30');
  const [rulesChanged, setRulesChanged] = useState(false);

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

      const [settingsData, statsData, behaviorData, scheduleData, professionalsData, customMessagesData, blockedData] = await Promise.all([
        safeLoad(() => getSecretarySettings(clinicId), null),
        safeLoad(() => getSecretaryStats(clinicId), { total_conversations: 0, total_appointments_created: 0, transferred_conversations: 0 }),
        safeLoad(() => getBehaviorSettings(clinicId), null),
        safeLoad(() => getScheduleEntries(clinicId), []),
        safeLoad(() => getClinicProfessionals(clinicId), []),
        safeLoad(() => getCustomMessages(clinicId), []),
        safeLoad(() => getBlockedNumbers(clinicId), []),
      ]);

      if (settingsData) {
        setSettings(settingsData);
        setLocalMinAdvanceHours(String(settingsData.min_advance_hours || 2));
        setLocalIntervalMinutes(String(settingsData.interval_minutes || 30));
        setRulesChanged(false);
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
      setProfessionals(professionalsData);
      setCustomMessages(customMessagesData);
      setBlockedNumbers(blockedData);

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

  // Open edit modal
  const handleOpenEditModal = (entry: ScheduleEntry) => {
    setEditingEntry(entry);
    setEditScheduleDay(entry.day_of_week);
    setEditScheduleStart(formatTime(entry.start_time));
    setEditScheduleEnd(formatTime(entry.end_time));
    setShowEditModal(true);
  };

  // Save edit
  const handleEditScheduleEntry = async () => {
    if (!editingEntry?.id) return;

    const result = await updateScheduleEntry(editingEntry.id, {
      day_of_week: editScheduleDay,
      start_time: editScheduleStart,
      end_time: editScheduleEnd,
    });
    if (result) {
      setScheduleEntries(prev => prev.map(e => e.id === editingEntry.id ? result : e));
      setShowEditModal(false);
      setEditingEntry(null);
      toast({ title: 'Horário atualizado' });
    } else {
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível atualizar o horário.' });
    }
  };

  // Ask for delete confirmation
  const handleAskDeleteConfirmation = (id: string) => {
    setDeletingEntryId(id);
    setShowDeleteConfirm(true);
  };

  // Confirm delete
  const handleConfirmDelete = async () => {
    if (!deletingEntryId) return;

    const success = await deleteScheduleEntry(deletingEntryId);
    if (success) {
      setScheduleEntries(prev => prev.filter(e => e.id !== deletingEntryId));
      toast({ title: 'Horário removido' });
    } else {
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível remover.' });
    }
    setShowDeleteConfirm(false);
    setDeletingEntryId(null);
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

  // =====================================================
  // Professional Handlers
  // =====================================================
  const handleOpenProfessionalModal = (prof?: ClinicProfessional) => {
    if (prof) {
      setEditingProfessional(prof);
      setProfName(prof.name);
      setProfTitle(prof.title || 'Dr.');
      setProfSpecialty(prof.specialty || '');
    } else {
      setEditingProfessional(null);
      setProfName('');
      setProfTitle('Dr.');
      setProfSpecialty('');
    }
    setShowProfessionalModal(true);
  };

  const handleSaveProfessional = async () => {
    if (!clinicId || !profName.trim()) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Digite o nome do profissional.' });
      return;
    }

    if (editingProfessional?.id) {
      const success = await updateClinicProfessional(editingProfessional.id, {
        name: profName.trim(),
        title: profTitle,
        specialty: profSpecialty,
      });
      if (success) {
        setProfessionals(prev => prev.map(p =>
          p.id === editingProfessional.id
            ? { ...p, name: profName.trim(), title: profTitle, specialty: profSpecialty }
            : p
        ));
        setShowProfessionalModal(false);
        setEditingProfessional(null);
        toast({ title: 'Profissional atualizado' });
      } else {
        toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível atualizar.' });
      }
    } else {
      const result = await addClinicProfessional(clinicId, {
        name: profName.trim(),
        title: profTitle,
        specialty: profSpecialty,
        profession: 'Dentista',
        default_appointment_duration: 30,
        is_active: true,
        accepts_new_patients: true,
      });
      if (result) {
        setProfessionals(prev => [...prev, result]);
        setShowProfessionalModal(false);
        toast({ title: 'Profissional adicionado' });
      } else {
        toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível adicionar.' });
      }
    }
  };

  const handleDeleteProfessional = async (prof: ClinicProfessional) => {
    if (!prof.id) return;
    const success = await deleteClinicProfessional(prof.id);
    if (success) {
      setProfessionals(prev => prev.filter(p => p.id !== prof.id));
      toast({ title: 'Profissional removido' });
    } else {
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível remover.' });
    }
  };

  // =====================================================
  // Custom Message Handlers
  // =====================================================
  const availablePredefinedTypes = PREDEFINED_MESSAGE_TYPES.filter(
    type => !customMessages.some(m => m.message_key === type.key)
  );

  const handleOpenCustomMessageModal = (message?: CustomMessage, predefinedType?: typeof PREDEFINED_MESSAGE_TYPES[number]) => {
    if (message) {
      setEditingCustomMessage(message);
      setNewMessageTitle(message.title);
      setNewMessageContent(message.message);
      setNewMessageKey(message.message_key);
    } else if (predefinedType) {
      setEditingCustomMessage(null);
      setNewMessageTitle(predefinedType.title);
      setNewMessageContent(predefinedType.defaultMessage);
      setNewMessageKey(predefinedType.key);
    } else {
      setEditingCustomMessage(null);
      setNewMessageTitle('');
      setNewMessageContent('');
      setNewMessageKey('custom_' + Date.now());
    }
    setShowCustomMessageModal(true);
  };

  const handleSaveCustomMessage = async () => {
    if (!clinicId || !newMessageTitle.trim() || !newMessageContent.trim()) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Preencha o título e a mensagem.' });
      return;
    }

    if (editingCustomMessage?.id) {
      const success = await updateCustomMessage(editingCustomMessage.id, {
        title: newMessageTitle,
        message: newMessageContent,
      });
      if (success) {
        setCustomMessages(prev => prev.map(m =>
          m.id === editingCustomMessage.id
            ? { ...m, title: newMessageTitle, message: newMessageContent }
            : m
        ));
        setShowCustomMessageModal(false);
        setEditingCustomMessage(null);
        toast({ title: 'Mensagem atualizada' });
      } else {
        toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível salvar.' });
      }
    } else {
      const result = await addCustomMessage(clinicId, newMessageKey, newMessageTitle, newMessageContent, false);
      if (result) {
        setCustomMessages(prev => [...prev, result]);
        setShowCustomMessageModal(false);
        toast({ title: 'Mensagem adicionada' });
      } else {
        toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível adicionar.' });
      }
    }
  };

  const handleDeleteCustomMessage = async (message: CustomMessage) => {
    if (!message.id) return;
    const success = await deleteCustomMessage(message.id);
    if (success) {
      setCustomMessages(prev => prev.filter(m => m.id !== message.id));
      toast({ title: 'Mensagem removida' });
    } else {
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível remover.' });
    }
  };

  const handleToggleCustomMessageActive = async (message: CustomMessage) => {
    if (!message.id) return;
    const success = await updateCustomMessage(message.id, { is_active: !message.is_active });
    if (success) {
      setCustomMessages(prev => prev.map(m =>
        m.id === message.id ? { ...m, is_active: !m.is_active } : m
      ));
    }
  };

  // =====================================================
  // Blocked Numbers Handlers
  // =====================================================
  const handleSaveBlockedNumber = async () => {
    if (!clinicId || !newBlockedNumber.trim()) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Digite um número válido.' });
      return;
    }
    const result = await addBlockedNumber(clinicId, newBlockedNumber.trim());
    if (result) {
      setBlockedNumbers(prev => [result, ...prev]);
      setShowBlockedNumberModal(false);
      setNewBlockedNumber('');
      toast({ title: 'Número bloqueado' });
    } else {
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível bloquear.' });
    }
  };

  const handleRemoveBlockedNumber = async (item: BlockedNumber) => {
    if (!item.id) return;
    const success = await removeBlockedNumber(item.id);
    if (success) {
      setBlockedNumbers(prev => prev.filter(n => n.id !== item.id));
      toast({ title: 'Número desbloqueado' });
    }
  };

  // =====================================================
  // Human Keywords Handlers
  // =====================================================
  const handleOpenKeywordModal = (index?: number) => {
    if (index !== undefined && settings?.human_keywords) {
      setEditingKeywordIndex(index);
      setNewKeyword(settings.human_keywords[index]);
    } else {
      setEditingKeywordIndex(null);
      setNewKeyword('');
    }
    setShowKeywordModal(true);
  };

  const handleSaveKeyword = async () => {
    if (!settings || !newKeyword.trim()) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Digite uma palavra-chave.' });
      return;
    }

    const currentKeywords = settings.human_keywords || [];
    let updatedKeywords: string[];

    if (editingKeywordIndex !== null) {
      updatedKeywords = [...currentKeywords];
      updatedKeywords[editingKeywordIndex] = newKeyword.trim().toLowerCase();
    } else {
      if (currentKeywords.includes(newKeyword.trim().toLowerCase())) {
        toast({ variant: 'destructive', title: 'Erro', description: 'Esta palavra-chave já existe.' });
        return;
      }
      updatedKeywords = [...currentKeywords, newKeyword.trim().toLowerCase()];
    }

    await updateSetting('human_keywords', updatedKeywords);
    setShowKeywordModal(false);
    setEditingKeywordIndex(null);
    setNewKeyword('');
    toast({ title: 'Palavra-chave salva' });
  };

  const handleDeleteKeyword = async (index: number) => {
    if (!settings?.human_keywords) return;
    const updatedKeywords = settings.human_keywords.filter((_, i) => i !== index);
    await updateSetting('human_keywords', updatedKeywords);
  };

  // =====================================================
  // Scheduling Rules Handlers
  // =====================================================
  const handleSaveSchedulingRules = async () => {
    if (!clinicId) return;

    const minHours = parseInt(localMinAdvanceHours) || 2;
    const interval = parseInt(localIntervalMinutes) || 30;

    await updateSetting('min_advance_hours', minHours);
    await updateSetting('interval_minutes', interval);

    setRulesChanged(false);
    toast({ title: 'Regras de agendamento salvas' });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-50 to-transparent rounded-2xl p-6 border border-red-100">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-white p-3 rounded-xl shadow-sm border border-red-50">
              <Bot className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Secretária IA</h1>
              <p className="text-primary/80 mt-1 font-medium">Automatize o atendimento e comunicação com pacientes</p>
            </div>
          </div>
          <Badge variant="secondary" className="bg-white text-primary border-primary/20">
            <Sparkles className="w-3 h-3 mr-1" />
            Beta
          </Badge>
        </div>
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
                            <span className="text-sm">{formatTime(entry.start_time)} - {formatTime(entry.end_time)}</span>
                            {entry.location_name && (
                              <Badge variant="secondary" className="text-xs">
                                <MapPin className="w-3 h-3 mr-1" />
                                {entry.location_name}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEditModal(entry)}
                            >
                              <Pencil className="w-4 h-4 text-muted-foreground" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => entry.id && handleAskDeleteConfirmation(entry.id)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
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

      {/* Edit Schedule Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Horário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Dia da Semana</Label>
              <Select value={String(editScheduleDay)} onValueChange={(v) => setEditScheduleDay(parseInt(v))}>
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
                  value={editScheduleStart}
                  onChange={(e) => setEditScheduleStart(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-sm font-medium mb-2 block">Fim</Label>
                <Input
                  type="time"
                  value={editScheduleEnd}
                  onChange={(e) => setEditScheduleEnd(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>Cancelar</Button>
            <Button onClick={handleEditScheduleEntry}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground py-4">
            Tem certeza que deseja excluir este horário? Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Professional Modal */}
      <Dialog open={showProfessionalModal} onOpenChange={setShowProfessionalModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingProfessional ? 'Editar Profissional' : 'Adicionar Profissional'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Título</Label>
              <Select value={profTitle} onValueChange={setProfTitle}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Dr.">Dr.</SelectItem>
                  <SelectItem value="Dra.">Dra.</SelectItem>
                  <SelectItem value="Prof.">Prof.</SelectItem>
                  <SelectItem value="">Sem título</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium mb-2 block">Nome</Label>
              <Input
                value={profName}
                onChange={(e) => setProfName(e.target.value)}
                placeholder="Nome do profissional"
              />
            </div>
            <div>
              <Label className="text-sm font-medium mb-2 block">Especialidade</Label>
              <Input
                value={profSpecialty}
                onChange={(e) => setProfSpecialty(e.target.value)}
                placeholder="Ex: Ortodontia, Implantes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProfessionalModal(false)}>Cancelar</Button>
            <Button onClick={handleSaveProfessional}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Custom Message Modal */}
      <Dialog open={showCustomMessageModal} onOpenChange={setShowCustomMessageModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCustomMessage ? 'Editar Mensagem' : 'Nova Mensagem'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Título</Label>
              <Input
                value={newMessageTitle}
                onChange={(e) => setNewMessageTitle(e.target.value)}
                placeholder="Ex: Confirmação de consulta"
              />
            </div>
            <div>
              <Label className="text-sm font-medium mb-2 block">Mensagem</Label>
              <textarea
                className="w-full min-h-[100px] p-3 border rounded-md text-sm"
                value={newMessageContent}
                onChange={(e) => setNewMessageContent(e.target.value)}
                placeholder="Digite a mensagem..."
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use {'{nome}'}, {'{data}'}, {'{hora}'}, {'{profissional}'} para variáveis
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCustomMessageModal(false)}>Cancelar</Button>
            <Button onClick={handleSaveCustomMessage}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Blocked Number Modal */}
      <Dialog open={showBlockedNumberModal} onOpenChange={setShowBlockedNumberModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bloquear Número</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Número de Telefone</Label>
              <Input
                value={newBlockedNumber}
                onChange={(e) => setNewBlockedNumber(e.target.value)}
                placeholder="Ex: 5511999999999"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Digite o número com código do país (sem + ou espaços)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBlockedNumberModal(false)}>Cancelar</Button>
            <Button onClick={handleSaveBlockedNumber}>Bloquear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Keyword Modal */}
      <Dialog open={showKeywordModal} onOpenChange={setShowKeywordModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingKeywordIndex !== null ? 'Editar Palavra-chave' : 'Nova Palavra-chave'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Palavra-chave</Label>
              <Input
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                placeholder="Ex: atendente, humano..."
              />
              <p className="text-xs text-muted-foreground mt-1">
                Quando o paciente usar esta palavra, será transferido para humano
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowKeywordModal(false)}>Cancelar</Button>
            <Button onClick={handleSaveKeyword}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Statistics */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <BarChart3 className="w-4 h-4 text-primary" />
            </div>
            <CardTitle className="text-base">Relatórios (Este Mês)</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl text-center">
              <p className="text-3xl font-bold text-primary">{stats.total_appointments_created}</p>
              <p className="text-xs text-primary/80 mt-1">Agendamentos</p>
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
                    ? "bg-primary/5 border-primary/30"
                    : "bg-background hover:bg-muted/50"
                )}
              >
                <span className="text-2xl block mb-1">😊</span>
                <span className={cn(
                  "font-medium",
                  settings.tone === 'casual' ? "text-primary" : "text-foreground"
                )}>Casual</span>
              </button>
              <button
                onClick={() => updateSetting('tone', 'formal')}
                className={cn(
                  "p-4 rounded-xl border text-center transition-colors",
                  settings.tone === 'formal'
                    ? "bg-primary/5 border-primary/30"
                    : "bg-background hover:bg-muted/50"
                )}
              >
                <span className="text-2xl block mb-1">👔</span>
                <span className={cn(
                  "font-medium",
                  settings.tone === 'formal' ? "text-primary" : "text-foreground"
                )}>Formal</span>
              </button>
            </div>
          </div>
        </CollapsibleSection>
      )}

      {/* Professionals */}
      <CollapsibleSection title="Profissionais" icon={User}>
        {professionals.length === 0 ? (
          <div className="text-center py-6">
            <User className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground mb-4">Nenhum profissional cadastrado</p>
          </div>
        ) : (
          <div className="space-y-2">
            {professionals.map(prof => (
              <div key={prof.id} className="flex items-center justify-between bg-muted/50 p-3 rounded-lg border">
                <div>
                  <p className="font-medium text-sm">{prof.title} {prof.name}</p>
                  {prof.specialty && <p className="text-xs text-muted-foreground">{prof.specialty}</p>}
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => handleOpenProfessionalModal(prof)}>
                    <Pencil className="w-4 h-4 text-muted-foreground" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteProfessional(prof)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        <Button variant="outline" className="w-full mt-4" onClick={() => handleOpenProfessionalModal()}>
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Profissional
        </Button>
      </CollapsibleSection>

      {/* Custom Messages */}
      <CollapsibleSection title="Mensagens Customizadas" icon={MessageCircle}>
        {customMessages.length === 0 ? (
          <div className="text-center py-6">
            <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground mb-4">Nenhuma mensagem customizada</p>
          </div>
        ) : (
          <div className="space-y-2">
            {customMessages.map(msg => (
              <div key={msg.id} className="flex items-center justify-between bg-muted/50 p-3 rounded-lg border">
                <div className="flex-1 min-w-0 mr-2">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{msg.title}</p>
                    {msg.is_predefined && (
                      <Badge variant="secondary" className="text-xs">Padrão</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{msg.message}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Switch
                    checked={msg.is_active}
                    onCheckedChange={() => handleToggleCustomMessageActive(msg)}
                  />
                  <Button variant="ghost" size="sm" onClick={() => handleOpenCustomMessageModal(msg)}>
                    <Pencil className="w-4 h-4 text-muted-foreground" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteCustomMessage(msg)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2 mt-4">
          <Button variant="outline" className="flex-1" onClick={() => handleOpenCustomMessageModal()}>
            <Plus className="w-4 h-4 mr-2" />
            Criar Mensagem
          </Button>
          {availablePredefinedTypes.length > 0 && (
            <Select onValueChange={(key) => {
              const type = PREDEFINED_MESSAGE_TYPES.find(t => t.key === key);
              if (type) handleOpenCustomMessageModal(undefined, type);
            }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Adicionar modelo" />
              </SelectTrigger>
              <SelectContent>
                {availablePredefinedTypes.map(type => (
                  <SelectItem key={type.key} value={type.key}>{type.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </CollapsibleSection>

      {/* Scheduling Rules */}
      {settings && (
        <CollapsibleSection title="Regras de Agendamento" icon={Calendar}>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Antecedência Mínima (horas)</Label>
              <Input
                type="number"
                value={localMinAdvanceHours}
                onChange={(e) => {
                  setLocalMinAdvanceHours(e.target.value);
                  setRulesChanged(true);
                }}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">Tempo mínimo antes de permitir agendamento</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Intervalo entre Consultas (minutos)</Label>
              <Input
                type="number"
                value={localIntervalMinutes}
                onChange={(e) => {
                  setLocalIntervalMinutes(e.target.value);
                  setRulesChanged(true);
                }}
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
            {rulesChanged && (
              <Button onClick={handleSaveSchedulingRules} className="w-full">
                <Save className="w-4 h-4 mr-2" />
                Salvar Regras
              </Button>
            )}
          </div>
        </CollapsibleSection>
      )}

      {/* Control & Limits - Human Keywords */}
      {settings && (
        <CollapsibleSection title="Controle e Limites" icon={Shield}>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Palavras-chave para Humano</Label>
              <div className="flex flex-wrap gap-2">
                {settings.human_keywords?.map((kw, idx) => (
                  <Badge
                    key={idx}
                    variant="secondary"
                    className="bg-amber-50 text-amber-700 border-amber-200 cursor-pointer hover:bg-amber-100"
                    onClick={() => handleOpenKeywordModal(idx)}
                  >
                    "{kw}"
                    <button
                      className="ml-1 hover:text-red-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteKeyword(idx);
                      }}
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">Quando o paciente usar essas palavras, transfere para atendente humano</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => handleOpenKeywordModal()}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Palavra-chave
              </Button>
            </div>
          </div>
        </CollapsibleSection>
      )}

      {/* Blocked Numbers */}
      <CollapsibleSection title="Números Bloqueados" icon={Ban}>
        {blockedNumbers.length === 0 ? (
          <div className="text-center py-6">
            <Ban className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground mb-4">Nenhum número bloqueado</p>
          </div>
        ) : (
          <div className="space-y-2">
            {blockedNumbers.map(item => (
              <div key={item.id} className="flex items-center justify-between bg-muted/50 p-3 rounded-lg border">
                <div>
                  <p className="font-medium text-sm">{item.phone_number}</p>
                  {item.reason && <p className="text-xs text-muted-foreground">{item.reason}</p>}
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleRemoveBlockedNumber(item)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
        <Button variant="outline" className="w-full mt-4" onClick={() => setShowBlockedNumberModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Bloquear Número
        </Button>
      </CollapsibleSection>

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
