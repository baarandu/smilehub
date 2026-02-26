import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, Alert, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Plus, Settings, Search, X, Filter } from 'lucide-react-native';
import { useProsthesisOrders, useActiveProsthesisLabs } from '../src/hooks/useProsthesis';
import { prosthesisService } from '../src/services/prosthesis';
import { getNextStatus, getPreviousStatus } from '../src/utils/prosthesis';
import type { ProsthesisOrder, ProsthesisStatus, ProsthesisOrderFilters } from '../src/types/prosthesis';
import { STATUS_LABELS, STATUS_COLORS, PROSTHESIS_TYPE_LABELS } from '../src/types/prosthesis';
import { OrderCard } from '../src/components/prosthesis/OrderCard';
import { OrderFormModal } from '../src/components/prosthesis/OrderFormModal';
import { OrderDetailModal } from '../src/components/prosthesis/OrderDetailModal';
import { LabManagementModal } from '../src/components/prosthesis/LabManagementModal';
import { CompletionModal } from '../src/components/prosthesis/CompletionModal';
import { useClinic } from '../src/contexts/ClinicContext';
import { supabase } from '../src/lib/supabase';

const STATUSES: ProsthesisStatus[] = ['pre_lab', 'in_lab', 'in_clinic', 'completed'];

export default function ProsthesisCenterPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { clinicId } = useClinic();

  // Tab state
  const [activeTab, setActiveTab] = useState<ProsthesisStatus>('pre_lab');
  const [filters, setFilters] = useState<ProsthesisOrderFilters>({});
  const [showSearch, setShowSearch] = useState(false);
  const [searchText, setSearchText] = useState('');

  // Data
  const { orders, loading, refetch } = useProsthesisOrders(filters);
  const { labs } = useActiveProsthesisLabs();

  // Modals
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showLabs, setShowLabs] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [editingOrder, setEditingOrder] = useState<ProsthesisOrder | null>(null);
  const [detailOrder, setDetailOrder] = useState<ProsthesisOrder | null>(null);
  const [completionOrder, setCompletionOrder] = useState<ProsthesisOrder | null>(null);
  const [movingStatus, setMovingStatus] = useState(false);

  // Filter by current tab
  const filteredOrders = orders.filter(o => o.status === activeTab);

  // Count per status
  const countByStatus = (status: ProsthesisStatus) => orders.filter(o => o.status === status).length;

  const handleSearch = useCallback((text: string) => {
    setSearchText(text);
    setFilters(prev => ({ ...prev, search: text || undefined }));
  }, []);

  const handleMoveStatus = async (order: ProsthesisOrder, newStatus: ProsthesisStatus) => {
    // If moving to completed, show completion dialog
    if (newStatus === 'completed') {
      setCompletionOrder(order);
      setShowCompletion(true);
      return;
    }

    try {
      setMovingStatus(true);
      await prosthesisService.moveOrder(order.id, newStatus);
      refetch();
    } catch (e) {
      console.error('Error moving order:', e);
      Alert.alert('Erro', 'Não foi possível mover o serviço.');
    } finally {
      setMovingStatus(false);
    }
  };


  const handleCompleteOnly = async () => {
    if (!completionOrder) return;
    try {
      setMovingStatus(true);
      await prosthesisService.moveOrder(completionOrder.id, 'completed');
      setShowCompletion(false);
      setCompletionOrder(null);
      refetch();
    } catch (e) {
      console.error('Error completing:', e);
      Alert.alert('Erro', 'Não foi possível concluir.');
    } finally {
      setMovingStatus(false);
    }
  };

  const handleCompleteAndRegister = async () => {
    // For now, same as complete only — registration flow can be expanded later
    await handleCompleteOnly();
  };

  const handleAdvanceStatus = (order: ProsthesisOrder) => {
    const next = getNextStatus(order.status);
    if (next) handleMoveStatus(order, next);
  };

  const handleRetreatStatus = (order: ProsthesisOrder) => {
    const prev = getPreviousStatus(order.status);
    if (prev) handleMoveStatus(order, prev);
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
              <Text className="text-xl font-bold text-white">Central de Prótese</Text>
              <Text className="text-white/70 text-xs">Gestão de serviços protéticos</Text>
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
              onPress={() => setShowLabs(true)}
              className="p-2 bg-white/20 rounded-full"
            >
              <Settings size={18} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { setEditingOrder(null); setShowForm(true); }}
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
          {STATUSES.map(status => {
            const isActive = activeTab === status;
            const count = countByStatus(status);
            return (
              <TouchableOpacity
                key={status}
                onPress={() => setActiveTab(status)}
                className={`flex-1 py-2 rounded-xl items-center ${isActive ? 'bg-white' : 'bg-white/15'}`}
              >
                <Text
                  className={`text-xs font-medium ${isActive ? 'text-[#a03f3d]' : 'text-white/80'}`}
                  numberOfLines={1}
                >
                  {STATUS_LABELS[status]}
                </Text>
                <Text className={`text-lg font-bold ${isActive ? 'text-[#a03f3d]' : 'text-white'}`}>
                  {count}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Orders List */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#b94a48" />
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          ListEmptyComponent={
            <View className="items-center py-16">
              <Text className="text-gray-400 text-base">Nenhum serviço nesta etapa</Text>
              <Text className="text-gray-300 text-sm mt-1">Toque em + para criar</Text>
            </View>
          }
          renderItem={({ item }) => {
            const statusIdx = STATUSES.indexOf(item.status);
            return (
              <OrderCard
                order={item}
                onPress={() => { setDetailOrder(item); setShowDetail(true); }}
                onMoveLeft={() => handleRetreatStatus(item)}
                onMoveRight={() => handleAdvanceStatus(item)}
                isFirst={statusIdx === 0}
                isLast={statusIdx === STATUSES.length - 1}
              />
            );
          }}
        />
      )}

      {/* Modals */}
      <OrderFormModal
        visible={showForm}
        onClose={() => { setShowForm(false); setEditingOrder(null); }}
        order={editingOrder}
        onSaved={refetch}
        onLabsClick={() => { setShowForm(false); setShowLabs(true); }}
      />

      <OrderDetailModal
        visible={showDetail}
        onClose={() => { setShowDetail(false); setDetailOrder(null); }}
        order={detailOrder}
        onEdit={(o) => { setShowDetail(false); setEditingOrder(o); setShowForm(true); }}
        onMoveStatus={handleMoveStatus}
        onDeleted={refetch}
      />

      <LabManagementModal
        visible={showLabs}
        onClose={() => setShowLabs(false)}
      />

      <CompletionModal
        visible={showCompletion}
        onClose={() => { setShowCompletion(false); setCompletionOrder(null); }}
        order={completionOrder}
        onCompleteOnly={handleCompleteOnly}
        onCompleteAndRegister={handleCompleteAndRegister}
        loading={movingStatus}
      />
    </View>
  );
}
