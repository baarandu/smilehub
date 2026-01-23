import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { CreditCard, Banknote, Wallet, Landmark, Receipt } from 'lucide-react';
import { formatCurrency, generateUUID } from '@/utils/expense';
import { cn } from '@/lib/utils';

export interface ExpensePaymentTransaction {
    date: string; // YYYY-MM-DD
    amount: number;
    method: string;
}

interface ExpensePaymentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (method: string, transactions: ExpensePaymentTransaction[], brand?: string, interestRate?: number) => void;
    itemName: string;
    value: number;
}

export function ExpensePaymentDialog({ open, onOpenChange, onConfirm, itemName, value }: ExpensePaymentDialogProps) {
    const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
    const [isInstallments, setIsInstallments] = useState(false);
    const [numInstallments, setNumInstallments] = useState('2');
    const [installmentItems, setInstallmentItems] = useState<{ id: string; date: string; amount: string }[]>([]);
    const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
    const [interestRate, setInterestRate] = useState('0');

    const allBrands = [
        { id: 'visa', label: 'Visa' },
        { id: 'mastercard', label: 'Mastercard' },
        { id: 'elo', label: 'Elo' },
        { id: 'amex', label: 'Amex' },
        { id: 'hipercard', label: 'Hipercard' },
        { id: 'others', label: 'Outros' }
    ];

    const methods = [
        { id: 'credit', label: 'Crédito', icon: CreditCard },
        { id: 'debit', label: 'Débito', icon: CreditCard },
        { id: 'pix', label: 'PIX', icon: Banknote },
        { id: 'cash', label: 'Dinheiro', icon: Wallet },
        { id: 'transfer', label: 'Transferência', icon: Landmark },
        { id: 'boleto', label: 'Boleto', icon: Receipt },
    ];

    useEffect(() => {
        if (open) {
            resetState();
        }
    }, [open]);

    const resetState = () => {
        setSelectedMethod(null);
        setIsInstallments(false);
        setNumInstallments('2');
        setInstallmentItems([]);
        setSelectedBrand(null);
        setInterestRate('0');
    };

    const generateInstallmentsList = (count: number) => {
        if (count < 2) {
            setInstallmentItems([]);
            return;
        }

        const numCount = parseInt(count.toString()) || 2;
        const interest = parseFloat(interestRate) || 0;
        const totalWithInterest = value * (1 + interest / 100);
        const baseAmount = Math.floor((totalWithInterest / numCount) * 100) / 100;
        let remainder = totalWithInterest - (baseAmount * numCount);
        remainder = Math.round(remainder * 100) / 100;

        const items = [];
        const today = new Date();

        for (let i = 0; i < numCount; i++) {
            const date = new Date(today);
            date.setMonth(today.getMonth() + i);
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            const displayDate = `${day}/${month}/${year}`;

            let amount = baseAmount;
            if (i === numCount - 1) {
                amount += remainder;
            }

            items.push({
                id: generateUUID(),
                date: displayDate,
                amount: formatCurrency(amount)
            });
        }

        setInstallmentItems(items);
    };

    useEffect(() => {
        if (isInstallments && (selectedMethod === 'credit' || selectedMethod === 'boleto')) {
            const count = parseInt(numInstallments) || 2;
            if (count >= 2) {
                generateInstallmentsList(count);
            }
        } else {
            setInstallmentItems([]);
        }
    }, [isInstallments, numInstallments, selectedMethod, interestRate, value]);

    const getTotalPlanned = () => {
        if (!isInstallments || installmentItems.length === 0) return value;
        return installmentItems.reduce((acc, item) => {
            const numValue = Number(item.amount.replace(/\./g, '').replace(',', '.')) || 0;
            return acc + numValue;
        }, 0);
    };

    const handleConfirm = () => {
        if (!selectedMethod) {
            alert('Por favor, selecione a forma de pagamento.');
            return;
        }

        if ((selectedMethod === 'credit' || selectedMethod === 'debit') && !selectedBrand) {
            alert('Por favor, selecione a bandeira do cartão.');
            return;
        }

        if (isInstallments && (selectedMethod === 'credit' || selectedMethod === 'boleto')) {
            const count = parseInt(numInstallments) || 0;
            if (count < 2 || count > 50) {
                alert('O número de parcelas deve ser entre 2 e 50.');
                return;
            }
        }

        let transactions: ExpensePaymentTransaction[] = [];

        if (isInstallments && (selectedMethod === 'credit' || selectedMethod === 'boleto') && installmentItems.length > 0) {
            transactions = installmentItems.map(item => {
                const [day, month, year] = item.date.split('/');
                const numValue = Number(item.amount.replace(/\./g, '').replace(',', '.')) || 0;
                return {
                    method: selectedMethod,
                    amount: numValue,
                    date: `${year}-${month}-${day}`
                };
            });
        } else {
            transactions = [{
                method: selectedMethod,
                amount: value,
                date: new Date().toISOString().split('T')[0]
            }];
        }

        const interest = isInstallments && (selectedMethod === 'credit' || selectedMethod === 'boleto') ? parseFloat(interestRate) || 0 : 0;
        onConfirm(selectedMethod, transactions, selectedBrand || undefined, interest > 0 ? interest : undefined);
    };

    const totalWithInterest = isInstallments && (selectedMethod === 'credit' || selectedMethod === 'boleto')
        ? value * (1 + (parseFloat(interestRate) || 0) / 100)
        : value;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Forma de Pagamento</DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Item Info */}
                    <div>
                        <p className="text-sm text-muted-foreground">{itemName}</p>
                        <p className="text-2xl font-bold">R$ {formatCurrency(value)}</p>
                    </div>

                    {/* Payment Methods */}
                    <div className="space-y-3">
                        <Label>Forma de Pagamento</Label>
                        <div className="grid grid-cols-3 gap-2">
                            {methods.map((method) => {
                                const Icon = method.icon;
                                const isSelected = selectedMethod === method.id;
                                return (
                                    <button
                                        key={method.id}
                                        type="button"
                                        onClick={() => {
                                            setSelectedMethod(method.id);
                                            if (method.id !== 'credit' && method.id !== 'boleto') {
                                                setIsInstallments(false);
                                            }
                                        }}
                                        className={cn(
                                            "flex flex-col items-center p-3 rounded-xl border-2 transition-colors",
                                            isSelected
                                                ? "border-teal-500 bg-teal-50"
                                                : "border-slate-200 bg-white hover:bg-slate-50"
                                        )}
                                    >
                                        <Icon className={cn("h-6 w-6", isSelected ? "text-teal-600" : "text-slate-500")} />
                                        <span className={cn("text-xs font-medium mt-1", isSelected ? "text-teal-700" : "text-slate-600")}>
                                            {method.label}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Card Brand Selection */}
                    {(selectedMethod === 'credit' || selectedMethod === 'debit') && (
                        <div className="space-y-3">
                            <Label>Bandeira do Cartão</Label>
                            <div className="flex flex-wrap gap-2">
                                {allBrands.map((brand) => {
                                    const isSelected = selectedBrand === brand.id;
                                    return (
                                        <button
                                            key={brand.id}
                                            type="button"
                                            onClick={() => setSelectedBrand(brand.id)}
                                            className={cn(
                                                "px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors",
                                                isSelected
                                                    ? "border-teal-500 bg-teal-50 text-teal-700"
                                                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                            )}
                                        >
                                            {brand.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Installments */}
                    {(selectedMethod === 'credit' || selectedMethod === 'boleto') && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label>Parcelamento</Label>
                                <Switch checked={isInstallments} onCheckedChange={setIsInstallments} />
                            </div>

                            {isInstallments && (
                                <div className="space-y-4 p-4 bg-slate-50 rounded-xl">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-sm">Número de Parcelas</Label>
                                            <Input
                                                type="number"
                                                min="2"
                                                max="50"
                                                value={numInstallments}
                                                onChange={(e) => {
                                                    const num = e.target.value.replace(/\D/g, '');
                                                    if (num === '' || (parseInt(num) >= 1 && parseInt(num) <= 50)) {
                                                        setNumInstallments(num);
                                                    }
                                                }}
                                                className="bg-white"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-sm">Juros (%)</Label>
                                            <Input
                                                type="text"
                                                value={interestRate}
                                                onChange={(e) => {
                                                    const num = e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.');
                                                    if (num === '' || (!isNaN(parseFloat(num)) && parseFloat(num) >= 0 && parseFloat(num) <= 100)) {
                                                        setInterestRate(num);
                                                    }
                                                }}
                                                className="bg-white"
                                            />
                                        </div>
                                    </div>

                                    {parseFloat(interestRate) > 0 && (
                                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                            <p className="text-sm text-yellow-800">
                                                Valor total com juros: R$ {formatCurrency(totalWithInterest)}
                                            </p>
                                        </div>
                                    )}

                                    {installmentItems.length > 0 && (
                                        <div className="space-y-2 max-h-48 overflow-y-auto">
                                            <Label className="text-sm">Parcelas</Label>
                                            {installmentItems.map((item, index) => (
                                                <div key={item.id} className="bg-white p-3 rounded-lg flex justify-between items-center">
                                                    <div>
                                                        <p className="text-sm font-medium">Parcela {index + 1} de {installmentItems.length}</p>
                                                        <p className="text-xs text-muted-foreground">{item.date}</p>
                                                    </div>
                                                    <p className="text-sm font-semibold">R$ {item.amount}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Summary */}
                    <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                        <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Valor Original</span>
                            <span className="text-sm font-medium">R$ {formatCurrency(value)}</span>
                        </div>
                        {isInstallments && parseFloat(interestRate) > 0 && (
                            <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Juros ({interestRate}%)</span>
                                <span className="text-sm font-medium text-red-600">+R$ {formatCurrency(totalWithInterest - value)}</span>
                            </div>
                        )}
                        <div className="border-t pt-2 flex justify-between">
                            <span className="font-semibold">Total</span>
                            <span className="text-lg font-bold">R$ {formatCurrency(totalWithInterest)}</span>
                        </div>
                    </div>

                    <Button onClick={handleConfirm} className="w-full bg-teal-600 hover:bg-teal-700">
                        Confirmar Pagamento
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
