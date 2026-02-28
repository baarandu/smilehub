import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Loader2, Calendar as CalendarIcon, CreditCard, Layers, Repeat } from 'lucide-react';
import { financialService } from '@/services/financial';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { toast } from 'sonner';
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
} from '@/utils/expense';

interface NewExpenseFormProps {
    onSuccess: () => void;
    transactionToEdit?: any;
}

export function NewExpenseForm({ onSuccess, transactionToEdit }: NewExpenseFormProps) {
    const { confirm, ConfirmDialog } = useConfirmDialog();
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

    useEffect(() => {
        if (transactionToEdit) {
            const parsed = parseExpenseDescription(transactionToEdit.description);
            setDescription(parsed.description);
            setObservations(parsed.observations);
            setDate(dbDateToDisplay(transactionToEdit.date)); // Now using DD/MM/YYYY
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
    }, [transactionToEdit]);

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

    const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value.replace(/\D/g, '');
        const numberValue = Number(rawValue) / 100;
        setValue(formatCurrency(numberValue));
    };

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setDate(applyDateMask(e.target.value));
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!description) { toast.error('Informe a descrição.'); return; }
        if (!value) { toast.error('Informe o valor.'); return; }
        if (!date || date.length !== 10) { toast.error('Informe uma data válida.'); return; }

        setLoading(true);
        try {
            if (transactionToEdit) {
                // Edit Logic
                if (isInstallment) {
                    if (!await confirm({ description: 'Ao salvar, a despesa original será excluída e um novo parcelamento será criado. Deseja continuar?', confirmLabel: 'Continuar' })) {
                        setLoading(false);
                        return;
                    }
                    if (transactionToEdit.recurrence_id) {
                        await financialService.deleteRecurrence(transactionToEdit.recurrence_id);
                    } else {
                        await financialService.deleteTransaction(transactionToEdit.id);
                    }
                    await createInstallments();
                    toast.success('Novo parcelamento criado!');
                    onSuccess();
                } else {
                    const dbDate = dateToDbFormat(date);
                    const finalDesc = `${description} (${paymentMethod})`;

                    if (updateAllRecurring && transactionToEdit.recurrence_id) {
                        const allRecurrence = await financialService.getByRecurrenceId(transactionToEdit.recurrence_id);
                        await Promise.all(allRecurrence.map(t => {
                            const indexMatch = t.description.match(/ \(\d+\/\d+\)/);
                            const indexSuffix = indexMatch ? indexMatch[0] : '';
                            let newFullDesc = `${description} (${paymentMethod})${indexSuffix}`;
                            if (observations) newFullDesc += ` - ${observations}`;
                            return financialService.updateTransaction(t.id, { description: newFullDesc, amount: getNumericValue(value), category });
                        }));
                    } else {
                        await financialService.updateTransaction(transactionToEdit.id, {
                            description: finalDesc + (observations ? ` - ${observations}` : ''),
                            amount: getNumericValue(value),
                            date: dbDate,
                            category,
                            payment_method: paymentMethod
                        });
                    }
                    toast.success('Despesa atualizada!');
                    onSuccess();
                }
            } else {
                // Create Logic
                if (isFixedExpense) {
                    await createFixedExpenses();
                } else if (isInstallment) {
                    await createInstallments();
                } else {
                    const dbDate = dateToDbFormat(date);
                    const finalDesc = `${description} (${paymentMethod})` + (observations ? ` - ${observations}` : '');
                    await financialService.createExpense({
                        amount: getNumericValue(value),
                        description: finalDesc,
                        category,
                        date: dbDate,
                        location: null
                        // clinic_id is handled in service now
                    });
                }
                toast.success('Despesa salva com sucesso!');
                onSuccess();
            }
        } catch (error) {
            console.error(error);
            toast.error('Erro ao salvar despesa');
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
            return financialService.createTransaction({
                type: 'expense',
                amount: Number(item.rawValue.toFixed(2)),
                description: finalDesc,
                category,
                date: dbDate,
                location: null,
                recurrence_id: recurrenceId,
                payment_method: paymentMethod
                // clinic_id is handled in service now
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
            return financialService.createTransaction({
                type: 'expense',
                amount: Number(item.rawValue.toFixed(2)),
                description: finalDesc,
                category,
                date: dbDate,
                location: null,
                recurrence_id: recurrenceId,
                payment_method: paymentMethod
            });
        }));
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-h-[80vh] overflow-y-auto px-1">
            {transactionToEdit?.recurrence_id && (
                <div className="mb-4 bg-blue-50 p-3 rounded-xl border border-blue-100 flex flex-wrao items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1">
                        <Layers className="h-5 w-5 text-blue-600" />
                        <div>
                            <p className="text-blue-800 font-bold text-sm">Despesa Parcelada</p>
                            <p className="text-blue-600 text-xs">Aplicar a todas as parcelas?</p>
                        </div>
                    </div>
                    <Switch checked={updateAllRecurring} onCheckedChange={setUpdateAllRecurring} />
                </div>
            )}

            {/* Description */}
            <div className="space-y-2">
                <Label htmlFor="description">Descrição / Nome</Label>
                <Input
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ex: Aluguel..."
                    className="bg-slate-50 border-slate-200"
                    required
                />
            </div>

            {/* Category */}
            <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="bg-slate-50 border-slate-200">
                        <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                        {EXPENSE_CATEGORIES.map(cat => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Value and Date */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="amount">Valor {isInstallment ? 'Total' : isFixedExpense ? 'Mensal' : ''}</Label>
                    <Input
                        id="amount"
                        value={value}
                        onChange={handleValueChange}
                        placeholder="R$ 0,00"
                        className="bg-slate-50 border-slate-200 font-semibold"
                        required
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="date">{(isInstallment || isFixedExpense) ? '1º Vencimento' : 'Data'}</Label>
                    <div className="relative">
                        <Input
                            id="date"
                            value={date}
                            onChange={handleDateChange}
                            maxLength={10}
                            placeholder="DD/MM/AAAA"
                            className="bg-slate-50 border-slate-200 pl-9"
                            required
                        />
                        <CalendarIcon className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
                    </div>
                </div>
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
                <Label>Forma de Pagamento</Label>
                <Select value={paymentMethod} onValueChange={(val) => setPaymentMethod(val as PaymentMethod)}>
                    <SelectTrigger className="bg-slate-50 border-slate-200">
                        <SelectValue placeholder="Selecione a forma de pagamento" />
                    </SelectTrigger>
                    <SelectContent>
                        {PAYMENT_METHODS.map(method => (
                            <SelectItem key={method} value={method}>{method}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Fixed Expense Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50">
                <div className="flex items-center gap-2">
                    <Repeat className="h-5 w-5 text-slate-600" />
                    <div>
                        <span className="font-medium text-slate-700 text-sm">Despesa Fixa Recorrente?</span>
                        <p className="text-xs text-slate-500">Ex: aluguel, CRO (mesmo valor por mês)</p>
                    </div>
                </div>
                <Switch
                    checked={isFixedExpense}
                    onCheckedChange={(checked) => {
                        setIsFixedExpense(checked);
                        if (checked) setIsInstallment(false);
                    }}
                />
            </div>

            {/* Fixed Expense List */}
            {isFixedExpense && (
                <div className="space-y-4 p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                    <div className="flex items-center justify-between">
                        <Label>Configurar Meses</Label>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Meses:</span>
                            <Input
                                value={numMonthsStr}
                                onChange={(e) => setNumMonthsStr(e.target.value)}
                                className="w-16 h-8 text-center bg-white"
                                type="number"
                                maxLength={2}
                            />
                        </div>
                    </div>

                    {fixedExpenseList.length > 0 && value && (
                        <p className="text-xs text-slate-600 bg-white p-2 rounded-lg border border-slate-200">
                            {numMonthsStr} meses de <span className="font-semibold">R$ {value}</span> = Total: <span className="font-semibold">R$ {formatCurrency(getNumericValue(value) * (parseInt(numMonthsStr) || 0))}</span>
                        </p>
                    )}

                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {fixedExpenseList.length > 0 ? (
                            fixedExpenseList.map((item, index) => (
                                <div key={item.id} className="flex gap-2 items-center">
                                    <span className="text-xs text-muted-foreground w-12 font-medium">Mês {index + 1}</span>
                                    <Input
                                        value={item.date}
                                        onChange={(e) => {
                                            const newList = [...fixedExpenseList];
                                            newList[index].date = applyDateMask(e.target.value);
                                            setFixedExpenseList(newList);
                                        }}
                                        className="h-8 text-xs bg-white text-center flex-1"
                                        placeholder="Data"
                                        maxLength={10}
                                    />
                                    <Input
                                        value={item.value}
                                        onChange={(e) => {
                                            const newList = [...fixedExpenseList];
                                            const raw = e.target.value.replace(/\D/g, '');
                                            const val = Number(raw) / 100;
                                            newList[index].value = formatCurrency(val);
                                            newList[index].rawValue = val;
                                            setFixedExpenseList(newList);
                                        }}
                                        className="h-8 text-xs bg-white text-center flex-1 font-medium"
                                        placeholder="Valor"
                                    />
                                </div>
                            ))
                        ) : (
                            <p className="text-xs text-muted-foreground italic text-center py-2">
                                Preencha valor e data inicial para gerar.
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Installments Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50">
                <div className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-slate-600" />
                    <div>
                        <span className="font-medium text-slate-700 text-sm">
                            {transactionToEdit ? 'Refazer Parcelamento?' : 'Pagamento Parcelado?'}
                        </span>
                        <p className="text-xs text-slate-500">Ex: compra parcelada (valor dividido)</p>
                    </div>
                </div>
                <Switch
                    checked={isInstallment}
                    onCheckedChange={(checked) => {
                        setIsInstallment(checked);
                        if (checked) setIsFixedExpense(false);
                    }}
                />
            </div>

            {/* Installment List */}
            {isInstallment && (
                <div className="space-y-4 p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                    <div className="flex items-center justify-between">
                        <Label>Configurar Parcelas</Label>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Qtd:</span>
                            <Input
                                value={numInstallmentsStr}
                                onChange={(e) => setNumInstallmentsStr(e.target.value)}
                                className="w-16 h-8 text-center bg-white"
                                type="number"
                                maxLength={2}
                            />
                        </div>
                    </div>

                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {installmentList.length > 0 ? (
                            installmentList.map((item, index) => (
                                <div key={item.id} className="flex gap-2 items-center">
                                    <span className="text-xs text-muted-foreground w-6 font-medium">{index + 1}x</span>
                                    <Input
                                        value={item.date}
                                        onChange={(e) => updateInstallment(index, 'date', e.target.value)}
                                        className="h-8 text-xs bg-white text-center flex-1"
                                        placeholder="Data"
                                        maxLength={10}
                                    />
                                    <Input
                                        value={item.value}
                                        onChange={(e) => updateInstallment(index, 'value', e.target.value)}
                                        className="h-8 text-xs bg-white text-center flex-1 font-medium"
                                        placeholder="Valor"
                                    />
                                </div>
                            ))
                        ) : (
                            <p className="text-xs text-muted-foreground italic text-center py-2">
                                Preencha valor e data inicial para gerar.
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Observations */}
            <div className="space-y-2">
                <Label htmlFor="observations">Observações</Label>
                <Textarea
                    id="observations"
                    value={observations}
                    onChange={(e) => setObservations(e.target.value)}
                    placeholder="Detalhes adicionais..."
                    className="bg-slate-50 border-slate-200 resize-none h-24"
                />
            </div>

            <Button
                type="submit"
                className="w-full bg-red-600 hover:bg-red-700"
                disabled={loading}
            >
                {loading ? (
                    <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processando...
                    </>
                ) : (
                    transactionToEdit ? 'Salvar Alterações' : 'Salvar Despesa'
                )}
            </Button>
        {ConfirmDialog}
        </form>
    );
}
