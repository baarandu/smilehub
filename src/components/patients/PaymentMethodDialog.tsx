import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Banknote, CreditCard, Smartphone, ArrowRight } from 'lucide-react';
import { formatMoney } from '@/utils/budgetUtils';

interface PaymentMethodDialogProps {
    open: boolean;
    onClose: () => void;
    onConfirm: (method: string, installments: number) => void;
    itemName: string;
    value: number;
}

const PAYMENT_METHODS = [
    { id: 'cash', label: 'Dinheiro', icon: Banknote, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    { id: 'credit', label: 'Crédito', icon: CreditCard, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
    { id: 'debit', label: 'Débito', icon: CreditCard, color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-200' },
    { id: 'pix', label: 'PIX', icon: Smartphone, color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-200' },
];

export function PaymentMethodDialog({ open, onClose, onConfirm, itemName, value }: PaymentMethodDialogProps) {
    const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
    const [installments, setInstallments] = useState('1');

    const handleConfirm = () => {
        if (!selectedMethod) return;
        const numInstallments = selectedMethod === 'credit' ? parseInt(installments) || 1 : 1;
        onConfirm(selectedMethod, numInstallments);
        setSelectedMethod(null);
        setInstallments('1');
    };

    const installmentValue = selectedMethod === 'credit' && parseInt(installments) > 1
        ? value / parseInt(installments)
        : value;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-center">Registrar Pagamento</DialogTitle>
                </DialogHeader>

                <div className="text-center py-4 border-b">
                    <div className="text-sm text-muted-foreground">{itemName}</div>
                    <div className="text-2xl font-bold text-teal-600 mt-1">
                        R$ {formatMoney(value)}
                    </div>
                </div>

                <div className="py-4 space-y-4">
                    <Label>Método de Pagamento</Label>
                    <div className="grid grid-cols-2 gap-3">
                        {PAYMENT_METHODS.map(method => {
                            const Icon = method.icon;
                            const isSelected = selectedMethod === method.id;
                            return (
                                <div
                                    key={method.id}
                                    onClick={() => {
                                        setSelectedMethod(method.id);
                                        if (method.id !== 'credit') setInstallments('1');
                                    }}
                                    className={`
                                        cursor-pointer p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all
                                        ${isSelected
                                            ? `border-teal-500 bg-teal-50`
                                            : `border-slate-100 hover:border-slate-200 bg-white`
                                        }
                                    `}
                                >
                                    <Icon className={`w-6 h-6 ${isSelected ? 'text-teal-600' : method.color}`} />
                                    <span className={`font-medium ${isSelected ? 'text-teal-700' : 'text-slate-700'}`}>
                                        {method.label}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    {selectedMethod === 'credit' && (
                        <div className="space-y-2 pt-2 animate-in fade-in slide-in-from-top-2">
                            <Label>Número de Parcelas (meses)</Label>
                            <Input
                                type="number"
                                min={1}
                                max={48}
                                value={installments}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === '' || (parseInt(val) >= 1 && parseInt(val) <= 48)) {
                                        setInstallments(val);
                                    }
                                }}
                                className="text-center text-lg font-semibold"
                            />
                            {parseInt(installments) > 1 && (
                                <p className="text-sm text-center text-muted-foreground">
                                    {installments}x de R$ {formatMoney(installmentValue)}
                                </p>
                            )}
                        </div>
                    )}

                    <Button
                        className="w-full h-12 mt-4 bg-teal-600 hover:bg-teal-700 text-lg"
                        disabled={!selectedMethod}
                        onClick={handleConfirm}
                    >
                        Confirmar Pagamento
                        <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
