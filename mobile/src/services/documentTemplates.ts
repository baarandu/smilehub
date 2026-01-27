import { supabase } from '../lib/supabase';
import * as FileSystem from 'expo-file-system/legacy';
import type { DocumentTemplate, Patient } from '../types/database';

export const documentTemplatesService = {
    async getAll(): Promise<DocumentTemplate[]> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('document_templates')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return (data || []) as DocumentTemplate[];
    },

    async create(template: { name: string; content: string }): Promise<DocumentTemplate> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data, error } = await supabase
            .from('document_templates')
            .insert({
                user_id: user.id,
                name: template.name,
                content: template.content
            } as any)
            .select()
            .single();

        if (error) throw error;
        return data as DocumentTemplate;
    },

    async update(id: string, template: { name?: string; content?: string }): Promise<DocumentTemplate> {
        const { data, error } = await (supabase
            .from('document_templates') as any)
            .update({
                ...template,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data as unknown as DocumentTemplate;
    },

    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('document_templates')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    fillTemplate(content: string, patient: Patient, date: string): string {
        let filled = content;

        const replacements: Record<string, string> = {
            'nome': patient.name || '',
            'cpf': patient.cpf || '___.___.___-__',
            'data_nascimento': patient.birth_date ? new Date(patient.birth_date).toLocaleDateString('pt-BR') : '__/__/____',
            'data': new Date(date).toLocaleDateString('pt-BR')
        };

        for (const [key, value] of Object.entries(replacements)) {
            const regexDouble = new RegExp(`\\{\\{${key}\\}\\}`, 'gi');
            const regexSingle = new RegExp(`\\{${key}\\}`, 'gi');
            filled = filled.replace(regexDouble, value).replace(regexSingle, value);
        }

        return filled;
    },

    async saveAsExam(patientId: string, name: string, fileUri: string): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // Read file as base64
        const base64Data = await FileSystem.readAsStringAsync(fileUri, {
            encoding: 'base64'
        } as any);

        if (!base64Data || base64Data.length < 100) {
            throw new Error('PDF file is empty or too small');
        }

        // Convert base64 to Uint8Array for upload
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        const fileName = `doc_${patientId}_${Date.now()}.pdf`;

        const { error: uploadError } = await supabase.storage
            .from('exams')
            .upload(fileName, bytes.buffer, {
                contentType: 'application/pdf',
                upsert: true
            });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
            .from('exams')
            .getPublicUrl(fileName);

        const { error: insertError } = await supabase
            .from('exams')
            .insert({
                patient_id: patientId,
                title: name,
                name: name,
                date: new Date().toISOString().split('T')[0],
                order_date: new Date().toISOString().split('T')[0],
                file_urls: [publicUrl],
                type: 'document'
            } as any);

        if (insertError) throw insertError;
    }
};
