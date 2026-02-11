import { useState } from "react";
import {
  MessageSquare,
  Plus,
  Trash2,
  MoreVertical,
  Edit2,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { DentistConversation } from "@/types/dentistAgent";

interface ConversationSidebarProps {
  conversations: DentistConversation[];
  currentConversationId: string | null;
  onSelectConversation: (id: string | null) => void;
  onDeleteConversation: (id: string) => void;
  onUpdateTitle: (id: string, title: string) => void;
  isLoading?: boolean;
  embedded?: boolean;
}

export function ConversationSidebar({
  conversations,
  currentConversationId,
  onSelectConversation,
  onDeleteConversation,
  onUpdateTitle,
  isLoading,
  embedded,
}: ConversationSidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const startEditing = (conversation: DentistConversation) => {
    setEditingId(conversation.id);
    setEditTitle(conversation.title);
  };

  const saveEdit = () => {
    if (editingId && editTitle.trim()) {
      onUpdateTitle(editingId, editTitle.trim());
      setEditingId(null);
      setEditTitle("");
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
  };

  const handleConfirmDelete = () => {
    if (deleteId) {
      onDeleteConversation(deleteId);
      setDeleteId(null);
    }
  };

  const content = (
    <>
      {/* Header - only when not embedded */}
      {!embedded && (
        <div className="p-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Conversas
            </h2>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onSelectConversation(null)}
            >
              <Plus className="w-4 h-4 mr-1" />
              Nova
            </Button>
          </div>
        </div>
      )}

      {/* New conversation button when embedded */}
      {embedded && (
        <div className="p-3 border-b flex-shrink-0">
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            onClick={() => onSelectConversation(null)}
          >
            <Plus className="w-4 h-4 mr-1" />
            Nova conversa
          </Button>
        </div>
      )}

      {/* Conversations list */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        {isLoading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Carregando...
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Nenhuma conversa ainda.
            <br />
            Clique em "Nova" para começar.
          </div>
        ) : (
          <div className="p-2 space-y-1 overflow-hidden">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={cn(
                  "group relative rounded-lg transition-colors",
                  currentConversationId === conversation.id
                    ? "bg-primary/10"
                    : "hover:bg-muted"
                )}
              >
                {editingId === conversation.id ? (
                  <div className="p-3 flex items-center gap-2">
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEdit();
                        if (e.key === "Escape") cancelEdit();
                      }}
                      className="h-7 text-sm"
                      autoFocus
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 flex-shrink-0"
                      onClick={saveEdit}
                    >
                      <Check className="w-3 h-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 flex-shrink-0"
                      onClick={cancelEdit}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <div
                    className="p-3 cursor-pointer flex items-start justify-between gap-2"
                    onClick={() => onSelectConversation(conversation.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {conversation.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {conversation.message_count} mensagens •{" "}
                        {new Date(
                          conversation.last_message_at
                        ).toLocaleDateString("pt-BR")}
                      </p>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditing(conversation);
                          }}
                        >
                          <Edit2 className="w-4 h-4 mr-2" />
                          Renomear
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteId(conversation.id);
                          }}
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conversa</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta conversa? Esta ação não pode
              ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );

  if (embedded) {
    return (
      <div className="h-full flex flex-col overflow-hidden">{content}</div>
    );
  }

  return (
    <Card className="h-full flex flex-col overflow-hidden">{content}</Card>
  );
}
