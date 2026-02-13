import { supabase } from '@/lib/supabase';
import type { DocumentTemplate, DocumentTemplateInsert, DocumentTemplateUpdate } from '@/types/database';

export const documentTemplatesService = {
    async getAll(): Promise<DocumentTemplate[]> {
        const { data, error } = await supabase
            .from('document_templates')
            .select('*')
            .order('name');

        if (error) throw error;
        return (data || []) as DocumentTemplate[];
    },

    async getById(id: string): Promise<DocumentTemplate> {
        const { data, error } = await supabase
            .from('document_templates')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data as DocumentTemplate;
    },

    async create(template: Omit<DocumentTemplateInsert, 'user_id'>): Promise<DocumentTemplate> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('document_templates')
            .insert({ ...template, user_id: user.id } as any)
            .select()
            .single();

        if (error) throw error;
        return data as DocumentTemplate;
    },

    async update(id: string, template: DocumentTemplateUpdate): Promise<DocumentTemplate> {
        const { data, error } = await (supabase
            .from('document_templates') as any)
            .update({ ...(template as any), updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data as DocumentTemplate;
    },

    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('document_templates')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // Helper to replace template variables with patient data
    fillTemplate(content: string, patient: { name: string; cpf?: string | null; birth_date?: string | null }, documentDate: string): string {
        let filled = content;

        // Formata data YYYY-MM-DD para DD/MM/YYYY sem usar Date (evita problema de timezone)
        const formatDate = (dateStr: string) => {
            const [year, month, day] = dateStr.split('-');
            return `${day}/${month}/${year}`;
        };

        const replacements = {
            'nome': patient.name || '',
            'cpf': patient.cpf || '___.___.___-__',
            'data_nascimento': patient.birth_date ? formatDate(patient.birth_date) : '__/__/____',
            'data': formatDate(documentDate)
        };

        for (const [key, value] of Object.entries(replacements)) {
            const regexDouble = new RegExp(`\\{\\{${key}\\}\\}`, 'gi');
            const regexSingle = new RegExp(`\\{${key}\\}`, 'gi');
            filled = filled.replace(regexDouble, value).replace(regexSingle, value);
        }

        return filled;
    },

    async generatePdfBlob(patientName: string, templateName: string, content: string, dentistName?: string): Promise<Blob> {
        const { default: jsPDF } = await import('jspdf');

        const doc = new jsPDF({ format: 'a4' });

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 25;
        let y = 40;

        // Title
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text(templateName.toUpperCase(), pageWidth / 2, y, { align: 'center' });
        y += 20;

        // Content
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        const lines: string[] = doc.splitTextToSize(content, pageWidth - (margin * 2));

        for (const line of lines) {
            if (y > pageHeight - 50) {
                doc.addPage();
                y = 40;
            }
            doc.text(line, margin, y, { align: 'justify', maxWidth: pageWidth - (margin * 2) });
            y += 7;
        }

        // Signature
        const nameLower = templateName.toLowerCase();
        const isConsentForm = nameLower.includes('termo') || nameLower.includes('consentimento')
            || nameLower.includes('autoriza');
        const isDentistOnlyDoc = nameLower.includes('receitu') || nameLower.includes('atestado');

        const signerName = dentistName || 'Responsável Técnico';

        y += 40;
        if (y > pageHeight - 60) {
            doc.addPage();
            y = 60;
        }

        doc.setDrawColor(0);
        doc.setLineWidth(0.5);
        doc.setFontSize(10);

        if (isConsentForm) {
            doc.line(pageWidth / 2 - 40, y, pageWidth / 2 + 40, y);
            y += 5;
            doc.text(patientName, pageWidth / 2, y, { align: 'center' });
        } else if (isDentistOnlyDoc) {
            doc.line(pageWidth / 2 - 40, y, pageWidth / 2 + 40, y);
            y += 5;
            doc.text(signerName, pageWidth / 2, y, { align: 'center' });
        } else {
            const leftCenter = pageWidth / 4;
            const rightCenter = (pageWidth * 3) / 4;
            doc.line(leftCenter - 35, y, leftCenter + 35, y);
            doc.line(rightCenter - 35, y, rightCenter + 35, y);
            y += 5;
            doc.text(patientName, leftCenter, y, { align: 'center' });
            doc.text(signerName, rightCenter, y, { align: 'center' });
        }

        const pdfOutput = doc.output('arraybuffer');
        return new Blob([pdfOutput], { type: 'application/pdf' });
    },

    async saveAsExam(patientId: string, patientName: string, name: string, content: string): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // Get dentist name for signature
        let dentistName: string | undefined;
        const nameLower = name.toLowerCase();
        const isConsentForm = nameLower.includes('termo') || nameLower.includes('consentimento')
            || nameLower.includes('autoriza');

        if (!isConsentForm) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('full_name, gender')
                .eq('id', user.id)
                .maybeSingle() as any;

            if (profile && profile.full_name) {
                const prefix = profile.gender === 'female' ? 'Dra.' : 'Dr.';
                dentistName = `${prefix} ${profile.full_name}`;
            }
        }

        const pdfBlob = await this.generatePdfBlob(patientName, name, content, dentistName);

        const fileName = `doc_${patientId}_${Date.now()}.pdf`;

        const { error: uploadError } = await supabase.storage
            .from('exams')
            .upload(fileName, pdfBlob, {
                contentType: 'application/pdf',
                upsert: true
            });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
            .from('exams')
            .getPublicUrl(fileName);

        const { error: insertError } = await (supabase
            .from('exams') as any)
            .insert({
                patient_id: patientId,
                name: name,
                order_date: new Date().toISOString().split('T')[0],
                file_urls: [publicUrl],
                file_type: 'document'
            });

        if (insertError) throw insertError;
    }
};
