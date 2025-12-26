import { supabase } from '../lib/supabase';
import type { Exam, ExamInsert, ExamUpdate } from '../types/database';
import * as FileSystem from 'expo-file-system/legacy';

// Inline base64 to ArrayBuffer decoder (avoids import issues with base64-arraybuffer)
function decodeBase64(base64: string): ArrayBuffer {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const lookup = new Uint8Array(256);
  for (let i = 0; i < chars.length; i++) {
    lookup[chars.charCodeAt(i)] = i;
  }

  let bufferLength = base64.length * 0.75;
  if (base64[base64.length - 1] === '=') bufferLength--;
  if (base64[base64.length - 2] === '=') bufferLength--;

  const arraybuffer = new ArrayBuffer(bufferLength);
  const bytes = new Uint8Array(arraybuffer);

  let p = 0;
  for (let i = 0; i < base64.length; i += 4) {
    const encoded1 = lookup[base64.charCodeAt(i)];
    const encoded2 = lookup[base64.charCodeAt(i + 1)];
    const encoded3 = lookup[base64.charCodeAt(i + 2)];
    const encoded4 = lookup[base64.charCodeAt(i + 3)];

    bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
    bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
    bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
  }

  return arraybuffer;
}

// Allowed MIME types for security
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const examsService = {
  async getByPatient(patientId: string): Promise<Exam[]> {
    const { data, error } = await supabase
      .from('exams')
      .select('*')
      .eq('patient_id', patientId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data as unknown as Exam[]) || [];
  },

  async uploadFile(file: { uri: string; type: string; name: string }): Promise<string> {
    // Validate MIME type before upload
    const mimeType = file.type || 'image/jpeg';
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      throw new Error(
        `Tipo de arquivo não permitido: ${mimeType}. Apenas imagens (JPEG, PNG, GIF, WebP, HEIC) e PDFs são aceitos.`
      );
    }

    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = fileName;

    // Read file as base64 for React Native
    const base64 = await FileSystem.readAsStringAsync(file.uri, {
      encoding: 'base64',
    });

    // Check file size (base64 is ~33% larger)
    const estimatedSize = (base64.length * 3) / 4;
    if (estimatedSize > MAX_FILE_SIZE) {
      throw new Error(
        `Arquivo muito grande (${(estimatedSize / 1024 / 1024).toFixed(2)}MB). O tamanho máximo permitido é ${MAX_FILE_SIZE / 1024 / 1024}MB.`
      );
    }

    // Convert base64 to ArrayBuffer using inline decoder
    const arrayBuffer = decodeBase64(base64);

    const { data, error } = await supabase.storage
      .from('exams')
      .upload(filePath, arrayBuffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (error) {
      console.error('[ExamUpload] Upload error:', error);
      throw error;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('exams')
      .getPublicUrl(filePath);

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
    const { data, error } = await (supabase
      .from('exams') as any)
      .update(exam)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as unknown as Exam;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('exams')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};




