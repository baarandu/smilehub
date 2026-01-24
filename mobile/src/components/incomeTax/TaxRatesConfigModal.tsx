import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import {
  Calculator,
  X,
  Edit2,
  Check,
  RefreshCw,
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

  const getConfigsForRegime = (regime: TaxRegime) => {
    return configurations.filter(c => c.tax_regime === regime);
  };

  const renderFlatRateRow = (config: TaxRateConfiguration) => {
    const isEditing = editingId === config.id;
    const rate = config.flat_rate || 0;

    return (
      <View key={config.id} className="flex-row py-3 px-2 border-b border-gray-100 items-center">
        <View className="flex-1">
          <Text className="font-medium text-gray-800 text-sm">{getTaxTypeLabel(config.tax_type)}</Text>
          {config.description && (
            <Text className="text-xs text-gray-500 mt-0.5" numberOfLines={2}>{config.description}</Text>
          )}
        </View>

        {isEditing ? (
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
        ) : (
          <TouchableOpacity
            onPress={() => {
              setEditingId(config.id);
              setEditValue((rate * 100).toFixed(2));
            }}
            className="flex-row items-center bg-teal-50 px-3 py-1.5 rounded-lg"
          >
            <Text className="font-mono text-teal-700 font-medium mr-1">{formatTaxRate(rate)}</Text>
            <Edit2 size={14} color="#0D9488" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderFlatRatesTable = (flatConfigs: TaxRateConfiguration[]) => {
    if (flatConfigs.length === 0) return null;

    return (
      <View className="bg-white rounded-lg mb-3 border border-gray-100">
        <View className="px-3 py-2 border-b border-gray-100">
          <Text className="font-semibold text-gray-800">Aliquotas</Text>
          <Text className="text-xs text-gray-500">Toque na aliquota para editar</Text>
        </View>
        {flatConfigs.map(renderFlatRateRow)}
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

    if (configs.length === 0) {
      return (
        <View className="py-8 items-center">
          <Text className="text-gray-500">Nenhuma configuracao encontrada</Text>
        </View>
      );
    }

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
                Aliquotas conforme legislacao vigente. Toque para editar. Use "Restaurar Padrao" para reverter.
              </Text>
            </View>

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
    </Modal>
  );
}
