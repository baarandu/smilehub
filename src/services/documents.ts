import { supabase } from '@/lib/supabase';
import { PatientDocument, PatientDocumentInsert } from '@/types/database';

const BUCKET_NAME = 'patient-documents';

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

// Validate file before upload
function validateFile(file: File): void {
  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error(
      `Tipo de arquivo não permitido: ${file.type}. Apenas imagens (JPEG, PNG, GIF, WebP, HEIC) e PDFs são aceitos.`
    );
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      `Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(2)}MB). O tamanho máximo permitido é ${MAX_FILE_SIZE / 1024 / 1024}MB.`
    );
  }
}

// Upload file to Supabase Storage
export async function uploadFile(
  file: File,
  patientId: string
): Promise<{ url: string; path: string }> {
  // Validate file before upload
  validateFile(file);

  const fileExt = file.name.split('.').pop();
  const fileName = `${patientId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

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

// Delete file from Supabase Storage
export async function deleteFile(filePath: string): Promise<void> {
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([filePath]);

  if (error) throw error;
}

// Get all documents for a patient
export async function getPatientDocuments(patientId: string): Promise<PatientDocument[]> {
  const { data, error } = await supabase
    .from('patient_documents')
    .select('*')
    .eq('patient_id', patientId)
    .order('uploaded_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// Create document record
export async function createDocument(
  document: PatientDocumentInsert
): Promise<PatientDocument> {
  const { data, error } = await supabase
    .from('patient_documents')
    .insert(document as any)
    .select()
    .single();

  if (error) throw error;
  return data as PatientDocument;
}

// Upload file and create document record
export async function uploadPatientDocument(
  file: File,
  patientId: string,
  metadata: {
    name: string;
    description?: string;
    category?: PatientDocument['category'];
  }
): Promise<PatientDocument> {
  // Upload file
  const { url } = await uploadFile(file, patientId);

  // Determine file type
  const fileType = file.type.startsWith('image/') ? 'image' :
    file.type === 'application/pdf' ? 'pdf' : 'document';

  // Create document record
  const document = await createDocument({
    patient_id: patientId,
    name: metadata.name || file.name,
    description: metadata.description,
    file_url: url,
    file_type: fileType,
    file_size: file.size,
    category: metadata.category,
  });

  return document;
}

// Delete document and file
export async function deleteDocument(document: PatientDocument): Promise<void> {
  // Extract path from URL
  const urlParts = document.file_url.split('/');
  const bucketIndex = urlParts.findIndex(part => part === BUCKET_NAME);
  if (bucketIndex !== -1) {
    const filePath = urlParts.slice(bucketIndex + 1).join('/');
    await deleteFile(filePath);
  }

  // Delete record
  const { error } = await supabase
    .from('patient_documents')
    .delete()
    .eq('id', document.id);

  if (error) throw error;
}

// Get document categories
export const DOCUMENT_CATEGORIES = [
  { value: 'exam', label: 'Exame' },
  { value: 'xray', label: 'Raio-X' },
  { value: 'photo', label: 'Foto' },
  { value: 'document', label: 'Documento' },
  { value: 'prescription', label: 'Receita' },
] as const;





