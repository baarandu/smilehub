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
  Check,
  X as XIcon,
  AlertCircle,
  FileText,
} from 'lucide-react-native';
import { incomeTaxService } from '../../services/incomeTax';
import type { TransactionWithIR, SupplierFormData } from '../../types/incomeTax';

interface Props {
  transactions: TransactionWithIR[];
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

const applyCPFCNPJMask = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 11) {
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  } else {
    const cnpjDigits = digits.slice(0, 14);
    if (cnpjDigits.length <= 2) return cnpjDigits;
    if (cnpjDigits.length <= 5) return `${cnpjDigits.slice(0, 2)}.${cnpjDigits.slice(2)}`;
    if (cnpjDigits.length <= 8)
      return `${cnpjDigits.slice(0, 2)}.${cnpjDigits.slice(2, 5)}.${cnpjDigits.slice(5)}`;
    if (cnpjDigits.length <= 12)
      return `${cnpjDigits.slice(0, 2)}.${cnpjDigits.slice(2, 5)}.${cnpjDigits.slice(5, 8)}/${cnpjDigits.slice(8)}`;
    return `${cnpjDigits.slice(0, 2)}.${cnpjDigits.slice(2, 5)}.${cnpjDigits.slice(5, 8)}/${cnpjDigits.slice(8, 12)}-${cnpjDigits.slice(12)}`;
  }
};

