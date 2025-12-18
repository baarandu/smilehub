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
        const { data, error } = await supabase
            .from('document_templates')
            .update({ ...template, updated_at: new Date().toISOString() } as any)
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

        filled = filled.replace(/\{\{nome\}\}/gi, patient.name || '');
        filled = filled.replace(/\{\{cpf\}\}/gi, patient.cpf || '___.___.___-__');
        filled = filled.replace(/\{\{data_nascimento\}\}/gi,
            patient.birth_date ? new Date(patient.birth_date).toLocaleDateString('pt-BR') : '__/__/____'
        );
        filled = filled.replace(/\{\{data\}\}/gi,
            new Date(documentDate).toLocaleDateString('pt-BR')
        );

        return filled;
    }
};
