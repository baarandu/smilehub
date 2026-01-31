import { supabase } from '@/lib/supabase';
import type { FinancialTransaction, FinancialTransactionInsert } from '@/types/database';
import { getToothDisplayName, type ToothEntry } from '@/utils/budgetUtils';

export const financialService = {
    /**
     * Get user role and clinic info
     * Returns { userId, clinicId, role, canSeeAllFinancials }
     */
    async getUserContext(): Promise<{
        userId: string;
        clinicId: string;
        role: string;
        canSeeAllFinancials: boolean;
    } | null> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data: clinicUser } = await supabase
            .from('clinic_users')
            .select('clinic_id, role')
            .eq('user_id', user.id)
            .single();

        if (!clinicUser) return null;

        const role = (clinicUser as any).role;
        // Owners, admins, and managers can see all financials
        // Dentists and other roles only see their own transactions
        const canSeeAllFinancials = ['owner', 'admin', 'manager'].includes(role);

        return {
            userId: user.id,
            clinicId: (clinicUser as any).clinic_id,
            role,
            canSeeAllFinancials
        };
    },

    async getTransactions(start: Date, end: Date): Promise<any[]> {
        // Get user context to determine filtering
        const context = await this.getUserContext();

        let query = supabase
            .from('financial_transactions')
            .select('*, patients(name)')
            .gte('date', start.toISOString())
            .lte('date', end.toISOString())
            .order('date', { ascending: false })
            .order('created_at', { ascending: false });

        // If user is a dentist (not owner/admin), filter by their user_id
        if (context && !context.canSeeAllFinancials) {
            query = query.eq('user_id', context.userId);
        }

        const { data, error } = await query;

        if (error) throw error;

        // Fetch creator names
        const transactions = (data || []) as any[];
        const creatorIds = [...new Set(transactions.map(t => t.created_by || t.user_id).filter(Boolean))];

        let creatorNames: Record<string, string> = {};
        if (creatorIds.length > 0) {
            const { data: profiles } = await supabase.rpc('get_profiles_for_users', { user_ids: creatorIds });
            if (profiles) {
                creatorNames = profiles.reduce((acc: Record<string, string>, p: any) => {
                    acc[p.id] = p.full_name || p.email;
                    return acc;
                }, {});
            }
        }

        return transactions.map(t => ({
            ...t,
            created_by_name: creatorNames[t.created_by || t.user_id] || null
        }));
    },

    async createTransaction(transaction: FinancialTransactionInsert): Promise<FinancialTransaction> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Usuário não autenticado');

        const { data: clinicUser } = await supabase
            .from('clinic_users')
            .select('clinic_id')
            .eq('user_id', user.id)
            .single();

        if (!clinicUser?.clinic_id) throw new Error('Clínica não encontrada');

        const { data, error } = await supabase
            .from('financial_transactions')
            .insert({
                ...transaction,
                clinic_id: (clinicUser as any).clinic_id,
                user_id: user.id,  // Track which user created the transaction
                created_by: user.id  // Also store in created_by for consistency
            } as any)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async createExpense(expense: {
        amount: number;
        description: string;
        category: string;
        date: string;
        location?: string | null;
        related_entity_id?: string | null;
    }): Promise<FinancialTransaction> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Usuário não autenticado');

        const { data: clinicUser } = await supabase
            .from('clinic_users')
            .select('clinic_id')
            .eq('user_id', user.id)
            .single();

        if (!clinicUser?.clinic_id) throw new Error('Clínica não encontrada');

        const { data, error } = await supabase
            .from('financial_transactions')
            .insert({
                type: 'expense',
                amount: expense.amount,
                description: expense.description,
                category: expense.category,
                date: expense.date,
                location: expense.location || null,
                related_entity_id: expense.related_entity_id || null,
                clinic_id: (clinicUser as any).clinic_id,
                user_id: user.id,  // Track which user created the expense
                created_by: user.id  // Also store in created_by for consistency
            } as any)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updateTransaction(id: string, updates: Partial<FinancialTransactionInsert>): Promise<void> {
        const { error } = await (supabase
            .from('financial_transactions') as any)
            .update(updates)
            .eq('id', id);

        if (error) throw error;
    },

    async getByRecurrenceId(recurrenceId: string): Promise<FinancialTransaction[]> {
        const { data, error } = await supabase
            .from('financial_transactions')
            .select('*')
            .eq('recurrence_id', recurrenceId)
            .order('date', { ascending: true });

        if (error) throw error;
        return data || [];
    },

    async updateRecurrence(recurrenceId: string, updates: any): Promise<void> {
        const { error } = await (supabase
            .from('financial_transactions') as any)
            .update(updates)
            .eq('recurrence_id', recurrenceId);

        if (error) throw error;
    },

    async deleteTransaction(id: string): Promise<void> {
        const { error } = await supabase
            .from('financial_transactions')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    async deleteRecurrence(recurrenceId: string): Promise<void> {
        const { error } = await supabase
            .from('financial_transactions')
            .delete()
            .eq('recurrence_id', recurrenceId);

        if (error) throw error;
    },

    // Delete income and revert linked budget teeth to pending status
    async deleteIncomeAndRevertBudget(transactionId: string): Promise<void> {
        // 1. Get the transaction to find the linked budget
        const { data: transaction, error: fetchError } = await supabase
            .from('financial_transactions')
            .select('*')
            .eq('id', transactionId)
            .single();

        if (fetchError) throw fetchError;
        if (!transaction) throw new Error('Transaction not found');

        const txn = transaction as any;

        // 2. If there's a linked budget (related_entity_id), revert the teeth status
        if (txn.related_entity_id) {
            const budgetId = txn.related_entity_id;

            // Get the budget
            const { data: budget, error: budgetError } = await supabase
                .from('budgets')
                .select('notes, status')
                .eq('id', budgetId)
                .single();

            const budgetData = budget as any;

            if (!budgetError && budgetData && budgetData.notes) {
                try {
                    const parsed = JSON.parse(budgetData.notes);
                    if (parsed.teeth && Array.isArray(parsed.teeth)) {
                        // Find teeth that were marked as paid with this transaction
                        // Revert them to pending
                        let changed = false;
                        parsed.teeth = parsed.teeth.map((tooth: any) => {
                            // If the tooth is paid and matches the transaction amount or description
                            // Or if it has a reference to this transaction
                            if (tooth.status === 'paid' || tooth.status === 'completed') {
                                changed = true;
                                return { ...tooth, status: 'pending' };
                            }
                            return tooth;
                        });

                        if (changed) {
                            // Update budget notes and status
                            const hasPending = parsed.teeth.some((t: any) => t.status === 'pending');
                            const allPaid = parsed.teeth.every((t: any) => t.status === 'paid' || t.status === 'completed');
                            const newStatus = allPaid ? 'completed' : (hasPending ? 'pending' : 'approved');

                            await (supabase
                                .from('budgets') as any)
                                .update({
                                    notes: JSON.stringify(parsed),
                                    status: newStatus
                                })
                                .eq('id', budgetId);
                        }
                    }
                } catch (e) {
                    console.error('Error parsing budget notes:', e);
                }
            }
        }

        // 3. Delete the transaction
        const { error: deleteError } = await supabase
            .from('financial_transactions')
            .delete()
            .eq('id', transactionId);

        if (deleteError) throw deleteError;
    },

    /**
     * Delete an expense and revert the linked shopping order to pending status if it's a materials expense
     */
    async deleteExpenseAndRevertMaterials(transactionId: string): Promise<void> {
        // 1. Try to get the expense to find related_entity_id (may fail due to RLS)
        const { data: transaction } = await (supabase
            .from('financial_transactions') as any)
            .select('category, related_entity_id')
            .eq('id', transactionId)
            .maybeSingle();

        // 2. If it's a materials expense with a linked shopping order, revert it
        if (transaction?.category === 'Materiais' && transaction?.related_entity_id) {
            const shoppingOrderId = transaction.related_entity_id;

            // Revert shopping order to pending status
            await (supabase
                .from('shopping_orders') as any)
                .update({
                    status: 'pending',
                    completed_at: null
                })
                .eq('id', shoppingOrderId);
        }

        // 3. Delete the expense transaction
        const { error: deleteError } = await supabase
            .from('financial_transactions')
            .delete()
            .eq('id', transactionId);

        if (deleteError) throw deleteError;
    },

    /**
     * Sync budget item rates to existing financial transactions
     * Called when a budget is updated to ensure proper financial reporting
     */
    async syncBudgetRates(budgetId: string, teeth: ToothEntry[]): Promise<void> {
        // 1. Fetch all income transactions linked to this budget
        const { data: transactions, error } = await supabase
            .from('financial_transactions')
            .select('*')
            .eq('related_entity_id', budgetId)
            .eq('type', 'income');

        if (error) throw error;
        if (!transactions || transactions.length === 0) return;

        // 2. Iterate through updated teeth and sync corresponding transactions
        for (const tooth of teeth) {
            // Skip invalid entries
            if (!tooth.treatments || tooth.treatments.length === 0) continue;

            const treatmentsStr = tooth.treatments.join(', ');
            const toothDisplay = getToothDisplayName(tooth.tooth);

            // Find transactions that match this tooth/item
            // Matching strategy: description must contain tooth name AND at least one of the treatments
            const matchingTransactions = transactions.filter(t => {
                const hasTooth = t.description.includes(toothDisplay);
                const hasTreatment = tooth.treatments.some(treatment => t.description.includes(treatment));
                return hasTooth && hasTreatment;
            });

            if (matchingTransactions.length === 0) continue;

            // Determine correct rate for this item
            // Priority: Item specific > Global logic (handled by caller passing loaded/merged value if possible, 
            // but here we rely on what's in the tooth object from NewBudgetDialog)
            const newRate = tooth.locationRate || 0;

            // Update found transactions
            for (const tx of matchingTransactions) {
                // Skip if rate is already correct (optimization)
                // We cast to any because standard definitions might be missing location_rate properties in some types
                const currentRate = tx.location_rate || 0;

                // Always recalculate to ensure consistency, even if rate looks same (maybe amount changed? unlikely in this context but safe)

                // Calculate new location amount (based on gross minus card fee, consistent with PaymentMethodDialog)
                const baseForLocation = tx.amount - (tx.card_fee_amount || 0);
                const newLocationAmount = (baseForLocation * newRate) / 100;

                // Recalculate net amount
                // Start with gross amount
                let newNetAmount = tx.amount;

                // Deduct known fees (if fields exist and are non-null)
                if (tx.tax_amount) newNetAmount -= tx.tax_amount;
                if (tx.card_fee_amount) newNetAmount -= tx.card_fee_amount;
                if (tx.anticipation_amount) newNetAmount -= tx.anticipation_amount;
                if (tx.commission_amount) newNetAmount -= tx.commission_amount;

                // Deduct new location amount
                newNetAmount -= newLocationAmount;



                await (supabase.from('financial_transactions') as any).update({
                    location_rate: newRate,
                    location_amount: newLocationAmount,
                    net_amount: newNetAmount
                }).eq('id', tx.id);
            }
        }
    },

    /**
     * Migração: Recalcula taxas de localização de transações em lote
     * Corrige transações que usavam média das taxas em vez de cálculo individual
     * Retorna um relatório com as transações corrigidas
     */
    async migrateBatchLocationRates(): Promise<{
        total: number;
        corrected: number;
        skipped: number;
        errors: string[];
        details: Array<{
            transactionId: string;
            budgetId: string;
            description: string;
            oldLocationAmount: number;
            newLocationAmount: number;
            difference: number;
        }>;
    }> {
        const report = {
            total: 0,
            corrected: 0,
            skipped: 0,
            errors: [] as string[],
            details: [] as Array<{
                transactionId: string;
                budgetId: string;
                description: string;
                oldLocationAmount: number;
                newLocationAmount: number;
                difference: number;
            }>
        };

        // 1. Busca todas as transações de income vinculadas a orçamentos
        const { data: transactions, error: txError } = await supabase
            .from('financial_transactions')
            .select('*')
            .eq('type', 'income')
            .not('related_entity_id', 'is', null);

        if (txError) {
            report.errors.push(`Erro ao buscar transações: ${txError.message}`);
            return report;
        }

        if (!transactions || transactions.length === 0) {
            return report;
        }

        // Agrupa transações por budget_id para otimizar consultas
        const transactionsByBudget = new Map<string, any[]>();
        for (const tx of transactions) {
            const budgetId = tx.related_entity_id;
            if (!transactionsByBudget.has(budgetId)) {
                transactionsByBudget.set(budgetId, []);
            }
            transactionsByBudget.get(budgetId)!.push(tx);
        }

        // 2. Processa cada orçamento
        for (const [budgetId, budgetTransactions] of transactionsByBudget) {
            // Busca o orçamento
            const { data: budget, error: budgetError } = await supabase
                .from('budgets')
                .select('notes, location_rate')
                .eq('id', budgetId)
                .single();

            if (budgetError || !budget) {
                report.errors.push(`Orçamento ${budgetId} não encontrado`);
                report.skipped += budgetTransactions.length;
                continue;
            }

            let teeth: ToothEntry[] = [];
            let defaultLocationRate = (budget as any).location_rate || 0;

            try {
                const parsed = JSON.parse((budget as any).notes || '{}');
                teeth = parsed.teeth || [];
                if (parsed.locationRate) {
                    defaultLocationRate = parseFloat(parsed.locationRate);
                }
            } catch {
                report.errors.push(`Erro ao parsear notes do orçamento ${budgetId}`);
                report.skipped += budgetTransactions.length;
                continue;
            }

            if (teeth.length === 0) {
                report.skipped += budgetTransactions.length;
                continue;
            }

            // 3. Processa cada transação deste orçamento
            for (const tx of budgetTransactions) {
                report.total++;

                // Verifica se é transação em lote (contém "|" na descrição)
                const isBatch = tx.description && tx.description.includes(' | ');

                if (!isBatch) {
                    // Transação individual - já está correta
                    report.skipped++;
                    continue;
                }

                // Identifica os itens da transação pela descrição
                // Formato: "Tratamento - Dente | Tratamento - Dente (Método)"
                const descWithoutMethod = tx.description.replace(/\s*\([^)]+\)\s*(\(\d+\/\d+\))?$/, '');
                const itemDescriptions = descWithoutMethod.split(' | ');

                // Encontra os itens correspondentes no orçamento
                const matchedTeeth: ToothEntry[] = [];
                for (const itemDesc of itemDescriptions) {
                    // Formato: "Tratamento1, Tratamento2 - Dente"
                    const match = itemDesc.match(/^(.+)\s*-\s*(.+)$/);
                    if (!match) continue;

                    const treatments = match[1].split(',').map(t => t.trim());
                    const toothName = match[2].trim();

                    // Busca o tooth correspondente
                    const matchedTooth = teeth.find(t => {
                        const toothDisplay = getToothDisplayName(t.tooth);
                        const matchesTooth = toothDisplay === toothName || t.tooth === toothName;
                        const matchesTreatments = treatments.every(treatment =>
                            t.treatments.some(tt => tt.includes(treatment) || treatment.includes(tt))
                        );
                        return matchesTooth && matchesTreatments;
                    });

                    if (matchedTooth) {
                        matchedTeeth.push(matchedTooth);
                    }
                }

                if (matchedTeeth.length === 0) {
                    report.errors.push(`Transação ${tx.id}: nenhum item encontrado no orçamento`);
                    report.skipped++;
                    continue;
                }

                // 4. Recalcula a taxa de localização individualmente
                let newLocationAmountTotal = 0;
                let totalItemValue = 0;

                for (const tooth of matchedTeeth) {
                    const itemValue = Object.values(tooth.values as Record<string, string>)
                        .reduce((a: number, b: string) => a + (parseInt(b) || 0) / 100, 0);
                    const itemRate = (tooth as any).locationRate ?? defaultLocationRate;

                    totalItemValue += itemValue;
                    newLocationAmountTotal += (itemValue * itemRate / 100);
                }

                // Considera a taxa de cartão se houver
                const cardFeePerTx = tx.card_fee_amount || 0;
                const baseForLocation = tx.amount - cardFeePerTx;

                // Se o valor total dos itens encontrados for diferente do valor da transação,
                // ajusta proporcionalmente (pode haver parcelamento)
                if (totalItemValue > 0 && Math.abs(totalItemValue - tx.amount) > 0.01) {
                    const ratio = tx.amount / totalItemValue;
                    newLocationAmountTotal = newLocationAmountTotal * ratio;
                }

                // Ajusta considerando a taxa de cartão
                if (cardFeePerTx > 0 && totalItemValue > 0) {
                    // Recalcula: para cada item, (valor - proporcional da taxa de cartão) * taxa
                    const cardFeeRatio = cardFeePerTx / tx.amount;
                    newLocationAmountTotal = matchedTeeth.reduce((sum, tooth) => {
                        const itemValue = Object.values(tooth.values as Record<string, string>)
                            .reduce((a: number, b: string) => a + (parseInt(b) || 0) / 100, 0);
                        const itemRate = (tooth as any).locationRate ?? defaultLocationRate;
                        const itemBase = itemValue * (1 - cardFeeRatio);
                        return sum + (itemBase * itemRate / 100);
                    }, 0);

                    // Ajusta proporcionalmente se for parcela
                    if (totalItemValue > 0 && Math.abs(totalItemValue - tx.amount) > 0.01) {
                        const ratio = tx.amount / totalItemValue;
                        newLocationAmountTotal = newLocationAmountTotal * ratio;
                    }
                }

                const oldLocationAmount = tx.location_amount || 0;
                const difference = newLocationAmountTotal - oldLocationAmount;

                // Só atualiza se houver diferença significativa (> 1 centavo)
                if (Math.abs(difference) < 0.01) {
                    report.skipped++;
                    continue;
                }

                // 5. Calcula nova taxa efetiva e net_amount
                const effectiveRate = tx.amount > 0 ? (newLocationAmountTotal / tx.amount) * 100 : 0;

                let newNetAmount = tx.amount;
                if (tx.tax_amount) newNetAmount -= tx.tax_amount;
                if (tx.card_fee_amount) newNetAmount -= tx.card_fee_amount;
                if (tx.anticipation_amount) newNetAmount -= tx.anticipation_amount;
                if (tx.commission_amount) newNetAmount -= tx.commission_amount;
                newNetAmount -= newLocationAmountTotal;

                // 6. Atualiza a transação
                const { error: updateError } = await (supabase.from('financial_transactions') as any)
                    .update({
                        location_rate: effectiveRate,
                        location_amount: newLocationAmountTotal,
                        net_amount: newNetAmount
                    })
                    .eq('id', tx.id);

                if (updateError) {
                    report.errors.push(`Erro ao atualizar transação ${tx.id}: ${updateError.message}`);
                    continue;
                }

                report.corrected++;
                report.details.push({
                    transactionId: tx.id,
                    budgetId,
                    description: tx.description,
                    oldLocationAmount,
                    newLocationAmount: newLocationAmountTotal,
                    difference
                });
            }
        }

        return report;
    }
};
