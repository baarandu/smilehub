import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { accountingAgentService } from "@/services/accountingAgent";
import { toast } from "sonner";

export function useAccountingConversations(clinicId: string) {
  const queryClient = useQueryClient();

  const conversationsQuery = useQuery({
    queryKey: ["accounting-conversations", clinicId],
    queryFn: () => accountingAgentService.getConversations(clinicId),
    enabled: !!clinicId,
  });

  const deleteConversation = useMutation({
    mutationFn: (conversationId: string) =>
      accountingAgentService.deleteConversation(conversationId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["accounting-conversations", clinicId],
      });
      toast.success("Conversa excluída");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir conversa: ${error.message}`);
    },
  });

  const updateTitle = useMutation({
    mutationFn: ({
      conversationId,
      title,
    }: {
      conversationId: string;
      title: string;
    }) => accountingAgentService.updateConversationTitle(conversationId, title),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["accounting-conversations", clinicId],
      });
      toast.success("Título atualizado");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar título: ${error.message}`);
    },
  });

  return {
    conversations: conversationsQuery.data || [],
    isLoading: conversationsQuery.isLoading,
    error: conversationsQuery.error,
    deleteConversation: deleteConversation.mutate,
    updateTitle: updateTitle.mutate,
    isDeleting: deleteConversation.isPending,
    isUpdating: updateTitle.isPending,
  };
}
