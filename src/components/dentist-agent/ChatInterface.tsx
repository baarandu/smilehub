import { useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Stethoscope } from "lucide-react";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { QuickActions } from "./QuickActions";
import { PatientContextHeader } from "./PatientContextHeader";
import type { DentistMessage } from "@/types/dentistAgent";

interface ChatInterfaceProps {
  messages: DentistMessage[];
  isLoading?: boolean;
  isSending?: boolean;
  onSendMessage: (message: string, imageUrls?: string[]) => void;
  showQuickActions?: boolean;
  hasPatient?: boolean;
  patientName: string | null;
  patientAge: number | null;
  onClearPatient: () => void;
  clinicId: string;
}

export function ChatInterface({
  messages,
  isLoading,
  isSending,
  onSendMessage,
  showQuickActions = true,
  hasPatient,
  patientName,
  patientAge,
  onClearPatient,
  clinicId,
}: ChatInterfaceProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  return (
    <Card className="h-full flex flex-col overflow-hidden">
      {/* Patient context header */}
      <PatientContextHeader
        patientName={patientName}
        patientAge={patientAge}
        onClearPatient={onClearPatient}
      />

      {/* Messages area */}
      <ScrollArea className="flex-1 min-h-0 p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center justify-center h-full p-8">
            <div className="text-center mb-8">
              <div className="mx-auto w-12 h-12 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center mb-4">
                <Stethoscope className="w-6 h-6 text-teal-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">
                Olá! Sou seu consultor odontológico senior
              </h3>
              <p className="text-muted-foreground mb-2">
                Segunda opinião clínica para auxiliar no seu raciocínio.
              </p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>Diagnóstico diferencial e hipóteses clínicas</li>
                <li>Análise de radiografias e imagens clínicas</li>
                <li>Verificação de contraindicações e interações</li>
                <li>Planos de tratamento estruturados</li>
              </ul>
            </div>

            {showQuickActions && (
              <div className="w-full max-w-2xl">
                <p className="text-sm text-muted-foreground mb-3 text-center">
                  Escolha uma ação rápida ou descreva seu caso:
                </p>
                <QuickActions
                  onSelectAction={(prompt) => onSendMessage(prompt)}
                  disabled={isSending}
                  hasPatient={hasPatient}
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
                <div className="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center flex-shrink-0">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
                <Card className="p-4 bg-muted">
                  <p className="text-sm text-muted-foreground">
                    Analisando caso clínico...
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
        <ChatInput
          onSend={onSendMessage}
          disabled={isSending}
          clinicId={clinicId}
        />
      </div>
    </Card>
  );
}
