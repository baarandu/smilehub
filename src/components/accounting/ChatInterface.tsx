import { useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { QuickActions } from "./QuickActions";
import type { AccountingMessage } from "@/types/accountingAgent";

interface ChatInterfaceProps {
  messages: AccountingMessage[];
  isLoading?: boolean;
  isSending?: boolean;
  onSendMessage: (message: string) => void;
  showQuickActions?: boolean;
}

export function ChatInterface({
  messages,
  isLoading,
  isSending,
  onSendMessage,
  showQuickActions = true,
}: ChatInterfaceProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  return (
    <Card className="h-full flex flex-col">
      {/* Messages area */}
      <ScrollArea className="flex-1 p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          // Empty state with quick actions
          <div className="flex flex-col items-center justify-center h-full p-8">
            <div className="text-center mb-8">
              <h3 className="text-xl font-semibold mb-2">
                Olá! Sou seu assistente contábil
              </h3>
              <p className="text-muted-foreground">
                Posso ajudar você com:
              </p>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                <li>🏷️ Classificar transações automaticamente</li>
                <li>🔍 Auditar lançamentos e encontrar problemas</li>
                <li>📊 Fechar o mês com DRE e impostos</li>
                <li>📄 Preparar documentos para o contador</li>
              </ul>
            </div>

            {showQuickActions && (
              <div className="w-full max-w-2xl">
                <p className="text-sm text-muted-foreground mb-3 text-center">
                  Escolha uma ação rápida ou digite sua pergunta:
                </p>
                <QuickActions
                  onSelectAction={onSendMessage}
                  disabled={isSending}
                />
              </div>
            )}
          </div>
        ) : (
          // Messages list
          <div className="space-y-4">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}

            {/* Loading indicator */}
            {isSending && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
                <Card className="p-4 bg-muted">
                  <p className="text-sm text-muted-foreground">
                    Processando sua solicitação...
                  </p>
                </Card>
              </div>
            )}

            {/* Scroll anchor */}
            <div ref={scrollRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input area */}
      <div className="p-4 border-t">
        <ChatInput onSend={onSendMessage} disabled={isSending} />
      </div>
    </Card>
  );
}
