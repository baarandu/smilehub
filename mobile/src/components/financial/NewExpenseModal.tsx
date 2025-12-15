import { View, Text, Modal, TouchableOpacity, ScrollView, TextInput, Switch, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { X, Calendar, DollarSign, Tag, FileText, CreditCard, Layers, Trash, Check, AlertCircle } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import { financialService } from '../../services/financial';
import { FinancialTransaction } from '../../types/database';

interface NewExpenseModalProps {
    visible: boolean;
    onClose: () => void;
    onSave: () => void;
    transactionToEdit?: FinancialTransaction | null;
}

type ExpenseCategory = 'Materiais' | 'Laboratório' | 'Manutenção' | 'Aluguel/Condomínio' | 'Impostos' | 'Marketing' | 'Pessoal' | 'Outros';
const CATEGORIES: string[] = [
    'Materiais',
    'Laboratório',
    'Manutenção',
    'Aluguel/Condomínio',
    'Impostos',
    'Marketing',
    'Pessoal',
    'Outros'
];

type PaymentMethod = 'Cartão de Crédito' | 'Cartão de Débito' | 'Pix' | 'Dinheiro' | 'Boleto' | 'Transferência';
const PAYMENT_METHODS: PaymentMethod[] = ['Cartão de Crédito', 'Cartão de Débito', 'Pix', 'Dinheiro', 'Boleto', 'Transferência'];

interface InstallmentItem {
    id: number;
    date: string;
    value: string; // Formatted currency string
    rawValue: number;
}

// Simple UUID generator
const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

export function NewExpenseModal({ visible, onClose, onSave, transactionToEdit }: NewExpenseModalProps) {
    const [loading, setLoading] = useState(false);

    // Form State
    const [description, setDescription] = useState('');
    const [date, setDate] = useState(''); // DD/MM/YYYY
    const [category, setCategory] = useState<string>('Outros');
    const [value, setValue] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Pix');
    const [observations, setObservations] = useState('');

    // Installments
    const [isInstallment, setIsInstallment] = useState(false);
    const [numInstallmentsStr, setNumInstallmentsStr] = useState('2');
    const [installmentList, setInstallmentList] = useState<InstallmentItem[]>([]);

    // Edit Mode State
    const [updateAllRecurring, setUpdateAllRecurring] = useState(false);

    useEffect(() => {

        if (visible) {
            if (transactionToEdit) {
                const fullDesc = transactionToEdit.description;
                let rawDesc = fullDesc;
                let obs = '';

                // Try to extract Observations first (suffix " - ...")
                // We look for the LAST occurrence of " - " to be safe, or just split by " - " if we assume structure.
                // Our save structure: `${description} (${paymentMethod}) ... - ${observations}`
                // Let's rely on the " - " separator.
                if (fullDesc.includes(' - ')) {
                    const parts = fullDesc.split(' - ');
                    // Improve safety: The observations is likely the last part.
                    // But if description has " - " inside it, this gets tricky.
                    // However, we append " - " at the very end.
                    // For now, let's assume the last part is observations if we put it there.
                    // ACTUALLY, simpler:
                    // We know the pattern includes properties in parens before the dash.

                    // Let's try to match the known structure
                    // Regex: /^(.*?) \((.*?)\)(?: \(\d+\/\d+\))?(?: - (.*))?$/
                    // Group 1: Description
                    // Group 2: Payment Method
                    // Group 3: Observations

                    const match = fullDesc.match(/^(.*?) \((.*?)\)(?: \(\d+\/\d+\))?(?: - (.*))?$/);
                    if (match) {
                        rawDesc = match[1];
                        // match[2] is payment method
                        if (match[3]) {
                            obs = match[3];
                        }
                    } else {
                        // Fallback logic if regex fails (legacy data?)
                        const split = fullDesc.split(' - ');
                        if (split.length > 1) {
                            obs = split.pop() || '';
                            rawDesc = split.join(' - ');
                        }
                        // Clean up method from rawDesc if still there
                        if (rawDesc.includes(' (')) {
                            rawDesc = rawDesc.split(' (')[0];
                        }
                    }
                } else {
                    // No observations separator, just clean valid method
                    if (rawDesc.includes(' (')) {
                        rawDesc = rawDesc.split(' (')[0];
                    }
                }

                setDescription(rawDesc);

                const tDate = new Date(transactionToEdit.date);
                tDate.setMinutes(tDate.getMinutes() + tDate.getTimezoneOffset()); // Fix UTC offset for display
                const d = String(tDate.getDate()).padStart(2, '0');
                const m = String(tDate.getMonth() + 1).padStart(2, '0');
                const y = tDate.getFullYear();
                setDate(`${d}/${m}/${y}`);

                setCategory(transactionToEdit.category || 'Outros');
                setValue(formatCurrency(transactionToEdit.amount));

                // Extract Payment Method strictly from brackets
                const foundMethod = PAYMENT_METHODS.find(pm => transactionToEdit.description.includes(`(${pm})`));
                if (foundMethod) setPaymentMethod(foundMethod);

                setObservations(obs);

                setIsInstallment(false);
                setUpdateAllRecurring(false);
            } else {
                // Reset
                setDescription('');
                setDate('');
                setValue('');
                setObservations('');
                // Keep logic: if we want to "re-parcel", user must toggle it manually.
                // But initially, it's false unless we detect it's a recurrence (which we don't for now, we treat edit as single unless updated).
                // Wait, if it *is* a recurrence, we might want to load it?
                // For now, per requirement, "re-parceling" is an explicit action.
                // So we stick to single edit mode by default.

                setIsInstallment(false);
                setNumInstallmentsStr('2');
                setInstallmentList([]);
                setCategory('Outros');
                setPaymentMethod('Pix');
                setUpdateAllRecurring(false);
            }
        }
    }, [visible, transactionToEdit]);

    // Date Mask Helper
    const applyDateMask = (text: string) => {
        let cleaned = text.replace(/\D/g, '');
        if (cleaned.length > 8) cleaned = cleaned.slice(0, 8);

        let masked = cleaned;
        if (cleaned.length > 4) {
            masked = `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4)}`;
        } else if (cleaned.length > 2) {
            masked = `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
        }
        return masked;
    };

    const handleDateChange = (text: string) => {
        setDate(applyDateMask(text));
    };

    // Value Formatting Helper
    const formatCurrency = (val: number) => {
        return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const handleValueChange = (text: string) => {
        const rawValue = text.replace(/\D/g, '');
        const numberValue = Number(rawValue) / 100;
        setValue(formatCurrency(numberValue));
    };

    const getNumericValue = (currencyString: string) => {
        return Number(currencyString.replace(/\./g, '').replace(',', '.')) || 0;
    };

    // React to changes in base params to generate installment list
    useEffect(() => {
        // ALLOW generation if isInstallment is true, even if transactionToEdit exists (Re-parceling mode)
        if (!isInstallment) {
            setInstallmentList([]);
            return;
        }

        const count = parseInt(numInstallmentsStr) || 1;
        if (count < 2) return;

        const totalVal = getNumericValue(value);
        if (!date || date.length !== 10) return;

        const [day, month, year] = date.split('/').map(Number);
        if (!day || !month || !year) return;

        const baseDateObj = new Date(year, month - 1, day);
        const splitValue = totalVal / count;

        const newList: InstallmentItem[] = [];
        for (let i = 0; i < count; i++) {
            const nextDate = new Date(baseDateObj);
            nextDate.setMonth(nextDate.getMonth() + i);

            const d = String(nextDate.getDate()).padStart(2, '0');
            const m = String(nextDate.getMonth() + 1).padStart(2, '0');
            const y = nextDate.getFullYear();

            newList.push({
                id: i,
                date: `${d}/${m}/${y}`,
                value: formatCurrency(splitValue),
                rawValue: splitValue
            });
        }
        setInstallmentList(newList);

    }, [isInstallment, numInstallmentsStr, value, date]);


    // Handlers for individual installment edits
    const updateInstallment = (index: number, field: 'date' | 'value', text: string) => {
        const newList = [...installmentList];
        if (field === 'date') {
            newList[index].date = applyDateMask(text);
        } else {
            const raw = text.replace(/\D/g, '');
            const val = Number(raw) / 100;
            newList[index].value = formatCurrency(val);
            newList[index].rawValue = val;
        }
        setInstallmentList(newList);
    };

    const handleDelete = () => {
        if (!transactionToEdit) return;

        const performDelete = async (deleteRecurrence: boolean) => {
            setLoading(true);
            try {
                if (deleteRecurrence && transactionToEdit.recurrence_id) {
                    await financialService.deleteRecurrence(transactionToEdit.recurrence_id);
                } else {
                    await financialService.delete(transactionToEdit.id);
                }
                Alert.alert('Sucesso', 'Despesa excluída com sucesso!');
                onSave(); // Refresh list
                handleClose(); // Close modal and reset state
            } catch (error) {
                console.error('Error deleting expense:', error);
                Alert.alert('Erro', 'Erro ao excluir despesa');
            } finally {
                setLoading(false);
            }
        };

        if (transactionToEdit.recurrence_id) {
            Alert.alert(
                'Excluir Despesa Recorrente',
                'Deseja excluir apenas esta parcela ou todas as parcelas?',
                [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                        text: 'Apenas Esta',
                        onPress: () => performDelete(false)
                    },
                    {
                        text: 'Todas as Parcelas',
                        style: 'destructive',
                        onPress: () => performDelete(true)
                    }
                ]
            );
        } else {
            Alert.alert(
                'Confirmar Exclusão',
                'Tem certeza que deseja excluir esta despesa?',
                [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                        text: 'Excluir',
                        style: 'destructive',
                        onPress: () => performDelete(false)
                    }
                ]
            );
        }
    };

    const handleSave = async () => {
        if (!description) {
            Alert.alert('Erro', 'Informe a descrição.');
            return;
        }

        setLoading(true);
        try {
            // EDIT MODE
            if (transactionToEdit) {
                // SPECIAL CASE: Re-parceling (transforming single/recurrence into NEW recurrence)
                if (isInstallment) {
                    Alert.alert(
                        'Confirmar Re-parcelamento',
                        'Ao salvar, a despesa original será excluída e um novo parcelamento será criado. Deseja continuar?',
                        [
                            { text: 'Cancelar', style: 'cancel', onPress: () => setLoading(false) },
                            {
                                text: 'Continuar',
                                onPress: async () => {
                                    try {
                                        // 1. Delete Old
                                        if (transactionToEdit.recurrence_id) {
                                            await financialService.deleteRecurrence(transactionToEdit.recurrence_id);
                                        } else {
                                            await financialService.delete(transactionToEdit.id);
                                        }

                                        // 2. Create New Series
                                        const recurrenceId = generateUUID();
                                        const numInstallments = parseInt(numInstallmentsStr);
                                        const promises = [];

                                        for (let i = 0; i < installmentList.length; i++) {
                                            const item = installmentList[i];
                                            const [d, m, y] = item.date.split('/');
                                            const dbDate = `${y}-${m}-${d}`;

                                            let finalDesc = `${description} (${paymentMethod}) (${i + 1}/${numInstallments})`;
                                            if (observations) finalDesc += ` - ${observations}`;

                                            const roundedAmount = Number(item.rawValue.toFixed(2));

                                            promises.push(financialService.create({
                                                type: 'expense',
                                                amount: roundedAmount,
                                                description: finalDesc,
                                                category: category,
                                                date: dbDate,
                                                location: null,
                                                recurrence_id: recurrenceId
                                            }));
                                        }
                                        await Promise.all(promises);

                                        Alert.alert('Sucesso', 'Novo parcelamento criado!');
                                        onSave();
                                        handleClose();
                                    } catch (err) {
                                        console.error(err);
                                        Alert.alert('Erro', 'Falha ao re-parcelar.');
                                        setLoading(false);
                                    }
                                }
                            }
                        ]
                    );
                    return; // Stop here, wait for alert action
                }

                const [d, m, y] = date.split('/');
                const dbDate = `${y}-${m}-${d}`;

                // Reconstruct description
                let finalDesc = `${description} (${paymentMethod})`;

                if (updateAllRecurring && transactionToEdit.recurrence_id) {
                    // fetching all related
                    const allRecurrence = await financialService.getByRecurrenceId(transactionToEdit.recurrence_id);
                    const updatePromises = allRecurrence.map(t => {
                        // Preserve (x/y) suffix
                        // Regex looks for " (x/y)"
                        const indexMatch = t.description.match(/ \(\d+\/\d+\)/);
                        const indexSuffix = indexMatch ? indexMatch[0] : '';

                        // Construct new description
                        let newFullDesc = `${description} (${paymentMethod})${indexSuffix}`;
                        if (observations) newFullDesc += ` - ${observations}`;

                        return financialService.update(t.id, {
                            description: newFullDesc,
                            amount: getNumericValue(value),
                            category: category,
                            // date: t.date, // Preserve original date
                        });
                    });

                    await Promise.all(updatePromises);

                } else {
                    // Update Single
                    await financialService.update(transactionToEdit.id, {
                        description: finalDesc + (observations ? ` - ${observations}` : ''),
                        amount: getNumericValue(value),
                        date: dbDate,
                        category,
                    });
                }

                Alert.alert('Sucesso', 'Despesa atualizada!');
            }
            // CREATE MODE
            else {
                const promises = [];
                const recurrenceId = isInstallment ? generateUUID() : null;

                const numInstallments = isInstallment ? parseInt(numInstallmentsStr) : 1;

                if (!isInstallment) {
                    const [d, m, y] = date.split('/');
                    const dbDate = `${y}-${m}-${d}`;
                    const finalDesc = `${description} (${paymentMethod})` + (observations ? ` - ${observations}` : '');

                    promises.push(financialService.create({
                        type: 'expense',
                        amount: getNumericValue(value),
                        description: finalDesc,
                        category: category,
                        date: dbDate,
                        location: null,
                        recurrence_id: null
                    }));
                } else {
                    for (let i = 0; i < installmentList.length; i++) {
                        const item = installmentList[i];
                        const [d, m, y] = item.date.split('/');
                        const dbDate = `${y}-${m}-${d}`;

                        let finalDesc = `${description} (${paymentMethod}) (${i + 1}/${numInstallments})`;
                        if (observations) finalDesc += ` - ${observations}`;

                        const roundedAmount = Number(item.rawValue.toFixed(2));

                        promises.push(financialService.create({
                            type: 'expense',
                            amount: roundedAmount,
                            description: finalDesc,
                            category: category,
                            date: dbDate,
                            location: null,
                            recurrence_id: recurrenceId
                        }));
                    }
                }
                await Promise.all(promises);
                Alert.alert('Sucesso', 'Despesa salva com sucesso!');
            }

            onSave();
            handleClose();

        } catch (error) {
            console.error(error);
            Alert.alert('Erro', 'Não foi possível salvar a despesa.');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setDescription('');
        setDate('');
        setValue('');
        setObservations('');
        setIsInstallment(false);
        setNumInstallmentsStr('2');
        setInstallmentList([]);
        setCategory('Outros');
        setPaymentMethod('Pix');
        setUpdateAllRecurring(false);
        onClose();
    }

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View className="flex-1 justify-end bg-black/50">
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="bg-white rounded-t-3xl h-[95%]">
                    {/* Header */}
                    <View className="flex-row justify-between items-center p-4 border-b border-gray-100">
                        <Text className="text-xl font-bold text-gray-800">
                            {transactionToEdit ? 'Editar Despesa' : 'Nova Despesa'}
                        </Text>
                        <View className="flex-row gap-2">
                            {transactionToEdit && (
                                <TouchableOpacity onPress={handleDelete} className="bg-red-100 p-2 rounded-full">
                                    <Trash size={20} color="#EF4444" />
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity onPress={handleClose} className="bg-gray-100 p-2 rounded-full">
                                <X size={20} color="#374151" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
                        {transactionToEdit && transactionToEdit.recurrence_id && (
                            <View className="mb-4 bg-blue-50 p-3 rounded-xl border border-blue-100 flex-row items-center justify-between">
                                <View className="flex-row items-center gap-2 flex-1">
                                    <Layers size={20} color="#2563EB" />
                                    <View>
                                        <Text className="text-blue-800 font-bold">Despesa Parcelada</Text>
                                        <Text className="text-blue-600 text-xs text-wrap">
                                            Aplicar alterações a todas as parcelas?
                                            {'\n'}(Valor, Nome, Categoria)
                                        </Text>
                                    </View>
                                </View>
                                <Switch
                                    value={updateAllRecurring}
                                    onValueChange={setUpdateAllRecurring}
                                    trackColor={{ false: "#E5E7EB", true: "#93C5FD" }}
                                    thumbColor={updateAllRecurring ? "#2563EB" : "#F9FAFB"}
                                />
                            </View>
                        )}

                        {/* Description */}
                        <Text className="text-sm font-semibold text-gray-700 mb-2">Descrição / Nome</Text>
                        <TextInput
                            className="bg-gray-50 border border-gray-200 rounded-xl p-3 mb-4 text-base"
                            placeholder="Ex: Aluguel..."
                            value={description}
                            onChangeText={setDescription}
                        />

                        {/* Category */}
                        <Text className="text-sm font-semibold text-gray-700 mb-2">Categoria</Text>
                        <View className="flex-row flex-wrap gap-2 mb-4">
                            {CATEGORIES.map(cat => (
                                <TouchableOpacity
                                    key={cat}
                                    onPress={() => setCategory(cat)}
                                    className={`px-3 py-2 rounded-lg border flex-row items-center gap-2 ${category === cat ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}
                                >
                                    {category === cat && <Check size={14} color="#EF4444" />}
                                    <Text className={`text-xs ${category === cat ? 'text-red-700 font-medium' : 'text-gray-600'}`}>
                                        {cat}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Common Fields Row */}
                        {!isInstallment && (
                            <View className="flex-row gap-4 mb-4">
                                <View className="flex-1">
                                    <Text className="text-sm font-semibold text-gray-700 mb-2">Valor</Text>
                                    <TextInput
                                        className="bg-gray-50 border border-gray-200 rounded-xl p-3 font-semibold text-gray-900"
                                        placeholder="R$ 0,00"
                                        keyboardType="numeric"
                                        value={value}
                                        onChangeText={handleValueChange}
                                    />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-sm font-semibold text-gray-700 mb-2">Data</Text>
                                    <TextInput
                                        className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-900"
                                        placeholder="DD/MM/AAAA"
                                        keyboardType="numeric"
                                        maxLength={10}
                                        value={date}
                                        onChangeText={handleDateChange}
                                    />
                                </View>
                            </View>
                        )}

                        {/* Installments specific fields (Create Mode OR Re-parceling) */}
                        {isInstallment && (
                            <View className="flex-row gap-4 mb-4">
                                <View className="flex-1">
                                    <Text className="text-sm font-semibold text-gray-700 mb-2">Valor Total</Text>
                                    <TextInput
                                        className="bg-gray-50 border border-gray-200 rounded-xl p-3 font-semibold text-gray-900"
                                        placeholder="R$ 0,00"
                                        keyboardType="numeric"
                                        value={value}
                                        onChangeText={handleValueChange}
                                    />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-sm font-semibold text-gray-700 mb-2">1ª Vencimento</Text>
                                    <TextInput
                                        className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-900"
                                        placeholder="DD/MM/AAAA"
                                        keyboardType="numeric"
                                        maxLength={10}
                                        value={date}
                                        onChangeText={handleDateChange}
                                    />
                                </View>
                            </View>
                        )}

                        {/* Payment Method */}
                        <Text className="text-sm font-semibold text-gray-700 mb-2">Forma de Pagamento</Text>
                        <View className="flex-row flex-wrap gap-2 mb-6">
                            {PAYMENT_METHODS.map(method => (
                                <TouchableOpacity
                                    key={method}
                                    onPress={() => setPaymentMethod(method)}
                                    className={`px-3 py-2 rounded-lg border flex-row items-center gap-2 ${paymentMethod === method ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'}`}
                                >
                                    {paymentMethod === method && <Check size={14} color="#2563EB" />}
                                    <Text className={`text-xs ${paymentMethod === method ? 'text-blue-700 font-medium' : 'text-gray-600'}`}>
                                        {method}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Installments Toggle */}
                        {(!transactionToEdit || transactionToEdit) && (
                            <View className="flex-row justify-between items-center mb-4 bg-gray-50 p-3 rounded-xl border border-gray-100">
                                <View className="flex-row items-center gap-2">
                                    <CreditCard size={20} color="#4B5563" />
                                    <Text className="font-medium text-gray-700">
                                        {transactionToEdit ? 'Refazer Parcelamento?' : 'Pagamento Parcelado?'}
                                    </Text>
                                </View>
                                <Switch
                                    value={isInstallment}
                                    onValueChange={setIsInstallment}
                                    trackColor={{ false: "#E5E7EB", true: "#FECACA" }}
                                    thumbColor={isInstallment ? "#EF4444" : "#F9FAFB"}
                                />
                            </View>
                        )}

                        {/* Dynamic Installment List */}
                        {isInstallment && (
                            <View className="mb-6 bg-gray-50 p-3 rounded-xl border border-gray-100">
                                <View className="flex-row items-center justify-between mb-4">
                                    <Text className="text-sm font-semibold text-gray-700">Configurar Parcelas</Text>
                                    <View className="flex-row items-center gap-2">
                                        <Text className="text-xs text-gray-500">Qtd:</Text>
                                        <TextInput
                                            className="bg-white border border-gray-200 rounded-lg p-2 w-12 text-center text-sm"
                                            keyboardType="numeric"
                                            value={numInstallmentsStr}
                                            onChangeText={setNumInstallmentsStr}
                                            maxLength={2}
                                        />
                                    </View>
                                </View>

                                {installmentList.length > 0 ? (
                                    <View className="gap-3">
                                        {installmentList.map((item, index) => (
                                            <View key={item.id} className="flex-row gap-2 items-center">
                                                <Text className="text-xs text-gray-500 w-6 font-medium">{index + 1}x</Text>
                                                <View className="flex-1">
                                                    <TextInput
                                                        className="bg-white border border-gray-200 rounded-lg p-2 text-xs text-center"
                                                        placeholder="Data"
                                                        keyboardType="numeric"
                                                        maxLength={10}
                                                        value={item.date}
                                                        onChangeText={(text) => updateInstallment(index, 'date', text)}
                                                    />
                                                </View>
                                                <View className="flex-1">
                                                    <TextInput
                                                        className="bg-white border border-gray-200 rounded-lg p-2 text-xs text-center font-medium"
                                                        placeholder="Valor"
                                                        keyboardType="numeric"
                                                        value={item.value}
                                                        onChangeText={(text) => updateInstallment(index, 'value', text)}
                                                    />
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                ) : (
                                    <Text className="text-xs text-gray-400 italic text-center py-2">
                                        Preencha valor e data inicial para gerar as parcelas.
                                    </Text>
                                )}
                            </View>
                        )}

                        {/* Observations */}
                        <Text className="text-sm font-semibold text-gray-700 mb-2">Observações</Text>
                        <TextInput
                            className="bg-gray-50 border border-gray-200 rounded-xl p-3 h-24 text-base"
                            placeholder="Detalhes adicionais..."
                            multiline
                            textAlignVertical="top"
                            value={observations}
                            onChangeText={setObservations}
                        />

                    </ScrollView>

                    {/* Footer */}
                    <View className="p-4 border-t border-gray-100 safe-area-bottom">
                        <TouchableOpacity
                            onPress={handleSave}
                            disabled={loading}
                            className={`rounded-xl p-4 items-center flex-row justify-center gap-2 ${loading ? 'bg-red-400' : 'bg-red-600'}`}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <>
                                    <Check size={20} color="white" />
                                    <Text className="text-white font-bold text-lg">
                                        {transactionToEdit ? 'Salvar Alterações' : 'Salvar Despesa'}
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}
