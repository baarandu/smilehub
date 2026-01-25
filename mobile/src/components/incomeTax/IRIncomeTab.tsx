import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  Switch,
  Alert,
  FlatList,
  RefreshControl,
} from 'react-native';
import {
  Search,
  Edit2,
  User,
  Building2,
  AlertCircle,
  X,
  Check,
} from 'lucide-react-native';
import { incomeTaxService } from '../../services/incomeTax';
import type { TransactionWithIR, PJSource, PayerFormData } from '../../types/incomeTax';

interface Props {
  transactions: TransactionWithIR[];
  pjSources: PJSource[];
  onTransactionUpdated: () => void;
  refreshing?: boolean;
  onRefresh?: () => void;
}

const formatCurrency = (value: number) => {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatDate = (dateStr: string) => {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}`;
};

const applyCPFMask = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
};

const applyCurrencyMask = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  const numValue = parseInt(digits) / 100;
  return numValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export function IRIncomeTab({ transactions, pjSources, onTransactionUpdated, refreshing, onRefresh }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyIncomplete, setShowOnlyIncomplete] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<TransactionWithIR | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showPJPicker, setShowPJPicker] = useState(false);
  const [patientCpf, setPatientCpf] = useState('');
  const [formData, setFormData] = useState<PayerFormData>({
    payer_is_patient: true,
    payer_name: '',
    payer_cpf: '',
    payer_type: 'PF',
    pj_source_id: '',
    irrf_amount: '',
  });

  const filteredTransactions = useMemo(() => {
    let result = transactions;

    // Filter incomplete
    if (showOnlyIncomplete) {
      result = result.filter((t) => {
        if (t.payer_type === 'PF' || t.payer_is_patient) {
          return !t.payer_cpf && !t.patient?.cpf;
        }
        if (t.payer_type === 'PJ') {
          return !t.pj_source_id;
        }
        return false;
      });
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (t) =>
          t.description.toLowerCase().includes(term) ||
          t.patient?.name?.toLowerCase().includes(term) ||
          t.payer_name?.toLowerCase().includes(term)
      );
    }

    return result;
  }, [transactions, searchTerm, showOnlyIncomplete]);

  const summaries = useMemo(() => {
    const pfTotal = transactions
      .filter((t) => t.payer_type === 'PF' || (!t.pj_source_id && t.payer_is_patient))
      .reduce((sum, t) => sum + t.amount, 0);

    const pjTotal = transactions
      .filter((t) => t.payer_type === 'PJ' || !!t.pj_source_id)
      .reduce((sum, t) => sum + t.amount, 0);

    const irrfTotal = transactions.reduce((sum, t) => sum + (t.irrf_amount || 0), 0);

    const incompleteCount = transactions.filter((t) => {
      if (t.payer_type === 'PF' || t.payer_is_patient) {
        return !t.payer_cpf && !t.patient?.cpf;
      }
      if (t.payer_type === 'PJ') {
        return !t.pj_source_id;
      }
      return false;
    }).length;

    return { pfTotal, pjTotal, irrfTotal, incompleteCount };
  }, [transactions]);

  const openEditModal = (transaction: TransactionWithIR) => {
    setEditingTransaction(transaction);
    setFormData({
      payer_is_patient: transaction.payer_is_patient,
      payer_name: transaction.payer_name || '',
      payer_cpf: transaction.payer_cpf || '',
      payer_type: transaction.payer_type || 'PF',
      pj_source_id: transaction.pj_source_id || '',
      irrf_amount:
        transaction.irrf_amount > 0
          ? transaction.irrf_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
          : '',
    });
    setPatientCpf(transaction.patient?.cpf || '');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!editingTransaction) return;

    if (formData.payer_type === 'PF' && !formData.payer_is_patient) {
      if (!formData.payer_name || !formData.payer_cpf) {
        Alert.alert('Erro', 'Nome e CPF do pagador são obrigatórios');
        return;
      }
    }

    if (formData.payer_type === 'PJ' && !formData.pj_source_id) {
      Alert.alert('Erro', 'Selecione a fonte pagadora PJ');
      return;
    }

    try {
      await incomeTaxService.updateTransactionPayerFields(editingTransaction.id, formData);

      // If patient is the payer and CPF was updated, also update patient record
      if (formData.payer_is_patient && editingTransaction.patient && patientCpf) {
        const originalCpf = editingTransaction.patient.cpf || '';
        if (patientCpf !== originalCpf) {
          await incomeTaxService.updatePatientCPF(editingTransaction.patient_id!, patientCpf);
          Alert.alert('Sucesso', 'Dados do pagador e cadastro do paciente atualizados');
        } else {
          Alert.alert('Sucesso', 'Dados do pagador atualizados');
        }
      } else {
        Alert.alert('Sucesso', 'Dados do pagador atualizados');
      }

      setShowModal(false);
      setEditingTransaction(null);
      onTransactionUpdated();
    } catch (error) {
      Alert.alert('Erro', 'Falha ao atualizar');
    }
  };

  const getPayerInfo = (t: TransactionWithIR) => {
    if (t.pj_source_id && t.pj_source) {
      return {
        type: 'PJ',
        name: t.pj_source.nome_fantasia || t.pj_source.razao_social,
        document: t.pj_source.cnpj,
      };
    }

    if (t.payer_is_patient && t.patient) {
      return {
        type: 'PF',
        name: t.patient.name,
        document: t.patient.cpf || null,
      };
    }

    return {
      type: t.payer_type || 'PF',
      name: t.payer_name || null,
      document: t.payer_cpf || null,
    };
  };

  const selectedPJSource = pjSources.find((s) => s.id === formData.pj_source_id);

  const renderTransaction = ({ item: t }: { item: TransactionWithIR }) => {
    const payerInfo = getPayerInfo(t);
    const hasIssue = !payerInfo.document || !payerInfo.name;

    return (
      <TouchableOpacity
        onPress={() => openEditModal(t)}
        className="bg-white p-4 mb-2 rounded-xl border border-gray-100"
      >
        <View className="flex-row justify-between items-start mb-2">
          <View className="flex-1">
            <Text className="font-medium text-gray-900" numberOfLines={1}>
              {t.description}
            </Text>
            <Text className="text-xs text-gray-500">{formatDate(t.date)}</Text>
          </View>
          <Text className="font-bold text-[#a03f3d]">{formatCurrency(t.amount)}</Text>
        </View>

        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            <View
              className={`px-2 py-1 rounded-lg mr-2 flex-row items-center ${payerInfo.type === 'PJ' ? 'bg-blue-100' : 'bg-gray-100'}`}
            >
              {payerInfo.type === 'PJ' ? (
                <Building2 size={12} color="#2563EB" />
              ) : (
                <User size={12} color="#6B7280" />
              )}
              <Text
                className={`text-xs ml-1 font-medium ${payerInfo.type === 'PJ' ? 'text-blue-700' : 'text-gray-600'}`}
              >
                {payerInfo.type}
              </Text>
            </View>

            <Text className="text-sm text-gray-700 flex-1" numberOfLines={1}>
              {payerInfo.name || 'Não informado'}
            </Text>

            {hasIssue && <AlertCircle size={16} color="#F59E0B" />}
          </View>

          <Edit2 size={16} color="#9CA3AF" />
        </View>

        {t.irrf_amount > 0 && (
          <Text className="text-xs text-purple-600 mt-1">IRRF: {formatCurrency(t.irrf_amount)}</Text>
        )}
      </TouchableOpacity>
    );
  };

  const ListHeader = () => (
    <View>
      {/* Summary Cards */}
      <View className="flex-row gap-2 mb-4">
        <View className="flex-1 bg-white p-3 rounded-xl border border-gray-100">
          <Text className="text-xs text-gray-500">Receita PF</Text>
          <Text className="font-bold text-[#a03f3d]">{formatCurrency(summaries.pfTotal)}</Text>
        </View>
        <View className="flex-1 bg-white p-3 rounded-xl border border-gray-100">
          <Text className="text-xs text-gray-500">Receita PJ</Text>
          <Text className="font-bold text-blue-600">{formatCurrency(summaries.pjTotal)}</Text>
        </View>
        <View className="flex-1 bg-white p-3 rounded-xl border border-gray-100">
          <Text className="text-xs text-gray-500">IRRF</Text>
          <Text className="font-bold text-purple-600">{formatCurrency(summaries.irrfTotal)}</Text>
        </View>
      </View>

      {summaries.incompleteCount > 0 && (
        <TouchableOpacity
          onPress={() => setShowOnlyIncomplete(!showOnlyIncomplete)}
          className={`p-3 rounded-xl border mb-4 flex-row items-center justify-between ${showOnlyIncomplete ? 'bg-amber-100 border-amber-400' : 'bg-amber-50 border-amber-200'}`}
        >
          <View className="flex-row items-center flex-1">
            <AlertCircle size={18} color="#D97706" />
            <Text className="text-amber-800 ml-2 text-sm flex-1">
              {showOnlyIncomplete
                ? `Mostrando ${summaries.incompleteCount} receita(s) incompleta(s)`
                : `${summaries.incompleteCount} receita(s) com dados incompletos`}
            </Text>
          </View>
          <Text className="text-amber-700 text-xs font-medium">
            {showOnlyIncomplete ? 'Ver todas' : 'Filtrar'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Search */}
      <View className="flex-row items-center bg-white rounded-xl border border-gray-200 px-3 mb-4">
        <Search size={18} color="#9CA3AF" />
        <TextInput
          className="flex-1 py-3 ml-2"
          placeholder="Buscar receitas..."
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </View>
    </View>
  );

  return (
    <View className="flex-1">
      <FlatList
        data={filteredTransactions}
        keyExtractor={(item) => item.id}
        renderItem={renderTransaction}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          <Text className="text-center text-gray-500 py-8">Nenhuma receita encontrada</Text>
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={refreshing || false} onRefresh={onRefresh} colors={['#b94a48']} />
          ) : undefined
        }
      />

      {/* Edit Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl max-h-[80%]">
            <View className="flex-row justify-between items-center p-4 border-b border-gray-100">
              <Text className="font-bold text-lg">Dados do Pagador</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View className="p-4">
              {editingTransaction && (
                <View className="bg-gray-50 p-3 rounded-lg mb-4">
                  <Text className="font-medium">{editingTransaction.description}</Text>
                  <Text className="text-sm text-gray-500">
                    {formatDate(editingTransaction.date)} - {formatCurrency(editingTransaction.amount)}
                  </Text>
                </View>
              )}

              {/* Payer Type Selection */}
              <Text className="text-xs text-gray-500 mb-2">Tipo de Pagador</Text>
              <View className="flex-row gap-2 mb-4">
                <TouchableOpacity
                  onPress={() => setFormData({ ...formData, payer_type: 'PF', pj_source_id: '' })}
                  className={`flex-1 flex-row items-center justify-center py-3 rounded-lg border ${formData.payer_type === 'PF' ? 'bg-[#a03f3d] border-[#a03f3d]' : 'border-gray-200'}`}
                >
                  <User size={18} color={formData.payer_type === 'PF' ? 'white' : '#6B7280'} />
                  <Text
                    className={`ml-2 font-medium ${formData.payer_type === 'PF' ? 'text-white' : 'text-gray-700'}`}
                  >
                    Pessoa Física
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    setFormData({ ...formData, payer_type: 'PJ', payer_is_patient: false })
                  }
                  className={`flex-1 flex-row items-center justify-center py-3 rounded-lg border ${formData.payer_type === 'PJ' ? 'bg-[#a03f3d] border-[#a03f3d]' : 'border-gray-200'}`}
                >
                  <Building2 size={18} color={formData.payer_type === 'PJ' ? 'white' : '#6B7280'} />
                  <Text
                    className={`ml-2 font-medium ${formData.payer_type === 'PJ' ? 'text-white' : 'text-gray-700'}`}
                  >
                    Pessoa Jurídica
                  </Text>
                </TouchableOpacity>
              </View>

              {/* PF Fields */}
              {formData.payer_type === 'PF' && (
                <>
                  {editingTransaction?.patient && (
                    <View className="flex-row items-center justify-between bg-gray-50 p-3 rounded-lg mb-4">
                      <View>
                        <Text className="font-medium">Paciente é o pagador</Text>
                        <Text className="text-xs text-gray-500">
                          {editingTransaction.patient.name}
                        </Text>
                      </View>
                      <Switch
                        value={formData.payer_is_patient}
                        onValueChange={(v) => setFormData({ ...formData, payer_is_patient: v })}
                        trackColor={{ false: '#D1D5DB', true: '#D1D5DB' }}
                        thumbColor={formData.payer_is_patient ? '#a03f3d' : '#9CA3AF'}
                      />
                    </View>
                  )}

                  {!formData.payer_is_patient && (
                    <>
                      <View className="mb-3">
                        <Text className="text-xs text-gray-500 mb-1">Nome do Pagador</Text>
                        <TextInput
                          className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-3"
                          placeholder="Nome completo"
                          value={formData.payer_name}
                          onChangeText={(v) => setFormData({ ...formData, payer_name: v })}
                        />
                      </View>
                      <View className="mb-4">
                        <Text className="text-xs text-gray-500 mb-1">CPF do Pagador</Text>
                        <TextInput
                          className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-3"
                          placeholder="000.000.000-00"
                          value={formData.payer_cpf}
                          onChangeText={(v) => setFormData({ ...formData, payer_cpf: applyCPFMask(v) })}
                          keyboardType="numeric"
                        />
                      </View>
                    </>
                  )}

                  {formData.payer_is_patient && editingTransaction?.patient && (
                    <View className="mb-4">
                      <Text className="text-xs text-gray-500 mb-1">CPF do Paciente</Text>
                      {!editingTransaction.patient.cpf ? (
                        <>
                          <View className="bg-amber-50 border border-amber-200 rounded-lg p-2 mb-2 flex-row items-center">
                            <AlertCircle size={14} color="#D97706" />
                            <Text className="text-xs text-amber-700 ml-2 flex-1">
                              CPF não cadastrado - preencha para atualizar o cadastro
                            </Text>
                          </View>
                          <TextInput
                            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-3"
                            placeholder="000.000.000-00"
                            value={patientCpf}
                            onChangeText={(v) => setPatientCpf(applyCPFMask(v))}
                            keyboardType="numeric"
                          />
                        </>
                      ) : (
                        <View className="bg-gray-50 p-3 rounded-lg">
                          <Text className="text-sm font-mono">{editingTransaction.patient.cpf}</Text>
                        </View>
                      )}
                    </View>
                  )}
                </>
              )}

              {/* PJ Fields */}
              {formData.payer_type === 'PJ' && (
                <>
                  <View className="mb-3">
                    <Text className="text-xs text-gray-500 mb-1">Fonte Pagadora (Convênio)</Text>
                    <TouchableOpacity
                      onPress={() => setShowPJPicker(true)}
                      className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-3"
                    >
                      <Text className={selectedPJSource ? 'text-gray-900' : 'text-gray-400'}>
                        {selectedPJSource
                          ? selectedPJSource.nome_fantasia || selectedPJSource.razao_social
                          : 'Selecione a fonte PJ'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View className="mb-4">
                    <Text className="text-xs text-gray-500 mb-1">IRRF Retido</Text>
                    <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-lg px-3">
                      <Text className="text-gray-500">R$</Text>
                      <TextInput
                        className="flex-1 py-3 ml-2"
                        placeholder="0,00"
                        value={formData.irrf_amount}
                        onChangeText={(v) =>
                          setFormData({ ...formData, irrf_amount: applyCurrencyMask(v) })
                        }
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                </>
              )}

              <TouchableOpacity
                onPress={handleSave}
                className="bg-[#a03f3d] py-4 rounded-xl items-center"
              >
                <Text className="text-white font-bold">Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* PJ Source Picker Modal */}
      <Modal visible={showPJPicker} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl max-h-[60%]">
            <View className="flex-row justify-between items-center p-4 border-b border-gray-100">
              <Text className="font-bold text-lg">Selecione a Fonte PJ</Text>
              <TouchableOpacity onPress={() => setShowPJPicker(false)}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <View className="p-4">
              {pjSources.filter((s) => s.is_active).length === 0 ? (
                <Text className="text-center text-gray-500 py-4">
                  Nenhuma fonte PJ cadastrada. Adicione nas configurações.
                </Text>
              ) : (
                pjSources
                  .filter((s) => s.is_active)
                  .map((source) => (
                    <TouchableOpacity
                      key={source.id}
                      onPress={() => {
                        setFormData({ ...formData, pj_source_id: source.id });
                        setShowPJPicker(false);
                      }}
                      className={`p-4 mb-2 rounded-lg flex-row items-center justify-between ${formData.pj_source_id === source.id ? 'bg-[#fef2f2] border border-[#fca5a5]' : 'bg-gray-50'}`}
                    >
                      <View>
                        <Text
                          className={
                            formData.pj_source_id === source.id
                              ? 'text-[#8b3634] font-medium'
                              : 'text-gray-700'
                          }
                        >
                          {source.nome_fantasia || source.razao_social}
                        </Text>
                        <Text className="text-xs text-gray-500">{source.cnpj}</Text>
                      </View>
                      {formData.pj_source_id === source.id && <Check size={20} color="#b94a48" />}
                    </TouchableOpacity>
                  ))
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
