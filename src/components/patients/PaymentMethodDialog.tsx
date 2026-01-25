import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Banknote, CreditCard, Smartphone, ArrowRight, Loader2, Info, User, Building2, AlertCircle } from 'lucide-react';
import { formatMoney } from '@/utils/budgetUtils';
import { settingsService } from '@/services/settings';
import { CardFeeConfig } from '@/types/database';
import type { PJSource } from '@/types/incomeTax';

export interface FinancialBreakdown {
    grossAmount: number;
    taxRate: number;
    taxAmount: number;
    cardFeeRate: number;
    cardFeeAmount: number;
    anticipationRate: number;
    anticipationAmount: number;
    locationRate: number;
    locationAmount: number;
    netAmount: number;
    isAnticipated: boolean;
}

export interface PayerData {
    payer_is_patient: boolean;
    payer_type: 'PF' | 'PJ';
    payer_name: string | null;
    payer_cpf: string | null;
    pj_source_id: string | null;
}

interface PaymentMethodDialogProps {
    open: boolean;
    onClose: () => void;
    onConfirm: (method: string, installments: number, brand?: string, breakdown?: FinancialBreakdown, payerData?: PayerData) => void;
    itemName: string;
    value: number;
    locationRate?: number;
    loading?: boolean;
    patientName?: string;
    patientCpf?: string;
    pjSources?: PJSource[];
}

// CPF mask
const applyCPFMask = (value: string): string => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
};

// Payment method icons and labels
const PAYMENT_METHODS = [
    { id: 'pix', label: 'PIX', icon: Smartphone, color: 'text-emerald-600' },
    { id: 'credit', label: 'Crédito', icon: CreditCard, color: 'text-blue-600' },
    { id: 'debit', label: 'Débito', icon: CreditCard, color: 'text-purple-600' },
    { id: 'cash', label: 'Dinheiro', icon: Banknote, color: 'text-green-600' },
];

// Default card brands (used when no settings are configured)
const CARD_BRANDS = [
    { id: 'visa', label: 'Visa' },
    { id: 'mastercard', label: 'Mastercard' },
    { id: 'elo', label: 'Elo' },
    { id: 'amex', label: 'American Express' },
    { id: 'hipercard', label: 'Hipercard' },
];

