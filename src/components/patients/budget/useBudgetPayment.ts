import { useState } from 'react';
import { budgetsService } from '@/services/budgets';
import { financialService } from '@/services/financial';
import { prosthesisService } from '@/services/prosthesis';
import { getToothDisplayName, calculateBudgetStatus, type ToothEntry } from '@/utils/budgetUtils';
import { isProstheticTreatment, getProsthesisTypeFromTreatments, hasLabTreatment } from '@/utils/prosthesis';
import { isOrthodonticTreatment, getOrthoTypeFromTreatments } from '@/utils/orthodontics';
import { orthodonticsService } from '@/services/orthodontics';
import { receivablesService } from '@/services/receivables';
import { patientCreditsService } from '@/services/patientCredits';
import { useClinic } from '@/contexts/ClinicContext';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import type { BudgetWithItems } from '@/types/database';
import type { PayerData } from '../PaymentMethodDialog';
import type { SplitPaymentPortion } from '@/types/receivables';
import { toLocalDateString } from '@/utils/formatters';

interface UseBudgetPaymentProps {
    budget: BudgetWithItems;
    patientId: string;
    parsedNotes: any;
    onSuccess: () => void;
    toast: (opts: { title: string; description: string; variant?: 'destructive' }) => void;
}

export function useBudgetPayment({ budget, patientId, parsedNotes, onSuccess, toast }: UseBudgetPaymentProps) {
    const { clinicId } = useClinic();
    const queryClient = useQueryClient();
    const [paymentItem, setPaymentItem] = useState<{ index: number; tooth: ToothEntry } | null>(null);
    const [paymentBatch, setPaymentBatch] = useState<{ indices: number[]; teeth: ToothEntry[]; totalValue: number } | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const autoCreateProsthesisOrder = async (tooth: ToothEntry, toothIndex: number, budgetId: string): Promise<boolean> => {
        if (!clinicId) return false;
        if (!isProstheticTreatment(tooth.treatments)) return false;
        if (!hasLabTreatment(tooth)) return false;

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Use prosthesis type from budget form, fallback to auto-mapping
            const type = tooth.prosthesisType || getProsthesisTypeFromTreatments(tooth.treatments) || 'outro';
            const value = Object.values(tooth.values).reduce((a, b) => a + (parseInt(b as string) || 0) / 100, 0);

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

            await prosthesisService.createOrderFromBudget({
                clinic_id: clinicId,
                patient_id: patientId,
                dentist_id: user.id,
                type,
                material: material?.toLowerCase() || null,
                tooth_numbers: tooth.tooth ? [tooth.tooth] : [],
                patient_price: value,
                lab_id: tooth.prosthesisLabId || null,
                lab_cost: parseLabCost(tooth.prosthesisLabCost),
                color: tooth.prosthesisColor || null,
                shade_details: tooth.prosthesisShadeDetails || null,
                cementation_type: tooth.prosthesisCementation || null,
                estimated_delivery_date: tooth.prosthesisDeliveryDate || null,
                notes: tooth.prosthesisNotes || null,
                special_instructions: tooth.prosthesisInstructions || null,
                created_by: user.id,
                budget_id: budgetId,
                budget_tooth_index: toothIndex,
            });

            queryClient.invalidateQueries({ queryKey: ['prosthesis-orders'] });
            queryClient.invalidateQueries({ queryKey: ['budgets'] });
            return true;
        } catch (err) {
            console.error('Erro ao criar ordem de prótese automaticamente:', err);
            return false;
        }
    };

    const autoCreateOrthoCase = async (tooth: ToothEntry, budgetId: string): Promise<boolean> => {
        if (!clinicId) return false;
        if (!isOrthodonticTreatment(tooth.treatments)) return false;

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return false;

            const treatmentType = getOrthoTypeFromTreatments(tooth.treatments);

            await orthodonticsService.createCase({
                clinic_id: clinicId,
                patient_id: patientId,
                dentist_id: user.id,
                treatment_type: treatmentType,
                budget_id: budgetId,
                created_by: user.id,
            });

            queryClient.invalidateQueries({ queryKey: ['orthodontic-cases'] });
            return true;
        } catch (err) {
            console.error('Erro ao criar caso ortodôntico automaticamente:', err);
            return false;
        }
    };

    const getItemValue = (tooth: ToothEntry) => {
        return Object.values(tooth.values).reduce((a, b) => a + (parseInt(b as string) || 0) / 100, 0);
    };

    const formatLocalDate = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const getMethodLabel = (method: string) => {
        const methodLabels: Record<string, string> = {
            credit: 'Crédito', debit: 'Débito', pix: 'PIX', cash: 'Dinheiro', transfer: 'Transf.'
        };
        return methodLabels[method] || method;
    };

    const getPaymentTag = (method: string, brand?: string) => {
        const methodLabel = getMethodLabel(method);
        const isCard = method === 'credit' || method === 'debit';
        const displayBrand = isCard && brand ? brand : null;
        return displayBrand ? `(${methodLabel} - ${displayBrand.toUpperCase()})` : `(${methodLabel})`;
    };

    const parseBudgetDate = (dateStr: string) => {
        let parsedDate = dateStr;
        if (parsedDate && parsedDate.includes('/')) {
            const [d, m, y] = parsedDate.split('/');
            parsedDate = `${y}-${m}-${d}`;
        }
        const budgetDate = new Date(parsedDate + 'T12:00:00');
        return isNaN(budgetDate.getTime()) ? new Date() : budgetDate;
    };

    const handlePayItem = (index: number, tooth: ToothEntry) => {
        setPaymentItem({ index, tooth });
    };

    const handlePaySelected = (selectedApprovedItems: Set<number>, teeth: ToothEntry[]) => {
        if (selectedApprovedItems.size === 0) return false;

        const indices = Array.from(selectedApprovedItems);
        const selectedTeeth = indices.map(idx => teeth[idx]);
        const totalValue = selectedTeeth.reduce((sum, t) => sum + getItemValue(t), 0);

        setPaymentBatch({ indices, teeth: selectedTeeth, totalValue });
        return true;
    };

    const handlePayAll = (teeth: ToothEntry[]) => {
        const isPayable = (t: ToothEntry) => t.status === 'approved' || t.status === 'partially_paid';
        const approvedItems = teeth.filter(isPayable);
        const indices = teeth.map((t, idx) => isPayable(t) ? idx : -1).filter(idx => idx !== -1);
        const totalValue = approvedItems.reduce((sum, t) => sum + getItemValue(t), 0);

        setPaymentBatch({ indices, teeth: approvedItems, totalValue });
    };

    const handleConfirmPayment = async (method: string, installments: number, brand?: string, breakdown?: any, payerData?: PayerData, cardMachineId?: string | null, creditUsed: number = 0, paymentDate?: string) => {
        if (!paymentItem || isSubmitting || !patientId) return;

        try {
            setIsSubmitting(true);

            const refreshedBudget = await budgetsService.getById(budget.id);
            if (!refreshedBudget) return;

            const parsed = JSON.parse(refreshedBudget.notes || '{}');
            const currentTeeth = parsed.teeth as ToothEntry[];
            if (!currentTeeth) return;

            const selectedTooth = currentTeeth[paymentItem.index];
            const originalAmount = getItemValue(selectedTooth);
            const totalAmount = breakdown?.grossAmount ?? originalAmount;
            const safeCreditUsed = Math.max(0, Math.min(creditUsed, originalAmount));

            if (safeCreditUsed > 0) {
                await patientCreditsService.addTransaction({
                    patientId,
                    type: 'debit',
                    amount: safeCreditUsed,
                    description: `Pagamento do procedimento: ${selectedTooth.treatments.join(', ')}`,
                });
            }

            const isAnticipated = breakdown?.isAnticipated || false;
            const numTransactions = isAnticipated ? 1 : (installments || 1);
            const txAmount = totalAmount / numTransactions;

            const targetLocationRate = (selectedTooth as any).locationRate ?? (refreshedBudget as any).location_rate ?? (parsed.locationRate ? parseFloat(parsed.locationRate) : 0);

            let netAmountPerTx = txAmount;
            let taxAmountPerTx = 0;
            let cardFeeAmountPerTx = 0;
            let anticipationAmountPerTx = 0;
            let locationAmountPerTx = 0;

            if (breakdown) {
                netAmountPerTx = breakdown.netAmount / numTransactions;
                taxAmountPerTx = breakdown.taxAmount / numTransactions;
                cardFeeAmountPerTx = breakdown.cardFeeAmount / numTransactions;
                anticipationAmountPerTx = breakdown.anticipationAmount ? (breakdown.anticipationAmount / numTransactions) : 0;

                if (breakdown.locationAmount) {
                    locationAmountPerTx = breakdown.locationAmount / numTransactions;
                } else if (targetLocationRate > 0) {
                    const baseForLocation = txAmount - cardFeeAmountPerTx;
                    locationAmountPerTx = (baseForLocation * targetLocationRate) / 100;
                    netAmountPerTx -= locationAmountPerTx;
                }
            } else {
                if (targetLocationRate > 0) {
                    locationAmountPerTx = (txAmount * targetLocationRate) / 100;
                    netAmountPerTx = txAmount - locationAmountPerTx;
                }
            }

            const effectivePaymentDate = paymentDate || toLocalDateString(new Date());
            const startDate = parseBudgetDate(effectivePaymentDate);
            const budgetLocation = parsed.location || null;
            const paymentTag = getPaymentTag(method, brand);

            if (method !== 'credit_balance' && totalAmount > 0) {
                for (let i = 0; i < numTransactions; i++) {
                    const date = new Date(startDate);
                    if (!isAnticipated) {
                        date.setMonth(date.getMonth() + i);
                    }

                    await financialService.createTransaction({
                        type: 'income',
                        amount: txAmount,
                        description: `${selectedTooth.treatments.join(', ')} ${paymentTag} - ${getToothDisplayName(selectedTooth.tooth)}${numTransactions > 1 ? ` (${i + 1}/${numTransactions})` : ''}`,
                        category: 'Tratamento',
                        date: formatLocalDate(date),
                        patient_id: patientId,
                        related_entity_id: budget.id,
                        location: budgetLocation,
                        payment_method: method,
                        net_amount: netAmountPerTx,
                        tax_rate: breakdown?.taxRate,
                        tax_amount: taxAmountPerTx,
                        card_fee_rate: breakdown?.cardFeeRate,
                        card_fee_amount: cardFeeAmountPerTx,
                        anticipation_rate: breakdown?.anticipationRate,
                        anticipation_amount: anticipationAmountPerTx,
                        location_rate: targetLocationRate,
                        location_amount: locationAmountPerTx,
                        discount_amount: (breakdown?.discountAmount || 0) / numTransactions,
                        payer_is_patient: payerData?.payer_is_patient ?? true,
                        payer_type: payerData?.payer_type || 'PF',
                        payer_name: payerData?.payer_name || null,
                        payer_cpf: payerData?.payer_cpf || null,
                        pj_source_id: payerData?.pj_source_id || null,
                        card_machine_id: cardMachineId || null,
                    } as any);
                }
            }

            currentTeeth[paymentItem.index] = {
                ...currentTeeth[paymentItem.index],
                status: 'paid',
                paymentMethod: (safeCreditUsed > 0 && method === 'credit_balance') ? 'credit_balance' as any : method as any,
                paymentInstallments: installments,
                paymentDate: effectivePaymentDate,
                financialBreakdown: { ...breakdown, creditUsed: safeCreditUsed }
            };

            const newBudgetStatus = calculateBudgetStatus(currentTeeth);
            const updatedNotes = JSON.stringify({ ...parsed, teeth: currentTeeth });

            await budgetsService.update(budget.id, {
                notes: updatedNotes,
                status: newBudgetStatus
            });

            // Invalidate budgets cache so paid items appear in procedures
            queryClient.invalidateQueries({ queryKey: ['budgets', patientId] });
            queryClient.invalidateQueries({ queryKey: ['patient-credits', patientId] });

            // Auto-create prosthesis order if item is prosthetic with lab
            const prosthesisCreated = await autoCreateProsthesisOrder(selectedTooth, paymentItem.index, budget.id);

            // Auto-create ortho case if item is orthodontic
            const orthoCreated = await autoCreateOrthoCase(selectedTooth, budget.id);

            toast({
                title: "Pagamento Registrado",
                description: prosthesisCreated
                    ? "Ordem de prótese criada! Acesse a Central de Prótese para configurar o envio ao laboratório."
                    : orthoCreated
                    ? "Caso ortodôntico criado! Acesse a Central de Ortodontia para acompanhar."
                    : "O item foi marcado como pago e lançado no financeiro.",
            });
            onSuccess();
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Erro", description: "Falha ao registrar pagamento." });
        } finally {
            setIsSubmitting(false);
            setPaymentItem(null);
        }
    };

    const handleConfirmBatchPayment = async (method: string, installments: number, brand?: string, breakdown?: any, payerData?: PayerData, cardMachineId?: string | null, creditUsed: number = 0, paymentDate?: string) => {
        if (!paymentBatch || isSubmitting || !patientId) return;

        try {
            setIsSubmitting(true);

            const refreshedBudget = await budgetsService.getById(budget.id);
            if (!refreshedBudget) return;

            const parsed = JSON.parse(refreshedBudget.notes || '{}');
            const currentTeeth = parsed.teeth as ToothEntry[];
            if (!currentTeeth) return;

            const { indices } = paymentBatch;
            const totalAmount = breakdown?.grossAmount ?? paymentBatch.totalValue;
            const safeCreditUsed = Math.max(0, Math.min(creditUsed, paymentBatch.totalValue));

            if (safeCreditUsed > 0) {
                await patientCreditsService.addTransaction({
                    patientId,
                    type: 'debit',
                    amount: safeCreditUsed,
                    description: `Pagamento de ${indices.length} item(ns) do orçamento`,
                });
            }

            const isAnticipated = breakdown?.isAnticipated || false;
            const numInstallments = isAnticipated ? 1 : (installments || 1);

            const effectivePaymentDate = paymentDate || toLocalDateString(new Date());
            const startDate = parseBudgetDate(effectivePaymentDate);
            const budgetLocation = parsed.location || null;
            const paymentTag = getPaymentTag(method, brand);

            const totalCardFee = breakdown?.cardFeeAmount || 0;
            const totalTaxAmount = breakdown?.taxAmount || 0;
            const totalAnticipationAmount = breakdown?.anticipationAmount || 0;

            const originalTotal = paymentBatch.totalValue;

            for (const idx of indices) {
                const tooth = currentTeeth[idx];
                const itemOriginalValue = Object.values(tooth.values).reduce((a: number, b: string) => a + (parseInt(b) || 0) / 100, 0);
                const ratio = itemOriginalValue / originalTotal;
                const itemValue = totalAmount * ratio;

                const toothRate = (tooth as any).locationRate;
                const budgetRate = (refreshedBudget as any).location_rate;
                const notesRate = parsed.locationRate ? parseFloat(parsed.locationRate) : 0;
                const itemLocationRate = (toothRate && toothRate > 0) ? toothRate : (budgetRate && budgetRate > 0) ? budgetRate : notesRate;

                const itemCardFee = totalCardFee * ratio;
                const itemTaxAmount = totalTaxAmount * ratio;
                const itemAnticipationAmount = totalAnticipationAmount * ratio;

                const baseForLocation = itemValue - itemCardFee;
                const itemLocationAmount = (baseForLocation * itemLocationRate) / 100;
                const itemNetAmount = itemValue - itemTaxAmount - itemCardFee - itemAnticipationAmount - itemLocationAmount;

                const amountPerInstallment = itemValue / numInstallments;
                const cardFeePerInstallment = itemCardFee / numInstallments;
                const taxPerInstallment = itemTaxAmount / numInstallments;
                const anticipationPerInstallment = itemAnticipationAmount / numInstallments;
                const locationPerInstallment = itemLocationAmount / numInstallments;
                const netPerInstallment = itemNetAmount / numInstallments;

                const itemDescription = `${tooth.treatments.join(', ')} - ${getToothDisplayName(tooth.tooth)}`;

                if (method !== 'credit_balance' && itemValue > 0) {
                    for (let i = 0; i < numInstallments; i++) {
                        const date = new Date(startDate);
                        if (!isAnticipated) {
                            date.setMonth(date.getMonth() + i);
                        }

                        await financialService.createTransaction({
                            type: 'income',
                            amount: amountPerInstallment,
                            description: `${itemDescription} ${paymentTag}${numInstallments > 1 ? ` (${i + 1}/${numInstallments})` : ''}`,
                            category: 'Tratamento',
                            date: formatLocalDate(date),
                            patient_id: patientId,
                            related_entity_id: budget.id,
                            location: budgetLocation,
                            payment_method: method,
                            net_amount: netPerInstallment,
                            tax_rate: breakdown?.taxRate,
                            tax_amount: taxPerInstallment,
                            card_fee_rate: breakdown?.cardFeeRate,
                            card_fee_amount: cardFeePerInstallment,
                            anticipation_rate: breakdown?.anticipationRate,
                            anticipation_amount: anticipationPerInstallment,
                            location_rate: itemLocationRate,
                            location_amount: locationPerInstallment,
                            discount_amount: (itemOriginalValue - itemValue) / numInstallments,
                            payer_is_patient: payerData?.payer_is_patient ?? true,
                            payer_type: payerData?.payer_type || 'PF',
                            payer_name: payerData?.payer_name || null,
                            payer_cpf: payerData?.payer_cpf || null,
                            pj_source_id: payerData?.pj_source_id || null,
                            card_machine_id: cardMachineId || null,
                        } as any);
                    }
                }

                currentTeeth[idx] = {
                    ...tooth,
                    status: 'paid',
                    paymentMethod: (safeCreditUsed > 0 && method === 'credit_balance') ? 'credit_balance' as any : method as any,
                    paymentInstallments: installments,
                    paymentDate: effectivePaymentDate,
                    discountAmount: itemOriginalValue - itemValue,
                    financialBreakdown: {
                        grossAmount: itemValue,
                        netAmount: itemNetAmount,
                        discountAmount: itemOriginalValue - itemValue,
                        taxRate: breakdown?.taxRate || 0,
                        taxAmount: itemTaxAmount,
                        cardFeeRate: breakdown?.cardFeeRate || 0,
                        cardFeeAmount: itemCardFee,
                        anticipationRate: breakdown?.anticipationRate || 0,
                        anticipationAmount: itemAnticipationAmount,
                        locationRate: itemLocationRate,
                        locationAmount: itemLocationAmount,
                        creditUsed: safeCreditUsed * ratio,
                    }
                };
            }

            const newBudgetStatus = calculateBudgetStatus(currentTeeth);
            const updatedNotes = JSON.stringify({ ...parsed, teeth: currentTeeth });

            await budgetsService.update(budget.id, {
                notes: updatedNotes,
                status: newBudgetStatus
            });

            // Invalidate budgets cache so paid items appear in procedures
            queryClient.invalidateQueries({ queryKey: ['budgets', patientId] });
            queryClient.invalidateQueries({ queryKey: ['patient-credits', patientId] });

            // Auto-create prosthesis orders for prosthetic items with lab
            let prosthesisCount = 0;
            for (const idx of indices) {
                const created = await autoCreateProsthesisOrder(currentTeeth[idx], idx, budget.id);
                if (created) prosthesisCount++;
            }

            // Auto-create ortho cases for orthodontic items
            let orthoCount = 0;
            for (const idx of indices) {
                const created = await autoCreateOrthoCase(currentTeeth[idx], budget.id);
                if (created) orthoCount++;
            }

            const extras: string[] = [];
            if (prosthesisCount > 0) extras.push(`${prosthesisCount} ordem(ns) de prótese criada(s)`);
            if (orthoCount > 0) extras.push(`${orthoCount} caso(s) ortodôntico(s) criado(s)`);

            toast({
                title: "Pagamento Registrado",
                description: extras.length > 0
                    ? `${indices.length} item(ns) pago(s). ${extras.join('. ')}!`
                    : `${indices.length} item(ns) marcado(s) como pago(s) e lançado(s) no financeiro.`,
            });
            onSuccess();
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Erro", description: "Falha ao registrar pagamento." });
        } finally {
            setIsSubmitting(false);
            setPaymentBatch(null);
        }
    };

    const handleConfirmSplitPayment = async (portions: SplitPaymentPortion[], cardMachineId?: string | null, creditUsed: number = 0) => {
        if (!paymentItem || isSubmitting || !patientId) return;

        try {
            setIsSubmitting(true);

            const refreshedBudget = await budgetsService.getById(budget.id);
            if (!refreshedBudget) return;

            const parsed = JSON.parse(refreshedBudget.notes || '{}');
            const currentTeeth = parsed.teeth as ToothEntry[];
            if (!currentTeeth) return;

            const selectedTooth = currentTeeth[paymentItem.index];
            const toothDescription = `${selectedTooth.treatments.join(', ')} - ${getToothDisplayName(selectedTooth.tooth)}`;
            const budgetLocation = parsed.location || null;
            const splitGroupId = crypto.randomUUID();

            // Create receivables (immediate ones also create financial_transactions)
            const receivables = await receivablesService.createSplitPayment(
                budget.id,
                patientId,
                paymentItem.index,
                toothDescription,
                portions,
                splitGroupId,
                budgetLocation,
                cardMachineId || null,
            );

            // Cover any remaining balance with the patient's credit.
            const itemValueCents = Math.round(getItemValue(selectedTooth) * 100);
            const methodCents = portions.reduce((sum, p) => sum + Math.round(p.amount * 100), 0);
            const creditAppliedCents = Math.max(0, Math.min(Math.round(creditUsed * 100), itemValueCents - methodCents));
            if (creditAppliedCents > 0) {
                await patientCreditsService.addTransaction({
                    patientId,
                    type: 'debit',
                    amount: creditAppliedCents / 100,
                    description: `Pagamento do procedimento: ${selectedTooth.treatments.join(', ')}`,
                });
            }

            // Determine tooth status: methods + credit cover the value & all immediate = paid.
            const allImmediate = portions.every(p => p.isImmediate);
            const fullyPaid = (methodCents + creditAppliedCents) >= itemValueCents;
            const newStatus = (fullyPaid && allImmediate) ? 'paid' : 'partially_paid';

            currentTeeth[paymentItem.index] = {
                ...currentTeeth[paymentItem.index],
                status: newStatus,
                paymentDate: toLocalDateString(new Date()),
                splitGroupId,
                ...(creditAppliedCents > 0
                    ? { financialBreakdown: { ...((selectedTooth as any).financialBreakdown || {}), creditUsed: creditAppliedCents / 100 } }
                    : {}),
                splitPayments: receivables.map(r => ({
                    receivableId: r.id,
                    amount: r.amount,
                    method: r.payment_method,
                    dueDate: r.due_date,
                    status: r.status,
                })),
            };

            const newBudgetStatus = calculateBudgetStatus(currentTeeth);
            const updatedNotes = JSON.stringify({ ...parsed, teeth: currentTeeth });

            await budgetsService.update(budget.id, {
                notes: updatedNotes,
                status: newBudgetStatus,
            });

            queryClient.invalidateQueries({ queryKey: ['budgets', patientId] });
            queryClient.invalidateQueries({ queryKey: ['receivables'] });
            queryClient.invalidateQueries({ queryKey: ['patient-credits', patientId] });

            // Auto-create prosthesis/ortho orders
            const prosthesisCreated = await autoCreateProsthesisOrder(selectedTooth, paymentItem.index, budget.id);
            const orthoCreated = await autoCreateOrthoCase(selectedTooth, budget.id);

            const immediateCount = portions.filter(p => p.isImmediate).length;
            const scheduledCount = portions.length - immediateCount;

            toast({
                title: "Pagamento Dividido Registrado",
                description: prosthesisCreated
                    ? "Ordem de prótese criada! Acesse a Central de Prótese para configurar o envio ao laboratório."
                    : orthoCreated
                    ? "Caso ortodôntico criado! Acesse a Central de Ortodontia para acompanhar."
                    : `${immediateCount} parcela(s) paga(s) agora${scheduledCount > 0 ? `, ${scheduledCount} agendada(s)` : ''}.`,
            });
            onSuccess();
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Erro", description: "Falha ao registrar pagamento dividido." });
        } finally {
            setIsSubmitting(false);
            setPaymentItem(null);
        }
    };

    const handleConfirmSplitBatchPayment = async (portions: SplitPaymentPortion[], cardMachineId?: string | null, creditUsed: number = 0) => {
        if (!paymentBatch || isSubmitting || !patientId) return;

        try {
            setIsSubmitting(true);

            const refreshedBudget = await budgetsService.getById(budget.id);
            if (!refreshedBudget) return;

            const parsed = JSON.parse(refreshedBudget.notes || '{}');
            const currentTeeth = parsed.teeth as ToothEntry[];
            if (!currentTeeth) return;

            const { indices } = paymentBatch;
            const budgetLocation = parsed.location || null;

            // Per-item metadata, in the order the items were selected.
            const itemsMeta = indices.map(idx => {
                const tooth = currentTeeth[idx];
                const valueCents = Math.round(
                    Object.values(tooth.values).reduce((a: number, b: string) => a + (parseInt(b) || 0) / 100, 0) * 100
                );
                return { idx, tooth, valueCents };
            });

            // Zero-value items produce zero-amount portions which violate the
            // payment_receivables amount > 0 constraint. Mark as paid without
            // creating receivables (mirrors the non-split batch flow guard).
            for (const m of itemsMeta) {
                if (m.valueCents <= 0) {
                    currentTeeth[m.idx] = {
                        ...m.tooth,
                        status: 'paid',
                        paymentDate: toLocalDateString(new Date()),
                    };
                }
            }

            // Allocate each payment method to items in whole cents (no proportional
            // split): start at the item the user assigned (portion.itemIndex), then
            // fill the remaining items in order. Each item gets the real amounts that
            // landed on it instead of a prorated fraction.
            const payable = itemsMeta.filter(m => m.valueCents > 0);
            const orderIdx = payable.map(m => m.idx);
            const remaining = new Map<number, number>(payable.map(m => [m.idx, m.valueCents]));
            const slicesByItem = new Map<number, { portion: SplitPaymentPortion; amountCents: number }[]>(
                orderIdx.map(idx => [idx, []])
            );

            const allocatePortion = (portion: SplitPaymentPortion, amountCents: number) => {
                const start = portion.itemIndex;
                const order: number[] = [];
                if (start != null && remaining.has(start)) order.push(start);
                for (const idx of orderIdx) if (idx !== start) order.push(idx);

                for (const idx of order) {
                    if (amountCents <= 0) break;
                    const avail = remaining.get(idx) ?? 0;
                    if (avail <= 0) continue;
                    const take = Math.min(avail, amountCents);
                    slicesByItem.get(idx)!.push({ portion, amountCents: take });
                    remaining.set(idx, avail - take);
                    amountCents -= take;
                }
                // Leftover (paying more than the items' total) lands on the last item.
                if (amountCents > 0 && orderIdx.length > 0) {
                    slicesByItem.get(orderIdx[orderIdx.length - 1])!.push({ portion, amountCents });
                }
            };

            for (const portion of portions) {
                allocatePortion(portion, Math.round(portion.amount * 100));
            }

            // Cover any remaining balance with the patient's credit (in order). This
            // settles items whose methods didn't reach the full value (e.g. 320 paid
            // + 50 credit = 370). One debit transaction is created for the total used.
            const creditByItem = new Map<number, number>();
            let creditLeftCents = Math.max(0, Math.round(creditUsed * 100));
            for (const idx of orderIdx) {
                if (creditLeftCents <= 0) break;
                const rem = remaining.get(idx) ?? 0;
                if (rem <= 0) continue;
                const take = Math.min(rem, creditLeftCents);
                creditByItem.set(idx, take);
                remaining.set(idx, rem - take);
                creditLeftCents -= take;
            }
            const totalCreditAppliedCents = Math.max(0, Math.round(creditUsed * 100)) - creditLeftCents;
            if (totalCreditAppliedCents > 0) {
                await patientCreditsService.addTransaction({
                    patientId,
                    type: 'debit',
                    amount: totalCreditAppliedCents / 100,
                    description: `Pagamento de ${payable.length} item(ns) do orçamento`,
                });
            }

            // Create receivables per item from the slices that landed on it.
            for (const m of payable) {
                const slices = slicesByItem.get(m.idx) || [];
                const creditAppliedCents = creditByItem.get(m.idx) || 0;
                if (slices.length === 0 && creditAppliedCents === 0) continue; // nothing for this item

                const splitGroupId = crypto.randomUUID();
                const toothDescription = `${m.tooth.treatments.join(', ')} - ${getToothDisplayName(m.tooth.tooth)}`;

                // Scale each portion's financial breakdown to the slice it contributes here.
                const itemPortions: SplitPaymentPortion[] = slices.map(s => {
                    const portionCents = Math.round(s.portion.amount * 100);
                    const fraction = portionCents > 0 ? s.amountCents / portionCents : 1;
                    return {
                        ...s.portion,
                        amount: s.amountCents / 100,
                        breakdown: {
                            ...s.portion.breakdown,
                            grossAmount: s.portion.breakdown.grossAmount * fraction,
                            taxAmount: s.portion.breakdown.taxAmount * fraction,
                            cardFeeAmount: s.portion.breakdown.cardFeeAmount * fraction,
                            anticipationAmount: s.portion.breakdown.anticipationAmount * fraction,
                            locationAmount: s.portion.breakdown.locationAmount * fraction,
                            netAmount: s.portion.breakdown.netAmount * fraction,
                        },
                    };
                });

                const receivables = slices.length > 0
                    ? await receivablesService.createSplitPayment(
                        budget.id, patientId, m.idx, toothDescription, itemPortions, splitGroupId, budgetLocation, cardMachineId || null,
                    )
                    : [];

                const methodCents = slices.reduce((sum, s) => sum + s.amountCents, 0);
                // Item is settled when methods + applied credit cover its full value.
                const fullyPaid = (methodCents + creditAppliedCents) >= m.valueCents;
                const allImmediate = slices.every(s => s.portion.isImmediate); // credit counts as immediate
                const immediateDates = slices
                    .filter(s => s.portion.isImmediate)
                    .map(s => s.portion.dueDate)
                    .sort();
                const payDate = immediateDates.length ? immediateDates[immediateDates.length - 1] : toLocalDateString(new Date());

                currentTeeth[m.idx] = {
                    ...m.tooth,
                    status: (fullyPaid && allImmediate) ? 'paid' : 'partially_paid',
                    paymentDate: payDate,
                    splitGroupId,
                    ...(creditAppliedCents > 0
                        ? { financialBreakdown: { ...((m.tooth as any).financialBreakdown || {}), creditUsed: creditAppliedCents / 100 } }
                        : {}),
                    splitPayments: receivables.map(r => ({
                        receivableId: r.id,
                        amount: r.amount,
                        method: r.payment_method,
                        dueDate: r.due_date,
                        status: r.status,
                    })),
                } as ToothEntry;
            }

            const newBudgetStatus = calculateBudgetStatus(currentTeeth);
            const updatedNotes = JSON.stringify({ ...parsed, teeth: currentTeeth });

            await budgetsService.update(budget.id, {
                notes: updatedNotes,
                status: newBudgetStatus,
            });

            queryClient.invalidateQueries({ queryKey: ['budgets', patientId] });
            queryClient.invalidateQueries({ queryKey: ['receivables'] });
            queryClient.invalidateQueries({ queryKey: ['patient-credits', patientId] });

            const immediateCount = portions.filter(p => p.isImmediate).length;
            const scheduledCount = portions.length - immediateCount;
            const creditNote = totalCreditAppliedCents > 0 ? ` R$ ${(totalCreditAppliedCents / 100).toFixed(2)} cobertos pelo crédito.` : '';

            toast({
                title: "Pagamento Dividido Registrado",
                description: `${indices.length} item(ns) com ${immediateCount} parcela(s) paga(s)${scheduledCount > 0 ? `, ${scheduledCount} agendada(s)` : ''}.${creditNote}`,
            });
            onSuccess();
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Erro", description: "Falha ao registrar pagamento dividido." });
        } finally {
            setIsSubmitting(false);
            setPaymentBatch(null);
        }
    };

    return {
        paymentItem,
        paymentBatch,
        isSubmitting,
        setPaymentItem,
        setPaymentBatch,
        handlePayItem,
        handlePaySelected,
        handlePayAll,
        handleConfirmPayment,
        handleConfirmBatchPayment,
        handleConfirmSplitPayment,
        handleConfirmSplitBatchPayment,
        getItemValue,
    };
}
