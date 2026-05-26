import { supabase } from "@/lib/supabase";
import type {
  AccountingConversation,
  AccountingMessage,
  SendMessageRequest,
  SendMessageResponse,
} from "@/types/accountingAgent";

const EDGE_FUNCTION_URL = `${
  import.meta.env.VITE_SUPABASE_URL
}/functions/v1/accounting-agent`;

export const accountingAgentService = {
  // Send message to agent
  async sendMessage(
    request: SendMessageRequest
  ): Promise<SendMessageResponse> {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      throw new Error("Not authenticated");
    }

    const response = await fetch(EDGE_FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to send message");
    }

    return response.json();
  },

  // Get all conversations for a clinic
  async getConversations(
    clinicId: string
  ): Promise<AccountingConversation[]> {
    const { data, error } = await supabase
      .from("accounting_agent_conversations")
      .select("*")
      .eq("clinic_id", clinicId)
      .order("last_message_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Get a single conversation
  async getConversation(
    conversationId: string
  ): Promise<AccountingConversation | null> {
    const { data, error } = await supabase
      .from("accounting_agent_conversations")
      .select("*")
      .eq("id", conversationId)
      .single();

    if (error) throw error;
    return data;
  },

  // Get messages for a conversation
  async getMessages(
    conversationId: string
  ): Promise<AccountingMessage[]> {
    const { data, error } = await supabase
      .from("accounting_agent_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Delete a conversation
  async deleteConversation(conversationId: string): Promise<void> {
    const { error } = await supabase
      .from("accounting_agent_conversations")
      .delete()
      .eq("id", conversationId);

    if (error) throw error;
  },

  // Update conversation title
  async updateConversationTitle(
    conversationId: string,
    title: string
  ): Promise<void> {
    const { error } = await supabase
      .from("accounting_agent_conversations")
      .update({ title })
      .eq("id", conversationId);

    if (error) throw error;
  },
};
