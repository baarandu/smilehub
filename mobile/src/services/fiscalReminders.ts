import { supabase } from '../lib/supabase';
import type { TaxRegime, FiscalDocumentCategory } from '../types/fiscalDocuments';
import { getChecklistByRegime, FISCAL_CATEGORY_LABELS } from '../types/fiscalDocuments';

export interface FiscalReminder {
    id: string;
    clinic_id: string;
    tax_regime: TaxRegime;
    category: FiscalDocumentCategory;
    subcategory: string | null;
    title: string;
    description: string | null;
    due_date: string;
    frequency: 'once' | 'monthly' | 'quarterly' | 'annually';
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface FiscalAlert {
    id: string;
    type: 'missing_document' | 'expiring_document' | 'expired_document' | 'deadline';
    title: string;
    description: string;
    category: string;
    categoryLabel: string;
    dueDate: string;
    daysUntilDue: number;
    urgency: 'critical' | 'warning' | 'info';
    documentId?: string;
    reminderId?: string;
}

export interface ExpiringDocument {
    id: string;
    name: string;
    category: FiscalDocumentCategory;
    expiration_date: string;
    days_until_expiration: number;
}

// Calculate days between two dates
function daysBetween(date1: string, date2: string): number {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = d2.getTime() - d1.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Get urgency level based on days until due
function getUrgency(daysUntilDue: number): 'critical' | 'warning' | 'info' {
    if (daysUntilDue <= 0) return 'critical';
    if (daysUntilDue <= 7) return 'critical';
    if (daysUntilDue <= 30) return 'warning';
    return 'info';
}

export const fiscalRemindersService = {
    // Get all reminders for a clinic
    async getReminders(clinicId: string): Promise<FiscalReminder[]> {
        const { data, error } = await supabase
            .from('fiscal_document_reminders')
            .select('*')
            .eq('clinic_id', clinicId)
            .eq('is_active', true)
            .order('due_date', { ascending: true });

        if (error) throw error;
        return (data || []) as FiscalReminder[];
    },

    // Create a reminder
    async createReminder(reminder: Omit<FiscalReminder, 'id' | 'created_at' | 'updated_at'>): Promise<FiscalReminder> {
        const { data, error } = await supabase
            .from('fiscal_document_reminders')
            .insert(reminder as any)
            .select()
            .single();

        if (error) throw error;
        return data as FiscalReminder;
    },

    // Update a reminder
    async updateReminder(id: string, updates: Partial<FiscalReminder>): Promise<FiscalReminder> {
        const { data, error } = await (supabase
            .from('fiscal_document_reminders') as any)
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data as FiscalReminder;
    },

    // Delete a reminder
    async deleteReminder(id: string): Promise<void> {
        const { error } = await supabase
            .from('fiscal_document_reminders')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // Get expiring documents (within next X days)
    async getExpiringDocuments(clinicId: string, daysAhead: number = 30): Promise<ExpiringDocument[]> {
        const today = new Date().toISOString().split('T')[0];
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + daysAhead);
        const futureDateStr = futureDate.toISOString().split('T')[0];

        try {
            const { data, error } = await supabase
                .from('fiscal_documents')
                .select('id, name, category, expiration_date')
                .eq('clinic_id', clinicId)
                .not('expiration_date', 'is', null)
                .lte('expiration_date', futureDateStr)
                .order('expiration_date', { ascending: true });

            if (error) {
                // Column might not exist yet - return empty array
                if (error.code === '42703') {
                    console.warn('expiration_date column not found - migration needed');
                    return [];
                }
                throw error;
            }

            return ((data || []) as any[]).map(doc => ({
                ...doc,
                days_until_expiration: daysBetween(today, doc.expiration_date),
            })) as ExpiringDocument[];
        } catch (err: any) {
            // Handle column not exists error gracefully
            if (err?.code === '42703') {
                console.warn('expiration_date column not found - migration needed');
                return [];
            }
            throw err;
        }
    },

    // Get all fiscal alerts (missing docs, expiring docs, deadlines)
    async getFiscalAlerts(
        clinicId: string,
        taxRegime: TaxRegime,
        fiscalYear: number
    ): Promise<FiscalAlert[]> {
        const alerts: FiscalAlert[] = [];
        const today = new Date().toISOString().split('T')[0];

        // 1. Get expiring/expired documents
        const expiringDocs = await this.getExpiringDocuments(clinicId, 60);
        for (const doc of expiringDocs) {
            const isExpired = doc.days_until_expiration <= 0;
            alerts.push({
                id: `expiring-${doc.id}`,
                type: isExpired ? 'expired_document' : 'expiring_document',
                title: isExpired ? 'Documento vencido' : 'Documento vencendo',
                description: doc.name,
                category: doc.category,
                categoryLabel: FISCAL_CATEGORY_LABELS[doc.category] || doc.category,
                dueDate: doc.expiration_date,
                daysUntilDue: doc.days_until_expiration,
                urgency: getUrgency(doc.days_until_expiration),
                documentId: doc.id,
            });
        }

        // 2. Get upcoming reminders/deadlines
        const reminders = await this.getReminders(clinicId);
        const upcomingReminders = reminders.filter(r => {
            const daysUntil = daysBetween(today, r.due_date);
            return daysUntil <= 30 && r.tax_regime === taxRegime;
        });

        for (const reminder of upcomingReminders) {
            const daysUntil = daysBetween(today, reminder.due_date);
            alerts.push({
                id: `reminder-${reminder.id}`,
                type: 'deadline',
                title: reminder.title,
                description: reminder.description || '',
                category: reminder.category,
                categoryLabel: FISCAL_CATEGORY_LABELS[reminder.category as FiscalDocumentCategory] || reminder.category,
                dueDate: reminder.due_date,
                daysUntilDue: daysUntil,
                urgency: getUrgency(daysUntil),
                reminderId: reminder.id,
            });
        }

        // 3. Check for missing required documents (annual frequency items)
        const checklist = getChecklistByRegime(taxRegime);
        const requiredAnnualDocs = checklist.filter(item =>
            item.required && item.frequency === 'annual'
        );

        // Get existing documents for this year
        const { data: existingDocs } = await supabase
            .from('fiscal_documents')
            .select('category, subcategory')
            .eq('clinic_id', clinicId)
            .eq('fiscal_year', fiscalYear);

        const existingSet = new Set(
            ((existingDocs || []) as any[]).map(d => `${d.category}:${d.subcategory}`)
        );

        // Check for missing required annual documents after Q3 (October onwards)
        const currentMonth = new Date().getMonth() + 1;
        if (currentMonth >= 10) {
            for (const item of requiredAnnualDocs) {
                const key = `${item.category}:${item.subcategory}`;
                if (!existingSet.has(key)) {
                    alerts.push({
                        id: `missing-${item.category}-${item.subcategory}`,
                        type: 'missing_document',
                        title: 'Documento obrigatório pendente',
                        description: item.label,
                        category: item.category,
                        categoryLabel: FISCAL_CATEGORY_LABELS[item.category] || item.category,
                        dueDate: `${fiscalYear}-12-31`,
                        daysUntilDue: daysBetween(today, `${fiscalYear}-12-31`),
                        urgency: 'warning',
                    });
                }
            }
        }

        // Sort by urgency and due date
        return alerts.sort((a, b) => {
            const urgencyOrder = { critical: 0, warning: 1, info: 2 };
            if (urgencyOrder[a.urgency] !== urgencyOrder[b.urgency]) {
                return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
            }
            return a.daysUntilDue - b.daysUntilDue;
        });
    },

    // Get alert counts for badge
    async getAlertCounts(
        clinicId: string,
        taxRegime: TaxRegime,
        fiscalYear: number
    ): Promise<{ critical: number; warning: number; total: number }> {
        const alerts = await this.getFiscalAlerts(clinicId, taxRegime, fiscalYear);
        return {
            critical: alerts.filter(a => a.urgency === 'critical').length,
            warning: alerts.filter(a => a.urgency === 'warning').length,
            total: alerts.length,
        };
    },
};
