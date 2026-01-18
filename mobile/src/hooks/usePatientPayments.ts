import { Alert } from 'react-native';
import { budgetsService } from '../services/budgets';
import { financialService } from '../services/financial';
import { type ToothEntry, calculateToothTotal, getToothDisplayName, calculateBudgetStatus } from '../components/patients/budgetUtils';
import type { BudgetWithItems, Patient } from '../types/database';

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

export function usePatientPayments(
    budgets: BudgetWithItems[],
    patient: Patient | null,
    loadBudgets: () => void
) {
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
        onComplete?: () => void
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
                        ...deductionPayload
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
                    ...deductionPayload
                });
            }

            Alert.alert('Sucesso', 'Pagamento registrado com sucesso!');
            loadBudgets();
            onComplete?.();
        } catch (error) {
            console.error('Error registering payment:', error);
            Alert.alert('Erro', 'Não foi possível registrar o pagamento');
        }
    };

    return {
        getAllPaymentItems,
        handleConfirmPayment,
        getLocationRate,
    };
}
