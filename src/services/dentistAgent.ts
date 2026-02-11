import { supabase } from "@/lib/supabase";
import type {
  DentistConversation,
  DentistMessage,
  SendDentistMessageRequest,
  SendDentistMessageResponse,
} from "@/types/dentistAgent";

const EDGE_FUNCTION_URL = `${
  import.meta.env.VITE_SUPABASE_URL
}/functions/v1/dentist-agent`;

export const dentistAgentService = {
  // Send message to agent
  async sendMessage(
    request: SendDentistMessageRequest
  ): Promise<SendDentistMessageResponse> {
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
  async getConversations(clinicId: string): Promise<DentistConversation[]> {
    const { data, error } = await supabase
      .from("dentist_agent_conversations")
      .select("*")
      .eq("clinic_id", clinicId)
      .order("last_message_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Get a single conversation
  async getConversation(
    conversationId: string
  ): Promise<DentistConversation | null> {
    const { data, error } = await supabase
      .from("dentist_agent_conversations")
      .select("*")
      .eq("id", conversationId)
      .single();

    if (error) throw error;
    return data;
  },

  // Get messages for a conversation
  async getMessages(conversationId: string): Promise<DentistMessage[]> {
    const { data, error } = await supabase
      .from("dentist_agent_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Delete a conversation
  async deleteConversation(conversationId: string): Promise<void> {
    const { error } = await supabase
      .from("dentist_agent_conversations")
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
      .from("dentist_agent_conversations")
      .update({ title })
      .eq("id", conversationId);

    if (error) throw error;
  },

  // Upload image for chat
  async uploadChatImage(clinicId: string, file: File): Promise<string> {
    const fileExt = file.name.split(".").pop();
    const fileName = `chat-images/${clinicId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("exams")
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from("exams")
      .getPublicUrl(fileName);

    return data.publicUrl;
  },
};
