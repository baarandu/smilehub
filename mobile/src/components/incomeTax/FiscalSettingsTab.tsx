import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import {
  User,
  Building2,
  Save,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
} from 'lucide-react-native';
import { incomeTaxService } from '../../services/incomeTax';
import type {
  FiscalProfile,
  PJSource,
  FiscalProfileFormData,
  PJSourceFormData,
  SimplesFatorRMode,
  SimplesAnexo,
} from '../../types/incomeTax';

interface Props {
  fiscalProfile: FiscalProfile | null;
  pjSources: PJSource[];
  onProfileUpdated: (profile: FiscalProfile) => void;
  onPJSourcesUpdated: () => void;
}

const BRAZILIAN_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

const applyCPFMask = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
};

const applyCNPJMask = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
};

const applyCEPMask = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
};

export function FiscalSettingsTab({
  fiscalProfile,
  pjSources,
  onProfileUpdated,
  onPJSourcesUpdated,
}: Props) {
  const [saving, setSaving] = useState(false);
  const [showStateModal, setShowStateModal] = useState(false);
  const [showRegimeModal, setShowRegimeModal] = useState(false);
  const [showPJModal, setShowPJModal] = useState(false);
  const [showFatorRModeModal, setShowFatorRModeModal] = useState(false);
  const [showAnexoModal, setShowAnexoModal] = useState(false);
  const [editingPJSource, setEditingPJSource] = useState<PJSource | null>(null);
  const [pjFormData, setPJFormData] = useState<PJSourceFormData>({
    cnpj: '',
    razao_social: '',
    nome_fantasia: '',
    is_active: true,
  });

  const [formData, setFormData] = useState<FiscalProfileFormData>({
    pf_enabled: false,
    pf_cpf: '',
    pf_cro: '',
    pf_address: '',
    pf_city: '',
    pf_state: '',
    pf_zip_code: '',
    pf_uses_carne_leao: false,
    pj_enabled: false,
    pj_cnpj: '',
    pj_razao_social: '',
    pj_nome_fantasia: '',
    pj_regime_tributario: '',
    pj_cnae: '',
    simples_fator_r_mode: 'manual',
    simples_monthly_payroll: '',
    simples_anexo: 'anexo_iii',
  });

  useEffect(() => {
    if (fiscalProfile) {
      setFormData({
        pf_enabled: fiscalProfile.pf_enabled,
        pf_cpf: fiscalProfile.pf_cpf || '',
        pf_cro: fiscalProfile.pf_cro || '',
        pf_address: fiscalProfile.pf_address || '',
        pf_city: fiscalProfile.pf_city || '',
        pf_state: fiscalProfile.pf_state || '',
        pf_zip_code: fiscalProfile.pf_zip_code || '',
        pf_uses_carne_leao: fiscalProfile.pf_uses_carne_leao,
        pj_enabled: fiscalProfile.pj_enabled,
        pj_cnpj: fiscalProfile.pj_cnpj || '',
        pj_razao_social: fiscalProfile.pj_razao_social || '',
        pj_nome_fantasia: fiscalProfile.pj_nome_fantasia || '',
        pj_regime_tributario: fiscalProfile.pj_regime_tributario || '',
        pj_cnae: fiscalProfile.pj_cnae || '',
        simples_fator_r_mode: fiscalProfile.simples_fator_r_mode || 'manual',
        simples_monthly_payroll: fiscalProfile.simples_monthly_payroll?.toString() || '',
        simples_anexo: fiscalProfile.simples_anexo || 'anexo_iii',
      });
    }
  }, [fiscalProfile]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const profile = await incomeTaxService.saveFiscalProfile(formData);
      onProfileUpdated(profile);
    } catch (error) {
      console.error('Error saving:', error);
      Alert.alert('Erro', 'Falha ao salvar perfil fiscal');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePJSource = async () => {
    if (!pjFormData.cnpj || !pjFormData.razao_social) {
      Alert.alert('Erro', 'CNPJ e Razao Social sao obrigatorios');
      return;
    }

    try {
      if (editingPJSource) {
        await incomeTaxService.updatePJSource(editingPJSource.id, pjFormData);
      } else {
        await incomeTaxService.createPJSource(pjFormData);
      }
      setShowPJModal(false);
      setPJFormData({ cnpj: '', razao_social: '', nome_fantasia: '', is_active: true });
      setEditingPJSource(null);
      onPJSourcesUpdated();
      Alert.alert('Sucesso', editingPJSource ? 'Fonte PJ atualizada' : 'Fonte PJ cadastrada');
    } catch (error) {
      Alert.alert('Erro', 'Falha ao salvar fonte PJ');
    }
  };

  const handleDeletePJSource = (source: PJSource) => {
    Alert.alert(
      'Confirmar exclusao',
      `Remover "${source.razao_social}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await incomeTaxService.deletePJSource(source.id);
              onPJSourcesUpdated();
              Alert.alert('Sucesso', 'Fonte PJ removida');
            } catch (error) {
              Alert.alert('Erro', 'Falha ao remover');
            }
          },
        },
      ]
    );
  };

  const openEditPJSource = (source: PJSource) => {
    setEditingPJSource(source);
    setPJFormData({
      cnpj: source.cnpj,
      razao_social: source.razao_social,
      nome_fantasia: source.nome_fantasia || '',
      is_active: source.is_active,
    });
    setShowPJModal(true);
  };

  const regimeLabels: Record<string, string> = {
    simples: 'Simples Nacional',
    lucro_presumido: 'Lucro Presumido',
    lucro_real: 'Lucro Real',
  };

  return (
    <View className="p-4">
      {/* PF Section */}
      <View className="bg-white rounded-xl p-4 mb-4 border border-gray-100">
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-row items-center">
            <View className="w-10 h-10 bg-teal-100 rounded-full items-center justify-center mr-3">
              <User size={20} color="#0D9488" />
            </View>
            <View>
              <Text className="font-bold text-gray-900">Pessoa Fisica (PF)</Text>
              <Text className="text-xs text-gray-500">Dados para declaracao PF</Text>
            </View>
          </View>
          <Switch
            value={formData.pf_enabled}
            onValueChange={(v) => setFormData({ ...formData, pf_enabled: v })}
            trackColor={{ false: '#D1D5DB', true: '#5EEAD4' }}
            thumbColor={formData.pf_enabled ? '#0D9488' : '#9CA3AF'}
          />
        </View>

        {formData.pf_enabled && (
          <View className="space-y-3">
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="text-xs text-gray-500 mb-1">CPF</Text>
                <TextInput
                  className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2"
                  placeholder="000.000.000-00"
                  value={formData.pf_cpf}
                  onChangeText={(v) => setFormData({ ...formData, pf_cpf: applyCPFMask(v) })}
                  keyboardType="numeric"
                />
              </View>
              <View className="flex-1">
                <Text className="text-xs text-gray-500 mb-1">CRO</Text>
                <TextInput
                  className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2"
                  placeholder="CRO-SP 12345"
                  value={formData.pf_cro}
                  onChangeText={(v) => setFormData({ ...formData, pf_cro: v })}
                />
              </View>
            </View>

            <View>
              <Text className="text-xs text-gray-500 mb-1">Endereco</Text>
              <TextInput
                className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2"
                placeholder="Rua, numero, complemento"
                value={formData.pf_address}
                onChangeText={(v) => setFormData({ ...formData, pf_address: v })}
                multiline
              />
            </View>

            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="text-xs text-gray-500 mb-1">Cidade</Text>
                <TextInput
                  className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2"
                  placeholder="Cidade"
                  value={formData.pf_city}
                  onChangeText={(v) => setFormData({ ...formData, pf_city: v })}
                />
              </View>
              <View className="w-20">
                <Text className="text-xs text-gray-500 mb-1">UF</Text>
                <TouchableOpacity
                  onPress={() => setShowStateModal(true)}
                  className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2"
                >
                  <Text className={formData.pf_state ? 'text-gray-900' : 'text-gray-400'}>
                    {formData.pf_state || 'UF'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View>
              <Text className="text-xs text-gray-500 mb-1">CEP</Text>
              <TextInput
                className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 w-32"
                placeholder="00000-000"
                value={formData.pf_zip_code}
                onChangeText={(v) => setFormData({ ...formData, pf_zip_code: applyCEPMask(v) })}
                keyboardType="numeric"
              />
            </View>

            <View className="flex-row items-center justify-between bg-gray-50 p-3 rounded-lg mt-2">
              <View>
                <Text className="font-medium text-gray-900">Carne-Leao</Text>
                <Text className="text-xs text-gray-500">Recolhe IR mensalmente</Text>
              </View>
              <Switch
                value={formData.pf_uses_carne_leao}
                onValueChange={(v) => setFormData({ ...formData, pf_uses_carne_leao: v })}
                trackColor={{ false: '#D1D5DB', true: '#5EEAD4' }}
                thumbColor={formData.pf_uses_carne_leao ? '#0D9488' : '#9CA3AF'}
              />
            </View>
          </View>
        )}
      </View>

      {/* PJ Section */}
      <View className="bg-white rounded-xl p-4 mb-4 border border-gray-100">
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-row items-center">
            <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center mr-3">
              <Building2 size={20} color="#2563EB" />
            </View>
            <View>
              <Text className="font-bold text-gray-900">Pessoa Juridica (PJ)</Text>
              <Text className="text-xs text-gray-500">Dados da empresa</Text>
            </View>
          </View>
          <Switch
            value={formData.pj_enabled}
            onValueChange={(v) => setFormData({ ...formData, pj_enabled: v })}
            trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
            thumbColor={formData.pj_enabled ? '#2563EB' : '#9CA3AF'}
          />
        </View>

        {formData.pj_enabled && (
          <View className="space-y-3">
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="text-xs text-gray-500 mb-1">CNPJ</Text>
                <TextInput
                  className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2"
                  placeholder="00.000.000/0000-00"
                  value={formData.pj_cnpj}
                  onChangeText={(v) => setFormData({ ...formData, pj_cnpj: applyCNPJMask(v) })}
                  keyboardType="numeric"
                />
              </View>
              <View className="flex-1">
                <Text className="text-xs text-gray-500 mb-1">CNAE</Text>
                <TextInput
                  className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2"
                  placeholder="8630-5/04"
                  value={formData.pj_cnae}
                  onChangeText={(v) => setFormData({ ...formData, pj_cnae: v })}
                />
              </View>
            </View>

            <View>
              <Text className="text-xs text-gray-500 mb-1">Razao Social</Text>
              <TextInput
                className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2"
                placeholder="Nome empresarial"
                value={formData.pj_razao_social}
                onChangeText={(v) => setFormData({ ...formData, pj_razao_social: v })}
              />
            </View>

            <View>
              <Text className="text-xs text-gray-500 mb-1">Nome Fantasia</Text>
              <TextInput
                className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2"
                placeholder="Nome comercial"
                value={formData.pj_nome_fantasia}
                onChangeText={(v) => setFormData({ ...formData, pj_nome_fantasia: v })}
              />
            </View>

            <View>
              <Text className="text-xs text-gray-500 mb-1">Regime Tributario</Text>
              <TouchableOpacity
                onPress={() => setShowRegimeModal(true)}
                className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2"
              >
                <Text className={formData.pj_regime_tributario ? 'text-gray-900' : 'text-gray-400'}>
                  {formData.pj_regime_tributario
                    ? regimeLabels[formData.pj_regime_tributario]
                    : 'Selecione'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Simples Nacional - Fator R Configuration */}
            {formData.pj_regime_tributario === 'simples' && (
              <View className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <Text className="font-medium text-blue-900 mb-2">Configuracao do Fator R</Text>
                <Text className="text-xs text-blue-700 mb-3">
                  O Fator R determina se sua empresa usa Anexo III (aliquotas menores) ou Anexo V (aliquotas maiores).
                </Text>

                <View className="mb-3">
                  <Text className="text-xs text-blue-800 mb-1">Como calcular?</Text>
                  <TouchableOpacity
                    onPress={() => setShowFatorRModeModal(true)}
                    className="bg-white border border-blue-200 rounded-lg px-3 py-2"
                  >
                    <Text className="text-blue-800">
                      {formData.simples_fator_r_mode === 'auto'
                        ? 'Automatico (informar folha)'
                        : 'Manual (escolher anexo)'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {formData.simples_fator_r_mode === 'auto' ? (
                  <View>
                    <Text className="text-xs text-blue-800 mb-1">Folha de Pagamento Mensal (R$)</Text>
                    <TextInput
                      className="bg-white border border-blue-200 rounded-lg px-3 py-2"
                      placeholder="0,00"
                      value={formData.simples_monthly_payroll}
                      onChangeText={(v) => setFormData({ ...formData, simples_monthly_payroll: v })}
                      keyboardType="decimal-pad"
                    />
                    <Text className="text-xs text-blue-600 mt-1">
                      Inclua pro-labore, salarios e encargos.
                    </Text>
                  </View>
                ) : (
                  <View>
                    <Text className="text-xs text-blue-800 mb-1">Anexo do Simples</Text>
                    <TouchableOpacity
                      onPress={() => setShowAnexoModal(true)}
                      className="bg-white border border-blue-200 rounded-lg px-3 py-2"
                    >
                      <Text className="text-blue-800">
                        {formData.simples_anexo === 'anexo_iii'
                          ? 'Anexo III (Fator R >= 28%)'
                          : 'Anexo V (Fator R < 28%)'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </View>
        )}
      </View>

      {/* PJ Sources */}
      <View className="bg-white rounded-xl p-4 mb-4 border border-gray-100">
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-row items-center">
            <Building2 size={20} color="#0D9488" />
            <Text className="font-bold text-gray-900 ml-2">Fontes PJ (Convenios)</Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              setEditingPJSource(null);
              setPJFormData({ cnpj: '', razao_social: '', nome_fantasia: '', is_active: true });
              setShowPJModal(true);
            }}
            className="bg-teal-600 px-3 py-1.5 rounded-lg flex-row items-center"
          >
            <Plus size={16} color="white" />
            <Text className="text-white font-medium ml-1">Adicionar</Text>
          </TouchableOpacity>
        </View>

        {pjSources.length === 0 ? (
          <Text className="text-center text-gray-500 py-4">Nenhuma fonte PJ cadastrada</Text>
        ) : (
          pjSources.map((source) => (
            <View
              key={source.id}
              className="flex-row items-center justify-between py-3 border-b border-gray-100"
            >
              <View className="flex-1">
                <Text className="font-medium text-gray-900">{source.razao_social}</Text>
                {source.nome_fantasia && (
                  <Text className="text-xs text-gray-500">{source.nome_fantasia}</Text>
                )}
                <Text className="text-xs text-gray-500">{source.cnpj}</Text>
              </View>
              <View className="flex-row gap-2">
                <TouchableOpacity onPress={() => openEditPJSource(source)} className="p-2">
                  <Edit2 size={18} color="#6B7280" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDeletePJSource(source)} className="p-2">
                  <Trash2 size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Save Button */}
      <TouchableOpacity
        onPress={handleSave}
        disabled={saving}
        className={`flex-row items-center justify-center py-4 rounded-xl ${saving ? 'bg-gray-300' : 'bg-teal-600'}`}
      >
        {saving ? (
          <ActivityIndicator color="white" />
        ) : (
          <>
            <Save size={20} color="white" />
            <Text className="text-white font-bold ml-2">Salvar Configuracoes</Text>
          </>
        )}
      </TouchableOpacity>

      {/* State Modal */}
      <Modal visible={showStateModal} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl max-h-[60%]">
            <View className="flex-row justify-between items-center p-4 border-b border-gray-100">
              <Text className="font-bold text-lg">Selecione o Estado</Text>
              <TouchableOpacity onPress={() => setShowStateModal(false)}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <View className="flex-row flex-wrap p-4">
              {BRAZILIAN_STATES.map((state) => (
                <TouchableOpacity
                  key={state}
                  onPress={() => {
                    setFormData({ ...formData, pf_state: state });
                    setShowStateModal(false);
                  }}
                  className={`w-16 py-2 m-1 rounded-lg items-center ${formData.pf_state === state ? 'bg-teal-600' : 'bg-gray-100'}`}
                >
                  <Text className={formData.pf_state === state ? 'text-white font-bold' : 'text-gray-700'}>
                    {state}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Regime Modal */}
      <Modal visible={showRegimeModal} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl">
            <View className="flex-row justify-between items-center p-4 border-b border-gray-100">
              <Text className="font-bold text-lg">Regime Tributario</Text>
              <TouchableOpacity onPress={() => setShowRegimeModal(false)}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <View className="p-4">
              {['simples', 'lucro_presumido', 'lucro_real'].map((regime) => (
                <TouchableOpacity
                  key={regime}
                  onPress={() => {
                    setFormData({ ...formData, pj_regime_tributario: regime });
                    setShowRegimeModal(false);
                  }}
                  className={`p-4 mb-2 rounded-lg flex-row items-center justify-between ${formData.pj_regime_tributario === regime ? 'bg-teal-50 border border-teal-200' : 'bg-gray-50'}`}
                >
                  <Text className={formData.pj_regime_tributario === regime ? 'text-teal-700 font-medium' : 'text-gray-700'}>
                    {regimeLabels[regime]}
                  </Text>
                  {formData.pj_regime_tributario === regime && <Check size={20} color="#0D9488" />}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* PJ Source Modal */}
      <Modal visible={showPJModal} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl">
            <View className="flex-row justify-between items-center p-4 border-b border-gray-100">
              <Text className="font-bold text-lg">
                {editingPJSource ? 'Editar Fonte PJ' : 'Nova Fonte PJ'}
              </Text>
              <TouchableOpacity onPress={() => setShowPJModal(false)}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <View className="p-4 space-y-4">
              <View>
                <Text className="text-xs text-gray-500 mb-1">CNPJ *</Text>
                <TextInput
                  className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-3"
                  placeholder="00.000.000/0000-00"
                  value={pjFormData.cnpj}
                  onChangeText={(v) => setPJFormData({ ...pjFormData, cnpj: applyCNPJMask(v) })}
                  keyboardType="numeric"
                />
              </View>
              <View>
                <Text className="text-xs text-gray-500 mb-1">Razao Social *</Text>
                <TextInput
                  className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-3"
                  placeholder="Nome empresarial"
                  value={pjFormData.razao_social}
                  onChangeText={(v) => setPJFormData({ ...pjFormData, razao_social: v })}
                />
              </View>
              <View>
                <Text className="text-xs text-gray-500 mb-1">Nome Fantasia</Text>
                <TextInput
                  className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-3"
                  placeholder="Nome comercial (opcional)"
                  value={pjFormData.nome_fantasia}
                  onChangeText={(v) => setPJFormData({ ...pjFormData, nome_fantasia: v })}
                />
              </View>
              <View className="flex-row items-center justify-between">
                <Text className="font-medium text-gray-900">Ativo</Text>
                <Switch
                  value={pjFormData.is_active}
                  onValueChange={(v) => setPJFormData({ ...pjFormData, is_active: v })}
                  trackColor={{ false: '#D1D5DB', true: '#5EEAD4' }}
                  thumbColor={pjFormData.is_active ? '#0D9488' : '#9CA3AF'}
                />
              </View>
              <TouchableOpacity
                onPress={handleSavePJSource}
                className="bg-teal-600 py-4 rounded-xl items-center mt-4"
              >
                <Text className="text-white font-bold">Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Fator R Mode Modal */}
      <Modal visible={showFatorRModeModal} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl">
            <View className="flex-row justify-between items-center p-4 border-b border-gray-100">
              <Text className="font-bold text-lg">Como calcular o Fator R?</Text>
              <TouchableOpacity onPress={() => setShowFatorRModeModal(false)}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <View className="p-4">
              {[
                { value: 'auto', label: 'Automatico', desc: 'Informar folha de pagamento mensal' },
                { value: 'manual', label: 'Manual', desc: 'Escolher anexo diretamente' },
              ].map((mode) => (
                <TouchableOpacity
                  key={mode.value}
                  onPress={() => {
                    setFormData({ ...formData, simples_fator_r_mode: mode.value as SimplesFatorRMode });
                    setShowFatorRModeModal(false);
                  }}
                  className={`p-4 mb-2 rounded-lg flex-row items-center justify-between ${
                    formData.simples_fator_r_mode === mode.value
                      ? 'bg-blue-50 border border-blue-200'
                      : 'bg-gray-50'
                  }`}
                >
                  <View>
                    <Text className={formData.simples_fator_r_mode === mode.value ? 'text-blue-700 font-medium' : 'text-gray-700'}>
                      {mode.label}
                    </Text>
                    <Text className="text-xs text-gray-500">{mode.desc}</Text>
                  </View>
                  {formData.simples_fator_r_mode === mode.value && <Check size={20} color="#2563EB" />}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Anexo Modal */}
      <Modal visible={showAnexoModal} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl">
            <View className="flex-row justify-between items-center p-4 border-b border-gray-100">
              <Text className="font-bold text-lg">Anexo do Simples</Text>
              <TouchableOpacity onPress={() => setShowAnexoModal(false)}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <View className="p-4">
              {[
                { value: 'anexo_iii', label: 'Anexo III', desc: 'Fator R >= 28% (aliquotas de 6% a 33%)' },
                { value: 'anexo_v', label: 'Anexo V', desc: 'Fator R < 28% (aliquotas de 15,5% a 30,5%)' },
              ].map((anexo) => (
                <TouchableOpacity
                  key={anexo.value}
                  onPress={() => {
                    setFormData({ ...formData, simples_anexo: anexo.value as SimplesAnexo });
                    setShowAnexoModal(false);
                  }}
                  className={`p-4 mb-2 rounded-lg flex-row items-center justify-between ${
                    formData.simples_anexo === anexo.value
                      ? 'bg-blue-50 border border-blue-200'
                      : 'bg-gray-50'
                  }`}
                >
                  <View>
                    <Text className={formData.simples_anexo === anexo.value ? 'text-blue-700 font-medium' : 'text-gray-700'}>
                      {anexo.label}
                    </Text>
                    <Text className="text-xs text-gray-500">{anexo.desc}</Text>
                  </View>
                  {formData.simples_anexo === anexo.value && <Check size={20} color="#2563EB" />}
                </TouchableOpacity>
              ))}
              <Text className="text-xs text-gray-500 text-center mt-2">
                Consulte seu contador para confirmar o anexo correto.
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
