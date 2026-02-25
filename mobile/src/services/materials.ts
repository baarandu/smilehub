import { supabase } from '../lib/supabase';
import type { ParseMaterialsResponse } from '../types/materials';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;

async function getAccessToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Não autenticado');
  return session.access_token;
}

export const materialsService = {
  async parseText(text: string, clinicId: string): Promise<ParseMaterialsResponse> {
    const token = await getAccessToken();

    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/parse-materials`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          mode: 'text',
          text,
          clinic_id: clinicId,
        }),
      },
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Erro ao processar texto' }));
      throw new Error(err.error || 'Erro ao processar texto');
    }

    return response.json();
  },

  async parseInvoice(base64: string, fileType: string, clinicId: string): Promise<ParseMaterialsResponse> {
    const token = await getAccessToken();

    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/parse-materials`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          mode: 'invoice',
          image_base64: base64,
          file_type: fileType,
          clinic_id: clinicId,
        }),
      },
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Erro ao processar nota fiscal' }));
      throw new Error(err.error || 'Erro ao processar nota fiscal');
    }

    return response.json();
  },
};
