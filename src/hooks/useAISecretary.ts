import { useState, useEffect, useMemo, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useClinic } from '@/contexts/ClinicContext';
import type { WizardData } from '@/components/secretary/setup-wizard';
import type { BehaviorPresetId } from '@/services/secretary';
import {
  getSecretarySettings,
  saveSecretarySettings,
  updateSecretarySetting,
  BEHAVIOR_PRESETS,
  getBehaviorSettings,
  saveBehaviorSettings,
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
  PREDEFINED_MESSAGE_TYPES,
  getConversations,
  getConversationMessages,
  ConversationSummary,
  ConversationMessage,
} from '@/services/secretary';

// Format time to HH:MM (removes seconds if present)
const formatTime = (time: string) => time?.slice(0, 5) || time;

const DEFAULT_SETTINGS: Omit<AISecretarySettings, 'clinic_id'> = {
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
};

const DEFAULT_STATS: AISecretaryStats = {
  total_conversations: 0,
  total_appointments_created: 0,
  transferred_conversations: 0,
};

export function useAISecretary() {
  const { toast } = useToast();
  const { clinicId, loading: clinicLoading } = useClinic();

  // Loading state
  const [isLoading, setIsLoading] = useState(true);
  const [isFirstTimeSetup, setIsFirstTimeSetup] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  // Core Settings
  const [settings, setSettings] = useState<AISecretarySettings | null>(null);
  const [behavior, setBehavior] = useState<AISecretaryBehavior | null>(null);
  const [stats, setStats] = useState<AISecretaryStats>(DEFAULT_STATS);

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

  // Conversations
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [conversationFilter, setConversationFilter] = useState('all');
  const [conversationSearch, setConversationSearch] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<ConversationSummary | null>(null);
  const [conversationMessages, setConversationMessages] = useState<ConversationMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

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
      setIsLoading(false);
      setSettings({ clinic_id: '', ...DEFAULT_SETTINGS });
      setBehavior({ clinic_id: '', ...DEFAULT_BEHAVIOR_SETTINGS } as AISecretaryBehavior);
    }
  }, [clinicId, clinicLoading]);

  const loadData = async () => {
    if (!clinicId) return;

    setIsLoading(true);
    try {
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
        safeLoad(() => getSecretaryStats(clinicId), DEFAULT_STATS),
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
        setIsFirstTimeSetup(false);
      } else {
        setSettings({ clinic_id: clinicId, ...DEFAULT_SETTINGS });
        setIsFirstTimeSetup(true);
      }

      setStats(statsData);
      setScheduleEntries(scheduleData);
      setProfessionals(professionalsData);
      setCustomMessages(customMessagesData);
      setBlockedNumbers(blockedData);

      if (behaviorData) {
        setBehavior(behaviorData);
      } else {
        setBehavior({ clinic_id: clinicId, ...DEFAULT_BEHAVIOR_SETTINGS } as AISecretaryBehavior);
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

  // =====================================================
  // Settings Handlers
  // =====================================================
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

  // =====================================================
  // Behavior Handlers
  // =====================================================
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

  // =====================================================
  // Schedule Handlers
  // =====================================================
  const handleAddScheduleEntry = async () => {
    if (!clinicId) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Clínica não identificada.' });
      return;
    }

    const result = await addScheduleEntry(clinicId, newScheduleDay, newScheduleStart, newScheduleEnd);
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

  const handleOpenEditModal = (entry: ScheduleEntry) => {
    setEditingEntry(entry);
    setEditScheduleDay(entry.day_of_week);
    setEditScheduleStart(formatTime(entry.start_time));
    setEditScheduleEnd(formatTime(entry.end_time));
    setShowEditModal(true);
  };

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

  const handleAskDeleteConfirmation = (id: string) => {
    setDeletingEntryId(id);
    setShowDeleteConfirm(true);
  };

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
  // Conversations Handlers
  // =====================================================
  const loadConversations = useCallback(async () => {
    if (!clinicId) return;
    setConversationsLoading(true);
    try {
      const data = await getConversations(clinicId, {
        status: conversationFilter !== 'all' ? conversationFilter : undefined,
        search: conversationSearch || undefined,
      });
      setConversations(data);
    } catch (e) {
      console.warn('Error loading conversations:', e);
    } finally {
      setConversationsLoading(false);
    }
  }, [clinicId, conversationFilter, conversationSearch]);

  const handleViewConversation = async (conv: ConversationSummary) => {
    setSelectedConversation(conv);
    setMessagesLoading(true);
    try {
      const msgs = await getConversationMessages(conv.id);
      setConversationMessages(msgs);
    } catch (e) {
      console.warn('Error loading messages:', e);
      setConversationMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  };

  const formatConversationDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
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

  // =====================================================
  // Behavior Preset Handler
  // =====================================================
  const handleApplyPreset = async (presetId: BehaviorPresetId) => {
    const preset = BEHAVIOR_PRESETS.find(p => p.id === presetId);
    if (!preset) return;
    await handleBehaviorUpdateMultiple(preset.overrides);
    toast({ title: `Preset "${preset.label}" aplicado` });
  };

  // =====================================================
  // Setup Wizard Handler
  // =====================================================
  const handleSetupComplete = async (data: WizardData) => {
    if (!clinicId) return;

    try {
      // 1. Save settings
      const settingsPayload: Partial<AISecretarySettings> = {
        clinic_id: clinicId,
        is_active: true,
        tone: data.tone,
        clinic_phone: data.clinicPhone || undefined,
        clinic_address: data.clinicAddress || undefined,
        clinic_email: data.clinicEmail || undefined,
      };
      await saveSecretarySettings(clinicId, settingsPayload);

      // 2. Save behavior defaults
      await saveBehaviorSettings(clinicId, DEFAULT_BEHAVIOR_SETTINGS);

      // 3. Create default schedule (Seg-Sex 8h-18h)
      await createDefaultSchedule(clinicId);

      // 4. Add professionals
      for (const prof of data.professionals) {
        await addClinicProfessional(clinicId, {
          name: prof.name,
          title: prof.title,
          specialty: prof.specialty,
          profession: 'Dentista',
          default_appointment_duration: 30,
          is_active: true,
          accepts_new_patients: true,
        });
      }

      toast({ title: 'Secretária IA ativada!', description: 'Tudo configurado e pronto para uso.' });

      // Reload all data
      setIsFirstTimeSetup(false);
      await loadData();
    } catch (error) {
      console.error('Setup error:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível completar a configuração. Tente novamente.',
      });
    }
  };

  return {
    // Loading
    isLoading,
    isFirstTimeSetup,
    clinicId,

    // Setup Wizard
    handleSetupComplete,

    // Navigation
    activeSection, setActiveSection,

    // Core data
    settings,
    behavior,
    stats,

    // Settings
    updateSetting,

    // Behavior
    handleBehaviorUpdate,
    handleBehaviorUpdateMultiple,
    handleApplyPreset,

    // Schedule
    scheduleEntries,
    scheduleByDay,
    showScheduleModal, setShowScheduleModal,
    newScheduleDay, setNewScheduleDay,
    newScheduleStart, setNewScheduleStart,
    newScheduleEnd, setNewScheduleEnd,
    showEditModal, setShowEditModal,
    editScheduleDay, setEditScheduleDay,
    editScheduleStart, setEditScheduleStart,
    editScheduleEnd, setEditScheduleEnd,
    showDeleteConfirm, setShowDeleteConfirm,
    handleAddScheduleEntry,
    handleOpenEditModal,
    handleEditScheduleEntry,
    handleAskDeleteConfirmation,
    handleConfirmDelete,
    handleCreateDefaultSchedule,

    // Professionals
    professionals,
    showProfessionalModal, setShowProfessionalModal,
    editingProfessional,
    profName, setProfName,
    profTitle, setProfTitle,
    profSpecialty, setProfSpecialty,
    handleOpenProfessionalModal,
    handleSaveProfessional,
    handleDeleteProfessional,

    // Custom Messages
    customMessages,
    showCustomMessageModal, setShowCustomMessageModal,
    editingCustomMessage,
    newMessageTitle, setNewMessageTitle,
    newMessageContent, setNewMessageContent,
    availablePredefinedTypes,
    handleOpenCustomMessageModal,
    handleSaveCustomMessage,
    handleDeleteCustomMessage,
    handleToggleCustomMessageActive,

    // Blocked Numbers
    blockedNumbers,
    showBlockedNumberModal, setShowBlockedNumberModal,
    newBlockedNumber, setNewBlockedNumber,
    handleSaveBlockedNumber,
    handleRemoveBlockedNumber,

    // Keywords
    showKeywordModal, setShowKeywordModal,
    editingKeywordIndex,
    newKeyword, setNewKeyword,
    handleOpenKeywordModal,
    handleSaveKeyword,
    handleDeleteKeyword,

    // Scheduling Rules
    localMinAdvanceHours, setLocalMinAdvanceHours,
    localIntervalMinutes, setLocalIntervalMinutes,
    rulesChanged, setRulesChanged,
    handleSaveSchedulingRules,

    // Conversations
    conversations,
    conversationsLoading,
    conversationFilter, setConversationFilter,
    conversationSearch, setConversationSearch,
    selectedConversation, setSelectedConversation,
    conversationMessages,
    messagesLoading,
    loadConversations,
    handleViewConversation,
    formatConversationDate,
  };
}
