import { supabase } from "@/lib/supabase";

const EDGE_FUNCTION_URL = `${
  import.meta.env.VITE_SUPABASE_URL
}/functions/v1/parse-materials`;

export interface ParsedMaterialItem {
  name: string;
  quantity: number;
  unitPrice: number;
  brand: string;
  type?: string;
  code?: string;
}

export interface ParseMaterialsResponse {
  items: ParsedMaterialItem[];
  brand?: string | null;
  payment_method?: string | null;
  total_amount?: number | null;
  tokens_used?: number;
}

export const materialsService = {
  async parseText(
    text: string,
    clinicId: string
  ): Promise<ParseMaterialsResponse> {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw new Error("Not authenticated");

    const response = await fetch(EDGE_FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        mode: "text",
        text,
        clinic_id: clinicId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Erro ao processar texto");
    }

    return response.json();
  },

  async parseInvoice(
    base64: string,
    fileType: string,
    clinicId: string
  ): Promise<ParseMaterialsResponse> {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw new Error("Not authenticated");

    const response = await fetch(EDGE_FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        mode: "invoice",
        image_base64: base64,
        file_type: fileType,
        clinic_id: clinicId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Erro ao processar nota fiscal");
    }

    return response.json();
  },
};
