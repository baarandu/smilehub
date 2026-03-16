import { supabase } from '@/lib/supabase';

export interface ConversationSummary {
  id: string;
  clinic_id: string;
  phone_number: string;
  contact_name: string | null;
  status: 'active' | 'completed' | 'transferred' | 'abandoned';
  messages_count: number;
  appointment_created: boolean;
  started_at: string;
  last_message_at: string;
  ended_at: string | null;
  transferred_reason: string | null;
  followup_count: number;
}

export interface ConversationMessage {
  id: string;
  sender: 'patient' | 'ai' | 'human';
  content: string;
  intent_detected: string | null;
  sent_at: string;
}

export interface ConversationFilters {
  status?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export async function getConversations(
  clinicId: string,
  filters?: ConversationFilters
): Promise<ConversationSummary[]> {
  let query = supabase
    .from('ai_secretary_conversations')
    .select('id, clinic_id, phone_number, contact_name, status, messages_count, appointment_created, started_at, last_message_at, ended_at, transferred_reason, followup_count')
    .eq('clinic_id', clinicId)
    .order('last_message_at', { ascending: false })
    .limit(100);

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }

  if (filters?.search) {
    query = query.or(`phone_number.ilike.%${filters.search}%,contact_name.ilike.%${filters.search}%`);
  }

  if (filters?.dateFrom) {
    query = query.gte('started_at', filters.dateFrom);
  }

  if (filters?.dateTo) {
    query = query.lte('started_at', filters.dateTo + 'T23:59:59');
  }

  const { data, error } = await query;
  if (error) {
    if (error.code === '42P01' || error.message?.includes('does not exist')) {
      return [];
    }
    throw error;
  }
  return (data || []) as ConversationSummary[];
}

export async function getConversationMessages(
  conversationId: string
): Promise<ConversationMessage[]> {
  const { data, error } = await supabase
    .from('ai_secretary_messages')
    .select('id, sender, content, intent_detected, sent_at')
    .eq('conversation_id', conversationId)
    .order('sent_at', { ascending: true })
    .limit(200);

  if (error) {
    if (error.code === '42P01' || error.message?.includes('does not exist')) {
      return [];
    }
    throw error;
  }
  return (data || []) as ConversationMessage[];
}
