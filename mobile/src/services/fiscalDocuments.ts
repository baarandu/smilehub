import { supabase } from '../lib/supabase';
import type {
    FiscalDocument,
    FiscalDocumentInsert,
    FiscalDocumentUpdate,
    FiscalDocumentCategory,
    TaxRegime,
    FiscalChecklistItem,
    FiscalChecklistSection,
} from '../types/fiscalDocuments';

const BUCKET_NAME = 'fiscal-documents';

// Allowed MIME types for security
const ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/heic',
    'image/heif',
    'application/pdf',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/xml',
    'application/xml',
];

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB for fiscal documents

// Validate file before upload
function validateFile(file: File): void {
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        throw new Error(
            `Tipo de arquivo não permitido: ${file.type}. Tipos aceitos: imagens, PDFs, Excel e XML.`
        );
    }

    if (file.size > MAX_FILE_SIZE) {
        throw new Error(
            `Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(2)}MB). O tamanho máximo é ${MAX_FILE_SIZE / 1024 / 1024}MB.`
        );
    }
}

// Upload file to Supabase Storage
// Path format: {clinicId}/{fiscalYear}/{category}/{timestamp}-{random}.{ext}
async function uploadFile(
    file: File,
    clinicId: string,
    fiscalYear: number,
    category: string
): Promise<{ url: string; path: string }> {
    validateFile(file);

    if (!clinicId) {
        throw new Error('clinicId é obrigatório para upload de arquivos');
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${clinicId}/${fiscalYear}/${category}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false,
        });

    if (error) throw error;

    const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(data.path);

    return {
        url: urlData.publicUrl,
        path: data.path,
    };
}

// Delete file from Storage
async function deleteFile(filePath: string): Promise<void> {
    const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([filePath]);

    if (error) throw error;
}

