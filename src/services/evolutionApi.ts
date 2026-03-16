/**
 * Evolution API Service (via Edge Function Proxy)
 * All Evolution API calls go through the evolution-proxy Edge Function.
 * No API keys are exposed to the frontend.
 */

import { supabase } from '@/lib/supabase';

interface ConnectionStatus {
  status: 'connected' | 'connecting' | 'disconnected' | 'api_offline' | 'not_configured';
  provider?: 'meta' | 'evolution';
  instanceName?: string;
  instanceExists?: boolean;
  phoneNumber?: string;
  verifiedName?: string;
  qualityRating?: string;
  message?: string;
}

interface QRCodeData {
  base64: string | null;
  code: string | null;
  count: number;
}

interface ProxyResponse {
  success?: boolean;
  error?: string;
  instanceName?: string;
  qrcode?: QRCodeData;
  status?: string;
  provider?: string;
  instanceExists?: boolean;
  phoneNumber?: string;
  verifiedName?: string;
  qualityRating?: string;
  message?: string;
  messageId?: string;
}

async function callProxy(action: string, extra: Record<string, unknown> = {}): Promise<ProxyResponse> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Não autenticado');
  }

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/evolution-proxy`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ action, ...extra }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `Erro ${response.status}`);
  }

  return data;
}

class EvolutionApiService {
  /**
   * Check connection status (goes through proxy)
   */
  async getStatus(): Promise<ConnectionStatus> {
    const data = await callProxy('status');
    return {
      status: (data.status as ConnectionStatus['status']) || 'disconnected',
      provider: (data.provider as ConnectionStatus['provider']) || undefined,
      instanceName: data.instanceName as string | undefined,
      instanceExists: data.instanceExists as boolean | undefined,
      phoneNumber: data.phoneNumber as string | undefined,
      verifiedName: data.verifiedName as string | undefined,
      qualityRating: data.qualityRating as string | undefined,
      message: data.message as string | undefined,
    };
  }

  /**
   * Create instance + auto-setup webhook + return QR code
   */
  async createInstance(): Promise<ProxyResponse> {
    return callProxy('create');
  }

  /**
   * Get QR code for existing instance
   */
  async connect(): Promise<QRCodeData> {
    const data = await callProxy('connect');
    return data.qrcode || { base64: null, code: null, count: 0 };
  }

  /**
   * Disconnect WhatsApp
   */
  async disconnect(): Promise<void> {
    await callProxy('disconnect');
  }

  /**
   * Send a test message
   */
  async sendTest(phone: string, message: string): Promise<void> {
    await callProxy('send-test', { phone, message });
  }

  /**
   * Setup webhook (usually done automatically on create)
   */
  async setupWebhook(): Promise<void> {
    await callProxy('setup-webhook');
  }
}

export const evolutionApi = new EvolutionApiService();
export type { ConnectionStatus, QRCodeData, ProxyResponse };
