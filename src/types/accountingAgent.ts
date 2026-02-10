export interface AccountingConversation {
  id: string;
  clinic_id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  last_message_at: string;
  message_count: number;
  tool_calls_count: number;
}

export interface AccountingMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "tool";
  content: string;
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

export interface SendMessageRequest {
  conversation_id?: string;
  message: string;
  clinic_id: string;
}

export interface SendMessageResponse {
  conversation_id: string;
  response: string;
  tool_calls?: ToolCall[];
}

export type ConversationMode =
  | "classify"
  | "audit"
  | "close"
  | "checklist"
  | "diagnostic"
  | "expenses"
  | "deadlines"
  | "general";

export interface QuickAction {
  icon: React.ComponentType<any>;
  label: string;
  description: string;
  prompt: string;
  color: string;
  mode: ConversationMode;
}
