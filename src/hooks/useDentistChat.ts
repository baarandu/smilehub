import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dentistAgentService } from "@/services/dentistAgent";
import { toast } from "sonner";
import type { DentistMessage } from "@/types/dentistAgent";

export function useDentistChat(
  conversationId: string | null,
  clinicId: string,
  patientId?: string | null
) {
  const queryClient = useQueryClient();
  const [optimisticMessages, setOptimisticMessages] = useState<
    DentistMessage[]
  >([]);

  const messagesQuery = useQuery({
    queryKey: ["dentist-messages", conversationId],
    queryFn: () =>
      conversationId
        ? dentistAgentService.getMessages(conversationId)
        : Promise.resolve([]),
    enabled: !!conversationId,
  });

  const sendMessage = useMutation({
    mutationFn: async ({
      message,
      imageUrls,
    }: {
      message: string;
      imageUrls?: string[];
    }) => {
      // Add optimistic user message
      const optimisticUserMessage: DentistMessage = {
        id: `temp-${Date.now()}`,
        conversation_id: conversationId || "",
        role: "user",
        content: message,
        image_urls: imageUrls,
        created_at: new Date().toISOString(),
      };

      setOptimisticMessages((prev) => [...prev, optimisticUserMessage]);

      const response = await dentistAgentService.sendMessage({
        conversation_id: conversationId || undefined,
        message,
        clinic_id: clinicId,
        patient_id: patientId || undefined,
        image_urls: imageUrls,
      });

      return response;
    },
    onSuccess: (response) => {
      setOptimisticMessages([]);

      queryClient.invalidateQueries({
        queryKey: ["dentist-messages", response.conversation_id],
      });

      if (!conversationId) {
        queryClient.invalidateQueries({
          queryKey: ["dentist-conversations", clinicId],
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
