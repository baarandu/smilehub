import { useState, useEffect } from "react";
import { useSearchParams, Navigate } from "react-router-dom";
import { Stethoscope, Info, MessageSquare } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ChatInterface } from "@/components/dentist-agent/ChatInterface";
import { ConversationSidebar } from "@/components/dentist-agent/ConversationSidebar";
import { useDentistConversations } from "@/hooks/useDentistConversations";
import { useDentistChat } from "@/hooks/useDentistChat";
import { useCurrentClinic } from "@/hooks/useCurrentClinic";
import { useClinic } from "@/contexts/ClinicContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export default function DentistAgent() {
  const { currentClinic } = useCurrentClinic();
  const { isDentist } = useClinic();
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentConversationId, setCurrentConversationId] = useState<
    string | null
  >(null);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  // Patient context from URL param
  const urlPatientId = searchParams.get("patient_id");
  const [patientId, setPatientId] = useState<string | null>(
    urlPatientId
  );
  const [patientName, setPatientName] = useState<string | null>(null);
  const [patientAge, setPatientAge] = useState<number | null>(null);

  // Load patient info when patientId changes
  useEffect(() => {
    if (!patientId || !currentClinic?.id) {
      setPatientName(null);
      setPatientAge(null);
      return;
    }

    const loadPatient = async () => {
      const { data } = await supabase
        .from("patients")
        .select("name, birth_date")
        .eq("id", patientId)
        .eq("clinic_id", currentClinic.id)
        .single();

      if (data) {
        setPatientName(data.name);
        if (data.birth_date) {
          const today = new Date();
          const birth = new Date(data.birth_date);
          let age = today.getFullYear() - birth.getFullYear();
          const m = today.getMonth() - birth.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
          setPatientAge(age);
        }
      }
    };

    loadPatient();
  }, [patientId, currentClinic?.id]);

  const {
    conversations,
    isLoading: isLoadingConversations,
    deleteConversation,
    updateTitle,
  } = useDentistConversations(currentClinic?.id || "");

  const {
    messages,
    isLoading: isLoadingMessages,
    isSending,
    sendMessage,
  } = useDentistChat(
    currentConversationId,
    currentClinic?.id || "",
    patientId
  );

  // Guard: only dentists/admins
  if (!isDentist) {
    return <Navigate to="/inicio" replace />;
  }

  const handleSendMessage = async (
    message: string,
    imageUrls?: string[]
  ) => {
    try {
      const response = await sendMessage({ message, imageUrls });

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

  const handleSelectPatient = (id: string, name: string, age: number | null) => {
    setPatientId(id);
    setPatientName(name);
    setPatientAge(age);
    const params = new URLSearchParams(searchParams);
    params.set("patient_id", id);
    setSearchParams(params);
  };

  const handleClearPatient = () => {
    setPatientId(null);
    setPatientName(null);
    setPatientAge(null);
    // Remove from URL
    searchParams.delete("patient_id");
    setSearchParams(searchParams);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] lg:h-[calc(100vh-5rem)]">
      {/* Header */}
      <div className="mb-4 lg:mb-6 flex-shrink-0">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#fef2f2] dark:bg-red-900/30 rounded-lg">
              <Stethoscope className="w-6 h-6 text-[#a03f3d]" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold">Dentista IA</h1>
              <p className="text-sm text-muted-foreground hidden sm:block">
                Segunda opinião clínica para auxiliar no raciocínio diagnóstico e
                terapêutico
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
            <strong>Importante:</strong> Este assistente fornece orientações de
            apoio ao raciocínio clínico. As recomendações{" "}
            <strong>não substituem</strong> a avaliação clínica presencial e o
            exame físico.
          </AlertDescription>
        </Alert>
      </div>

      {/* Main content area */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 min-h-0 overflow-hidden">
        {/* Sidebar - Desktop only */}
        <div className="hidden lg:block h-full overflow-hidden">
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
        <div className="h-full overflow-hidden">
          <ChatInterface
            messages={messages}
            isLoading={isLoadingMessages}
            isSending={isSending}
            onSendMessage={handleSendMessage}
            showQuickActions={!currentConversationId}
            hasPatient={!!patientId}
            patientId={patientId}
            patientName={patientName}
            patientAge={patientAge}
            onClearPatient={handleClearPatient}
            onSelectPatient={handleSelectPatient}
            clinicId={currentClinic?.id || ""}
          />
        </div>
      </div>
    </div>
  );
}