export function PaymentMethodDialog({ open, onClose, onConfirm, itemName, value, locationRate = 0, loading = false, patientName, patientCpf, pjSources = [] }: PaymentMethodDialogProps) {
    const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
    const [installments, setInstallments] = useState('1');
    const [selectedBrand, setSelectedBrand] = useState<string>('visa');
    const [anticipate, setAnticipate] = useState(false);

    // Payer Data
    const [payerIsPatient, setPayerIsPatient] = useState(true);
    const [payerType, setPayerType] = useState<'PF' | 'PJ'>('PF');
    const [payerName, setPayerName] = useState('');
    const [payerCpf, setPayerCpf] = useState('');
    const [selectedPJSource, setSelectedPJSource] = useState('');

    // Financial Settings
    const [isLoadingSettings, setIsLoadingSettings] = useState(true);
    const [taxRate, setTaxRate] = useState(0);
    const [cardFees, setCardFees] = useState<CardFeeConfig[]>([]);

    // Build available brands from settings
    const availableBrands = useMemo(() => {
        if (cardFees.length === 0) return CARD_BRANDS;

        // Get unique brand names from settings - exactly as entered
        const uniqueNames = Array.from(new Set(cardFees.map(f => f.brand.trim())));

        return uniqueNames.map(name => ({
            id: name,
            // Capitalize first letter of each word/segment (handles "visa/mastercard" -> "Visa/Mastercard")
            label: name.replace(/\b\w/g, l => l.toUpperCase())
        })).sort((a, b) => a.label.localeCompare(b.label));
    }, [cardFees]);

    useEffect(() => {
        if (open) {
            loadSettings();
            setAnticipate(false);
            setInstallments('1');
            // Set initial brand to the first available one
            setSelectedBrand('visa');
            setSelectedMethod(null);
            // Reset payer data
            setPayerIsPatient(true);
            setPayerType('PF');
            setPayerName('');
            setPayerCpf('');
            setSelectedPJSource('');
        }
    }, [open]);

    // Update initial brand when availableBrands changes
    useEffect(() => {
        if (availableBrands.length > 0 && !availableBrands.find(b => b.id === selectedBrand)) {
            setSelectedBrand(availableBrands[0].id);
        }
    }, [availableBrands, selectedBrand]);

    const loadSettings = async () => {
        setIsLoadingSettings(true);
        try {
            const settings = await settingsService.getFinancialSettings();
            let totalTax = 0;
            if (settings) {
                totalTax += (settings.tax_rate || 0);
            }

            // Load multiple taxes (ISS, etc)
            const taxes = await settingsService.getTaxes();
            if (taxes && taxes.length > 0) {
                const taxesTotal = taxes.reduce((sum, tax) => sum + tax.rate, 0);
                totalTax += taxesTotal;
            }

            setTaxRate(totalTax);
            const fees = await settingsService.getCardFees();
            if (fees) {
                setCardFees(fees);
            }
        } catch (error) {
            console.error('Error loading financial settings:', error);
        } finally {
            setIsLoadingSettings(false);
        }
    };

    // Calculate Breakdown
    const breakdown = useMemo((): FinancialBreakdown => {
        const grossAmount = value;
        const taxAmount = (grossAmount * taxRate) / 100;

        let cardFeeRate = 0;
        let cardFeeAmount = 0;
        let anticipationRate = 0;
        let anticipationAmount = 0;

        // Find applicable card fee
        if (selectedMethod === 'credit' || selectedMethod === 'debit') {
            const numInstallments = parseInt(installments) || 1;

            // Adjust installments for lookup: debit is always 1
            const lookupInstallments = selectedMethod === 'debit' ? 1 : numInstallments;

            let feeConfig = cardFees.find(f =>
                f.brand.toLowerCase() === selectedBrand.toLowerCase() &&
                f.payment_type === selectedMethod &&
                f.installments === lookupInstallments
            );

            // Fallback: try 'others' or 'outras bandeiras' brand if no specific brand config found
            if (!feeConfig) {
                feeConfig = cardFees.find(f =>
                    (f.brand.toLowerCase() === 'others' || f.brand.toLowerCase() === 'outras bandeiras' || f.brand.toLowerCase() === 'outros') &&
                    f.payment_type === selectedMethod &&
                    f.installments === lookupInstallments
                );
            }

            if (feeConfig) {
                // If user wants to anticipate and there's an anticipation rate, use it
                // Otherwise use the normal rate
                if (anticipate && feeConfig.anticipation_rate) {
                    cardFeeRate = feeConfig.anticipation_rate;
                } else {
                    cardFeeRate = feeConfig.rate;
                }

                // Store the anticipation rate if available (for display purposes)
                if (feeConfig.anticipation_rate) {
                    anticipationRate = feeConfig.anticipation_rate;
                }
            }

            cardFeeAmount = (grossAmount * cardFeeRate) / 100;
        }

        // Anticipation Logic
        let isAnticipatedLogic = anticipate;
        if (selectedMethod === 'credit' || selectedMethod === 'debit') {
            isAnticipatedLogic = selectedMethod === 'debit' || anticipate;
        }

        // Location Rate Logic: (Gross - CardFee) * Rate
        const safeCardFee = cardFeeAmount || 0;

        const baseForLocation = grossAmount - safeCardFee;
        const locationAmount = (baseForLocation * locationRate) / 100;

        const netAmount = grossAmount - taxAmount - safeCardFee - locationAmount;

        return {
            grossAmount,
            taxRate,
            taxAmount,
            cardFeeRate,
            cardFeeAmount,
            anticipationRate: anticipate ? anticipationRate : 0,
            anticipationAmount: 0, // Anticipation is now absorbed into cardFeeRate when anticipate=true
            locationRate,
            locationAmount,
            netAmount,
            isAnticipated: isAnticipatedLogic
        };
    }, [value, taxRate, cardFees, selectedMethod, installments, selectedBrand, anticipate, locationRate]);


    const handleConfirm = () => {
        if (!selectedMethod) return;
        const numInstallments = selectedMethod !== 'debit' ? parseInt(installments) || 1 : 1;

        // Build payer data
        const payerData: PayerData = {
            payer_is_patient: payerIsPatient,
            payer_type: payerType,
            payer_name: payerIsPatient ? null : (payerType === 'PF' ? payerName : null),
            payer_cpf: payerIsPatient ? (patientCpf || null) : (payerType === 'PF' ? payerCpf : null),
            pj_source_id: payerType === 'PJ' ? selectedPJSource : null,
        };

        onConfirm(selectedMethod, numInstallments, selectedBrand, breakdown, payerData);
        setSelectedMethod(null);
        setInstallments('1');
    };

    const installmentValue = selectedMethod === 'credit' && parseInt(installments) > 1
        ? value / parseInt(installments)
        : value;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-center">Registrar Pagamento</DialogTitle>
                </DialogHeader>

                {isLoadingSettings ? (
                    <div className="flex justify-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin text-[#a03f3d]" />
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Amount Display */}
                        <div className="text-center py-4 border-b bg-gray-50 rounded-t-lg -mx-6 px-6">
                            <div className="text-sm text-muted-foreground">{itemName}</div>
                            <div className="text-3xl font-bold text-[#a03f3d] mt-1">
                                R$ {formatMoney(value)}
                            </div>
                        </div>

                        {/* Payment Method Selection */}
                        <div className="space-y-3">
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
                                                if (method.id !== 'credit') {
                                                    setInstallments('1');
                                                    setAnticipate(false);
                                                }
                                            }}
                                            className={`
                                                cursor-pointer p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all
                                                ${isSelected
                                                    ? `border-red-500 bg-red-50`
                                                    : `border-slate-100 hover:border-slate-200 bg-white`
                                                }
                                            `}
                                        >
                                            <Icon className={`w-5 h-5 ${isSelected ? 'text-[#a03f3d]' : method.color}`} />
                                            <span className={`text-sm font-medium ${isSelected ? 'text-[#8b3634]' : 'text-slate-700'}`}>
                                                {method.label}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Credit Card Specifics */}
                        {(selectedMethod === 'credit' || selectedMethod === 'debit') && (
                            <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-top-2 border-t mt-4">
                                <div className="space-y-2">
                                    <Label>Bandeira do Cartão</Label>
                                    <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableBrands.map(brand => (
                                                <SelectItem key={brand.id} value={brand.id}>{brand.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {selectedMethod !== 'debit' && (
                                    <div className="space-y-2">
                                        <Label>Parcelamento</Label>
                                        <div className="flex gap-2">
                                            <Input
                                                type="number"
                                                min={1}
                                                max={12}
                                                value={installments}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    if (val === '' || (parseInt(val) >= 1 && parseInt(val) <= 12)) {
                                                        setInstallments(val);
                                                    }
                                                }}
                                                className="w-24 text-center font-semibold"
                                            />
                                            <div className="flex-1 flex items-center text-sm text-muted-foreground bg-gray-50 px-3 rounded-md border">
                                                {parseInt(installments) > 1
                                                    ? `${installments}x de R$ ${formatMoney(installmentValue)}`
                                                    : 'À vista'
                                                }
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                                    <div className="flex flex-col">
                                        <Label className="text-indigo-900 cursor-pointer" htmlFor="antecipar">Antecipar Recebimento</Label>
                                        <span className="text-xs text-indigo-600">Receber tudo agora (taxa extra pode aplicar)</span>
                                    </div>
                                    <Switch
                                        id="antecipar"
                                        checked={anticipate}
                                        onCheckedChange={setAnticipate}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Payer Section */}
                        <div className="space-y-3 pt-2 border-t mt-4">
                            <Label>Quem está pagando?</Label>

                            {/* Patient is payer toggle */}
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                                <div className="flex items-center gap-2">
                                    <User className="w-4 h-4 text-gray-600" />
                                    <div>
                                        <span className="font-medium text-sm">Paciente é o pagador</span>
                                        {patientName && (
                                            <p className="text-xs text-gray-500">{patientName}</p>
                                        )}
                                    </div>
                                </div>
                                <Switch
                                    checked={payerIsPatient}
                                    onCheckedChange={(checked) => {
                                        setPayerIsPatient(checked);
                                        if (checked) {
                                            setPayerType('PF');
                                        }
                                    }}
                                />
                            </div>

                            {/* Show patient CPF status */}
                            {payerIsPatient && (
                                <div className={`p-2 rounded-lg text-xs flex items-center gap-2 ${patientCpf ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                                    {patientCpf ? (
                                        <>
                                            <User className="w-3 h-3" />
                                            CPF: {patientCpf}
                                        </>
                                    ) : (
                                        <>
                                            <AlertCircle className="w-3 h-3" />
                                            CPF não cadastrado - pode ser preenchido depois no menu IR
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Alternative payer options */}
                            {!payerIsPatient && (
                                <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                    {/* PF/PJ Toggle */}
                                    <div className="flex gap-2">
                                        <Button
                                            type="button"
                                            variant={payerType === 'PF' ? 'default' : 'outline'}
                                            className={payerType === 'PF' ? 'flex-1 bg-[#a03f3d] hover:bg-[#8b3634]' : 'flex-1'}
                                            onClick={() => setPayerType('PF')}
                                        >
                                            <User className="w-4 h-4 mr-2" />
                                            Pessoa Física
                                        </Button>
                                        <Button
                                            type="button"
                                            variant={payerType === 'PJ' ? 'default' : 'outline'}
                                            className={payerType === 'PJ' ? 'flex-1 bg-[#a03f3d] hover:bg-[#8b3634]' : 'flex-1'}
                                            onClick={() => setPayerType('PJ')}
                                        >
                                            <Building2 className="w-4 h-4 mr-2" />
                                            Convênio/PJ
                                        </Button>
                                    </div>

                                    {/* PF Fields */}
                                    {payerType === 'PF' && (
                                        <div className="space-y-2">
                                            <div>
                                                <Label className="text-xs">Nome do Pagador</Label>
                                                <Input
                                                    placeholder="Nome completo"
                                                    value={payerName}
                                                    onChange={(e) => setPayerName(e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <Label className="text-xs">CPF do Pagador</Label>
                                                <Input
                                                    placeholder="000.000.000-00"
                                                    value={payerCpf}
                                                    onChange={(e) => setPayerCpf(applyCPFMask(e.target.value))}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* PJ Fields */}
                                    {payerType === 'PJ' && (
                                        <div className="space-y-2">
                                            <Label className="text-xs">Fonte Pagadora (Convênio)</Label>
                                            {pjSources.length === 0 ? (
                                                <p className="text-xs text-amber-600 p-2 bg-amber-50 rounded">
                                                    Nenhum convênio cadastrado. Adicione nas configurações do IR.
                                                </p>
                                            ) : (
                                                <Select value={selectedPJSource} onValueChange={setSelectedPJSource}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Selecione o convênio" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {pjSources.filter(s => s.is_active).map((source) => (
                                                            <SelectItem key={source.id} value={source.id}>
                                                                {source.nome_fantasia || source.razao_social}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Financial Breakdown Summary */}
                        <div className="bg-slate-50 p-4 rounded-lg space-y-2 text-sm">
                            <div className="flex justify-between text-slate-600">
                                <span>Valor Bruto</span>
                                <span>R$ {formatMoney(breakdown.grossAmount)}</span>
                            </div>
                            {breakdown.taxAmount > 0 && (
                                <div className="flex justify-between text-red-500">
                                    <span>Imposto ({breakdown.taxRate}%)</span>
                                    <span>- R$ {formatMoney(breakdown.taxAmount)}</span>
                                </div>
                            )}
                            {breakdown.cardFeeAmount > 0 && (
                                <div className="flex justify-between text-red-500">
                                    <span>Taxa Cartão ({breakdown.cardFeeRate}%)</span>
                                    <span>- R$ {formatMoney(breakdown.cardFeeAmount)}</span>
                                </div>
                            )}
                            {breakdown.locationAmount > 0 && (
                                <div className="flex justify-between text-red-500">
                                    <span>Taxa Procedimento ({breakdown.locationRate}%)</span>
                                    <span>- R$ {formatMoney(breakdown.locationAmount)}</span>
                                </div>
                            )}
                            {breakdown.anticipationAmount > 0 && (
                                <div className="flex justify-between text-red-500">
                                    <span>Antecipação</span>
                                    <span>- R$ {formatMoney(breakdown.anticipationAmount)}</span>
                                </div>
                            )}
                            <div className="pt-2 mt-2 border-t border-slate-200 flex justify-between font-bold text-slate-900 text-base">
                                <span>Valor Líquido</span>
                                <span className="text-emerald-600">R$ {formatMoney(breakdown.netAmount)}</span>
                            </div>
                        </div>

                        <Button
                            className="w-full h-12 mt-2 bg-[#a03f3d] hover:bg-[#8b3634] text-lg"
                            disabled={!selectedMethod || loading || isLoadingSettings}
                            onClick={handleConfirm}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                    Processando...
                                </>
                            ) : (
                                <>
                                    Confirmar
                                    <ArrowRight className="w-5 h-5 ml-2" />
                                </>
                            )}
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
