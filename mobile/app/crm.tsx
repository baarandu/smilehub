import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, ScrollView, TextInput,
  ActivityIndicator, Alert, Modal, RefreshControl, Linking, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  ArrowLeft, Plus, Search, X, Phone, MessageCircle, ChevronLeft,
  ChevronRight, Calendar, FileText, Send, Clock,
} from 'lucide-react-native';
import { useClinic } from '../src/contexts/ClinicContext';
import { supabase } from '../src/lib/supabase';

// ==================== Types ====================

interface CrmStage {
  id: string;
  name: string;
  color: string;
  position: number;
}

interface CrmLead {
  id: string;
  stage_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  next_action: string | null;
  next_action_date: string | null;
  source_name?: string;
  tags?: { id: string; name: string; color: string }[];
  created_at: string;
}

interface CrmLeadSource {
  id: string;
  name: string;
}

interface CrmActivity {
  id: string;
  type: string;
  title: string;
  created_at: string;
}

// ==================== Service ====================

const LEAD_SELECT = `*, crm_stages(name, color), crm_lead_sources(name), crm_lead_tags(crm_tags(id, name, color))`;

function mapLead(row: any): CrmLead {
  return {
    ...row,
    source_name: row.crm_lead_sources?.name,
    tags: row.crm_lead_tags?.map((lt: any) => lt.crm_tags).filter(Boolean) ?? [],
    crm_stages: undefined,
    crm_lead_sources: undefined,
    crm_lead_tags: undefined,
  };
}

async function seedAndGetStages(clinicId: string): Promise<CrmStage[]> {
  await supabase.rpc('seed_crm_default_stages', { p_clinic_id: clinicId });
  const { data } = await supabase.from('crm_stages').select('*').eq('clinic_id', clinicId).order('position');
  return data || [];
}

async function getLeads(clinicId: string): Promise<CrmLead[]> {
  const { data } = await supabase.from('crm_leads').select(LEAD_SELECT).eq('clinic_id', clinicId).order('position');
  return (data || []).map(mapLead);
}

async function getSources(clinicId: string): Promise<CrmLeadSource[]> {
  const { data } = await supabase.from('crm_lead_sources').select('*').eq('clinic_id', clinicId).order('name');
  return data || [];
}

async function getActivities(leadId: string): Promise<CrmActivity[]> {
  const { data } = await supabase.from('crm_activities').select('*').eq('lead_id', leadId).order('created_at', { ascending: false }).limit(20);
  return data || [];
}

// ==================== Main Component ====================

