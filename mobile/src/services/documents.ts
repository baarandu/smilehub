import { supabase } from '../lib/supabase';

// Placeholder service for documents
// This can be expanded later if document management is needed

export const documentsService = {
    async getByPatient(patientId: string): Promise<any[]> {
        // Placeholder - return empty array for now
        return [];
    },

    async upload(file: { uri: string; type: string; name: string }, patientId: string): Promise<string> {
        // Placeholder - implement document upload later
        throw new Error('Document upload not implemented');
    },

    async delete(id: string): Promise<void> {
        // Placeholder - implement document delete later
        throw new Error('Document delete not implemented');
    },
};
