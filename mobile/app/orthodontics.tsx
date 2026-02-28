import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { ArrowLeft, Plus, Search, X } from 'lucide-react-native';
import { useOrthodonticCases } from '../src/hooks/useOrthodontics';
import { orthodonticsService } from '../src/services/orthodontics';
import { getNextStatus } from '../src/utils/orthodontics';
import { supabase } from '../src/lib/supabase';
import type { OrthodonticCase, OrthodonticStatus, CaseFilters } from '../src/types/orthodontics';
import { ORTHO_KANBAN_COLUMNS } from '../src/types/orthodontics';
import { OrthoCard } from '../src/components/orthodontics/OrthoCard';
import { CaseDetailModal } from '../src/components/orthodontics/CaseDetailModal';
import { CaseFormModal } from '../src/components/orthodontics/CaseFormModal';
import { SessionFormModal } from '../src/components/orthodontics/SessionFormModal';
import { MaintenanceScheduleModal } from '../src/components/orthodontics/MaintenanceScheduleModal';
import { useClinic } from '../src/contexts/ClinicContext';

export default function OrthodonticsPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { clinicId } = useClinic();

  // Tab state
  const [activeTab, setActiveTab] = useState<OrthodonticStatus>('awaiting_documentation');
  const [filters, setFilters] = useState<CaseFilters>({});
  const [showSearch, setShowSearch] = useState(false);
  const [searchText, setSearchText] = useState('');

  // Data
  const { cases, loading, refetch } = useOrthodonticCases(filters);

  // Appointments for cards
  const [appointments, setAppointments] = useState<Record<string, { date: string; time: string }>>({});

  // Modals
  const [showDetail, setShowDetail] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showSession, setShowSession] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [detailCase, setDetailCase] = useState<OrthodonticCase | null>(null);
  const [editingCase, setEditingCase] = useState<OrthodonticCase | null>(null);
  const [sessionCase, setSessionCase] = useState<OrthodonticCase | null>(null);
  const [scheduleCase, setScheduleCase] = useState<OrthodonticCase | null>(null);

  // Reload on focus
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  // Load upcoming appointments for doc_received + active patients
  useEffect(() => {
    if (!clinicId || cases.length === 0) return;
    const relevantCases = cases.filter(c =>
      c.status === 'documentation_received' || c.status === 'active'
    );
    if (relevantCases.length === 0) return;

    const patientIds = relevantCases.map(c => c.patient_id);
    const today = new Date().toISOString().split('T')[0];

    (supabase.from('appointments') as any)
      .select('patient_id, date, time')
      .eq('clinic_id', clinicId)
      .in('patient_id', patientIds)
      .gte('date', today)
      .eq('status', 'scheduled')
      .order('date', { ascending: true })
      .then(({ data }: any) => {
        if (!data) return;
        const map: Record<string, { date: string; time: string }> = {};
        for (const a of data) {
          if (!map[a.patient_id]) {
            map[a.patient_id] = { date: a.date, time: a.time || '' };
          }
        }
        setAppointments(map);
      });
  }, [clinicId, cases]);

  // Filter by current tab
  const filteredCases = cases.filter(c => c.status === activeTab);

  // Count per status
  const countByStatus = (status: OrthodonticStatus) => cases.filter(c => c.status === status).length;

  const handleSearch = useCallback((text: string) => {
    setSearchText(text);
    setFilters(prev => ({ ...prev, search: text || undefined }));
  }, []);

  const handleAdvanceStatus = async (orthoCase: OrthodonticCase) => {
    const next = getNextStatus(orthoCase.status);
    if (!next) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await orthodonticsService.changeStatus(orthoCase.id, next, user?.id || '');
      refetch();
    } catch (e) {
      console.error('Error advancing status:', e);
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View
        style={{ paddingTop: insets.top + 8 }}
        className="bg-[#a03f3d] px-4 pb-4"
      >
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center gap-3">
            <TouchableOpacity onPress={() => router.back()} className="p-2 bg-white/20 rounded-full">
              <ArrowLeft size={20} color="#FFF" />
            </TouchableOpacity>
            <View>
              <Text className="text-xl font-bold text-white">Central de Ortodontia</Text>
              <Text className="text-white/70 text-xs">Gestao de casos ortodonticos</Text>
            </View>
          </View>
          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={() => setShowSearch(!showSearch)}
              className="p-2 bg-white/20 rounded-full"
            >
              <Search size={18} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { setEditingCase(null); setShowForm(true); }}
              className="p-2 bg-white rounded-full"
            >
              <Plus size={18} color="#a03f3d" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search bar */}
        {showSearch && (
          <View className="flex-row items-center bg-white/20 rounded-xl px-3 mb-3">
            <Search size={16} color="#FFF" />
            <TextInput
              value={searchText}
              onChangeText={handleSearch}
              placeholder="Buscar paciente..."
              placeholderTextColor="rgba(255,255,255,0.6)"
              className="flex-1 py-2 ml-2 text-white"
              autoFocus
            />
            {searchText ? (
              <TouchableOpacity onPress={() => handleSearch('')}>
                <X size={16} color="#FFF" />
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        {/* Status Tabs */}
        <View className="flex-row gap-1">
          {ORTHO_KANBAN_COLUMNS.map(col => {
            const isActive = activeTab === col.id;
            const count = countByStatus(col.id);
            return (
              <TouchableOpacity
                key={col.id}
                onPress={() => setActiveTab(col.id)}
                className={`flex-1 py-2 rounded-xl items-center ${isActive ? 'bg-white' : 'bg-white/15'}`}
              >
                <Text
                  className={`text-[10px] font-medium ${isActive ? 'text-[#a03f3d]' : 'text-white/80'}`}
                  numberOfLines={1}
                >
                  {col.title}
                </Text>
                <Text className={`text-lg font-bold ${isActive ? 'text-[#a03f3d]' : 'text-white'}`}>
                  {count}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Cases List */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#a03f3d" />
        </View>
      ) : (
        <FlatList
          data={filteredCases}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          ListEmptyComponent={
            <View className="items-center py-16">
              <Text className="text-gray-400 text-base">Nenhum caso nesta etapa</Text>
              <Text className="text-gray-300 text-sm mt-1">Toque em + para criar</Text>
            </View>
          }
          renderItem={({ item }) => (
            <OrthoCard
              orthoCase={item}
              onPress={() => { setDetailCase(item); setShowDetail(true); }}
              onAdvance={() => handleAdvanceStatus(item)}
              onSchedule={() => { setScheduleCase(item); setShowSchedule(true); }}
              onMaintenance={() => { setSessionCase(item); setShowSession(true); }}
              nextAppointment={appointments[item.patient_id] || null}
            />
          )}
        />
      )}

      {/* Modals */}
      <CaseDetailModal
        visible={showDetail}
        onClose={() => { setShowDetail(false); setDetailCase(null); }}
        orthoCase={detailCase}
        onEdit={(c) => { setShowDetail(false); setEditingCase(c); setShowForm(true); }}
        onSession={(c) => { setShowDetail(false); setSessionCase(c); setShowSession(true); }}
        onSchedule={(c) => { setShowDetail(false); setScheduleCase(c); setShowSchedule(true); }}
        onRefresh={refetch}
      />

      <CaseFormModal
        visible={showForm}
        onClose={() => { setShowForm(false); setEditingCase(null); }}
        orthoCase={editingCase}
        onSaved={refetch}
      />

      <SessionFormModal
        visible={showSession}
        onClose={() => { setShowSession(false); setSessionCase(null); }}
        orthoCase={sessionCase}
        onSaved={refetch}
      />

      <MaintenanceScheduleModal
        visible={showSchedule}
        onClose={() => { setShowSchedule(false); setScheduleCase(null); }}
        orthoCase={scheduleCase}
        onSaved={refetch}
      />
    </View>
  );
}
