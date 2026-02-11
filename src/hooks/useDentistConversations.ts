import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dentistAgentService } from "@/services/dentistAgent";
import { toast } from "sonner";

export function useDentistConversations(clinicId: string) {
  const queryClient = useQueryClient();

  const conversationsQuery = useQuery({
    queryKey: ["dentist-conversations", clinicId],
    queryFn: () => dentistAgentService.getConversations(clinicId),
    enabled: !!clinicId,
  });

  const deleteConversation = useMutation({
    mutationFn: (conversationId: string) =>
      dentistAgentService.deleteConversation(conversationId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["dentist-conversations", clinicId],
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
    }) =>
      dentistAgentService.updateConversationTitle(conversationId, title),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["dentist-conversations", clinicId],
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
