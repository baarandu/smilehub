import { supabase } from '../lib/supabase';
import type { Exam, ExamInsert, ExamUpdate } from '../types/database';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';

export const examsService = {
  async getByPatient(patientId: string): Promise<Exam[]> {
    const { data, error } = await supabase
      .from('exams')
      .select('*')
      .eq('patient_id', patientId)
      .order('date', { ascending: false });

    if (error) throw error;
    return (data as unknown as Exam[]) || [];
  },

  async uploadFile(file: { uri: string; type: string; name: string }): Promise<string> {
    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = fileName;

    console.log('[ExamUpload] Starting upload for:', file.name, 'to path:', filePath);

    // Read file as base64 for React Native
    const base64 = await FileSystem.readAsStringAsync(file.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    console.log('[ExamUpload] Base64 length:', base64.length);

    // Convert base64 to ArrayBuffer
    const arrayBuffer = decode(base64);

    const { data, error } = await supabase.storage
      .from('exams')
      .upload(filePath, arrayBuffer, {
        contentType: file.type || 'image/jpeg',
        upsert: false,
      });

    if (error) {
      console.error('[ExamUpload] Upload error:', error);
      throw error;
    }

    console.log('[ExamUpload] Upload success, data:', data);

    const { data: { publicUrl } } = supabase.storage
      .from('exams')
      .getPublicUrl(filePath);

    console.log('[ExamUpload] Public URL:', publicUrl);

    return publicUrl;
  },

  async create(exam: ExamInsert): Promise<Exam> {
    const { data, error } = await supabase
      .from('exams')
      .insert(exam as any)
      .select()
      .single();

    if (error) throw error;
    return data as Exam;
  },

  async update(id: string, exam: Partial<ExamUpdate>): Promise<Exam> {
    const { data, error } = await supabase
      .from('exams')
      .update(exam as any)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Exam;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('exams')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};

