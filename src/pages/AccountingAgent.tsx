import { useState } from "react";
import { Calculator, Info, MessageSquare } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

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

  const handleDeleteConversation = (id: string) => {
    deleteConversation(id);
    if (currentConversationId === id) {
      setCurrentConversationId(null);
    }
  };

  const handleSelectConversation = (id: string | null) => {
    setCurrentConversationId(id);
    setMobileSheetOpen(false);
  };

  const handleUpdateTitle = (id: string, title: string) => {
    updateTitle({ conversationId: id, title });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-4 lg:mb-6">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Calculator className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold">Contabilidade IA</h1>
              <p className="text-sm text-muted-foreground hidden sm:block">
                Assistente inteligente para classificação, auditoria e fechamento contábil
              </p>
            </div>
          </div>

          {/* Mobile: conversations button */}
          <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="lg:hidden">
                <MessageSquare className="w-4 h-4 mr-2" />
                Conversas
                {conversations.length > 0 && (
                  <span className="ml-1.5 bg-primary/10 text-primary text-xs font-medium px-1.5 py-0.5 rounded-full">
                    {conversations.length}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 p-0">
              <SheetHeader className="p-4 border-b">
                <SheetTitle>Conversas</SheetTitle>
              </SheetHeader>
              <div className="h-[calc(100%-60px)]">
                <ConversationSidebar
                  conversations={conversations}
                  currentConversationId={currentConversationId}
                  onSelectConversation={handleSelectConversation}
                  onDeleteConversation={handleDeleteConversation}
                  onUpdateTitle={handleUpdateTitle}
                  isLoading={isLoadingConversations}
                  embedded
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <Alert className="mt-3">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs sm:text-sm">
            <strong>Importante:</strong> Este assistente fornece orientações gerais
            baseadas nos seus dados financeiros. Confirme decisões importantes
            com seu contador.
          </AlertDescription>
        </Alert>
      </div>

      {/* Main content area */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 min-h-0">
        {/* Sidebar - Desktop only */}
        <div className="hidden lg:block h-full">
          <ConversationSidebar
            conversations={conversations}
            currentConversationId={currentConversationId}
            onSelectConversation={setCurrentConversationId}
            onDeleteConversation={handleDeleteConversation}
            onUpdateTitle={handleUpdateTitle}
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
    </div>
  );
}
