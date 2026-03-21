// Constants for AI Secretary Service

import type { AISecretaryBehavior, AISecretarySettings, PredefinedMessageType } from './types';

// Predefined message situations
export const PREDEFINED_MESSAGE_TYPES: readonly PredefinedMessageType[] = [
    { key: 'cancellation', title: 'Cancelamento', description: 'Quando paciente cancela consulta', defaultMessage: 'Lamentamos que você precise cancelar. Deseja remarcar para outro dia?' },
    { key: 'reschedule', title: 'Reagendamento', description: 'Quando consulta é reagendada', defaultMessage: 'Sua consulta foi reagendada para {data} às {hora}. Confirmado!' },
    { key: 'no_show', title: 'Falta/No-show', description: 'Quando paciente não comparece', defaultMessage: 'Notamos sua ausência na consulta de hoje. Está tudo bem? Podemos remarcar.' },
    { key: 'birthday', title: 'Aniversário', description: 'Mensagem de aniversário', defaultMessage: 'Feliz aniversário! 🎂 A equipe da clínica deseja um dia especial!' },
    { key: 'followup', title: 'Retorno/Follow-up', description: 'Lembrete de retorno', defaultMessage: 'Olá! Está na hora do seu retorno. Que tal agendar?' },
    { key: 'welcome', title: 'Boas-vindas', description: 'Primeiro contato do paciente', defaultMessage: 'Seja bem-vindo(a)! Estamos felizes em tê-lo(a) como paciente.' },
    { key: 'payment_pending', title: 'Pagamento Pendente', description: 'Lembrete de pagamento', defaultMessage: 'Olá! Identificamos um pagamento pendente. Podemos ajudar?' },
    { key: 'post_procedure', title: 'Pós-procedimento', description: 'Cuidados após procedimento', defaultMessage: 'Como está se sentindo após o procedimento? Lembre-se dos cuidados recomendados.' },
] as const;

// Default behavior settings
export const DEFAULT_BEHAVIOR_SETTINGS: Omit<AISecretaryBehavior, 'id' | 'clinic_id' | 'created_at' | 'updated_at'> = {
    // Message behavior
    send_typing_indicator: true,
    send_recording_indicator: true,
    mark_as_read: true,
    react_to_messages: false,
    reaction_on_appointment: '✅',
    reaction_on_cancel: '😢',
    reaction_on_greeting: '👋',
    response_cadence_enabled: true,
    response_delay_min_ms: 1500,
    response_delay_max_ms: 4000,
    typing_speed_cpm: 300,
    wait_for_complete_message: true,
    wait_timeout_ms: 8000,

    // Audio
    receive_audio_enabled: true,
    transcribe_audio: true,
    audio_transcription_provider: 'openai',
    wait_for_audio_complete: true,
    audio_wait_timeout_ms: 30000,
    respond_with_audio: false,
    tts_provider: 'openai',
    tts_voice_id: 'shimmer',
    tts_speed: 1.0,
    audio_response_mode: 'never',

    // Payments
    send_payment_links: false,
    payment_provider: null,
    pix_enabled: false,
    pix_key: null,
    pix_key_type: null,
    pix_beneficiary_name: null,
    notify_payment_received: true,
    auto_confirm_payment: false,
    send_payment_reminders: false,
    payment_reminder_hours: 24,
    payment_link_message: 'Segue o link para pagamento da sua consulta:',
    payment_received_message: 'Pagamento recebido com sucesso! ✅',
    payment_reminder_message: 'Lembrete: você tem um pagamento pendente.',

    // Reminders
    send_appointment_reminders: true,
    reminder_times: [24, 2],
    reminder_include_address: true,
    reminder_include_professional: true,
    reminder_ask_confirmation: true,
    send_cancellation_alerts: true,
    offer_reschedule_on_cancel: true,
    reminder_message_24h: 'Olá! Lembrete: você tem consulta amanhã às {hora} com {profissional}.',
    reminder_message_2h: 'Sua consulta é em 2 horas! Endereço: {endereco}',
    cancellation_alert_message: 'Sua consulta de {data} foi cancelada.',
    reschedule_offer_message: 'Deseja remarcar para outro dia?',
    send_post_appointment_message: false,
    post_appointment_message: 'Como foi sua consulta? Sua opinião é importante para nós!',
    post_appointment_delay_hours: 2,
};

// TTS Voice options for UI
export const TTS_VOICES = {
    openai: [
        { id: 'alloy', name: 'Alloy', description: 'Neutra e equilibrada' },
        { id: 'echo', name: 'Echo', description: 'Masculina e grave' },
        { id: 'fable', name: 'Fable', description: 'Expressiva e britânica' },
        { id: 'onyx', name: 'Onyx', description: 'Profunda e autoritária' },
        { id: 'nova', name: 'Nova', description: 'Jovem e energética' },
        { id: 'shimmer', name: 'Shimmer', description: 'Feminina e suave' },
    ],
    elevenlabs: [
        { id: 'custom', name: 'Personalizada', description: 'Configure no ElevenLabs' },
    ],
    google: [
        { id: 'pt-BR-Standard-A', name: 'Standard A', description: 'Feminina padrão' },
        { id: 'pt-BR-Standard-B', name: 'Standard B', description: 'Masculina padrão' },
        { id: 'pt-BR-Wavenet-A', name: 'Wavenet A', description: 'Feminina neural' },
        { id: 'pt-BR-Wavenet-B', name: 'Wavenet B', description: 'Masculina neural' },
    ],
};

