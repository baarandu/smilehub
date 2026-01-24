import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  Animated,
} from 'react-native';
import { Swipeable, GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  Calculator,
  X,
  Edit2,
  Check,
  RefreshCw,
  Plus,
  Trash2,
  ChevronLeft,
} from 'lucide-react-native';
import { taxConfigService } from '../../services/taxConfig';
import type {
  TaxRateConfiguration,
  TaxRateBracket,
  TaxRegime,
} from '../../types/taxCalculations';
import {
  TAX_REGIME_INFO,
  getTaxTypeLabel,
  formatTaxRate,
  formatCurrency,
} from '../../types/taxCalculations';

interface Props {
  visible: boolean;
  onClose: () => void;
  onConfigUpdated?: () => void;
}

const REGIME_TABS: { key: TaxRegime; label: string }[] = [
  { key: 'pf_carne_leao', label: 'PF' },
  { key: 'simples', label: 'Simples' },
  { key: 'lucro_presumido', label: 'LP' },
  { key: 'lucro_real', label: 'LR' },
];

export function TaxRatesConfigModal({ visible, onClose, onConfigUpdated }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configurations, setConfigurations] = useState<TaxRateConfiguration[]>([]);
  const [activeTab, setActiveTab] = useState<TaxRegime>('pf_carne_leao');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  // New tax form
  const [showNewTax, setShowNewTax] = useState(false);
  const [newTaxType, setNewTaxType] = useState('');
  const [newTaxRate, setNewTaxRate] = useState('');
  const [newTaxDescription, setNewTaxDescription] = useState('');

  // Swipe hint
  const [showSwipeHint, setShowSwipeHint] = useState(true);
  const swipeHintOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible && showSwipeHint) {
      // Fade out hint after 4 seconds
      const timer = setTimeout(() => {
        Animated.timing(swipeHintOpacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }).start(() => setShowSwipeHint(false));
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [visible, showSwipeHint]);

  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible]);

  const loadData = async () => {
    setLoading(true);
    try {
      await taxConfigService.initializeDefaultRates();
      const configs = await taxConfigService.getTaxConfigurations();
      setConfigurations(configs);
    } catch (error) {
      console.error('Error loading tax configs:', error);
      Alert.alert('Erro', 'Falha ao carregar configuracoes');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateFlatRate = async (configId: string) => {
    const rate = parseFloat(editValue) / 100;
    if (isNaN(rate) || rate < 0 || rate > 1) {
      Alert.alert('Erro', 'Valor invalido');
      return;
    }

    setSaving(true);
    try {
      await taxConfigService.updateConfiguration(configId, { flat_rate: rate });
      await loadData();
      setEditingId(null);
      onConfigUpdated?.();
      Alert.alert('Sucesso', 'Aliquota atualizada');
    } catch (error) {
      Alert.alert('Erro', 'Falha ao atualizar aliquota');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateBracket = async (bracketId: string, field: string) => {
    let value: number | null;

    if (field === 'rate') {
      value = parseFloat(editValue) / 100;
      if (isNaN(value) || value < 0 || value > 1) {
        Alert.alert('Erro', 'Valor invalido');
        return;
      }
    } else {
      value = parseFloat(editValue.replace(/\./g, '').replace(',', '.'));
      if (isNaN(value)) {
        Alert.alert('Erro', 'Valor invalido');
        return;
      }
    }

    setSaving(true);
    try {
      await taxConfigService.updateBracket(bracketId, { [field]: value });
      await loadData();
      setEditingId(null);
      onConfigUpdated?.();
      Alert.alert('Sucesso', 'Faixa atualizada');
    } catch (error) {
      Alert.alert('Erro', 'Falha ao atualizar faixa');
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefaults = () => {
    Alert.alert(
      'Restaurar Configuracoes de Fabrica',
      'Todas as aliquotas serao restauradas para os valores padrao conforme a legislacao (IRPF 2024, Simples Anexo III, Lucro Presumido, Lucro Real).\n\nQualquer alteracao sera perdida.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restaurar',
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            try {
              await taxConfigService.resetToDefaults();
              await loadData();
              onConfigUpdated?.();
              Alert.alert('Sucesso', 'Valores de fabrica restaurados com sucesso');
            } catch (error) {
              Alert.alert('Erro', 'Falha ao restaurar configuracoes');
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  const handleCreateTax = async () => {
    if (!newTaxType || !newTaxRate) {
      Alert.alert('Erro', 'Preencha tipo e aliquota');
      return;
    }

    const rate = parseFloat(newTaxRate) / 100;
    if (isNaN(rate) || rate < 0 || rate > 1) {
      Alert.alert('Erro', 'Aliquota invalida');
      return;
    }

    setSaving(true);
    try {
      await taxConfigService.createConfiguration({
        tax_regime: activeTab,
        tax_type: newTaxType,
        rate_type: 'flat',
        flat_rate: rate,
        description: newTaxDescription || undefined,
      });
      await loadData();
      setShowNewTax(false);
      setNewTaxType('');
      setNewTaxRate('');
      setNewTaxDescription('');
      onConfigUpdated?.();
      Alert.alert('Sucesso', 'Imposto adicionado');
    } catch (error) {
      Alert.alert('Erro', 'Falha ao adicionar imposto');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTax = (configId: string, taxName: string) => {
    Alert.alert(
      'Excluir Imposto',
      `Deseja excluir "${taxName}"? Esta acao nao pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            try {
              await taxConfigService.deleteConfiguration(configId);
              await loadData();
              onConfigUpdated?.();
              Alert.alert('Sucesso', 'Imposto removido');
            } catch (error) {
              Alert.alert('Erro', 'Falha ao remover imposto');
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  const getConfigsForRegime = (regime: TaxRegime) => {
    return configurations.filter(c => c.tax_regime === regime);
  };

  const swipeableRefs = useRef<{ [key: string]: Swipeable | null }>({});

  const closeAllSwipeables = (exceptId?: string) => {
    Object.entries(swipeableRefs.current).forEach(([id, ref]) => {
      if (ref && id !== exceptId) {
        ref.close();
      }
    });
  };

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>,
    config: TaxRateConfiguration
  ) => {
    const rate = config.flat_rate || 0;

    const scale = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0.8, 1],
      extrapolate: 'clamp',
    });

    return (
      <View style={{ flexDirection: 'row', width: 160 }}>
        {/* Edit Button */}
        <Animated.View style={{ flex: 1, transform: [{ scale }] }}>
          <TouchableOpacity
            onPress={() => {
              swipeableRefs.current[config.id]?.close();
              setEditingId(config.id);
              setEditValue((rate * 100).toFixed(2));
            }}
            style={{
              backgroundColor: '#14B8A6',
              justifyContent: 'center',
              alignItems: 'center',
              flex: 1,
              width: 80,
            }}
          >
            <Edit2 size={22} color="white" />
            <Text style={{ color: 'white', fontSize: 12, marginTop: 4 }}>Editar</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Delete Button */}
        <Animated.View style={{ flex: 1, transform: [{ scale }] }}>
          <TouchableOpacity
            onPress={() => {
              swipeableRefs.current[config.id]?.close();
              handleDeleteTax(config.id, getTaxTypeLabel(config.tax_type));
            }}
            style={{
              backgroundColor: '#EF4444',
              justifyContent: 'center',
              alignItems: 'center',
              flex: 1,
              width: 80,
            }}
          >
            <Trash2 size={22} color="white" />
            <Text style={{ color: 'white', fontSize: 12, marginTop: 4 }}>Excluir</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  };

  const renderFlatRateRow = (config: TaxRateConfiguration) => {
    const isEditing = editingId === config.id;
    const rate = config.flat_rate || 0;

    if (isEditing) {
      return (
        <View key={config.id} className="flex-row py-3 px-3 border-b border-gray-100 items-center bg-white">
          <View className="flex-1 mr-2">
            <Text className="font-medium text-gray-800 text-sm">{getTaxTypeLabel(config.tax_type)}</Text>
          </View>
          <View className="flex-row items-center">
            <TextInput
              className="bg-gray-100 border border-gray-200 rounded px-2 py-1 w-16 text-right"
              value={editValue}
              onChangeText={setEditValue}
              keyboardType="decimal-pad"
              autoFocus
            />
            <Text className="text-gray-500 mx-1">%</Text>
            <TouchableOpacity
              onPress={() => handleUpdateFlatRate(config.id)}
              disabled={saving}
              className="p-1"
            >
              <Check size={18} color="#16A34A" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setEditingId(null)}
              className="p-1"
            >
              <X size={18} color="#DC2626" />
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <Swipeable
        key={config.id}
        ref={(ref) => { swipeableRefs.current[config.id] = ref; }}
        renderRightActions={(progress, dragX) => renderRightActions(progress, dragX, config)}
        onSwipeableWillOpen={() => closeAllSwipeables(config.id)}
        rightThreshold={40}
        overshootRight={false}
        friction={2}
      >
        <View className="flex-row py-3 px-3 border-b border-gray-100 items-center bg-white">
          <View className="flex-1 mr-2">
            <Text className="font-medium text-gray-800 text-sm">{getTaxTypeLabel(config.tax_type)}</Text>
            {config.description && (
              <Text className="text-xs text-gray-500 mt-0.5" numberOfLines={2}>{config.description}</Text>
            )}
          </View>
          <View className="flex-row items-center">
            <View className="flex-row items-center bg-teal-50 px-3 py-1.5 rounded-lg">
              <Text className="font-mono text-teal-700 font-medium">{formatTaxRate(rate)}</Text>
            </View>
            {/* Swipe indicator */}
            <View className="ml-2 opacity-40">
              <ChevronLeft size={16} color="#9CA3AF" />
            </View>
          </View>
        </View>
      </Swipeable>
    );
  };

  const renderFlatRatesTable = (flatConfigs: TaxRateConfiguration[]) => {
    return (
      <View className="bg-white rounded-lg mb-3 border border-gray-100 overflow-hidden">
        <View className="px-3 py-2 border-b border-gray-100 flex-row justify-between items-center">
          <View>
            <Text className="font-semibold text-gray-800">Aliquotas</Text>
            <Text className="text-xs text-gray-500">Deslize para esquerda para editar/excluir</Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowNewTax(true)}
            className="flex-row items-center bg-teal-50 px-3 py-1.5 rounded-lg"
          >
            <Plus size={16} color="#0D9488" />
            <Text className="text-teal-600 text-sm font-medium ml-1">Adicionar</Text>
          </TouchableOpacity>
        </View>

        {/* New Tax Form */}
        {showNewTax && (
          <View className="p-3 bg-gray-50 border-b border-gray-200">
            <View className="mb-2">
              <Text className="text-xs text-gray-600 mb-1">Tipo do Imposto</Text>
              <TextInput
                className="bg-white border border-gray-200 rounded px-3 py-2"
                value={newTaxType}
                onChangeText={setNewTaxType}
                placeholder="Ex: outro_imposto"
              />
            </View>
            <View className="flex-row mb-2">
              <View className="flex-1 mr-2">
                <Text className="text-xs text-gray-600 mb-1">Aliquota (%)</Text>
                <TextInput
                  className="bg-white border border-gray-200 rounded px-3 py-2"
                  value={newTaxRate}
                  onChangeText={setNewTaxRate}
                  placeholder="5.00"
                  keyboardType="decimal-pad"
                />
              </View>
              <View className="flex-1">
                <Text className="text-xs text-gray-600 mb-1">Descricao</Text>
                <TextInput
                  className="bg-white border border-gray-200 rounded px-3 py-2"
                  value={newTaxDescription}
                  onChangeText={setNewTaxDescription}
                  placeholder="Opcional"
                />
              </View>
            </View>
            <View className="flex-row justify-end">
              <TouchableOpacity
                onPress={() => {
                  setShowNewTax(false);
                  setNewTaxType('');
                  setNewTaxRate('');
                  setNewTaxDescription('');
                }}
                className="px-4 py-2 mr-2"
              >
                <Text className="text-gray-600">Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCreateTax}
                disabled={saving}
                className="bg-teal-600 px-4 py-2 rounded-lg"
              >
                <Text className="text-white font-medium">Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {flatConfigs.length === 0 ? (
          <View className="py-6 items-center">
            <Text className="text-gray-500 text-sm">Nenhuma aliquota cadastrada</Text>
            <Text className="text-gray-400 text-xs">Toque em "Adicionar" para criar</Text>
          </View>
        ) : (
          flatConfigs.map(renderFlatRateRow)
        )}
      </View>
    );
  };

  const renderProgressiveConfig = (config: TaxRateConfiguration) => {
    const brackets = config.brackets || [];

    return (
      <View key={config.id} className="bg-white rounded-lg p-3 mb-2 border border-gray-100">
        <Text className="font-medium text-gray-800 mb-2">{getTaxTypeLabel(config.tax_type)}</Text>
        {config.description && (
          <Text className="text-xs text-gray-500 mb-2">{config.description}</Text>
        )}

        {/* Brackets Table Header */}
        <View className="flex-row bg-gray-50 py-2 px-1 rounded-t">
          <Text className="text-xs text-gray-500 w-8">#</Text>
          <Text className="text-xs text-gray-500 flex-1">De</Text>
          <Text className="text-xs text-gray-500 flex-1">Ate</Text>
          <Text className="text-xs text-gray-500 w-16 text-right">Aliq.</Text>
        </View>

        {/* Brackets */}
        {brackets.map((bracket) => (
          <View key={bracket.id} className="flex-row py-2 px-1 border-b border-gray-50">
            <Text className="text-xs text-gray-600 w-8">{bracket.bracket_order}</Text>

            {/* Min Value */}
            {editingId === `${bracket.id}-min` ? (
              <View className="flex-1 flex-row items-center">
                <TextInput
                  className="bg-gray-100 border border-gray-200 rounded px-1 flex-1 text-xs"
                  value={editValue}
                  onChangeText={setEditValue}
                  keyboardType="decimal-pad"
                  autoFocus
                />
                <TouchableOpacity
                  onPress={() => handleUpdateBracket(bracket.id, 'min_value')}
                  className="p-1"
                >
                  <Check size={14} color="#16A34A" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => {
                  setEditingId(`${bracket.id}-min`);
                  setEditValue(bracket.min_value.toString());
                }}
                className="flex-1"
              >
                <Text className="text-xs text-gray-700">
                  {formatCurrency(bracket.min_value)}
                </Text>
              </TouchableOpacity>
            )}

            {/* Max Value */}
            {bracket.max_value === null ? (
              <Text className="text-xs text-gray-400 flex-1">Sem limite</Text>
            ) : editingId === `${bracket.id}-max` ? (
              <View className="flex-1 flex-row items-center">
                <TextInput
                  className="bg-gray-100 border border-gray-200 rounded px-1 flex-1 text-xs"
                  value={editValue}
                  onChangeText={setEditValue}
                  keyboardType="decimal-pad"
                  autoFocus
                />
                <TouchableOpacity
                  onPress={() => handleUpdateBracket(bracket.id, 'max_value')}
                  className="p-1"
                >
                  <Check size={14} color="#16A34A" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => {
                  setEditingId(`${bracket.id}-max`);
                  setEditValue(bracket.max_value?.toString() || '');
                }}
                className="flex-1"
              >
                <Text className="text-xs text-gray-700">
                  {formatCurrency(bracket.max_value)}
                </Text>
              </TouchableOpacity>
            )}

            {/* Rate */}
            {editingId === `${bracket.id}-rate` ? (
              <View className="w-16 flex-row items-center justify-end">
                <TextInput
                  className="bg-gray-100 border border-gray-200 rounded px-1 w-10 text-xs text-right"
                  value={editValue}
                  onChangeText={setEditValue}
                  keyboardType="decimal-pad"
                  autoFocus
                />
                <TouchableOpacity
                  onPress={() => handleUpdateBracket(bracket.id, 'rate')}
                  className="p-1"
                >
                  <Check size={14} color="#16A34A" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => {
                  setEditingId(`${bracket.id}-rate`);
                  setEditValue((bracket.rate * 100).toFixed(2));
                }}
                className="w-16"
              >
                <Text className="text-xs text-teal-600 text-right font-mono">
                  {formatTaxRate(bracket.rate)}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ))}

        <Text className="text-xs text-gray-400 mt-2">Toque nos valores para editar</Text>
      </View>
    );
  };

  const renderRegimeContent = () => {
    const configs = getConfigsForRegime(activeTab);
    const flatConfigs = configs.filter(c => c.rate_type === 'flat');
    const progressiveConfigs = configs.filter(c => c.rate_type === 'progressive');

    return (
      <View>
        <View className="p-3 bg-teal-50 rounded-lg mb-3">
          <Text className="text-xs text-teal-700">
            {TAX_REGIME_INFO[activeTab].description}
          </Text>
        </View>

        {renderFlatRatesTable(flatConfigs)}

        {progressiveConfigs.map((config) => renderProgressiveConfig(config))}
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <GestureHandlerRootView style={{ flex: 1 }}>
      <View className="flex-1 bg-gray-50">
        {/* Header */}
        <View className="bg-white border-b border-gray-200 px-4 py-3">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Calculator size={24} color="#0D9488" />
              <Text className="font-bold text-lg text-gray-900 ml-2">Base de Calculo</Text>
            </View>
            <TouchableOpacity onPress={onClose} className="p-2">
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          <Text className="text-xs text-gray-500 mt-1">
            Valores padrao conforme legislacao. Edite se necessario.
          </Text>
        </View>

        {/* Regime Tabs */}
        <View className="flex-row bg-white border-b border-gray-200">
          {REGIME_TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              className={`flex-1 py-3 items-center border-b-2 ${
                activeTab === tab.key ? 'border-teal-600' : 'border-transparent'
              }`}
            >
              <Text
                className={`text-sm font-medium ${
                  activeTab === tab.key ? 'text-teal-600' : 'text-gray-500'
                }`}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content */}
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#0D9488" />
          </View>
        ) : (
          <ScrollView className="flex-1 p-4">
            {/* Info Banner */}
            <View className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <Text className="text-xs text-blue-800">
                <Text className="font-bold">Valores de fabrica: </Text>
                Aliquotas conforme legislacao vigente. Use "Restaurar Padrao" para reverter.
              </Text>
            </View>

            {/* Swipe Hint Banner */}
            {showSwipeHint && (
              <Animated.View
                style={{ opacity: swipeHintOpacity }}
                className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex-row items-center"
              >
                <View className="bg-amber-100 p-2 rounded-full mr-3">
                  <ChevronLeft size={16} color="#D97706" />
                </View>
                <View className="flex-1">
                  <Text className="text-xs text-amber-800 font-medium">Dica: Deslize para a esquerda</Text>
                  <Text className="text-xs text-amber-700">em qualquer aliquota para editar ou excluir</Text>
                </View>
              </Animated.View>
            )}

            {renderRegimeContent()}
          </ScrollView>
        )}

        {/* Footer */}
        <View className="bg-white border-t border-gray-200 p-4">
          <TouchableOpacity
            onPress={handleResetToDefaults}
            disabled={saving || loading}
            className="flex-row items-center justify-center py-3 bg-gray-100 rounded-xl"
          >
            <RefreshCw size={18} color="#6B7280" />
            <Text className="text-gray-700 font-medium ml-2">Restaurar Padrao</Text>
          </TouchableOpacity>
        </View>
      </View>
      </GestureHandlerRootView>
    </Modal>
  );
}
