import { View, Text, Modal, TouchableOpacity, ScrollView, TextInput, Switch, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { X, CreditCard, Layers, Trash, Check, Calendar, Repeat } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import { financialService } from '../../services/financial';
import { FinancialTransaction } from '../../types/database';
import {
    EXPENSE_CATEGORIES,
    PAYMENT_METHODS,
    PaymentMethod,
    InstallmentItem,
    generateUUID,
    applyDateMask,
    formatCurrency,
    getNumericValue,
    dateToDbFormat,
    dbDateToDisplay,
    generateInstallments,
    generateFixedExpenses,
    extractPaymentMethod,
    parseExpenseDescription
} from '../../utils/expense';
import { DatePickerModal } from '../common/DatePickerModal';
import { SelectModal } from '../common/SelectModal';
import { ChevronDown } from 'lucide-react-native';

interface NewExpenseModalProps {
    visible: boolean;
    onClose: () => void;
    onSave: () => void;
    transactionToEdit?: FinancialTransaction | null;
}

export function NewExpenseModal({ visible, onClose, onSave, transactionToEdit }: NewExpenseModalProps) {
    const [loading, setLoading] = useState(false);

    // Form State
    const [description, setDescription] = useState('');
    const [date, setDate] = useState('');
    const [category, setCategory] = useState<string>('Outros');
    const [value, setValue] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Pix');
    const [observations, setObservations] = useState('');

    // Installments
    const [isInstallment, setIsInstallment] = useState(false);
    const [numInstallmentsStr, setNumInstallmentsStr] = useState('2');
    const [installmentList, setInstallmentList] = useState<InstallmentItem[]>([]);

    // Fixed Expenses (recurring same value)
    const [isFixedExpense, setIsFixedExpense] = useState(false);
    const [numMonthsStr, setNumMonthsStr] = useState('12');
    const [fixedExpenseList, setFixedExpenseList] = useState<InstallmentItem[]>([]);

    // Edit Mode State
    const [updateAllRecurring, setUpdateAllRecurring] = useState(false);
    
    // Date Picker State
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Select Modal States
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);

    useEffect(() => {
        if (visible) {
            if (transactionToEdit) {
                const parsed = parseExpenseDescription(transactionToEdit.description);
                setDescription(parsed.description);
                setObservations(parsed.observations);
                setDate(dbDateToDisplay(transactionToEdit.date));
                setCategory(transactionToEdit.category || 'Outros');
                setValue(formatCurrency(transactionToEdit.amount));
                const method = extractPaymentMethod(transactionToEdit.description);
                if (method) setPaymentMethod(method);
                setIsInstallment(false);
                setIsFixedExpense(false);
                setUpdateAllRecurring(false);
            } else {
                resetForm();
            }
        }
    }, [visible, transactionToEdit]);

    useEffect(() => {
        if (!isInstallment) {
            setInstallmentList([]);
            return;
        }
        const count = parseInt(numInstallmentsStr) || 1;
        if (count < 2) return;
        const totalVal = getNumericValue(value);
        const items = generateInstallments(totalVal, count, date);
        setInstallmentList(items);
    }, [isInstallment, numInstallmentsStr, value, date]);

    useEffect(() => {
        if (!isFixedExpense) {
            setFixedExpenseList([]);
            return;
        }
        const months = parseInt(numMonthsStr) || 1;
        if (months < 2) return;
        const monthlyVal = getNumericValue(value);
        const items = generateFixedExpenses(monthlyVal, months, date);
        setFixedExpenseList(items);
    }, [isFixedExpense, numMonthsStr, value, date]);

    const resetForm = () => {
        setDescription('');
        const today = new Date();
        const todayStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
        setDate(todayStr);
        setValue('');
        setObservations('');
        setIsInstallment(false);
        setNumInstallmentsStr('2');
        setInstallmentList([]);
        setIsFixedExpense(false);
        setNumMonthsStr('12');
        setFixedExpenseList([]);
        setCategory('Outros');
        setPaymentMethod('Pix');
        setUpdateAllRecurring(false);
    };

    const handleClose = () => { resetForm(); onClose(); };

    const handleDateSelect = (selectedDate: Date) => {
        const day = String(selectedDate.getDate()).padStart(2, '0');
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const year = selectedDate.getFullYear();
        setDate(`${day}/${month}/${year}`);
    };

    const getDateFromString = (dateStr: string): Date => {
        if (!dateStr || dateStr.length !== 10) {
            return new Date();
        }
        const [day, month, year] = dateStr.split('/').map(Number);
        if (day && month && year) {
            return new Date(year, month - 1, day);
        }
        return new Date();
    };

    const handleValueChange = (text: string) => {
        const rawValue = text.replace(/\D/g, '');
        const numberValue = Number(rawValue) / 100;
        setValue(formatCurrency(numberValue));
    };

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
                onSave();
                handleClose();
            } catch (error) {
                Alert.alert('Erro', 'Erro ao excluir despesa');
            } finally {
                setLoading(false);
            }
        };

        if (transactionToEdit.recurrence_id) {
            Alert.alert('Excluir Despesa Recorrente', 'Deseja excluir apenas esta parcela ou todas as parcelas?', [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Apenas Esta', onPress: () => performDelete(false) },
                { text: 'Todas as Parcelas', style: 'destructive', onPress: () => performDelete(true) }
            ]);
        } else {
            Alert.alert('Confirmar Exclusão', 'Tem certeza que deseja excluir esta despesa?', [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Excluir', style: 'destructive', onPress: () => performDelete(false) }
            ]);
        }
    };

    const handleSave = async () => {
        if (!description) { Alert.alert('Erro', 'Informe a descrição.'); return; }

        setLoading(true);
        try {
            if (transactionToEdit) {
                if (isInstallment) {
                    Alert.alert('Confirmar Re-parcelamento', 'Ao salvar, a despesa original será excluída e um novo parcelamento será criado. Deseja continuar?', [
                        { text: 'Cancelar', style: 'cancel', onPress: () => setLoading(false) },
                        {
                            text: 'Continuar', onPress: async () => {
                                try {
                                    if (transactionToEdit.recurrence_id) {
                                        await financialService.deleteRecurrence(transactionToEdit.recurrence_id);
                                    } else {
                                        await financialService.delete(transactionToEdit.id);
                                    }
                                    await createInstallments();
                                    Alert.alert('Sucesso', 'Novo parcelamento criado!');
                                    onSave(); handleClose();
                                } catch (err) {
                                    Alert.alert('Erro', 'Falha ao re-parcelar.');
                                    setLoading(false);
                                }
                            }
                        }
                    ]);
                    return;
                }

                const dbDate = dateToDbFormat(date);
                let finalDesc = `${description} (${paymentMethod})`;

                if (updateAllRecurring && transactionToEdit.recurrence_id) {
                    const allRecurrence = await financialService.getByRecurrenceId(transactionToEdit.recurrence_id);
                    await Promise.all(allRecurrence.map(t => {
                        const indexMatch = t.description.match(/ \(\d+\/\d+\)/);
                        const indexSuffix = indexMatch ? indexMatch[0] : '';
                        let newFullDesc = `${description} (${paymentMethod})${indexSuffix}`;
                        if (observations) newFullDesc += ` - ${observations}`;
                        return financialService.update(t.id, { description: newFullDesc, amount: getNumericValue(value), category });
                    }));
                } else {
                    await financialService.update(transactionToEdit.id, {
                        description: finalDesc + (observations ? ` - ${observations}` : ''),
                        amount: getNumericValue(value),
                        date: dbDate,
                        category
                    });
                }
                Alert.alert('Sucesso', 'Despesa atualizada!');
            } else {
                if (isFixedExpense) {
                    await createFixedExpenses();
                } else if (isInstallment) {
                    await createInstallments();
                } else {
                    const dbDate = dateToDbFormat(date);
                    const finalDesc = `${description} (${paymentMethod})` + (observations ? ` - ${observations}` : '');
                    await financialService.create({ type: 'expense', amount: getNumericValue(value), description: finalDesc, category, date: dbDate, location: null, recurrence_id: null });
                }
                Alert.alert('Sucesso', 'Despesa salva com sucesso!');
            }
            onSave(); handleClose();
        } catch (error) {
            Alert.alert('Erro', 'Não foi possível salvar a despesa.');
        } finally {
            setLoading(false);
        }
    };

    const createInstallments = async () => {
        const recurrenceId = generateUUID();
        const numInstallments = parseInt(numInstallmentsStr);
        await Promise.all(installmentList.map((item, i) => {
            const dbDate = dateToDbFormat(item.date);
            let finalDesc = `${description} (${paymentMethod}) (${i + 1}/${numInstallments})`;
            if (observations) finalDesc += ` - ${observations}`;
            return financialService.create({
                type: 'expense',
                amount: Number(item.rawValue.toFixed(2)),
                description: finalDesc,
                category,
                date: dbDate,
                location: null,
                recurrence_id: recurrenceId
            });
        }));
    };

    const createFixedExpenses = async () => {
        const recurrenceId = generateUUID();
        const numMonths = parseInt(numMonthsStr);
        await Promise.all(fixedExpenseList.map((item, i) => {
            const dbDate = dateToDbFormat(item.date);
            let finalDesc = `${description} (${paymentMethod}) (Mês ${i + 1}/${numMonths})`;
            if (observations) finalDesc += ` - ${observations}`;
            return financialService.create({
                type: 'expense',
                amount: Number(item.rawValue.toFixed(2)),
                description: finalDesc,
                category,
                date: dbDate,
                location: null,
                recurrence_id: recurrenceId
            });
        }));
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View className="flex-1 justify-end bg-black/50">
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="bg-white rounded-t-3xl h-[95%]">
                    {/* Header */}
                    <View className="flex-row justify-between items-center p-4 border-b border-gray-100">
                        <Text className="text-xl font-bold text-gray-800">{transactionToEdit ? 'Editar Despesa' : 'Nova Despesa'}</Text>
                        <View className="flex-row gap-2">
                            {transactionToEdit && (
                                <TouchableOpacity onPress={handleDelete} className="bg-[#fee2e2] p-2 rounded-full">
                                    <Trash size={20} color="#EF4444" />
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity onPress={handleClose} className="bg-gray-100 p-2 rounded-full">
                                <X size={20} color="#374151" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
                        {transactionToEdit?.recurrence_id && (
                            <View className="mb-4 bg-blue-50 p-3 rounded-xl border border-blue-100 flex-row items-center justify-between">
                                <View className="flex-row items-center gap-2 flex-1">
                                    <Layers size={20} color="#2563EB" />
                                    <View>
                                        <Text className="text-blue-800 font-bold">Despesa Parcelada</Text>
                                        <Text className="text-blue-600 text-xs">Aplicar alterações a todas as parcelas?{'\n'}(Valor, Nome, Categoria)</Text>
                                    </View>
                                </View>
                                <Switch value={updateAllRecurring} onValueChange={setUpdateAllRecurring} trackColor={{ false: "#E5E7EB", true: "#93C5FD" }} thumbColor={updateAllRecurring ? "#2563EB" : "#F9FAFB"} />
                            </View>
                        )}

                        {/* Description */}
                        <Text className="text-sm font-semibold text-gray-700 mb-2">Descrição / Nome</Text>
                        <TextInput className="bg-gray-50 border border-gray-200 rounded-xl p-3 mb-4 text-base" placeholder="Ex: Aluguel..." value={description} onChangeText={setDescription} />

                        {/* Category */}
                        <Text className="text-sm font-semibold text-gray-700 mb-2">Categoria</Text>
                        <TouchableOpacity
                            onPress={() => setShowCategoryModal(true)}
                            className="bg-gray-50 border border-gray-200 rounded-xl p-3 mb-4 flex-row items-center justify-between"
                        >
                            <Text className="text-base text-gray-900">{category}</Text>
                            <ChevronDown size={20} color="#6B7280" />
                        </TouchableOpacity>

                        {/* Value and Date */}
                        {(!isInstallment && !isFixedExpense) ? (
                            <View className="flex-row gap-4 mb-4">
                                <View className="flex-1">
                                    <Text className="text-sm font-semibold text-gray-700 mb-2">Valor</Text>
                                    <TextInput className="bg-gray-50 border border-gray-200 rounded-xl p-3 font-semibold text-gray-900" placeholder="R$ 0,00" keyboardType="numeric" value={value} onChangeText={handleValueChange} />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-sm font-semibold text-gray-700 mb-2">Data</Text>
                                    <TouchableOpacity
                                        onPress={() => setShowDatePicker(true)}
                                        className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex-row items-center justify-between"
                                    >
                                        <Text className={`text-gray-900 ${!date ? 'text-gray-400' : ''}`}>
                                            {date || 'DD/MM/AAAA'}
                                        </Text>
                                        <Calendar size={20} color="#6B7280" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ) : isInstallment ? (
                            <View className="flex-row gap-4 mb-4">
                                <View className="flex-1">
                                    <Text className="text-sm font-semibold text-gray-700 mb-2">Valor Total</Text>
                                    <TextInput className="bg-gray-50 border border-gray-200 rounded-xl p-3 font-semibold text-gray-900" placeholder="R$ 0,00" keyboardType="numeric" value={value} onChangeText={handleValueChange} />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-sm font-semibold text-gray-700 mb-2">1º Vencimento</Text>
                                    <TextInput className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-900" placeholder="DD/MM/AAAA" keyboardType="numeric" maxLength={10} value={date} onChangeText={t => setDate(applyDateMask(t))} />
                                </View>
                            </View>
                        ) : (
                            <View className="flex-row gap-4 mb-4">
                                <View className="flex-1">
                                    <Text className="text-sm font-semibold text-gray-700 mb-2">Valor Mensal</Text>
                                    <TextInput className="bg-gray-50 border border-gray-200 rounded-xl p-3 font-semibold text-gray-900" placeholder="R$ 0,00" keyboardType="numeric" value={value} onChangeText={handleValueChange} />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-sm font-semibold text-gray-700 mb-2">1º Vencimento</Text>
                                    <TextInput className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-900" placeholder="DD/MM/AAAA" keyboardType="numeric" maxLength={10} value={date} onChangeText={t => setDate(applyDateMask(t))} />
                                </View>
                            </View>
                        )}

                        {/* Payment Method */}
                        <Text className="text-sm font-semibold text-gray-700 mb-2">Forma de Pagamento</Text>
                        <TouchableOpacity
                            onPress={() => setShowPaymentModal(true)}
                            className="bg-gray-50 border border-gray-200 rounded-xl p-3 mb-6 flex-row items-center justify-between"
                        >
                            <Text className="text-base text-gray-900">{paymentMethod}</Text>
                            <ChevronDown size={20} color="#6B7280" />
                        </TouchableOpacity>

                        {/* Fixed Expense Toggle */}
                        <View className="flex-row justify-between items-center mb-4 bg-gray-50 p-3 rounded-xl border border-gray-100">
                            <View className="flex-row items-center gap-2 flex-1">
                                <Repeat size={20} color="#4B5563" />
                                <View className="flex-1">
                                    <Text className="font-medium text-gray-700">Despesa Fixa Recorrente?</Text>
                                    <Text className="text-xs text-gray-500">Ex: aluguel, CRO (mesmo valor por mês)</Text>
                                </View>
                            </View>
                            <Switch
                                value={isFixedExpense}
                                onValueChange={(val) => {
                                    setIsFixedExpense(val);
                                    if (val) setIsInstallment(false);
                                }}
                                trackColor={{ false: "#E5E7EB", true: "#BBF7D0" }}
                                thumbColor={isFixedExpense ? "#22C55E" : "#F9FAFB"}
                            />
                        </View>

                        {/* Fixed Expense List */}
                        {isFixedExpense && (
                            <View className="mb-6 bg-gray-50 p-3 rounded-xl border border-gray-100">
                                <View className="flex-row items-center justify-between mb-4">
                                    <Text className="text-sm font-semibold text-gray-700">Configurar Meses</Text>
                                    <View className="flex-row items-center gap-2">
                                        <Text className="text-xs text-gray-500">Meses:</Text>
                                        <TextInput className="bg-white border border-gray-200 rounded-lg p-2 w-12 text-center text-sm" keyboardType="numeric" value={numMonthsStr} onChangeText={setNumMonthsStr} maxLength={2} />
                                    </View>
                                </View>

                                {fixedExpenseList.length > 0 && value && (
                                    <View className="bg-white p-2 rounded-lg border border-gray-200 mb-3">
                                        <Text className="text-xs text-gray-600">
                                            {numMonthsStr} meses de <Text className="font-semibold">R$ {value}</Text> = Total: <Text className="font-semibold">R$ {formatCurrency(getNumericValue(value) * (parseInt(numMonthsStr) || 0))}</Text>
                                        </Text>
                                    </View>
                                )}

                                {fixedExpenseList.length > 0 ? (
                                    <View className="gap-3">
                                        {fixedExpenseList.map((item, index) => (
                                            <View key={item.id} className="flex-row gap-2 items-center">
                                                <Text className="text-xs text-gray-500 w-12 font-medium">Mês {index + 1}</Text>
                                                <View className="flex-1">
                                                    <TextInput
                                                        className="bg-white border border-gray-200 rounded-lg p-2 text-xs text-center"
                                                        placeholder="Data"
                                                        keyboardType="numeric"
                                                        maxLength={10}
                                                        value={item.date}
                                                        onChangeText={t => {
                                                            const newList = [...fixedExpenseList];
                                                            newList[index].date = applyDateMask(t);
                                                            setFixedExpenseList(newList);
                                                        }}
                                                    />
                                                </View>
                                                <View className="flex-1">
                                                    <TextInput
                                                        className="bg-white border border-gray-200 rounded-lg p-2 text-xs text-center font-medium"
                                                        placeholder="Valor"
                                                        keyboardType="numeric"
                                                        value={item.value}
                                                        onChangeText={t => {
                                                            const newList = [...fixedExpenseList];
                                                            const raw = t.replace(/\D/g, '');
                                                            const val = Number(raw) / 100;
                                                            newList[index].value = formatCurrency(val);
                                                            newList[index].rawValue = val;
                                                            setFixedExpenseList(newList);
                                                        }}
                                                    />
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                ) : (
                                    <Text className="text-xs text-gray-400 italic text-center py-2">Preencha valor e data inicial para gerar.</Text>
                                )}
                            </View>
                        )}

                        {/* Installments Toggle */}
                        <View className="flex-row justify-between items-center mb-4 bg-gray-50 p-3 rounded-xl border border-gray-100">
                            <View className="flex-row items-center gap-2 flex-1">
                                <CreditCard size={20} color="#4B5563" />
                                <View className="flex-1">
                                    <Text className="font-medium text-gray-700">{transactionToEdit ? 'Refazer Parcelamento?' : 'Pagamento Parcelado?'}</Text>
                                    <Text className="text-xs text-gray-500">Ex: compra parcelada (valor dividido)</Text>
                                </View>
                            </View>
                            <Switch
                                value={isInstallment}
                                onValueChange={(val) => {
                                    setIsInstallment(val);
                                    if (val) setIsFixedExpense(false);
                                }}
                                trackColor={{ false: "#E5E7EB", true: "#FECACA" }}
                                thumbColor={isInstallment ? "#EF4444" : "#F9FAFB"}
                            />
                        </View>

                        {/* Installment List */}
                        {isInstallment && (
                            <View className="mb-6 bg-gray-50 p-3 rounded-xl border border-gray-100">
                                <View className="flex-row items-center justify-between mb-4">
                                    <Text className="text-sm font-semibold text-gray-700">Configurar Parcelas</Text>
                                    <View className="flex-row items-center gap-2">
                                        <Text className="text-xs text-gray-500">Qtd:</Text>
                                        <TextInput className="bg-white border border-gray-200 rounded-lg p-2 w-12 text-center text-sm" keyboardType="numeric" value={numInstallmentsStr} onChangeText={setNumInstallmentsStr} maxLength={2} />
                                    </View>
                                </View>
                                {installmentList.length > 0 ? (
                                    <View className="gap-3">
                                        {installmentList.map((item, index) => (
                                            <View key={item.id} className="flex-row gap-2 items-center">
                                                <Text className="text-xs text-gray-500 w-6 font-medium">{index + 1}x</Text>
                                                <View className="flex-1">
                                                    <TextInput className="bg-white border border-gray-200 rounded-lg p-2 text-xs text-center" placeholder="Data" keyboardType="numeric" maxLength={10} value={item.date} onChangeText={t => updateInstallment(index, 'date', t)} />
                                                </View>
                                                <View className="flex-1">
                                                    <TextInput className="bg-white border border-gray-200 rounded-lg p-2 text-xs text-center font-medium" placeholder="Valor" keyboardType="numeric" value={item.value} onChangeText={t => updateInstallment(index, 'value', t)} />
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                ) : (
                                    <Text className="text-xs text-gray-400 italic text-center py-2">Preencha valor e data inicial para gerar as parcelas.</Text>
                                )}
                            </View>
                        )}

                        {/* Observations */}
                        <Text className="text-sm font-semibold text-gray-700 mb-2">Observações</Text>
                        <TextInput className="bg-gray-50 border border-gray-200 rounded-xl p-3 h-24 text-base" placeholder="Detalhes adicionais..." multiline textAlignVertical="top" value={observations} onChangeText={setObservations} />
                    </ScrollView>

                    {/* Footer */}
                    <View className="p-4 border-t border-gray-100 safe-area-bottom">
                        <TouchableOpacity onPress={handleSave} disabled={loading} className={`rounded-xl p-4 items-center flex-row justify-center gap-2 ${loading ? 'bg-[#c95a58]' : 'bg-[#a03f3d]'}`}>
                            {loading ? <ActivityIndicator color="white" /> : (<><Check size={20} color="white" /><Text className="text-white font-bold text-lg">{transactionToEdit ? 'Salvar Alterações' : 'Salvar Despesa'}</Text></>)}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </View>
            
            {/* Date Picker Modal */}
            <DatePickerModal
                visible={showDatePicker}
                onClose={() => setShowDatePicker(false)}
                onSelectDate={handleDateSelect}
                initialDate={date ? getDateFromString(date) : new Date()}
            />

            {/* Category Select Modal */}
            <SelectModal
                visible={showCategoryModal}
                onClose={() => setShowCategoryModal(false)}
                onSelect={setCategory}
                options={EXPENSE_CATEGORIES}
                selectedValue={category}
                title="Selecione a Categoria"
            />

            {/* Payment Method Select Modal */}
            <SelectModal
                visible={showPaymentModal}
                onClose={() => setShowPaymentModal(false)}
                onSelect={(val) => setPaymentMethod(val as PaymentMethod)}
                options={PAYMENT_METHODS}
                selectedValue={paymentMethod}
                title="Forma de Pagamento"
            />
        </Modal>
    );
}
