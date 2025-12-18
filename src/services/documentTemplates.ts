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

        const replacements = {
            'nome': patient.name || '',
            'cpf': patient.cpf || '___.___.___-__',
            'data_nascimento': patient.birth_date ? new Date(patient.birth_date).toLocaleDateString('pt-BR') : '__/__/____',
            'data': new Date(documentDate).toLocaleDateString('pt-BR')
        };

        for (const [key, value] of Object.entries(replacements)) {
            // Support {{key}} and {key} as well
            const regexDouble = new RegExp(`\\{\\{${key}\\}\\}`, 'gi');
            const regexSingle = new RegExp(`\\{${key}\\}`, 'gi');
            filled = filled.replace(regexDouble, value).replace(regexSingle, value);
        }

        return filled;
    },

    async saveAsExam(patientId: string, patientName: string, name: string, content: string, letterheadUrl?: string | null): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // Dynamically import jsPDF
        const { default: jsPDF } = await import('jspdf');
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 25;
        let y = 60; // Safer top margin for tall logos

        // Helper to add background
        const addBackground = async () => {
            if (letterheadUrl) {
                try {
                    const response = await fetch(letterheadUrl);
                    const blob = await response.blob();
                    const reader = new FileReader();
                    const base64Data = await new Promise<string>((resolve) => {
                        reader.onloadend = () => resolve(reader.result as string);
                        reader.readAsDataURL(blob);
                    });

                    let format = 'PNG';
                    if (blob.type.includes('jpeg') || blob.type.includes('jpg')) format = 'JPEG';
                    if (blob.type.includes('webp')) format = 'WEBP';

                    doc.addImage(base64Data, format, 0, 0, pageWidth, pageHeight);
                } catch (error) {
                    console.error('Error adding letterhead:', error);
                }
            }
        };

        // First page background
        await addBackground();

        // Title
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text(name.toUpperCase(), pageWidth / 2, y, { align: 'center' });
        y += 20;

        // Content
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        const lines: string[] = doc.splitTextToSize(content, pageWidth - (margin * 2));

        for (const line of lines) {
            if (y > pageHeight - 40) { // Keep space for footer/signature
                doc.addPage();
                await addBackground();
                y = 50; // New page top margin
            }
            doc.text(line, margin, y, { align: 'justify', maxWidth: pageWidth - (margin * 2) });
            y += 7; // Line height
        }

        // Signature Line
        y += 20;
        if (y > pageHeight - 40) {
            doc.addPage();
            await addBackground();
            y = 50;
        }
        doc.setDrawColor(0);
        doc.setLineWidth(0.5);
        doc.line(pageWidth / 2 - 40, y, pageWidth / 2 + 40, y);
        y += 5;
        doc.setFontSize(10);
        doc.text(patientName, pageWidth / 2, y, { align: 'center' });

        const pdfBlob = doc.output('blob');
        const fileName = `doc_${patientId}_${Date.now()}.pdf`;

        // Upload to exams bucket
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

        // Get clinic_id
        const { data: clinicUser } = await supabase
            .from('clinic_users')
            .select('clinic_id')
            .eq('user_id', user.id)
            .single();

        if (!clinicUser) throw new Error('Clinic not found');

        // Create exam record
        const { error: insertError } = await (supabase
            .from('exams') as any)
            .insert({
                patient_id: patientId,
                clinic_id: (clinicUser as any).clinic_id,
                title: name,
                name: name,
                date: new Date().toISOString().split('T')[0],
                order_date: new Date().toISOString().split('T')[0],
                file_urls: [publicUrl],
                type: 'document'
            });

        if (insertError) throw insertError;
    }
};