export function IRExpensesTab({ transactions, onTransactionUpdated, refreshing, onRefresh }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingTransaction, setEditingTransaction] = useState<TransactionWithIR | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<SupplierFormData>({
    supplier_name: '',
    supplier_cpf_cnpj: '',
    receipt_number: '',
    is_deductible: false,
  });

  const filteredTransactions = useMemo(() => {
    if (!searchTerm) return transactions;
    const term = searchTerm.toLowerCase();
    return transactions.filter(
      (t) =>
        t.description.toLowerCase().includes(term) ||
        t.supplier_name?.toLowerCase().includes(term) ||
        t.category?.toLowerCase().includes(term)
    );
  }, [transactions, searchTerm]);

  const summaries = useMemo(() => {
    const totalExpenses = transactions.reduce((sum, t) => sum + t.amount, 0);
    const deductibleTotal = transactions
      .filter((t) => t.is_deductible)
      .reduce((sum, t) => sum + t.amount, 0);
    const incompleteCount = transactions.filter(
      (t) => t.is_deductible && (!t.supplier_name || !t.receipt_number)
    ).length;

    return { totalExpenses, deductibleTotal, incompleteCount };
  }, [transactions]);

  const openEditModal = (transaction: TransactionWithIR) => {
    setEditingTransaction(transaction);
    setFormData({
      supplier_name: transaction.supplier_name || '',
      supplier_cpf_cnpj: transaction.supplier_cpf_cnpj || '',
      receipt_number: transaction.receipt_number || '',
      is_deductible: transaction.is_deductible,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!editingTransaction) return;

    if (formData.is_deductible && !formData.supplier_name) {
      Alert.alert('Erro', 'Nome do fornecedor e obrigatorio para despesas dedutiveis');
      return;
    }

    try {
      await incomeTaxService.updateTransactionSupplierFields(editingTransaction.id, formData);
      setShowModal(false);
      setEditingTransaction(null);
      onTransactionUpdated();
      Alert.alert('Sucesso', 'Dados da despesa atualizados');
    } catch (error) {
      Alert.alert('Erro', 'Falha ao atualizar');
    }
  };

  const renderTransaction = ({ item: t }: { item: TransactionWithIR }) => {
    const hasIssue = t.is_deductible && (!t.supplier_name || !t.receipt_number);

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
            <View className="flex-row items-center mt-1">
              <Text className="text-xs text-gray-500">{formatDate(t.date)}</Text>
              <View className="mx-2 w-1 h-1 bg-gray-300 rounded-full" />
              <Text className="text-xs text-gray-500">{t.category}</Text>
            </View>
          </View>
          <Text className="font-bold text-[#a03f3d]">{formatCurrency(t.amount)}</Text>
        </View>

        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            {t.is_deductible ? (
              <View className="bg-green-100 px-2 py-1 rounded-lg flex-row items-center mr-2">
                <Check size={12} color="#16A34A" />
                <Text className="text-xs text-green-700 ml-1 font-medium">Dedutivel</Text>
              </View>
            ) : (
              <View className="bg-gray-100 px-2 py-1 rounded-lg mr-2">
                <Text className="text-xs text-gray-500">Nao dedutivel</Text>
              </View>
            )}

            {t.supplier_name && (
              <Text className="text-sm text-gray-600 flex-1" numberOfLines={1}>
                {t.supplier_name}
              </Text>
            )}

            {t.receipt_number && (
              <FileText size={14} color="#16A34A" style={{ marginLeft: 4 }} />
            )}

            {hasIssue && <AlertCircle size={16} color="#F59E0B" style={{ marginLeft: 4 }} />}
          </View>

          <Edit2 size={16} color="#9CA3AF" />
        </View>
      </TouchableOpacity>
    );
  };

  const ListHeader = () => (
    <View>
      {/* Summary Cards */}
      <View className="flex-row gap-2 mb-4">
        <View className="flex-1 bg-white p-3 rounded-xl border border-gray-100">
          <Text className="text-xs text-gray-500">Total Despesas</Text>
          <Text className="font-bold text-[#a03f3d]">{formatCurrency(summaries.totalExpenses)}</Text>
        </View>
        <View className="flex-1 bg-white p-3 rounded-xl border border-gray-100">
          <Text className="text-xs text-gray-500">Dedutiveis</Text>
          <Text className="font-bold text-green-600">{formatCurrency(summaries.deductibleTotal)}</Text>
        </View>
      </View>

      {summaries.incompleteCount > 0 && (
        <View className="bg-amber-50 p-3 rounded-xl border border-amber-200 mb-4 flex-row items-center">
          <AlertCircle size={18} color="#D97706" />
          <Text className="text-amber-800 ml-2 text-sm">
            {summaries.incompleteCount} despesa(s) dedutivel(is) com dados incompletos
          </Text>
        </View>
      )}

      {/* Search */}
      <View className="flex-row items-center bg-white rounded-xl border border-gray-200 px-3 mb-4">
        <Search size={18} color="#9CA3AF" />
        <TextInput
          className="flex-1 py-3 ml-2"
          placeholder="Buscar despesas..."
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </View>
    </View>
  );

  return (
    <View className="flex-1">
      {/* Transactions List */}
      <FlatList
        data={filteredTransactions}
        keyExtractor={(item) => item.id}
        renderItem={renderTransaction}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          <Text className="text-center text-gray-500 py-8">Nenhuma despesa encontrada</Text>
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing || false}
              onRefresh={onRefresh}
              colors={['#b94a48']}
              tintColor="#b94a48"
            />
          ) : undefined
        }
      />

      {/* Edit Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl">
            <View className="flex-row justify-between items-center p-4 border-b border-gray-100">
              <Text className="font-bold text-lg">Dados da Despesa</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <XIcon size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View className="p-4">
              {editingTransaction && (
                <View className="bg-gray-50 p-3 rounded-lg mb-4">
                  <Text className="font-medium">{editingTransaction.description}</Text>
                  <Text className="text-sm text-gray-500">
                    {formatDate(editingTransaction.date)} -{' '}
                    {formatCurrency(editingTransaction.amount)}
                  </Text>
                  <Text className="text-xs text-gray-500 mt-1">
                    Categoria: {editingTransaction.category}
                  </Text>
                </View>
              )}

              {/* Deductible Toggle */}
              <View className="flex-row items-center justify-between bg-gray-50 p-4 rounded-lg mb-4">
                <View>
                  <Text className="font-medium text-gray-900">Despesa Dedutivel</Text>
                  <Text className="text-xs text-gray-500">Pode ser abatida no IR</Text>
                </View>
                <Switch
                  value={formData.is_deductible}
                  onValueChange={(v) => setFormData({ ...formData, is_deductible: v })}
                  trackColor={{ false: '#D1D5DB', true: '#86EFAC' }}
                  thumbColor={formData.is_deductible ? '#16A34A' : '#9CA3AF'}
                />
              </View>

              {/* Supplier Fields */}
              <View className="mb-3">
                <Text className="text-xs text-gray-500 mb-1">
                  Nome do Fornecedor {formData.is_deductible && '*'}
                </Text>
                <TextInput
                  className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-3"
                  placeholder="Nome ou Razao Social"
                  value={formData.supplier_name}
                  onChangeText={(v) => setFormData({ ...formData, supplier_name: v })}
                />
              </View>

              <View className="mb-3">
                <Text className="text-xs text-gray-500 mb-1">CPF/CNPJ do Fornecedor</Text>
                <TextInput
                  className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-3"
                  placeholder="000.000.000-00 ou 00.000.000/0000-00"
                  value={formData.supplier_cpf_cnpj}
                  onChangeText={(v) =>
                    setFormData({ ...formData, supplier_cpf_cnpj: applyCPFCNPJMask(v) })
                  }
                  keyboardType="numeric"
                />
              </View>

              <View className="mb-4">
                <Text className="text-xs text-gray-500 mb-1">Numero do Comprovante</Text>
                <TextInput
                  className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-3"
                  placeholder="Numero da NF ou recibo"
                  value={formData.receipt_number}
                  onChangeText={(v) => setFormData({ ...formData, receipt_number: v })}
                />
              </View>

              {formData.is_deductible && (
                <View className="bg-[#fef2f2] p-3 rounded-lg mb-4 border border-[#fca5a5]">
                  <Text className="text-sm text-[#6b2a28]">
                    <Text className="font-bold">Dica:</Text> Guarde os comprovantes por 5 anos.
                  </Text>
                </View>
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
    </View>
  );
}
