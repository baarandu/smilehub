import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Banknote, CreditCard, Smartphone, ArrowRight, Loader2, Info, User, Building2, AlertCircle, SplitSquareHorizontal } from 'lucide-react';
import { formatMoney } from '@/utils/budgetUtils';
import { settingsService } from '@/services/settings';
import { supabase } from '@/lib/supabase';
import { CardFeeConfig } from '@/types/database';
import type { PJSource } from '@/types/incomeTax';
import { SplitPaymentBuilder } from './SplitPaymentBuilder';
import type { SplitPaymentPortion } from '@/types/receivables';
import { useCardMachines } from '@/hooks/useCardMachines';
import { toLocalDateString } from '@/utils/formatters';

export interface FinancialBreakdown {
    grossAmount: number;
    discountAmount: number;
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

export type RevenueType = 'individual' | 'clinic';

export interface PayerData {
    revenue_type?: RevenueType;
    payer_is_patient: boolean;
    payer_type: 'PF' | 'PJ';
    payer_name: string | null;
    payer_cpf: string | null;
    pj_source_id: string | null;
}

interface PaymentMethodDialogProps {
    open: boolean;
    onClose: () => void;
    onConfirm: (method: string, installments: number, brand?: string, breakdown?: FinancialBreakdown, payerData?: PayerData, cardMachineId?: string | null, creditUsed?: number, paymentDate?: string) => void;
    onConfirmSplit?: (portions: SplitPaymentPortion[], cardMachineId?: string | null, creditUsed?: number) => void;
    itemName: string;
    value: number;
    locationRate?: number;
    loading?: boolean;
    patientName?: string;
    patientCpf?: string;
    pjSources?: PJSource[];
    creditBalance?: number;
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

const normalizeBrand = (brand?: string | null) =>
    (brand || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();

const brandTokens = (brand?: string | null) =>
    normalizeBrand(brand)
        .split(/[^a-z0-9]+/)
        .filter(Boolean);

const brandMatches = (configuredBrand: string, selectedBrand: string) => {
    const configured = normalizeBrand(configuredBrand);
    const selected = normalizeBrand(selectedBrand);
    if (!configured || !selected) return false;
    if (configured === selected) return true;

    const configuredTokens = brandTokens(configured);
    const selectedTokens = brandTokens(selected);
    return configuredTokens.some(token => selectedTokens.includes(token));
};

const isFallbackBrand = (brand: string) => {
    const normalized = normalizeBrand(brand);
    return ['others', 'outras bandeiras', 'outros', 'outra bandeira'].includes(normalized);
};

const findCardFeeConfig = (
    fees: CardFeeConfig[],
    selectedBrand: string,
    paymentType: string,
    installments: number,
) => {
    const samePaymentType = fees.filter(f => f.payment_type === paymentType);
    const sameBrand = samePaymentType.filter(f => brandMatches(f.brand, selectedBrand));
    const fallbackBrand = samePaymentType.filter(f => isFallbackBrand(f.brand));
    const candidates = sameBrand.length > 0 ? sameBrand : fallbackBrand;

    return (
        candidates.find(f => f.installments === installments) ||
        candidates.find(f => f.installments === 1) ||
        candidates
            .filter(f => typeof f.installments === 'number')
            .sort((a, b) => Math.abs((a.installments || 1) - installments) - Math.abs((b.installments || 1) - installments))[0] ||
        null
    );
};

export function PaymentMethodDialog({ open, onClose, onConfirm, onConfirmSplit, itemName, value, locationRate = 0, loading = false, patientName, patientCpf, pjSources = [], creditBalance = 0 }: PaymentMethodDialogProps) {
    const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
    const [installments, setInstallments] = useState('1');
    const [selectedBrand, setSelectedBrand] = useState<string>('visa');
    const [anticipate, setAnticipate] = useState(false);
    // Clinic-wide default: when enabled in Configurações Financeiras, credit-card
    // payments are anticipated automatically (the toggle below starts on).
    const [autoAnticipate, setAutoAnticipate] = useState(false);
    const [paymentDate, setPaymentDate] = useState(toLocalDateString(new Date()));

    // Split Payment Mode
    const [isSplitMode, setIsSplitMode] = useState(false);
    const [splitPortions, setSplitPortions] = useState<SplitPaymentPortion[]>([]);
    const [splitValid, setSplitValid] = useState(false);
    const [splitCreditUsed, setSplitCreditUsed] = useState(0);

    // Payer Data
    const [payerIsPatient, setPayerIsPatient] = useState(true);
    const [isClinicRevenue, setIsClinicRevenue] = useState(false);
    const [payerType, setPayerType] = useState<'PF' | 'PJ'>('PF');
    const [payerName, setPayerName] = useState('');
    const [payerCpf, setPayerCpf] = useState('');
    const [selectedPJSource, setSelectedPJSource] = useState('');

    // Discount & Credits
    const [discountStr, setDiscountStr] = useState('');
    const discountAmount = parseFloat(discountStr) || 0;
    
    const [creditUsedStr, setCreditUsedStr] = useState('');
    const creditUsedAmount = parseFloat(creditUsedStr) || 0;

    const baseValueForPayment = Math.max(value - discountAmount, 0);
    // The portion passed to the chosen payment method (e.g. credit card)
    const effectiveValue = Math.max(baseValueForPayment - creditUsedAmount, 0);

    // Financial Settings
    const [isLoadingSettings, setIsLoadingSettings] = useState(true);
    const [taxRate, setTaxRate] = useState(0);
    const [cardFees, setCardFees] = useState<CardFeeConfig[]>([]);
    const [feesLoading, setFeesLoading] = useState(false);
    const [clinicBrands, setClinicBrands] = useState<{ id: string; name: string }[]>([]);

    // Card Machines
    const { data: machines = [], isLoading: machinesLoading } = useCardMachines(false);
    const [selectedMachineId, setSelectedMachineId] = useState<string>('');
    const isCardMethod = selectedMethod === 'credit' || selectedMethod === 'debit';
    // A split (pagamento misto) that includes a card portion also needs a maquininha selected.
    const splitHasCard = isSplitMode && splitPortions.some(p => p.method === 'credit' || p.method === 'debit');
    // True when a maquininha must be chosen for this payment but none is selected yet.
    const needsMachineSelection = (isCardMethod || splitHasCard) && machines.length > 0 && !selectedMachineId;

    // Filter fees by selected machine (when one is selected)
    const machineFees = useMemo(() => {
        if (!selectedMachineId) return cardFees;
        return cardFees.filter(f => (f as any).card_machine_id === selectedMachineId);
    }, [cardFees, selectedMachineId]);

    // Build available brands from the clinic's configured card_brands list
    // (same source as the chips in Configurações Financeiras → Bandeiras de Cartão)
    const availableBrands = useMemo(() => {
        if (clinicBrands.length === 0) return CARD_BRANDS;
        return clinicBrands.map(b => ({
            id: b.name.trim().toLowerCase(),
            label: b.name.trim()
        }));
    }, [clinicBrands]);

    // Auto-select machine if only one exists
    useEffect(() => {
        if (machines.length === 1 && !selectedMachineId) {
            setSelectedMachineId(machines[0].id);
        }
    }, [machines, selectedMachineId]);

    useEffect(() => {
        if (open) {
            loadSettings();
            setAnticipate(false);
            setInstallments('1');
            // Set initial brand to the first available one
            setSelectedBrand('visa');
            setSelectedMethod(null);
            // Reset machine selection only if more than 1 machine (so dialog forces choice)
            if (machines.length > 1) setSelectedMachineId('');
            else if (machines.length === 1) setSelectedMachineId(machines[0].id);
            // Reset payer data
            setPayerIsPatient(true);
            setPayerType('PF');
            setPayerName('');
            setPayerCpf('');
            setSelectedPJSource('');
            // Reset discount and credits
            setDiscountStr('');
            setCreditUsedStr('');
            // Reset split mode
            setIsSplitMode(false);
            setSplitPortions([]);
            setSplitValid(false);
        }
    }, [open]);

    // Load card fees whenever the machines list resolves. The machines query may
    // still be in flight when the dialog opens, so loading fees a single time at
    // open would leave cardFees empty and silently zero every card fee.
    useEffect(() => {
        if (!open) return;
        const machineIds = machines.map(m => m.id);
        if (machineIds.length === 0) {
            setCardFees([]);
            return;
        }
        let cancelled = false;
        setFeesLoading(true);
        supabase
            .from('card_fee_config')
            .select('*')
            .in('card_machine_id', machineIds)
            .then(({ data }) => {
                if (cancelled) return;
                setCardFees((data || []) as CardFeeConfig[]);
                setFeesLoading(false);
            });
        return () => { cancelled = true; };
    }, [open, machines]);

    useEffect(() => {
        if (!open || !selectedMachineId) {
            setClinicBrands([]);
            return;
        }

        const loadMachineBrands = async () => {
            try {
                const brands = await settingsService.getCardBrands(selectedMachineId);
                setClinicBrands(brands || []);
            } catch {
                setClinicBrands([]);
            }
        };

        loadMachineBrands();
    }, [open, selectedMachineId]);

    // Update initial brand when availableBrands changes.
    // Prefer Visa, then Mastercard, then a combined "Visa / Mastercard" brand,
    // then anything containing "visa" or "mastercard", then the first available.
    useEffect(() => {
        if (availableBrands.length === 0) return;
        if (availableBrands.find(b => b.id.toLowerCase() === selectedBrand.toLowerCase())) return;
        const lower = (s: string) => s.toLowerCase();
        const preferred =
            availableBrands.find(b => lower(b.id) === 'visa') ||
            availableBrands.find(b => lower(b.id) === 'mastercard') ||
            availableBrands.find(b => lower(b.label).includes('visa') && lower(b.label).includes('mastercard')) ||
            availableBrands.find(b => lower(b.label).includes('visa')) ||
            availableBrands.find(b => lower(b.label).includes('mastercard')) ||
            availableBrands[0];
        setSelectedBrand(preferred.id);
    }, [availableBrands, selectedBrand]);

    const loadSettings = async () => {
        setIsLoadingSettings(true);
        try {
            const settings = await settingsService.getFinancialSettings();
            let totalTax = 0;
            if (settings) {
                totalTax += (settings.tax_rate || 0);
            }

            // Apply the clinic-wide "antecipar automaticamente" default so credit
            // payments start with anticipation enabled when the option is on.
            const auto = !!(settings as any)?.auto_anticipate;
            setAutoAnticipate(auto);
            setAnticipate(auto);

            const taxes = await settingsService.getTaxes();
            if (taxes && taxes.length > 0) {
                const taxesTotal = taxes.reduce((sum, tax) => sum + tax.rate, 0);
                totalTax += taxesTotal;
            }

            setTaxRate(totalTax);
        } catch (error) {
            console.error('Error loading financial settings:', error);
        } finally {
            setIsLoadingSettings(false);
        }
    };

    // Calculate Breakdown
    const breakdown = useMemo((): FinancialBreakdown => {
        const grossAmount = effectiveValue;
        const taxAmount = (grossAmount * taxRate) / 100;

        let cardFeeRate = 0;
        let cardFeeAmount = 0;
        let anticipationRate = 0;
        const anticipationAmount = 0;

        // Find applicable card fee
        if (selectedMethod === 'credit' || selectedMethod === 'debit') {
            const numInstallments = parseInt(installments) || 1;

            // Adjust installments for lookup: debit is always 1
            const lookupInstallments = selectedMethod === 'debit' ? 1 : numInstallments;

            const feeConfig = findCardFeeConfig(machineFees, selectedBrand, selectedMethod, lookupInstallments);

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
            discountAmount,
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
    }, [effectiveValue, discountAmount, taxRate, machineFees, selectedMethod, installments, selectedBrand, anticipate, locationRate]);


    const handleConfirm = () => {
        // Validate machine selection for card-based payments (incl. split with a card portion)
        if (needsMachineSelection) {
            return;
        }

        if (isSplitMode) {
            if (!splitValid || !onConfirmSplit) return;
            onConfirmSplit(splitPortions, splitHasCard ? selectedMachineId || null : null, splitCreditUsed);
            return;
        }

        // If paying entirely with credit balance, we don't need a selected method
        if (effectiveValue > 0 && !selectedMethod) return;
        if (!paymentDate) return;
        
        const numInstallments = selectedMethod && selectedMethod !== 'debit' ? parseInt(installments) || 1 : 1;

        const payerData: PayerData = {
            revenue_type: isClinicRevenue ? 'clinic' : 'individual',
            payer_is_patient: payerIsPatient,
            payer_type: payerType,
            payer_name: payerIsPatient ? null : (payerType === 'PF' ? payerName : null),
            payer_cpf: payerIsPatient ? (patientCpf || null) : (payerType === 'PF' ? payerCpf : null),
            pj_source_id: payerType === 'PJ' ? selectedPJSource : null,
        };

        const machineToSend = isCardMethod ? (selectedMachineId || null) : null;
        onConfirm(selectedMethod || 'credit_balance', numInstallments, selectedBrand, breakdown, payerData, machineToSend, creditUsedAmount, paymentDate);
        setSelectedMethod(null);
        setInstallments('1');
        setPaymentDate(toLocalDateString(new Date()));
    };

    const installmentValue = selectedMethod === 'credit' && parseInt(installments) > 1
        ? effectiveValue / parseInt(installments)
        : effectiveValue;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-xl p-0 gap-0 overflow-hidden" hideCloseButton>
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b bg-slate-50">
                    <div className="flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-[#a03f3d]" />
                        <span className="font-semibold">Registrar Pagamento</span>
                    </div>
                    <div className="text-right">
                        <div className="text-sm text-muted-foreground">{itemName}</div>
                        {discountAmount > 0 ? (
                            <>
                                <div className="text-sm text-muted-foreground line-through">R$ {formatMoney(value)}</div>
                                <div className="text-xl font-bold text-[#a03f3d]">R$ {formatMoney(effectiveValue)}</div>
                            </>
                        ) : (
                            <div className="text-xl font-bold text-[#a03f3d]">R$ {formatMoney(value)}</div>
                        )}
                    </div>
                </div>

                {isLoadingSettings || machinesLoading || feesLoading ? (
                    <div className="flex justify-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin text-[#a03f3d]" />
                    </div>
                ) : (
                    <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                        {/* Split Payment Toggle */}
                        {onConfirmSplit && (
                            <div className="flex items-center justify-between p-3 bg-violet-50 rounded-lg border border-violet-100">
                                <div className="flex items-center gap-2">
                                    <SplitSquareHorizontal className="w-4 h-4 text-violet-600" />
                                    <div>
                                        <Label className="text-sm text-violet-900 cursor-pointer" htmlFor="split-toggle">Vários meios / Parcelar / Fiado</Label>
                                        <p className="text-xs text-violet-600">Usar mais de um meio de pagamento, dividir em parcelas, agendar ou registrar fiado</p>
                                    </div>
                                </div>
                                <Switch
                                    id="split-toggle"
                                    checked={isSplitMode}
                                    onCheckedChange={(checked) => {
                                        setIsSplitMode(checked);
                                        // Desconto/crédito digitados no modo simples não são enviados
                                        // no confirm do modo dividido — lá o crédito é o restante não
                                        // alocado, calculado pelo SplitPaymentBuilder sobre o valor cheio.
                                        if (checked) {
                                            setDiscountStr('');
                                            setCreditUsedStr('');
                                        }
                                    }}
                                />
                            </div>
                        )}

                        {isSplitMode ? (
                            <SplitPaymentBuilder
                                totalValue={effectiveValue}
                                locationRate={locationRate}
                                taxRate={taxRate}
                                cardFees={cardFees}
                                availableBrands={availableBrands}
                                patientName={patientName}
                                patientCpf={patientCpf}
                                pjSources={pjSources}
                                creditBalance={creditBalance}
                                onPortionsChange={(portions, valid, creditUsed) => {
                                    setSplitPortions(portions);
                                    setSplitValid(valid);
                                    setSplitCreditUsed(creditUsed);
                                }}
                            />
                        ) : null}

                        {/* Maquininha selection for split payments that include a card portion */}
                        {isSplitMode && splitHasCard && (
                            machines.length === 0 ? (
                                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 flex items-start gap-2">
                                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                    <span>Nenhuma maquininha cadastrada. Acesse Configurações Financeiras para cadastrar.</span>
                                </div>
                            ) : (
                                <div className="mt-3 space-y-1.5">
                                    <Label className="text-sm">Maquininha</Label>
                                    <Select value={selectedMachineId} onValueChange={setSelectedMachineId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione a maquininha usada" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {machines.map(m => (
                                                <SelectItem key={m.id} value={m.id}>
                                                    {m.name}{m.dentist_name ? ` — ${m.dentist_name}` : ''}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )
                        )}

                        {!isSplitMode && (<>
                        {/* Payment Method Selection */}
                        {effectiveValue > 0 ? (
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Forma de Pagamento (Restante)</Label>
                                <div className="grid grid-cols-4 gap-2">
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
                                                    } else {
                                                        // Honor the clinic-wide "antecipar automaticamente" default
                                                        setAnticipate(autoAnticipate);
                                                    }
                                                }}
                                                className={`cursor-pointer p-3 rounded-lg border-2 flex flex-col items-center gap-1.5 transition-all ${isSelected ? 'border-red-500 bg-red-50' : 'border-slate-200 hover:border-slate-300 bg-white'}`}
                                            >
                                                <Icon className={`w-5 h-5 ${isSelected ? 'text-[#a03f3d]' : method.color}`} />
                                                <span className={`text-xs font-medium ${isSelected ? 'text-[#8b3634]' : 'text-slate-600'}`}>
                                                    {method.label}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-sm font-medium text-center">
                                Valor coberto integralmente com o crédito do paciente.
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <Label htmlFor="payment-date" className="text-sm">Data do recebimento</Label>
                            <Input
                                id="payment-date"
                                type="date"
                                value={paymentDate}
                                onChange={(event) => setPaymentDate(event.target.value)}
                                required
                            />
                        </div>

                        {/* Credit Card Specifics */}
                        {(selectedMethod === 'credit' || selectedMethod === 'debit') && (
                            <div className="space-y-3 pt-3 border-t animate-in fade-in">
                                {machines.length === 0 ? (
                                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 flex items-start gap-2">
                                        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                        <span>Nenhuma maquininha cadastrada. Acesse Configurações Financeiras para cadastrar.</span>
                                    </div>
                                ) : (
                                    <div className="space-y-1.5">
                                        <Label className="text-sm">Maquininha</Label>
                                        <Select value={selectedMachineId} onValueChange={setSelectedMachineId}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione a maquininha usada" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {machines.map(m => (
                                                    <SelectItem key={m.id} value={m.id}>
                                                        {m.name}{m.dentist_name ? ` — ${m.dentist_name}` : ''}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                                <div className="flex gap-3">
                                    <div className="flex-1 space-y-1.5">
                                        <Label className="text-sm">Bandeira</Label>
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
                                        <div className="w-24 space-y-1.5">
                                            <Label className="text-sm">Parcelas</Label>
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
                                                className="text-center font-semibold"
                                            />
                                        </div>
                                    )}
                                </div>

                                {selectedMethod === 'credit' && parseInt(installments) > 1 && (
                                    <div className="text-sm text-muted-foreground text-center bg-slate-50 py-2 rounded">
                                        {installments}x de R$ {formatMoney(installmentValue)}
                                    </div>
                                )}

                                {breakdown.cardFeeRate === 0 && (
                                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 flex items-start gap-2">
                                        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                        <span>Nenhuma taxa encontrada para esta maquininha, bandeira e forma de pagamento.</span>
                                    </div>
                                )}

                                <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                                    <div>
                                        <Label className="text-sm text-indigo-900 cursor-pointer" htmlFor="antecipar">Antecipar Recebimento</Label>
                                        <p className="text-xs text-indigo-600">
                                            {anticipate
                                                ? 'Valor lançado de uma vez no mês do pagamento (taxa de antecipação aplicada)'
                                                : 'Parcelas distribuídas nos próximos meses conforme o número de parcelas'}
                                        </p>
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
                        <div className="space-y-3 pt-3 border-t">
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                                <div className="flex items-center gap-3">
                                    <User className="w-4 h-4 text-gray-500" />
                                    <div>
                                        <span className="text-sm font-medium">Paciente é o pagador</span>
                                        {patientName && <p className="text-xs text-gray-500">{patientName}</p>}
                                    </div>
                                </div>
                                <Switch
                                    checked={payerIsPatient}
                                    onCheckedChange={(checked) => {
                                        setPayerIsPatient(checked);
                                        if (checked) setPayerType('PF');
                                    }}
                                />
                            </div>

                            {payerIsPatient && patientCpf && (
                                <div className="text-xs text-green-700 bg-green-50 px-3 py-2 rounded flex items-center gap-2">
                                    <User className="w-4 h-4" /> CPF: {patientCpf}
                                </div>
                            )}

                            {!payerIsPatient && (
                                <div className="space-y-3 animate-in fade-in">
                                    <div className="flex gap-2">
                                        <Button
                                            type="button"
                                            variant={payerType === 'PF' ? 'default' : 'outline'}
                                            className={`flex-1 ${payerType === 'PF' ? 'bg-[#a03f3d] hover:bg-[#8b3634]' : ''}`}
                                            onClick={() => setPayerType('PF')}
                                        >
                                            <User className="w-4 h-4 mr-2" /> Pessoa Física
                                        </Button>
                                        <Button
                                            type="button"
                                            variant={payerType === 'PJ' ? 'default' : 'outline'}
                                            className={`flex-1 ${payerType === 'PJ' ? 'bg-[#a03f3d] hover:bg-[#8b3634]' : ''}`}
                                            onClick={() => setPayerType('PJ')}
                                        >
                                            <Building2 className="w-4 h-4 mr-2" /> Convênio/PJ
                                        </Button>
                                    </div>

                                    {payerType === 'PF' && (
                                        <div className="grid grid-cols-2 gap-3">
                                            <Input placeholder="Nome do pagador" value={payerName} onChange={(e) => setPayerName(e.target.value)} />
                                            <Input placeholder="CPF" value={payerCpf} onChange={(e) => setPayerCpf(applyCPFMask(e.target.value))} />
                                        </div>
                                    )}

                                    {payerType === 'PJ' && pjSources.length > 0 && (
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

                        {/* Discount */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-sm font-medium">Desconto (R$)</Label>
                                <Input
                                    type="number"
                                    min={0}
                                    max={value}
                                    step="0.01"
                                    placeholder="0,00"
                                    value={discountStr}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        if (e.target.value === '' || (val >= 0 && val <= value)) {
                                            setDiscountStr(e.target.value);
                                            // Reset credit if it exceeds new base
                                            if (creditUsedAmount > Math.max(value - val, 0)) {
                                                setCreditUsedStr('');
                                            }
                                        }
                                    }}
                                    className="font-semibold"
                                />
                            </div>

                            {/* Usar Crédito */}
                            {(creditBalance || 0) > 0 && (
                                <div className="space-y-1.5">
                                    <Label className="text-sm font-medium text-emerald-700">Usar Crédito (Max: R$ {formatMoney(Math.min(creditBalance || 0, baseValueForPayment))})</Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        max={Math.min(creditBalance || 0, baseValueForPayment)}
                                        step="0.01"
                                        placeholder="0,00"
                                        value={creditUsedStr}
                                        onChange={(e) => {
                                            const val = parseFloat(e.target.value);
                                            const maxAllowed = Math.min(creditBalance || 0, baseValueForPayment);
                                            if (e.target.value === '' || (val >= 0 && val <= maxAllowed)) {
                                                setCreditUsedStr(e.target.value);
                                            }
                                        }}
                                        className="font-semibold border-emerald-300 focus-visible:ring-emerald-500"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Revenue Type Toggle (for production report) */}
                        <div className="flex items-start justify-between gap-3 p-3 bg-purple-50/50 rounded-lg border border-purple-100">
                            <div className="flex items-start gap-2">
                                <Building2 className="w-4 h-4 text-purple-500 mt-0.5 shrink-0" />
                                <div>
                                    <span className="text-sm font-medium text-purple-800">Receita compartilhada da clínica</span>
                                    <p className="text-[11px] text-purple-600/80 leading-tight">
                                        Ative quando não for produção técnica de um dentista (ex: venda de produto, taxa de estrutura).
                                    </p>
                                </div>
                            </div>
                            <Switch
                                checked={isClinicRevenue}
                                onCheckedChange={setIsClinicRevenue}
                            />
                        </div>

                        {/* Financial Breakdown */}
                        <div className="bg-slate-50 p-4 rounded-lg space-y-2 text-sm">
                            <div className="flex justify-between text-slate-600">
                                <span>Valor Original</span>
                                <span>R$ {formatMoney(value)}</span>
                            </div>
                            {discountAmount > 0 && (
                                <div className="flex justify-between text-emerald-600">
                                    <span>Desconto</span>
                                    <span>- R$ {formatMoney(discountAmount)}</span>
                                </div>
                            )}
                            {creditUsedAmount > 0 && (
                                <div className="flex justify-between text-emerald-600 font-medium">
                                    <span>Crédito Utilizado</span>
                                    <span>- R$ {formatMoney(creditUsedAmount)}</span>
                                </div>
                            )}
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
                                    <span>Taxa Local ({breakdown.locationRate}%)</span>
                                    <span>- R$ {formatMoney(breakdown.locationAmount)}</span>
                                </div>
                            )}
                            <div className="pt-2 mt-2 border-t border-slate-200 flex justify-between font-bold text-slate-900 text-base">
                                <span>Valor Líquido</span>
                                <span className="text-emerald-600">R$ {formatMoney(breakdown.netAmount)}</span>
                            </div>
                        </div>
                        </>)}
                    </div>
                )}

                {/* Footer Button */}
                <div className="p-4 border-t bg-white">
                    <Button
                        className="w-full h-11 bg-[#a03f3d] hover:bg-[#8b3634] text-base"
                        disabled={
                            isSplitMode
                                ? (!splitValid || loading || needsMachineSelection)
                                : (
                                    (effectiveValue > 0 && !selectedMethod) || loading || isLoadingSettings ||
                                    needsMachineSelection
                                )
                        }
                        onClick={handleConfirm}
                    >
                        {loading ? (
                            <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Processando...</>
                        ) : (
                            <><ArrowRight className="w-5 h-5 mr-2" /> Confirmar Pagamento</>
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
