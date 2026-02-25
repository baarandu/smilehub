import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, Alert, Modal, TextInput, Switch, ActivityIndicator, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Plus, Edit3, Trash2, X, Tag } from 'lucide-react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { couponsService, type DiscountCoupon } from '../../src/services/admin/coupons';

export default function CouponsScreen() {
  const router = useRouter();
  const [coupons, setCoupons] = useState<DiscountCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<DiscountCoupon | null>(null);

  // Form state
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [description, setDescription] = useState('');
  const [validFrom, setValidFrom] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await couponsService.getAll();
      setCoupons(data);
    } catch (e) {
      console.error('Error loading coupons:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => {
    setCode(''); setDiscountType('percentage'); setDiscountValue('');
    setDescription(''); setValidFrom(''); setValidUntil('');
    setMaxUses(''); setIsActive(true); setEditing(null);
  };

  const openCreate = () => { resetForm(); setShowForm(true); };

  const openEdit = (coupon: DiscountCoupon) => {
    setCode(coupon.code);
    setDiscountType(coupon.discount_type);
    setDiscountValue(coupon.discount_value.toString());
    setDescription(coupon.description || '');
    setValidFrom(coupon.valid_from?.split('T')[0] || '');
    setValidUntil(coupon.valid_until?.split('T')[0] || '');
    setMaxUses(coupon.max_uses?.toString() || '');
    setIsActive(coupon.is_active ?? true);
    setEditing(coupon);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!code.trim()) { Alert.alert('Erro', 'Informe o código do cupom.'); return; }
    if (!discountValue) { Alert.alert('Erro', 'Informe o valor do desconto.'); return; }

    try {
      setSaving(true);
      const payload: Partial<DiscountCoupon> = {
        code: code.trim().toUpperCase(),
        discount_type: discountType,
        discount_value: parseFloat(discountValue),
        description: description.trim() || null,
        valid_from: validFrom || new Date().toISOString(),
        valid_until: validUntil || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        max_uses: maxUses ? parseInt(maxUses) : null,
        is_active: isActive,
      };

      if (editing) {
        await couponsService.update(editing.id, payload);
      } else {
        await couponsService.create(payload);
      }

      setShowForm(false);
      resetForm();
      load();
    } catch (e: any) {
      console.error('Error saving coupon:', e);
      Alert.alert('Erro', e.message || 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (coupon: DiscountCoupon) => {
    Alert.alert('Excluir Cupom', `Excluir "${coupon.code}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir', style: 'destructive',
        onPress: async () => {
          try {
            await couponsService.delete(coupon.id);
            load();
          } catch (e) {
            Alert.alert('Erro', 'Não foi possível excluir.');
          }
        },
      },
    ]);
  };

  const handleToggleActive = async (coupon: DiscountCoupon) => {
    try {
      await couponsService.update(coupon.id, { is_active: !coupon.is_active });
      load();
    } catch (e) {
      console.error('Error toggling coupon:', e);
    }
  };

  const formatDiscount = (coupon: DiscountCoupon) => {
    if (coupon.discount_type === 'percentage') return `${coupon.discount_value}%`;
    return `R$ ${(coupon.discount_value / 100).toFixed(2)}`;
  };

  const formatDate = (d: string | null) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('pt-BR');
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="flex-row items-center p-4 border-b border-gray-200 bg-white">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <ArrowLeft size={24} color="#374151" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-xl font-bold text-gray-900">Cupons de Desconto</Text>
          <Text className="text-gray-500 text-sm">Gerenciar cupons promocionais</Text>
        </View>
        <TouchableOpacity onPress={openCreate} className="bg-[#b94a48] p-2.5 rounded-xl">
          <Plus size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#b94a48" />
        </View>
      ) : (
        <FlatList
          data={coupons}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
          ListEmptyComponent={
            <View className="items-center py-16">
              <Tag size={40} color="#D1D5DB" />
              <Text className="text-gray-400 mt-3 text-base">Nenhum cupom cadastrado</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View className={`bg-white rounded-xl p-4 border border-gray-100 mb-3 ${!item.is_active ? 'opacity-60' : ''}`}>
              <View className="flex-row justify-between items-start mb-2">
                <View className="flex-1">
                  <View className="flex-row items-center gap-2">
                    <View className="bg-[#fef2f2] px-2 py-1 rounded">
                      <Text className="text-[#b94a48] font-bold text-sm">{item.code}</Text>
                    </View>
                    <View className={`px-2 py-0.5 rounded ${item.discount_type === 'percentage' ? 'bg-blue-50' : 'bg-green-50'}`}>
                      <Text className={`text-xs font-medium ${item.discount_type === 'percentage' ? 'text-blue-700' : 'text-green-700'}`}>
                        {formatDiscount(item)}
                      </Text>
                    </View>
                  </View>
                  {item.description && (
                    <Text className="text-sm text-gray-500 mt-1">{item.description}</Text>
                  )}
                </View>
                <Switch
                  value={item.is_active ?? false}
                  onValueChange={() => handleToggleActive(item)}
                  trackColor={{ false: '#D1D5DB', true: '#86EFAC' }}
                  thumbColor={item.is_active ? '#15803D' : '#f4f3f4'}
                />
              </View>

              <View className="flex-row gap-4 mt-2">
                <Text className="text-xs text-gray-400">
                  Válido: {formatDate(item.valid_from)} - {formatDate(item.valid_until)}
                </Text>
                <Text className="text-xs text-gray-400">
                  Usos: {item.used_count || 0}{item.max_uses ? `/${item.max_uses}` : ''}
                </Text>
              </View>

              <View className="flex-row justify-end gap-2 mt-3 pt-2 border-t border-gray-50">
                <TouchableOpacity onPress={() => openEdit(item)} className="flex-row items-center gap-1 px-3 py-1.5 bg-gray-50 rounded-lg">
                  <Edit3 size={14} color="#6B7280" />
                  <Text className="text-xs text-gray-600">Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item)} className="flex-row items-center gap-1 px-3 py-1.5 bg-red-50 rounded-lg">
                  <Trash2 size={14} color="#EF4444" />
                  <Text className="text-xs text-red-600">Excluir</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* Form Modal */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-gray-50">
          <View className="bg-white border-b border-gray-100 px-4 pt-4 pb-4 flex-row justify-between items-center">
            <Text className="text-xl font-bold text-gray-900">
              {editing ? 'Editar Cupom' : 'Novo Cupom'}
            </Text>
            <TouchableOpacity onPress={() => { setShowForm(false); resetForm(); }} className="p-2">
              <X size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View className="flex-1 p-4">
            <Text className="text-xs text-gray-500 mb-1 font-medium">Código *</Text>
            <TextInput
              value={code}
              onChangeText={t => setCode(t.toUpperCase())}
              placeholder="EX: PROMO10"
              autoCapitalize="characters"
              className="border border-gray-200 rounded-lg px-3 py-2.5 mb-3 text-gray-900"
            />

            <Text className="text-xs text-gray-500 mb-1 font-medium">Tipo de Desconto</Text>
            <View className="flex-row gap-2 mb-3">
              <TouchableOpacity
                onPress={() => setDiscountType('percentage')}
                className={`flex-1 py-2.5 rounded-lg items-center border ${discountType === 'percentage' ? 'bg-blue-50 border-blue-200' : 'border-gray-200'}`}
              >
                <Text className={discountType === 'percentage' ? 'text-blue-700 font-medium' : 'text-gray-500'}>Percentual (%)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setDiscountType('fixed')}
                className={`flex-1 py-2.5 rounded-lg items-center border ${discountType === 'fixed' ? 'bg-green-50 border-green-200' : 'border-gray-200'}`}
              >
                <Text className={discountType === 'fixed' ? 'text-green-700 font-medium' : 'text-gray-500'}>Valor Fixo (R$)</Text>
              </TouchableOpacity>
            </View>

            <Text className="text-xs text-gray-500 mb-1 font-medium">Valor *</Text>
            <TextInput
              value={discountValue}
              onChangeText={setDiscountValue}
              placeholder={discountType === 'percentage' ? 'Ex: 10' : 'Ex: 5000 (centavos)'}
              keyboardType="numeric"
              className="border border-gray-200 rounded-lg px-3 py-2.5 mb-3 text-gray-900"
            />

            <Text className="text-xs text-gray-500 mb-1 font-medium">Descrição</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Descrição do cupom"
              className="border border-gray-200 rounded-lg px-3 py-2.5 mb-3 text-gray-900"
            />

            <View className="flex-row gap-3 mb-3">
              <View className="flex-1">
                <Text className="text-xs text-gray-500 mb-1 font-medium">Válido De</Text>
                <TextInput
                  value={validFrom}
                  onChangeText={setValidFrom}
                  placeholder="AAAA-MM-DD"
                  className="border border-gray-200 rounded-lg px-3 py-2.5 text-gray-900"
                />
              </View>
              <View className="flex-1">
                <Text className="text-xs text-gray-500 mb-1 font-medium">Válido Até</Text>
                <TextInput
                  value={validUntil}
                  onChangeText={setValidUntil}
                  placeholder="AAAA-MM-DD"
                  className="border border-gray-200 rounded-lg px-3 py-2.5 text-gray-900"
                />
              </View>
            </View>

            <Text className="text-xs text-gray-500 mb-1 font-medium">Limite de Usos</Text>
            <TextInput
              value={maxUses}
              onChangeText={setMaxUses}
              placeholder="Ilimitado (vazio)"
              keyboardType="numeric"
              className="border border-gray-200 rounded-lg px-3 py-2.5 mb-3 text-gray-900"
            />

            <View className="flex-row items-center justify-between py-3 mb-4">
              <Text className="text-sm text-gray-700 font-medium">Cupom Ativo</Text>
              <Switch
                value={isActive}
                onValueChange={setIsActive}
                trackColor={{ false: '#D1D5DB', true: '#86EFAC' }}
                thumbColor={isActive ? '#15803D' : '#f4f3f4'}
              />
            </View>

            <TouchableOpacity
              onPress={handleSave}
              disabled={saving || !code.trim() || !discountValue}
              className={`py-3.5 rounded-xl items-center ${code.trim() && discountValue ? 'bg-[#b94a48]' : 'bg-gray-200'}`}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text className={`font-semibold ${code.trim() && discountValue ? 'text-white' : 'text-gray-400'}`}>
                  {editing ? 'Salvar Alterações' : 'Criar Cupom'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