export default function CRMPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { clinicId } = useClinic();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stages, setStages] = useState<CrmStage[]>([]);
  const [leads, setLeads] = useState<CrmLead[]>([]);
  const [sources, setSources] = useState<CrmLeadSource[]>([]);
  const [activeStageId, setActiveStageId] = useState<string>('');

  // Modals
  const [showNewLead, setShowNewLead] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedLead, setSelectedLead] = useState<CrmLead | null>(null);

  // Search
  const [showSearch, setShowSearch] = useState(false);
  const [searchText, setSearchText] = useState('');

  const loadData = useCallback(async () => {
    if (!clinicId) return;
    try {
      const [stagesData, leadsData, sourcesData] = await Promise.all([
        seedAndGetStages(clinicId),
        getLeads(clinicId),
        getSources(clinicId),
      ]);
      setStages(stagesData);
      setLeads(leadsData);
      setSources(sourcesData);
      if (!activeStageId && stagesData.length > 0) {
        setActiveStageId(stagesData[0].id);
      }
    } catch (e) {
      console.error('CRM load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [clinicId, activeStageId]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const filteredLeads = leads.filter(l => {
    if (l.stage_id !== activeStageId) return false;
    if (searchText && !l.name.toLowerCase().includes(searchText.toLowerCase())) return false;
    return true;
  });

  const activeStage = stages.find(s => s.id === activeStageId);

  const handleMoveLead = async (lead: CrmLead, direction: 'left' | 'right') => {
    const currentIdx = stages.findIndex(s => s.id === lead.stage_id);
    const newIdx = direction === 'left' ? currentIdx - 1 : currentIdx + 1;
    if (newIdx < 0 || newIdx >= stages.length) return;

    const newStageId = stages[newIdx].id;
    try {
      await supabase.from('crm_leads').update({ stage_id: newStageId, updated_at: new Date().toISOString() }).eq('id', lead.id);
      // Log activity
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('crm_activities').insert({
        clinic_id: clinicId,
        lead_id: lead.id,
        type: 'stage_change',
        title: 'Etapa alterada',
        metadata: { from_stage_id: lead.stage_id, to_stage_id: newStageId },
        created_by: user?.id,
      });
      loadData();
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível mover o lead.');
    }
  };

  const handleOpenWhatsApp = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    Linking.openURL(`https://wa.me/55${cleaned}`);
  };

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  // ==================== Lead Card ====================

  const renderLeadCard = ({ item: lead }: { item: CrmLead }) => {
    const stageIdx = stages.findIndex(s => s.id === lead.stage_id);
    const canMoveLeft = stageIdx > 0;
    const canMoveRight = stageIdx < stages.length - 1;

    return (
      <TouchableOpacity
        className="bg-white rounded-xl border border-gray-100 p-4 mb-3 shadow-sm"
        onPress={() => { setSelectedLead(lead); setShowDetail(true); }}
        activeOpacity={0.7}
      >
        <View className="flex-row items-start justify-between">
          <View className="flex-1">
            <Text className="text-base font-semibold text-gray-900">{lead.name}</Text>
            {lead.phone && (
              <View className="flex-row items-center mt-1">
                <Phone size={12} color="#9CA3AF" />
                <Text className="text-xs text-gray-500 ml-1">{lead.phone}</Text>
              </View>
            )}
          </View>
          {lead.source_name && (
            <View className="bg-gray-100 rounded-full px-2 py-0.5">
              <Text className="text-[10px] text-gray-600">{lead.source_name}</Text>
            </View>
          )}
        </View>

        {lead.next_action && (
          <View className="mt-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <View className="flex-row items-center">
              <Calendar size={12} color="#D97706" />
              <Text className="text-xs font-medium text-amber-800 ml-1.5 flex-1">{lead.next_action}</Text>
            </View>
            {lead.next_action_date && (
              <Text className="text-[10px] text-amber-600 mt-0.5 ml-4">{lead.next_action_date}</Text>
            )}
          </View>
        )}

        {(lead.tags || []).length > 0 && (
          <View className="flex-row flex-wrap gap-1 mt-2">
            {lead.tags!.slice(0, 3).map(tag => (
              <View key={tag.id} className="rounded-full px-2 py-0.5 border" style={{ borderColor: tag.color }}>
                <Text className="text-[9px] font-medium" style={{ color: tag.color }}>{tag.name}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Action buttons */}
        <View className="flex-row items-center justify-between mt-3 pt-2 border-t border-gray-50">
          <View className="flex-row gap-2">
            {canMoveLeft && (
              <TouchableOpacity
                className="flex-row items-center bg-gray-100 rounded-lg px-3 py-1.5"
                onPress={() => handleMoveLead(lead, 'left')}
              >
                <ChevronLeft size={14} color="#6B7280" />
                <Text className="text-xs text-gray-600 ml-0.5">{stages[stageIdx - 1]?.name}</Text>
              </TouchableOpacity>
            )}
            {canMoveRight && (
              <TouchableOpacity
                className="flex-row items-center rounded-lg px-3 py-1.5"
                style={{ backgroundColor: `${stages[stageIdx + 1]?.color}15` }}
                onPress={() => handleMoveLead(lead, 'right')}
              >
                <Text className="text-xs font-medium mr-0.5" style={{ color: stages[stageIdx + 1]?.color }}>
                  {stages[stageIdx + 1]?.name}
                </Text>
                <ChevronRight size={14} color={stages[stageIdx + 1]?.color} />
              </TouchableOpacity>
            )}
          </View>

          <View className="flex-row gap-1.5">
            {lead.phone && (
              <>
                <TouchableOpacity
                  className="w-8 h-8 rounded-full bg-green-50 items-center justify-center"
                  onPress={() => handleOpenWhatsApp(lead.phone!)}
                >
                  <MessageCircle size={16} color="#16A34A" />
                </TouchableOpacity>
                <TouchableOpacity
                  className="w-8 h-8 rounded-full bg-blue-50 items-center justify-center"
                  onPress={() => handleCall(lead.phone!)}
                >
                  <Phone size={16} color="#2563EB" />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ==================== New Lead Modal ====================

  const NewLeadModal = () => {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [sourceId, setSourceId] = useState('');
    const [nextAction, setNextAction] = useState('');
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
      if (!name.trim() || !clinicId) return;
      const defaultStage = stages.find(s => s.position === 0)?.id || stages[0]?.id;
      if (!defaultStage) return;

      setSaving(true);
      try {
        await supabase.from('crm_leads').insert({
          clinic_id: clinicId,
          name: name.trim(),
          phone: phone.trim() || null,
          email: email.trim() || null,
          stage_id: defaultStage,
          source_id: sourceId || null,
          next_action: nextAction.trim() || null,
          notes: notes.trim() || null,
        });
        setShowNewLead(false);
        loadData();
      } catch {
        Alert.alert('Erro', 'Não foi possível criar o lead.');
      } finally {
        setSaving(false);
      }
    };

    return (
      <Modal visible={showNewLead} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
          <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
            <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
              <TouchableOpacity onPress={() => setShowNewLead(false)}>
                <Text className="text-base text-gray-500">Cancelar</Text>
              </TouchableOpacity>
              <Text className="text-lg font-bold text-gray-900">Novo Lead</Text>
              <TouchableOpacity onPress={handleSave} disabled={!name.trim() || saving}>
                <Text className={`text-base font-semibold ${name.trim() ? 'text-[#b94a48]' : 'text-gray-300'}`}>
                  {saving ? 'Salvando...' : 'Criar'}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView className="flex-1 px-4 py-4" keyboardShouldPersistTaps="handled">
              <Text className="text-sm font-medium text-gray-700 mb-1">Nome *</Text>
              <TextInput
                className="border border-gray-200 rounded-xl px-4 py-3 text-base mb-4"
                placeholder="Nome do lead"
                value={name}
                onChangeText={setName}
                autoFocus
              />

              <Text className="text-sm font-medium text-gray-700 mb-1">Telefone</Text>
              <TextInput
                className="border border-gray-200 rounded-xl px-4 py-3 text-base mb-4"
                placeholder="(00) 00000-0000"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />

              <Text className="text-sm font-medium text-gray-700 mb-1">Email</Text>
              <TextInput
                className="border border-gray-200 rounded-xl px-4 py-3 text-base mb-4"
                placeholder="email@exemplo.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text className="text-sm font-medium text-gray-700 mb-1">Origem</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                <View className="flex-row gap-2">
                  {sources.map(s => (
                    <TouchableOpacity
                      key={s.id}
                      className={`rounded-full px-4 py-2 border ${sourceId === s.id ? 'bg-[#b94a48] border-[#b94a48]' : 'border-gray-200'}`}
                      onPress={() => setSourceId(sourceId === s.id ? '' : s.id)}
                    >
                      <Text className={`text-sm ${sourceId === s.id ? 'text-white font-medium' : 'text-gray-700'}`}>{s.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <Text className="text-sm font-medium text-gray-700 mb-1">Próxima ação</Text>
              <TextInput
                className="border border-gray-200 rounded-xl px-4 py-3 text-base mb-4"
                placeholder="Ex: Ligar para confirmar"
                value={nextAction}
                onChangeText={setNextAction}
              />

              <Text className="text-sm font-medium text-gray-700 mb-1">Observações</Text>
              <TextInput
                className="border border-gray-200 rounded-xl px-4 py-3 text-base mb-4"
                placeholder="Notas sobre o lead..."
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  };

  // ==================== Lead Detail Modal ====================

  const LeadDetailModal = () => {
    const [activities, setActivities] = useState<CrmActivity[]>([]);
    const [loadingActivities, setLoadingActivities] = useState(false);
    const [activityText, setActivityText] = useState('');
    const [sendingActivity, setSendingActivity] = useState(false);

    useEffect(() => {
      if (selectedLead && showDetail) {
        setLoadingActivities(true);
        getActivities(selectedLead.id).then(setActivities).finally(() => setLoadingActivities(false));
      }
    }, [selectedLead, showDetail]);

    const handleAddActivity = async () => {
      if (!activityText.trim() || !selectedLead || !clinicId) return;
      setSendingActivity(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('crm_activities').insert({
          clinic_id: clinicId,
          lead_id: selectedLead.id,
          type: 'note',
          title: activityText.trim(),
          created_by: user?.id,
        });
        setActivityText('');
        const updated = await getActivities(selectedLead.id);
        setActivities(updated);
      } catch {
        Alert.alert('Erro', 'Não foi possível registrar a atividade.');
      } finally {
        setSendingActivity(false);
      }
    };

    const handleDeleteLead = () => {
      if (!selectedLead) return;
      Alert.alert('Excluir lead', `Tem certeza que deseja excluir "${selectedLead.name}"?`, [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir', style: 'destructive', onPress: async () => {
            await supabase.from('crm_leads').delete().eq('id', selectedLead.id);
            setShowDetail(false);
            setSelectedLead(null);
            loadData();
          }
        },
      ]);
    };

    if (!selectedLead) return null;

    const stageIdx = stages.findIndex(s => s.id === selectedLead.stage_id);
    const currentStage = stages[stageIdx];

    const ACTIVITY_LABELS: Record<string, string> = {
      note: 'Nota', call: 'Ligação', whatsapp: 'WhatsApp',
      email: 'Email', meeting: 'Reunião', stage_change: 'Etapa', task: 'Tarefa',
    };

    return (
      <Modal visible={showDetail} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
          <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
            {/* Header */}
            <View className="bg-white px-4 py-3 border-b border-gray-100">
              <View className="flex-row items-center justify-between">
                <TouchableOpacity onPress={() => setShowDetail(false)}>
                  <ArrowLeft size={24} color="#374151" />
                </TouchableOpacity>
                <Text className="text-lg font-bold text-gray-900 flex-1 text-center">{selectedLead.name}</Text>
                <TouchableOpacity onPress={handleDeleteLead}>
                  <Text className="text-sm text-red-500">Excluir</Text>
                </TouchableOpacity>
              </View>

              {/* Contact & Stage */}
              <View className="flex-row items-center justify-between mt-3">
                <View className="flex-row gap-2">
                  {selectedLead.phone && (
                    <>
                      <TouchableOpacity
                        className="flex-row items-center bg-green-50 rounded-full px-3 py-1.5"
                        onPress={() => handleOpenWhatsApp(selectedLead.phone!)}
                      >
                        <MessageCircle size={14} color="#16A34A" />
                        <Text className="text-xs font-medium text-green-700 ml-1">WhatsApp</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        className="flex-row items-center bg-blue-50 rounded-full px-3 py-1.5"
                        onPress={() => handleCall(selectedLead.phone!)}
                      >
                        <Phone size={14} color="#2563EB" />
                        <Text className="text-xs font-medium text-blue-700 ml-1">Ligar</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
                {currentStage && (
                  <View className="rounded-full px-3 py-1" style={{ backgroundColor: `${currentStage.color}20` }}>
                    <Text className="text-xs font-semibold" style={{ color: currentStage.color }}>{currentStage.name}</Text>
                  </View>
                )}
              </View>
            </View>

            <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
              {/* Next action */}
              <View className="mx-4 mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
                <Text className="text-xs font-semibold text-amber-800 mb-1">Próxima ação</Text>
                <Text className="text-sm text-amber-900">
                  {selectedLead.next_action || 'Nenhuma ação definida'}
                </Text>
                {selectedLead.next_action_date && (
                  <Text className="text-xs text-amber-600 mt-0.5">{selectedLead.next_action_date}</Text>
                )}
              </View>

              {/* Move stage buttons */}
              <View className="flex-row gap-2 mx-4 mt-3">
                {stageIdx > 0 && (
                  <TouchableOpacity
                    className="flex-1 flex-row items-center justify-center bg-gray-100 rounded-xl py-3"
                    onPress={() => { handleMoveLead(selectedLead, 'left'); setShowDetail(false); }}
                  >
                    <ChevronLeft size={16} color="#6B7280" />
                    <Text className="text-sm text-gray-600 ml-1">{stages[stageIdx - 1]?.name}</Text>
                  </TouchableOpacity>
                )}
                {stageIdx < stages.length - 1 && (
                  <TouchableOpacity
                    className="flex-1 flex-row items-center justify-center rounded-xl py-3"
                    style={{ backgroundColor: `${stages[stageIdx + 1]?.color}15` }}
                    onPress={() => { handleMoveLead(selectedLead, 'right'); setShowDetail(false); }}
                  >
                    <Text className="text-sm font-medium" style={{ color: stages[stageIdx + 1]?.color }}>
                      {stages[stageIdx + 1]?.name}
                    </Text>
                    <ChevronRight size={16} color={stages[stageIdx + 1]?.color} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Info */}
              {(selectedLead.source_name || selectedLead.notes) && (
                <View className="mx-4 mt-3 bg-white rounded-xl p-4 border border-gray-100">
                  {selectedLead.source_name && (
                    <View className="flex-row items-center mb-2">
                      <Text className="text-xs text-gray-500 w-16">Origem</Text>
                      <Text className="text-sm text-gray-900">{selectedLead.source_name}</Text>
                    </View>
                  )}
                  {selectedLead.notes && (
                    <View>
                      <Text className="text-xs text-gray-500 mb-1">Observações</Text>
                      <Text className="text-sm text-gray-700">{selectedLead.notes}</Text>
                    </View>
                  )}
                </View>
              )}

              {/* Tags */}
              {(selectedLead.tags || []).length > 0 && (
                <View className="flex-row flex-wrap gap-1.5 mx-4 mt-3">
                  {selectedLead.tags!.map(tag => (
                    <View key={tag.id} className="rounded-full px-3 py-1 border" style={{ borderColor: tag.color }}>
                      <Text className="text-xs font-medium" style={{ color: tag.color }}>{tag.name}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Timeline */}
              <View className="mx-4 mt-4 mb-2">
                <Text className="text-sm font-semibold text-gray-900 mb-3">Timeline</Text>
                {loadingActivities ? (
                  <ActivityIndicator size="small" color="#b94a48" />
                ) : activities.length === 0 ? (
                  <Text className="text-sm text-gray-400 text-center py-4">Nenhuma atividade registrada</Text>
                ) : (
                  activities.map(activity => (
                    <View key={activity.id} className="flex-row gap-3 mb-3">
                      <View className="w-8 h-8 rounded-lg bg-gray-100 items-center justify-center mt-0.5">
                        <FileText size={14} color="#9CA3AF" />
                      </View>
                      <View className="flex-1">
                        <View className="flex-row items-center gap-2">
                          <Text className="text-xs font-medium text-gray-500">{ACTIVITY_LABELS[activity.type] || activity.type}</Text>
                        </View>
                        <Text className="text-sm text-gray-900">{activity.title}</Text>
                        <View className="flex-row items-center mt-0.5">
                          <Clock size={10} color="#9CA3AF" />
                          <Text className="text-[10px] text-gray-400 ml-1">
                            {new Date(activity.created_at).toLocaleDateString('pt-BR')}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))
                )}
              </View>
            </ScrollView>

            {/* Add activity input */}
            <View className="bg-white border-t border-gray-100 px-4 py-3" style={{ paddingBottom: insets.bottom + 8 }}>
              <View className="flex-row items-center gap-2">
                <TextInput
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm"
                  placeholder="Registrar nota..."
                  value={activityText}
                  onChangeText={setActivityText}
                  returnKeyType="send"
                  onSubmitEditing={handleAddActivity}
                />
                <TouchableOpacity
                  className="w-10 h-10 rounded-xl bg-[#b94a48] items-center justify-center"
                  onPress={handleAddActivity}
                  disabled={!activityText.trim() || sendingActivity}
                >
                  <Send size={18} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  };

  // ==================== Render ====================

  if (loading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#b94a48" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="bg-white px-4 py-3 border-b border-gray-100">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <ArrowLeft size={24} color="#374151" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900 flex-1">CRM</Text>
          <View className="flex-row gap-2">
            <TouchableOpacity
              className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center"
              onPress={() => setShowSearch(!showSearch)}
            >
              {showSearch ? <X size={18} color="#6B7280" /> : <Search size={18} color="#6B7280" />}
            </TouchableOpacity>
            <TouchableOpacity
              className="w-9 h-9 rounded-full bg-[#b94a48] items-center justify-center"
              onPress={() => setShowNewLead(true)}
            >
              <Plus size={18} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {showSearch && (
          <View className="mt-2">
            <TextInput
              className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm"
              placeholder="Buscar lead..."
              value={searchText}
              onChangeText={setSearchText}
              autoFocus
            />
          </View>
        )}
      </View>

      {/* Stage tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="bg-white border-b border-gray-100 px-2">
        <View className="flex-row py-2 gap-1">
          {stages.map(stage => {
            const count = leads.filter(l => l.stage_id === stage.id).length;
            const isActive = stage.id === activeStageId;
            return (
              <TouchableOpacity
                key={stage.id}
                className={`rounded-full px-4 py-2 flex-row items-center gap-1.5 ${isActive ? '' : 'bg-gray-50'}`}
                style={isActive ? { backgroundColor: `${stage.color}15` } : undefined}
                onPress={() => setActiveStageId(stage.id)}
              >
                <View className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color, opacity: isActive ? 1 : 0.4 }} />
                <Text
                  className={`text-xs font-medium ${isActive ? '' : 'text-gray-500'}`}
                  style={isActive ? { color: stage.color } : undefined}
                >
                  {stage.name}
                </Text>
                <View className="bg-white/80 rounded-full px-1.5 min-w-[20px] items-center">
                  <Text className="text-[10px] font-bold" style={{ color: stage.color }}>{count}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Leads list */}
      <FlatList
        data={filteredLeads}
        keyExtractor={item => item.id}
        renderItem={renderLeadCard}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <View className="items-center py-12">
            <Text className="text-gray-400 text-sm">Nenhum lead nesta etapa</Text>
          </View>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#b94a48" />}
      />

      <NewLeadModal />
      <LeadDetailModal />
    </View>
  );
}
