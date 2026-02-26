import { Alert } from 'react-native';
import { budgetsService } from '../services/budgets';
import { financialService } from '../services/financial';
import { prosthesisService } from '../services/prosthesis';
import { supabase } from '../lib/supabase';
import { type ToothEntry, calculateToothTotal, getToothDisplayName, calculateBudgetStatus } from '../components/patients/budgetUtils';
import type { BudgetWithItems, Patient } from '../types/database';

// Prosthesis integration helpers (mirrors web src/utils/prosthesis.ts)
const TREATMENT_TO_PROSTHESIS_TYPE: Record<string, string> = {
    'Bloco': 'onlay',
    'Coroa': 'coroa',
    'Faceta': 'faceta',
    'Implante': 'implante',
    'Pino': 'pino',
    'Prótese Removível': 'protese_removivel',
};

const PROSTHETIC_TREATMENTS = Object.keys(TREATMENT_TO_PROSTHESIS_TYPE);

function isProstheticTreatment(treatments: string[]): boolean {
    return treatments.some(t => PROSTHETIC_TREATMENTS.includes(t));
}

function getProsthesisTypeFromTreatments(treatments: string[]): string | null {
    for (const t of treatments) {
        if (TREATMENT_TO_PROSTHESIS_TYPE[t]) return TREATMENT_TO_PROSTHESIS_TYPE[t];
    }
    return null;
}

function hasLabTreatment(tooth: ToothEntry): boolean {
    const prostheticInItem = tooth.treatments.filter(t => PROSTHETIC_TREATMENTS.includes(t));
    if (prostheticInItem.length === 0) return false;
    if (!tooth.labTreatments) return true;
    return prostheticInItem.some(t => tooth.labTreatments![t] !== false);
}

const VALID_MATERIALS = ['zirconia', 'porcelana', 'resina', 'metal', 'emax', 'ceramica', 'acrilico', 'metalceramica', 'outro'];

const MATERIAL_MAP: Record<string, string> = {
    'zircônia': 'zirconia', 'zirconia': 'zirconia',
    'porcelana': 'porcelana',
    'resina': 'resina',
    'metal': 'metal',
    'e-max': 'emax', 'emax': 'emax',
    'cerâmica': 'ceramica', 'ceramica': 'ceramica',
    'acrílico': 'acrilico', 'acrilico': 'acrilico',
    'metalocerâmica': 'metalceramica', 'metalceramica': 'metalceramica', 'metalocêramica': 'metalceramica',
    'fibra de vidro': 'outro',
};

function normalizeMaterial(raw: string | null | undefined): string | null {
    if (!raw) return null;
    const lower = raw.trim().toLowerCase();
    if (!lower) return null;
    if (MATERIAL_MAP[lower]) return MATERIAL_MAP[lower];
    if (VALID_MATERIALS.includes(lower)) return lower;
    return 'outro';
}

interface PaymentItem {
    budgetId: string;
    toothIndex: number;
    tooth: ToothEntry;
    budgetDate: string;
}

interface PaymentBreakdown {
    grossAmount: number;
    netAmount: number;
    taxRate: number;
    taxAmount: number;
    cardFeeRate: number;
    cardFeeAmount: number;
    anticipationRate: number;
    anticipationAmount: number;
    locationRate: number;
    locationAmount: number;
}

interface Transaction {
    date: string;
    amount: number;
    method: string;
}

interface PayerData {
    payer_is_patient: boolean;
    payer_type: 'PF' | 'PJ';
    payer_name: string | null;
    payer_cpf: string | null;
    pj_source_id: string | null;
}

