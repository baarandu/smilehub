import { useState } from "react";
import { Calculator, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ChatInterface } from "@/components/accounting/ChatInterface";
import { ConversationSidebar } from "@/components/accounting/ConversationSidebar";
import { useAccountingConversations } from "@/hooks/useAccountingConversations";
import { useAccountingChat } from "@/hooks/useAccountingChat";
import { useCurrentClinic } from "@/hooks/useCurrentClinic";
import { toast } from "sonner";

export default function AccountingAgent() {
  const { currentClinic } = useCurrentClinic();
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(
    null
  );

  const {
    conversations,
    isLoading: isLoadingConversations,
    deleteConversation,
    updateTitle,
  } = useAccountingConversations(currentClinic?.id || "");

  const {
    messages,
    isLoading: isLoadingMessages,
    isSending,
    sendMessage,
  } = useAccountingChat(currentConversationId, currentClinic?.id || "");

  const handleSendMessage = async (message: string) => {
    try {
      const response = await sendMessage(message);

      // If new conversation was created, set it as current
      if (!currentConversationId && response.conversation_id) {
        setCurrentConversationId(response.conversation_id);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Erro ao enviar mensagem");
    }
  };

  const handleNewConversation = () => {
    setCurrentConversationId(null);
  };

  const handleDeleteConversation = (id: string) => {
    deleteConversation(id);
    if (currentConversationId === id) {
      setCurrentConversationId(null);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Calculator className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Agente de Contabilidade IA</h1>
            <p className="text-muted-foreground">
              Assistente inteligente para classificação, auditoria e fechamento contábil
            </p>
          </div>
        </div>

        <Alert className="mt-4">
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Importante:</strong> Este assistente fornece orientações gerais
            baseadas nos seus dados financeiros. Sempre confirme decisões importantes
            com seu contador antes de agir, pois cada caso pode ter particularidades.
          </AlertDescription>
        </Alert>
      </div>

      {/* Main content area */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 min-h-0">
        {/* Sidebar - Conversations */}
        <div className="hidden lg:block h-full">
          <ConversationSidebar
            conversations={conversations}
            currentConversationId={currentConversationId}
            onSelectConversation={setCurrentConversationId}
            onDeleteConversation={handleDeleteConversation}
            onUpdateTitle={updateTitle}
            isLoading={isLoadingConversations}
          />
        </div>

        {/* Main chat area */}
        <div className="h-full">
          <ChatInterface
            messages={messages}
            isLoading={isLoadingMessages}
            isSending={isSending}
            onSendMessage={handleSendMessage}
            showQuickActions={!currentConversationId}
          />
        </div>
      </div>

      {/* Mobile: Show conversations button */}
      <div className="lg:hidden mt-4">
        <Button
          variant="outline"
          onClick={handleNewConversation}
          className="w-full"
        >
          Ver todas as conversas ({conversations.length})
        </Button>
      </div>
    </div>
  );
}
