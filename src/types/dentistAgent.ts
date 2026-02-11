export interface DentistConversation {
  id: string;
  clinic_id: string;
  user_id: string;
  patient_id: string | null;
  title: string;
  created_at: string;
  updated_at: string;
  last_message_at: string;
  message_count: number;
  tool_calls_count: number;
}

export interface DentistMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  image_urls?: string[];
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  tool_name?: string;
  created_at: string;
  tokens_used?: number;
}

export interface ToolCall {
  name: string;
  arguments: Record<string, any>;
}

export interface SendDentistMessageRequest {
  conversation_id?: string;
  message: string;
  clinic_id: string;
  patient_id?: string;
  image_urls?: string[];
}

export interface SendDentistMessageResponse {
  conversation_id: string;
  response: string;
  tool_calls?: ToolCall[];
}

export interface DentistQuickAction {
  icon: React.ComponentType<any>;
  label: string;
  description: string;
  prompt: string;
  color: string;
  requiresPatient?: boolean;
}
