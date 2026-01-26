/**
 * Evolution API Service
 * Integração com WhatsApp via Evolution API
 */

const EVOLUTION_API_URL = import.meta.env.VITE_EVOLUTION_API_URL;
const EVOLUTION_API_KEY = import.meta.env.VITE_EVOLUTION_API_KEY;

if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
  console.warn('Evolution API não configurada. Defina VITE_EVOLUTION_API_URL e VITE_EVOLUTION_API_KEY.');
}

interface EvolutionInstance {
  instance: {
    instanceName: string;
    instanceId: string;
    status: string;
    serverUrl: string;
    apikey: string;
    owner: string;
  };
}

interface ConnectionState {
  instance: {
    instanceName: string;
    state: 'open' | 'close' | 'connecting';
  };
}

interface QRCodeResponse {
  pairingCode: string | null;
  code: string;
  base64: string;
  count: number;
}

interface SendMessageResponse {
  key: {
    remoteJid: string;
    fromMe: boolean;
    id: string;
  };
  message: {
    extendedTextMessage?: {
      text: string;
    };
  };
  messageTimestamp: string;
  status: string;
}

interface SendMessagePayload {
  number: string;
  text: string;
  delay?: number;
}

class EvolutionApiService {
  private baseUrl: string;
  private apiKey: string;
  private instanceName: string = 'smilehub';

  constructor() {
    this.baseUrl = EVOLUTION_API_URL;
    this.apiKey = EVOLUTION_API_KEY;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'apikey': this.apiKey,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Evolution API Error:', errorText);
      throw new Error(`Evolution API Error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * Verifica se a API está acessível
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(this.baseUrl);
      const data = await response.json();
      return data.status === 200;
    } catch (error) {
      console.error('Evolution API health check failed:', error);
      return false;
    }
  }

  /**
   * Cria uma nova instância do WhatsApp
   */
  async createInstance(instanceName?: string): Promise<EvolutionInstance> {
    const name = instanceName || this.instanceName;

    return this.request<EvolutionInstance>('/instance/create', {
      method: 'POST',
      body: JSON.stringify({
        instanceName: name,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
      }),
    });
  }

  /**
   * Lista todas as instâncias
   */
  async listInstances(): Promise<any[]> {
    return this.request<any[]>('/instance/fetchInstances');
  }

  /**
   * Obtém o estado da conexão de uma instância
   */
  async getConnectionState(instanceName?: string): Promise<ConnectionState> {
    const name = instanceName || this.instanceName;
    return this.request<ConnectionState>(`/instance/connectionState/${name}`);
  }

  /**
   * Obtém o QR Code para conectar o WhatsApp
   */
  async getQRCode(instanceName?: string): Promise<QRCodeResponse> {
    const name = instanceName || this.instanceName;
    return this.request<QRCodeResponse>(`/instance/connect/${name}`);
  }

  /**
   * Desconecta uma instância
   */
  async logout(instanceName?: string): Promise<void> {
    const name = instanceName || this.instanceName;
    await this.request(`/instance/logout/${name}`, { method: 'DELETE' });
  }

  /**
   * Deleta uma instância
   */
  async deleteInstance(instanceName?: string): Promise<void> {
    const name = instanceName || this.instanceName;
    await this.request(`/instance/delete/${name}`, { method: 'DELETE' });
  }

  /**
   * Reinicia uma instância
   */
  async restartInstance(instanceName?: string): Promise<void> {
    const name = instanceName || this.instanceName;
    await this.request(`/instance/restart/${name}`, { method: 'PUT' });
  }

  /**
   * Envia uma mensagem de texto
   */
  async sendText(
    phone: string,
    message: string,
    instanceName?: string
  ): Promise<SendMessageResponse> {
    const name = instanceName || this.instanceName;

    // Formatar número para padrão brasileiro (55 + DDD + número)
    let formattedPhone = phone.replace(/\D/g, '');

    // Adiciona 55 se não tiver
    if (!formattedPhone.startsWith('55')) {
      formattedPhone = '55' + formattedPhone;
    }

    const payload: SendMessagePayload = {
      number: formattedPhone,
      text: message,
      delay: 1200, // Delay para simular digitação
    };

    return this.request<SendMessageResponse>(`/message/sendText/${name}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Envia uma mensagem com mídia (imagem, documento, etc)
   */
  async sendMedia(
    phone: string,
    mediaUrl: string,
    caption: string,
    mediaType: 'image' | 'video' | 'audio' | 'document',
    instanceName?: string
  ): Promise<SendMessageResponse> {
    const name = instanceName || this.instanceName;

    let formattedPhone = phone.replace(/\D/g, '');
    if (!formattedPhone.startsWith('55')) {
      formattedPhone = '55' + formattedPhone;
    }

    return this.request<SendMessageResponse>(`/message/sendMedia/${name}`, {
      method: 'POST',
      body: JSON.stringify({
        number: formattedPhone,
        mediatype: mediaType,
        media: mediaUrl,
        caption: caption,
      }),
    });
  }

  /**
   * Verifica se um número tem WhatsApp
   */
  async checkNumber(phone: string, instanceName?: string): Promise<boolean> {
    const name = instanceName || this.instanceName;

    let formattedPhone = phone.replace(/\D/g, '');
    if (!formattedPhone.startsWith('55')) {
      formattedPhone = '55' + formattedPhone;
    }

    try {
      const response = await this.request<any>(`/chat/whatsappNumbers/${name}`, {
        method: 'POST',
        body: JSON.stringify({
          numbers: [formattedPhone],
        }),
      });

      return response?.[0]?.exists || false;
    } catch {
      return false;
    }
  }

  /**
   * Obtém informações de configuração
   */
  getConfig() {
    return {
      apiUrl: this.baseUrl,
      instanceName: this.instanceName,
      isConfigured: !!this.apiKey && !!this.baseUrl,
    };
  }

  /**
   * Atualiza configuração
   */
  setConfig(apiUrl?: string, apiKey?: string, instanceName?: string) {
    if (apiUrl) this.baseUrl = apiUrl;
    if (apiKey) this.apiKey = apiKey;
    if (instanceName) this.instanceName = instanceName;
  }
}

export const evolutionApi = new EvolutionApiService();
export type { EvolutionInstance, ConnectionState, QRCodeResponse, SendMessageResponse };