export const fiscalDocumentsService = {
    // Get all fiscal documents for a clinic
    async getAll(clinicId: string, fiscalYear?: number): Promise<FiscalDocument[]> {
        let query = supabase
            .from('fiscal_documents')
            .select('*')
            .eq('clinic_id', clinicId)
            .order('created_at', { ascending: false });

        if (fiscalYear) {
            query = query.eq('fiscal_year', fiscalYear);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    },

    // Get documents by category
    async getByCategory(
        clinicId: string,
        category: FiscalDocumentCategory,
        fiscalYear: number
    ): Promise<FiscalDocument[]> {
        const { data, error } = await supabase
            .from('fiscal_documents')
            .select('*')
            .eq('clinic_id', clinicId)
            .eq('category', category)
            .eq('fiscal_year', fiscalYear)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    // Get documents by regime
    async getByRegime(
        clinicId: string,
        taxRegime: TaxRegime,
        fiscalYear: number
    ): Promise<FiscalDocument[]> {
        const { data, error } = await supabase
            .from('fiscal_documents')
            .select('*')
            .eq('clinic_id', clinicId)
            .eq('fiscal_year', fiscalYear)
            .or(`tax_regime.eq.${taxRegime},tax_regime.eq.all`)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    // Get documents by month
    async getByMonth(
        clinicId: string,
        fiscalYear: number,
        month: number
    ): Promise<FiscalDocument[]> {
        const { data, error } = await supabase
            .from('fiscal_documents')
            .select('*')
            .eq('clinic_id', clinicId)
            .eq('fiscal_year', fiscalYear)
            .eq('reference_month', month)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    // Get a single document
    async getById(id: string): Promise<FiscalDocument | null> {
        const { data, error } = await supabase
            .from('fiscal_documents')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            throw error;
        }
        return data;
    },

    // Upload and create a fiscal document
    async upload(
        file: File,
        clinicId: string,
        userId: string,
        metadata: {
            name: string;
            description?: string;
            taxRegime: TaxRegime;
            category: FiscalDocumentCategory;
            subcategory?: string;
            fiscalYear: number;
            referenceMonth?: number;
            notes?: string;
        }
    ): Promise<FiscalDocument> {
        // Upload file
        const { url } = await uploadFile(
            file,
            clinicId,
            metadata.fiscalYear,
            metadata.category
        );

        // Determine file type
        const fileType = file.type.startsWith('image/')
            ? 'image'
            : file.type === 'application/pdf'
                ? 'pdf'
                : 'document';

        // Create document record (uploaded_by is optional to avoid FK constraint issues)
        const documentData: FiscalDocumentInsert = {
            clinic_id: clinicId,
            name: metadata.name || file.name,
            description: metadata.description,
            file_url: url,
            file_type: fileType as 'image' | 'pdf' | 'document',
            file_size: file.size,
            tax_regime: metadata.taxRegime,
            category: metadata.category,
            subcategory: metadata.subcategory,
            fiscal_year: metadata.fiscalYear,
            reference_month: metadata.referenceMonth,
            notes: metadata.notes,
            // Note: uploaded_by removed to avoid FK constraint issues with profiles table
        };

        const { data, error } = await supabase
            .from('fiscal_documents')
            .insert(documentData as any)
            .select()
            .single();

        if (error) throw error;
        return data as FiscalDocument;
    },

    // Update document metadata
    async update(id: string, updates: FiscalDocumentUpdate): Promise<FiscalDocument> {
        const { data, error } = await supabase
            .from('fiscal_documents')
            .update(updates as any)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data as FiscalDocument;
    },

    // Delete document and file
    async delete(document: FiscalDocument): Promise<void> {
        // Extract path from URL and delete file
        const urlParts = document.file_url.split('/');
        const bucketIndex = urlParts.findIndex(part => part === BUCKET_NAME);
        if (bucketIndex !== -1) {
            const filePath = urlParts.slice(bucketIndex + 1).join('/');
            await deleteFile(filePath);
        }

        // Delete record
        const { error } = await supabase
            .from('fiscal_documents')
            .delete()
            .eq('id', document.id);

        if (error) throw error;
    },

    // Get checklist status for a given regime and year
    async getChecklistStatus(
        clinicId: string,
        taxRegime: TaxRegime,
        fiscalYear: number
    ): Promise<FiscalChecklistSection[]> {
        // Get all documents for this clinic/year
        const documents = await this.getByRegime(clinicId, taxRegime, fiscalYear);

        // Import the checklist items
        const { getChecklistByRegime, groupChecklistByCategory, FISCAL_CATEGORY_LABELS } = await import('../types/fiscalDocuments');

        // Get checklist items for the regime
        const checklistItems = getChecklistByRegime(taxRegime);

        // Map documents to checklist items
        const itemsWithDocs = checklistItems.map(item => {
            const itemDocs = documents.filter(
                d => d.category === item.category && d.subcategory === item.subcategory
            );

            // Check if complete based on frequency
            let isComplete = itemDocs.length > 0;

            if (item.frequency === 'monthly' && isComplete) {
                // Check if we have at least one doc per month
                const monthsWithDocs = new Set(itemDocs.map(d => d.reference_month).filter(Boolean));
                isComplete = monthsWithDocs.size >= 12; // Ideally all 12 months
            } else if (item.frequency === 'quarterly' && isComplete) {
                const monthsWithDocs = new Set(itemDocs.map(d => d.reference_month).filter(Boolean));
                // Check for at least one doc in each quarter (months 3, 6, 9, 12)
                const quarters = [3, 6, 9, 12];
                isComplete = quarters.every(q =>
                    itemDocs.some(d => d.reference_month && d.reference_month <= q && d.reference_month > q - 3)
                );
            }

            return {
                ...item,
                documents: itemDocs,
                isComplete,
            };
        });

        // Group by category
        const sections = groupChecklistByCategory(itemsWithDocs);

        // Calculate completion counts
        return sections.map(section => ({
            ...section,
            items: itemsWithDocs.filter(i => i.category === section.category),
            completedCount: itemsWithDocs.filter(i => i.category === section.category && i.isComplete).length,
            totalCount: itemsWithDocs.filter(i => i.category === section.category).length,
        }));
    },

    // Get overall completion percentage
    async getCompletionPercentage(
        clinicId: string,
        taxRegime: TaxRegime,
        fiscalYear: number
    ): Promise<{ completed: number; total: number; percentage: number }> {
        const sections = await this.getChecklistStatus(clinicId, taxRegime, fiscalYear);

        const completed = sections.reduce((sum, s) => sum + s.completedCount, 0);
        const total = sections.reduce((sum, s) => sum + s.totalCount, 0);
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

        return { completed, total, percentage };
    },

    // Get pending/missing documents for accountant
    async getPendingDocuments(
        clinicId: string,
        taxRegime: TaxRegime,
        fiscalYear: number
    ): Promise<FiscalChecklistItem[]> {
        const sections = await this.getChecklistStatus(clinicId, taxRegime, fiscalYear);

        const pending: FiscalChecklistItem[] = [];
        sections.forEach(section => {
            section.items.forEach(item => {
                if (!item.isComplete && item.required) {
                    pending.push(item);
                }
            });
        });

        return pending;
    },

    // Export all documents as ZIP (returns URLs for download)
    async getExportUrls(
        clinicId: string,
        fiscalYear: number,
        taxRegime?: TaxRegime
    ): Promise<{ name: string; url: string; category: string }[]> {
        let documents: FiscalDocument[];

        if (taxRegime) {
            documents = await this.getByRegime(clinicId, taxRegime, fiscalYear);
        } else {
            documents = await this.getAll(clinicId, fiscalYear);
        }

        return documents.map(doc => ({
            name: doc.name,
            url: doc.file_url,
            category: doc.category,
        }));
    },

    // Get document counts by category for dashboard
    async getDocumentCounts(
        clinicId: string,
        fiscalYear: number
    ): Promise<Record<FiscalDocumentCategory, number>> {
        const { data, error } = await supabase
            .from('fiscal_documents')
            .select('category')
            .eq('clinic_id', clinicId)
            .eq('fiscal_year', fiscalYear);

        if (error) throw error;

        const counts: Record<string, number> = {};
        (data || []).forEach(doc => {
            counts[doc.category] = (counts[doc.category] || 0) + 1;
        });

        return counts as Record<FiscalDocumentCategory, number>;
    },
};
