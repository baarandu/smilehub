import { useState } from 'react';
import { budgetsService } from '@/services/budgets';
import { financialService } from '@/services/financial';
import { prosthesisService } from '@/services/prosthesis';
import { getToothDisplayName, calculateBudgetStatus, type ToothEntry } from '@/utils/budgetUtils';
import { isProstheticTreatment, getProsthesisTypeFromTreatments, hasLabTreatment } from '@/utils/prosthesis';
import { isOrthodonticTreatment, getOrthoTypeFromTreatments } from '@/utils/orthodontics';
import { orthodonticsService } from '@/services/orthodontics';
import { useClinic } from '@/contexts/ClinicContext';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import type { BudgetWithItems } from '@/types/database';
import type { PayerData } from '../PaymentMethodDialog';

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
        const approvedItems = teeth.filter(t => t.status === 'approved');
        const indices = teeth.map((t, idx) => t.status === 'approved' ? idx : -1).filter(idx => idx !== -1);
        const totalValue = approvedItems.reduce((sum, t) => sum + getItemValue(t), 0);

        setPaymentBatch({ indices, teeth: approvedItems, totalValue });
    };

    const handleConfirmPayment = async (method: string, installments: number, brand?: string, breakdown?: any, payerData?: PayerData) => {
        if (!paymentItem || isSubmitting || !patientId) return;

        try {
            setIsSubmitting(true);

            const refreshedBudget = await budgetsService.getById(budget.id);
            if (!refreshedBudget) return;

            const parsed = JSON.parse(refreshedBudget.notes || '{}');
            const currentTeeth = parsed.teeth as ToothEntry[];
            if (!currentTeeth) return;

            const selectedTooth = currentTeeth[paymentItem.index];
            const totalAmount = getItemValue(selectedTooth);

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

            const startDate = parseBudgetDate(refreshedBudget.date);
            const budgetLocation = parsed.location || null;
            const paymentTag = getPaymentTag(method, brand);

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
                    payer_is_patient: payerData?.payer_is_patient ?? true,
                    payer_type: payerData?.payer_type || 'PF',
                    payer_name: payerData?.payer_name || null,
                    payer_cpf: payerData?.payer_cpf || null,
                    pj_source_id: payerData?.pj_source_id || null,
                } as any);
            }

            currentTeeth[paymentItem.index] = {
                ...currentTeeth[paymentItem.index],
                status: 'paid',
                paymentMethod: method as any,
                paymentInstallments: installments,
                paymentDate: new Date().toISOString().split('T')[0],
                financialBreakdown: breakdown
            };

            const newBudgetStatus = calculateBudgetStatus(currentTeeth);
            const updatedNotes = JSON.stringify({ ...parsed, teeth: currentTeeth });

            await budgetsService.update(budget.id, {
                notes: updatedNotes,
                status: newBudgetStatus
            });

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

    const handleConfirmBatchPayment = async (method: string, installments: number, brand?: string, breakdown?: any, payerData?: PayerData) => {
        if (!paymentBatch || isSubmitting || !patientId) return;

        try {
            setIsSubmitting(true);

            const refreshedBudget = await budgetsService.getById(budget.id);
            if (!refreshedBudget) return;

            const parsed = JSON.parse(refreshedBudget.notes || '{}');
            const currentTeeth = parsed.teeth as ToothEntry[];
            if (!currentTeeth) return;

            const { indices } = paymentBatch;
            const totalAmount = paymentBatch.totalValue;

            const isAnticipated = breakdown?.isAnticipated || false;
            const numInstallments = isAnticipated ? 1 : (installments || 1);

            const startDate = parseBudgetDate(refreshedBudget.date);
            const budgetLocation = parsed.location || null;
            const paymentTag = getPaymentTag(method, brand);

            const totalCardFee = breakdown?.cardFeeAmount || 0;
            const totalTaxAmount = breakdown?.taxAmount || 0;
            const totalAnticipationAmount = breakdown?.anticipationAmount || 0;

            for (const idx of indices) {
                const tooth = currentTeeth[idx];
                const itemValue = Object.values(tooth.values).reduce((a: number, b: string) => a + (parseInt(b) || 0) / 100, 0);
                const ratio = itemValue / totalAmount;

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
                        payer_is_patient: payerData?.payer_is_patient ?? true,
                        payer_type: payerData?.payer_type || 'PF',
                        payer_name: payerData?.payer_name || null,
                        payer_cpf: payerData?.payer_cpf || null,
                        pj_source_id: payerData?.pj_source_id || null,
                    } as any);
                }

                currentTeeth[idx] = {
                    ...tooth,
                    status: 'paid',
                    paymentMethod: method as any,
                    paymentInstallments: installments,
                    paymentDate: new Date().toISOString().split('T')[0],
                    financialBreakdown: {
                        grossAmount: itemValue,
                        netAmount: itemNetAmount,
                        taxRate: breakdown?.taxRate || 0,
                        taxAmount: itemTaxAmount,
                        cardFeeRate: breakdown?.cardFeeRate || 0,
                        cardFeeAmount: itemCardFee,
                        anticipationRate: breakdown?.anticipationRate || 0,
                        anticipationAmount: itemAnticipationAmount,
                        locationRate: itemLocationRate,
                        locationAmount: itemLocationAmount,
                    }
                };
            }

            const newBudgetStatus = calculateBudgetStatus(currentTeeth);
            const updatedNotes = JSON.stringify({ ...parsed, teeth: currentTeeth });

            await budgetsService.update(budget.id, {
                notes: updatedNotes,
                status: newBudgetStatus
            });

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
        getItemValue,
    };
}