// Personality tone labels
export const PERSONALITY_TONES = {
    friendly: { label: 'Amigável', description: 'Descontraída e acolhedora' },
    professional: { label: 'Profissional', description: 'Cordial e objetiva' },
    formal: { label: 'Formal', description: 'Séria e respeitosa' },
};

export const EMOJI_OPTIONS = {
    yes: { label: 'Sim', description: 'Usa emojis frequentemente' },
    moderate: { label: 'Moderado', description: 'Usa emojis ocasionalmente' },
    no: { label: 'Não', description: 'Não usa emojis' },
};

// Behavior Presets
export type BehaviorPresetId = 'natural' | 'rapida' | 'discreta' | 'custom';

export interface BehaviorPresetConfig {
  id: BehaviorPresetId;
  label: string;
  emoji: string;
  description: string;
  overrides: Partial<AISecretaryBehavior>;
}

export const BEHAVIOR_PRESETS: BehaviorPresetConfig[] = [
  {
    id: 'natural',
    label: 'Natural',
    emoji: '🤝',
    description: 'Simula atendimento humano com delays, indicadores de digitação e reações',
    overrides: {
      send_typing_indicator: true,
      send_recording_indicator: true,
      mark_as_read: true,
      react_to_messages: true,
      response_cadence_enabled: true,
      response_delay_min_ms: 2000,
      response_delay_max_ms: 5000,
      typing_speed_cpm: 300,
      wait_for_complete_message: true,
      wait_timeout_ms: 8000,
      send_appointment_reminders: true,
      reminder_times: [24, 2],
    },
  },
  {
    id: 'rapida',
    label: 'Rápida',
    emoji: '⚡',
    description: 'Respostas instantâneas, sem delays nem indicadores — máxima eficiência',
    overrides: {
      send_typing_indicator: false,
      send_recording_indicator: false,
      mark_as_read: true,
      react_to_messages: false,
      response_cadence_enabled: false,
      response_delay_min_ms: 0,
      response_delay_max_ms: 0,
      wait_for_complete_message: false,
      send_appointment_reminders: true,
      reminder_times: [24],
    },
  },
  {
    id: 'discreta',
    label: 'Discreta',
    emoji: '🔇',
    description: 'Sem confirmações de leitura, sem digitação, sem reações — perfil baixo',
    overrides: {
      send_typing_indicator: false,
      send_recording_indicator: false,
      mark_as_read: false,
      react_to_messages: false,
      response_cadence_enabled: true,
      response_delay_min_ms: 3000,
      response_delay_max_ms: 8000,
      typing_speed_cpm: 200,
      wait_for_complete_message: true,
      wait_timeout_ms: 10000,
      send_appointment_reminders: true,
      reminder_times: [24, 2],
    },
  },
];

/** Check if current behavior matches a preset */
export function detectActivePreset(behavior: AISecretaryBehavior): BehaviorPresetId {
  for (const preset of BEHAVIOR_PRESETS) {
    const matches = Object.entries(preset.overrides).every(([key, value]) => {
      const current = (behavior as any)[key];
      if (Array.isArray(value) && Array.isArray(current)) {
        return JSON.stringify(value) === JSON.stringify(current);
      }
      return current === value;
    });
    if (matches) return preset.id;
  }
  return 'custom';
}

// Day names in Portuguese
export const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
export const DAY_NAMES_FULL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

// Default settings
export const DEFAULT_SETTINGS: Partial<AISecretarySettings> = {
    is_active: false,
    whatsapp_connected: false,
    tone: 'casual',
    work_hours_start: '08:00',
    work_hours_end: '18:00',
    work_days: { seg: true, ter: true, qua: true, qui: true, sex: true, sab: false, dom: false },
    min_advance_hours: 2,
    interval_minutes: 30,
    allowed_procedure_ids: [],
    greeting_message: 'Olá! Sou a assistente virtual. Como posso ajudar?',
    confirmation_message: 'Sua consulta foi agendada com sucesso!',
    reminder_message: 'Lembrete: Você tem uma consulta amanhã às {hora}.',
    out_of_hours_message: 'Olá! Nosso atendimento é das {inicio} às {fim}. Retornaremos em breve!',
    message_limit_per_conversation: 20,
    human_keywords: ['atendente', 'humano', 'pessoa', 'falar com alguém'],
    payment_methods: ['PIX', 'Dinheiro', 'Cartão de Débito', 'Cartão de Crédito'],
    accepted_insurance: [],
};

// Default behavior prompt for AI Secretary
export const DEFAULT_BEHAVIOR_PROMPT = `Você é uma secretária virtual simpática e profissional de uma clínica odontológica.

PERSONALIDADE:
- Seja acolhedora, educada e prestativa
- Use linguagem clara e acessível
- Demonstre empatia com as necessidades do paciente
- Mantenha um tom amigável mas profissional

FUNÇÕES PRINCIPAIS:
- Agendar consultas verificando a disponibilidade na agenda
- Responder dúvidas sobre procedimentos e valores
- Confirmar e remarcar consultas
- Enviar lembretes de consultas

DIRETRIZES:
- Sempre confirme os dados antes de finalizar um agendamento
- Se não souber responder algo, ofereça transferir para um atendente humano
- Não invente informações sobre preços ou procedimentos
- Seja breve e objetiva nas respostas
- Use emojis com moderação para tornar a conversa mais leve`;