export function usePatientPayments(
    budgets: BudgetWithItems[],
    patient: Patient | null,
    loadBudgets: () => void,
    clinicId?: string | null
) {
    const autoCreateProsthesisOrder = async (tooth: ToothEntry, toothIndex: number, budgetId: string): Promise<boolean> => {
        if (!clinicId) return false;
        if (!isProstheticTreatment(tooth.treatments)) return false;
        if (!hasLabTreatment(tooth)) return false;

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return false;

            const VALID_TYPES = ['coroa', 'ponte', 'protese_total', 'protese_parcial', 'protese_removivel', 'faceta', 'onlay', 'inlay', 'pino', 'provisorio', 'nucleo', 'implante', 'outro'];
            const rawType = (tooth as any).prosthesisType || getProsthesisTypeFromTreatments(tooth.treatments) || 'outro';
            const type = VALID_TYPES.includes(rawType) ? rawType : 'outro';
            const value = Object.values(tooth.values).reduce((a: number, b: unknown) => a + (parseInt(b as string) || 0) / 100, 0);

            let material: string | null = null;
            if (tooth.materials) {
                for (const t of tooth.treatments) {
                    if (tooth.materials[t]) { material = tooth.materials[t]; break; }
                }
            }

            const parseLabCost = (val?: string): number | null => {
                if (!val) return null;
                const cents = parseInt(val, 10);
                if (isNaN(cents) || cents === 0) return null;
                return cents / 100;
            };

            await prosthesisService.createOrder({
                clinic_id: clinicId,
                patient_id: patient?.id,
                dentist_id: user.id,
                type,
                material: normalizeMaterial(material),
                tooth_numbers: tooth.tooth ? [tooth.tooth] : [],
                patient_price: value,
                lab_id: (tooth as any).prosthesisLabId || null,
                lab_cost: parseLabCost((tooth as any).prosthesisLabCost),
                color: (tooth as any).prosthesisColor || null,
                shade_details: (tooth as any).prosthesisShadeDetails || null,
                cementation_type: (tooth as any).prosthesisCementation || null,
                estimated_delivery_date: (tooth as any).prosthesisDeliveryDate || null,
                notes: (tooth as any).prosthesisNotes || null,
                special_instructions: (tooth as any).prosthesisInstructions || null,
                budget_id: budgetId,
                budget_tooth_index: toothIndex,
            } as any);

            return true;
        } catch (err) {
            console.error('Erro ao criar ordem de prótese automaticamente:', err);
            return false;
        }
    };

    const getAllPaymentItems = (): PaymentItem[] => {
        const items: PaymentItem[] = [];
        budgets.forEach(budget => {
            if (budget.notes) {
                try {
                    const parsed = JSON.parse(budget.notes);
                    if (parsed.teeth) {
                        parsed.teeth.forEach((tooth: ToothEntry, index: number) => {
                            if (tooth.status === 'approved' || tooth.status === 'paid') {
                                items.push({ budgetId: budget.id, toothIndex: index, tooth, budgetDate: budget.date });
                            }
                        });
                    }
                } catch (e) {
                    // Invalid JSON, skip
                }
            }
        });
        return items;
    };

    const getLocationRate = (
        selectedPaymentItem: { budgetId: string; toothIndex: number; tooth: ToothEntry },
        breakdown?: PaymentBreakdown
    ): number => {
        if (breakdown?.locationRate !== undefined) {
            return breakdown.locationRate;
        }

        const budget = budgets.find(b => b.id === selectedPaymentItem.budgetId);
        if (!budget?.notes) return 0;

        const parsed = JSON.parse(budget.notes);
        const selectedTooth = parsed.teeth[selectedPaymentItem.toothIndex];

        if (selectedTooth.locationRate !== undefined && selectedTooth.locationRate !== null) {
            return selectedTooth.locationRate;
        } else if (budget.location_rate !== undefined && budget.location_rate !== null) {
            return budget.location_rate;
        }
        return parsed.locationRate || 0;
    };

    const handleConfirmPayment = async (
        selectedPaymentItem: { budgetId: string; toothIndex: number; tooth: ToothEntry; budgetDate?: string },
        method: string,
        transactions?: Transaction[],
        brand?: string,
        breakdown?: PaymentBreakdown,
        onComplete?: () => void,
        payerData?: PayerData
    ) => {
        try {
            const budget = budgets.find(b => b.id === selectedPaymentItem.budgetId);
            if (!budget?.notes) return;

            const parsed = JSON.parse(budget.notes);
            if (!parsed.teeth) return;

            const budgetLocation = parsed.location || null;
            const selectedTooth = parsed.teeth[selectedPaymentItem.toothIndex];
            const targetLocationRate = getLocationRate(selectedPaymentItem, breakdown);
            const installmentsCount = transactions ? transactions.length : 1;

            parsed.teeth[selectedPaymentItem.toothIndex] = {
                ...selectedTooth,
                status: 'paid',
                paymentMethod: method,
                paymentInstallments: installmentsCount,
                paymentDate: new Date().toISOString().split('T')[0],
                location: budgetLocation,
                paymentDetails: transactions,
                paymentBrand: brand,
                financialBreakdown: breakdown
            };

            const newBudgetStatus = calculateBudgetStatus(parsed.teeth);

            await budgetsService.update(selectedPaymentItem.budgetId, {
                notes: JSON.stringify(parsed),
                status: newBudgetStatus,
            });

            const methodLabels: Record<string, string> = {
                credit: 'Crédito', debit: 'Débito', pix: 'PIX', cash: 'Dinheiro', transfer: 'Transf.'
            };
            const methodLabel = methodLabels[method] || method;

            const isCard = method === 'credit' || method === 'debit';
            const displayBrand = isCard && brand ? brand : null;

            const paymentTag = displayBrand ? `(${methodLabel} - ${displayBrand.toUpperCase()})` : `(${methodLabel})`;
            const descriptionBase = `${selectedTooth.treatments.join(', ')} ${paymentTag} - ${getToothDisplayName(selectedTooth.tooth)} - ${patient?.name}`;

            if (transactions && transactions.length > 0) {
                for (let i = 0; i < transactions.length; i++) {
                    const t = transactions[i];
                    const suffix = transactions.length > 1 ? ` (${i + 1}/${transactions.length})` : '';

                    let deductionPayload: Record<string, any> = {};
                    if (breakdown) {
                        const ratio = t.amount / breakdown.grossAmount;
                        const locationAmt = breakdown.locationAmount ? (breakdown.locationAmount * ratio) : ((t.amount * targetLocationRate) / 100);

                        deductionPayload = {
                            net_amount: (breakdown.netAmount * ratio),
                            tax_rate: breakdown.taxRate,
                            tax_amount: breakdown.taxAmount * ratio,
                            card_fee_rate: breakdown.cardFeeRate,
                            card_fee_amount: breakdown.cardFeeAmount * ratio,
                            anticipation_rate: breakdown.anticipationRate,
                            anticipation_amount: (breakdown.anticipationAmount || 0) * ratio,
                            location_rate: targetLocationRate,
                            location_amount: locationAmt
                        };
                    } else if (targetLocationRate > 0) {
                        const locationAmt = (t.amount * targetLocationRate) / 100;
                        deductionPayload = {
                            net_amount: t.amount - locationAmt,
                            location_rate: targetLocationRate,
                            location_amount: locationAmt
                        };
                    }

                    await financialService.create({
                        type: 'income',
                        amount: t.amount,
                        description: descriptionBase + suffix,
                        category: 'Procedimento',
                        date: t.date,
                        location: budgetLocation,
                        patient_id: patient?.id,
                        related_entity_id: budget.id,
                        ...deductionPayload,
                        // Payer data
                        payer_is_patient: payerData?.payer_is_patient ?? true,
                        payer_type: payerData?.payer_type || 'PF',
                        payer_name: payerData?.payer_name || null,
                        payer_cpf: payerData?.payer_cpf || null,
                        pj_source_id: payerData?.pj_source_id || null,
                    });
                }
            } else {
                const itemTotal = Object.values(selectedTooth.values || {}).reduce((acc: number, val: unknown) => acc + (parseInt(val as string) || 0), 0) / 100;

                let deductionPayload: Record<string, any> = {};
                if (breakdown) {
                    deductionPayload = {
                        net_amount: breakdown.netAmount,
                        tax_rate: breakdown.taxRate,
                        tax_amount: breakdown.taxAmount,
                        card_fee_rate: breakdown.cardFeeRate,
                        card_fee_amount: breakdown.cardFeeAmount,
                        anticipation_rate: breakdown.anticipationRate,
                        anticipation_amount: breakdown.anticipationAmount,
                        location_rate: targetLocationRate,
                        location_amount: breakdown.locationAmount
                    };
                } else if (targetLocationRate > 0) {
                    const locationAmt = (itemTotal * targetLocationRate) / 100;
                    deductionPayload = {
                        net_amount: itemTotal - locationAmt,
                        location_rate: targetLocationRate,
                        location_amount: locationAmt
                    };
                }

                const budgetDate = selectedPaymentItem.budgetDate ? new Date(selectedPaymentItem.budgetDate + 'T12:00:00') : new Date();
                const dateStr = isNaN(budgetDate.getTime()) ? new Date().toISOString().split('T')[0] : budgetDate.toISOString().split('T')[0];

                await financialService.create({
                    type: 'income',
                    amount: itemTotal,
                    description: descriptionBase,
                    category: 'Procedimento',
                    date: dateStr,
                    location: budgetLocation,
                    patient_id: patient?.id,
                    related_entity_id: budget.id,
                    ...deductionPayload,
                    // Payer data
                    payer_is_patient: payerData?.payer_is_patient ?? true,
                    payer_type: payerData?.payer_type || 'PF',
                    payer_name: payerData?.payer_name || null,
                    payer_cpf: payerData?.payer_cpf || null,
                    pj_source_id: payerData?.pj_source_id || null,
                });
            }

            // Auto-create prosthesis order if item is prosthetic with lab
            const prosthesisCreated = await autoCreateProsthesisOrder(selectedTooth, selectedPaymentItem.toothIndex, selectedPaymentItem.budgetId);

            Alert.alert('Sucesso', prosthesisCreated
                ? 'Pagamento registrado! Ordem de prótese criada na Central de Próteses.'
                : 'Pagamento registrado com sucesso!');
            loadBudgets();
            onComplete?.();
        } catch (error) {
            console.error('Error registering payment:', error);
            Alert.alert('Erro', 'Não foi possível registrar o pagamento');
        }
    };

    const handleConfirmPaymentMultiple = async (
        selectedItems: { budgetId: string; items: { index: number; tooth: ToothEntry }[]; budgetDate?: string },
        method: string,
        transactions?: Transaction[],
        brand?: string,
        breakdown?: PaymentBreakdown,
        onComplete?: () => void,
        payerData?: PayerData
    ) => {
        try {
            const budget = budgets.find(b => b.id === selectedItems.budgetId);
            if (!budget?.notes) return;

            const parsed = JSON.parse(budget.notes);
            if (!parsed.teeth) return;

            const budgetLocation = parsed.location || null;
            const installmentsCount = transactions ? transactions.length : 1;

            // Calculate total value of all items
            const totalValue = selectedItems.items.reduce((sum, item) => sum + calculateToothTotal(item.tooth.values), 0);

            // Taxa do orçamento (global para todos os itens)
            const budgetRate = budget.location_rate;
            const notesRate = parsed.locationRate ?? 0;

            // Update all selected items to paid status
            for (const item of selectedItems.items) {
                const selectedTooth = parsed.teeth[item.index];
                const itemValue = calculateToothTotal(item.tooth.values);
                const ratio = itemValue / totalValue;

                // Pegar a taxa individual do item (fallback para taxa global se não definida ou for 0)
                const toothRate = item.tooth.locationRate;
                const itemLocationRate = (toothRate && toothRate > 0) ? toothRate : (budgetRate && budgetRate > 0) ? budgetRate : notesRate;

                // Calculate proportional breakdown for this item - usando taxa individual
                let itemBreakdown: PaymentBreakdown | undefined = undefined;
                if (breakdown) {
                    const cardFeeAmt = breakdown.cardFeeAmount * ratio;
                    const baseForLocation = itemValue - cardFeeAmt;
                    const locationAmt = (baseForLocation * itemLocationRate) / 100;
                    const taxAmt = breakdown.taxAmount * ratio;
                    const anticipationAmt = (breakdown.anticipationAmount || 0) * ratio;
                    const netAmt = itemValue - taxAmt - cardFeeAmt - anticipationAmt - locationAmt;

                    itemBreakdown = {
                        grossAmount: itemValue,
                        netAmount: netAmt,
                        taxRate: breakdown.taxRate,
                        taxAmount: taxAmt,
                        cardFeeRate: breakdown.cardFeeRate,
                        cardFeeAmount: cardFeeAmt,
                        anticipationRate: breakdown.anticipationRate,
                        anticipationAmount: anticipationAmt,
                        locationRate: itemLocationRate,
                        locationAmount: locationAmt,
                    };
                }

                parsed.teeth[item.index] = {
                    ...selectedTooth,
                    status: 'paid',
                    paymentMethod: method,
                    paymentInstallments: installmentsCount,
                    paymentDate: new Date().toISOString().split('T')[0],
                    location: budgetLocation,
                    paymentDetails: transactions?.map(t => ({ ...t, amount: t.amount * ratio })),
                    paymentBrand: brand,
                    financialBreakdown: itemBreakdown
                };
            }

            const newBudgetStatus = calculateBudgetStatus(parsed.teeth);

            await budgetsService.update(selectedItems.budgetId, {
                notes: JSON.stringify(parsed),
                status: newBudgetStatus,
            });

            // Create financial entries
            const methodLabels: Record<string, string> = {
                credit: 'Crédito', debit: 'Débito', pix: 'PIX', cash: 'Dinheiro', transfer: 'Transf.'
            };
            const methodLabel = methodLabels[method] || method;
            const isCard = method === 'credit' || method === 'debit';
            const displayBrand = isCard && brand ? brand : null;
            const paymentTag = displayBrand ? `(${methodLabel} - ${displayBrand.toUpperCase()})` : `(${methodLabel})`;

            // Create one financial entry per item
            for (const item of selectedItems.items) {
                const itemValue = calculateToothTotal(item.tooth.values);
                const ratio = itemValue / totalValue;
                // Taxa individual (fallback para taxa global se não definida ou for 0)
                const toothRateForTx = item.tooth.locationRate;
                const targetLocationRate = (toothRateForTx && toothRateForTx > 0) ? toothRateForTx : (budgetRate && budgetRate > 0) ? budgetRate : notesRate;

                const descriptionBase = `${item.tooth.treatments.join(', ')} ${paymentTag} - ${getToothDisplayName(item.tooth.tooth)} - ${patient?.name}`;

                if (transactions && transactions.length > 0) {
                    for (let i = 0; i < transactions.length; i++) {
                        const t = transactions[i];
                        const itemAmount = t.amount * ratio;
                        const suffix = transactions.length > 1 ? ` (${i + 1}/${transactions.length})` : '';

                        let deductionPayload: Record<string, any> = {};
                        if (breakdown) {
                            const txRatio = t.amount / breakdown.grossAmount;
                            // SEMPRE calcular locationAmt usando a taxa individual do item (não a média do breakdown)
                            const cardFeeAmt = breakdown.cardFeeAmount * txRatio * ratio;
                            const baseForLocation = itemAmount - cardFeeAmt;
                            const locationAmt = (baseForLocation * targetLocationRate) / 100;

                            const taxAmt = breakdown.taxAmount * txRatio * ratio;
                            const anticipationAmt = (breakdown.anticipationAmount || 0) * txRatio * ratio;
                            // Recalcular net_amount com o location correto
                            const netAmt = itemAmount - taxAmt - cardFeeAmt - anticipationAmt - locationAmt;

                            deductionPayload = {
                                net_amount: netAmt,
                                tax_rate: breakdown.taxRate,
                                tax_amount: taxAmt,
                                card_fee_rate: breakdown.cardFeeRate,
                                card_fee_amount: cardFeeAmt,
                                anticipation_rate: breakdown.anticipationRate,
                                anticipation_amount: anticipationAmt,
                                location_rate: targetLocationRate,
                                location_amount: locationAmt
                            };
                        } else if (targetLocationRate > 0) {
                            const locationAmt = (itemAmount * targetLocationRate) / 100;
                            deductionPayload = {
                                net_amount: itemAmount - locationAmt,
                                location_rate: targetLocationRate,
                                location_amount: locationAmt
                            };
                        }

                        await financialService.create({
                            type: 'income',
                            amount: itemAmount,
                            description: descriptionBase + suffix,
                            category: 'Procedimento',
                            date: t.date,
                            location: budgetLocation,
                            patient_id: patient?.id,
                            related_entity_id: budget.id,
                            ...deductionPayload,
                            payer_is_patient: payerData?.payer_is_patient ?? true,
                            payer_type: payerData?.payer_type || 'PF',
                            payer_name: payerData?.payer_name || null,
                            payer_cpf: payerData?.payer_cpf || null,
                            pj_source_id: payerData?.pj_source_id || null,
                        });
                    }
                } else {
                    const budgetDate = selectedItems.budgetDate ? new Date(selectedItems.budgetDate + 'T12:00:00') : new Date();
                    const dateStr = isNaN(budgetDate.getTime()) ? new Date().toISOString().split('T')[0] : budgetDate.toISOString().split('T')[0];

                    let deductionPayload: Record<string, any> = {};
                    if (breakdown) {
                        // SEMPRE calcular locationAmt usando a taxa individual do item (não a média do breakdown)
                        const cardFeeAmt = breakdown.cardFeeAmount * ratio;
                        const baseForLocation = itemValue - cardFeeAmt;
                        const locationAmt = (baseForLocation * targetLocationRate) / 100;

                        const taxAmt = breakdown.taxAmount * ratio;
                        const anticipationAmt = (breakdown.anticipationAmount || 0) * ratio;
                        // Recalcular net_amount com o location correto
                        const netAmt = itemValue - taxAmt - cardFeeAmt - anticipationAmt - locationAmt;

                        deductionPayload = {
                            net_amount: netAmt,
                            tax_rate: breakdown.taxRate,
                            tax_amount: taxAmt,
                            card_fee_rate: breakdown.cardFeeRate,
                            card_fee_amount: cardFeeAmt,
                            anticipation_rate: breakdown.anticipationRate,
                            anticipation_amount: anticipationAmt,
                            location_rate: targetLocationRate,
                            location_amount: locationAmt
                        };
                    } else if (targetLocationRate > 0) {
                        const locationAmt = (itemValue * targetLocationRate) / 100;
                        deductionPayload = {
                            net_amount: itemValue - locationAmt,
                            location_rate: targetLocationRate,
                            location_amount: locationAmt
                        };
                    }

                    await financialService.create({
                        type: 'income',
                        amount: itemValue,
                        description: descriptionBase,
                        category: 'Procedimento',
                        date: dateStr,
                        location: budgetLocation,
                        patient_id: patient?.id,
                        related_entity_id: budget.id,
                        ...deductionPayload,
                        payer_is_patient: payerData?.payer_is_patient ?? true,
                        payer_type: payerData?.payer_type || 'PF',
                        payer_name: payerData?.payer_name || null,
                        payer_cpf: payerData?.payer_cpf || null,
                        pj_source_id: payerData?.pj_source_id || null,
                    });
                }
            }

            // Auto-create prosthesis orders for prosthetic items with lab
            let prosthesisCount = 0;
            for (const item of selectedItems.items) {
                const created = await autoCreateProsthesisOrder(item.tooth, item.index, selectedItems.budgetId);
                if (created) prosthesisCount++;
            }

            Alert.alert('Sucesso', prosthesisCount > 0
                ? `${selectedItems.items.length} pagamento(s) registrado(s)! ${prosthesisCount} ordem(ns) de prótese criada(s) na Central de Próteses.`
                : `${selectedItems.items.length} pagamento(s) registrado(s) com sucesso!`);
            loadBudgets();
            onComplete?.();
        } catch (error) {
            console.error('Error registering payments:', error);
            Alert.alert('Erro', 'Não foi possível registrar os pagamentos');
        }
    };

    return {
        getAllPaymentItems,
        handleConfirmPayment,
        handleConfirmPaymentMultiple,
        getLocationRate,
    };
}
