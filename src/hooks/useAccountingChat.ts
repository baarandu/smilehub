import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { accountingAgentService } from "@/services/accountingAgent";
import { toast } from "sonner";
import type { AccountingMessage } from "@/types/accountingAgent";

export function useAccountingChat(
  conversationId: string | null,
  clinicId: string
) {
  const queryClient = useQueryClient();
  const [optimisticMessages, setOptimisticMessages] = useState<
    AccountingMessage[]
  >([]);

  const messagesQuery = useQuery({
    queryKey: ["accounting-messages", conversationId],
    queryFn: () =>
      conversationId
        ? accountingAgentService.getMessages(conversationId)
        : Promise.resolve([]),
    enabled: !!conversationId,
  });

  const sendMessage = useMutation({
    mutationFn: async (message: string) => {
      // Add optimistic user message
      const optimisticUserMessage: AccountingMessage = {
        id: `temp-${Date.now()}`,
        conversation_id: conversationId || "",
        role: "user",
        content: message,
        created_at: new Date().toISOString(),
      };

      setOptimisticMessages((prev) => [...prev, optimisticUserMessage]);

      const response = await accountingAgentService.sendMessage({
        conversation_id: conversationId || undefined,
        message,
        clinic_id: clinicId,
      });

      return response;
    },
    onSuccess: (response) => {
      // Clear optimistic messages
      setOptimisticMessages([]);

      // Invalidate and refetch messages
      queryClient.invalidateQueries({
        queryKey: ["accounting-messages", response.conversation_id],
      });

      // If new conversation, invalidate conversations list
      if (!conversationId) {
        queryClient.invalidateQueries({
          queryKey: ["accounting-conversations", clinicId],
        });
      }
    },
    onError: (error: Error) => {
      setOptimisticMessages([]);
      toast.error(`Erro ao enviar mensagem: ${error.message}`);
    },
  });

  const allMessages = [
    ...(messagesQuery.data || []),
    ...optimisticMessages,
  ];

  return {
    messages: allMessages,
    isLoading: messagesQuery.isLoading,
    isSending: sendMessage.isPending,
    error: messagesQuery.error,
    sendMessage: sendMessage.mutateAsync,
  };
}
