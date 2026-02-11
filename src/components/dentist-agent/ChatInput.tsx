import { useState, useRef } from "react";
import { Send, Loader2, ImageIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { dentistAgentService } from "@/services/dentistAgent";
import { toast } from "sonner";

interface ChatInputProps {
  onSend: (message: string, imageUrls?: string[]) => void;
  disabled?: boolean;
  clinicId: string;
}

export function ChatInput({ onSend, disabled, clinicId }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [pendingImages, setPendingImages] = useState<
    { file: File; preview: string }[]
  >([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!message.trim() && pendingImages.length === 0) || disabled || uploading)
      return;

    let imageUrls: string[] | undefined;

    // Upload pending images
    if (pendingImages.length > 0) {
      setUploading(true);
      try {
        const urls = await Promise.all(
          pendingImages.map((img) =>
            dentistAgentService.uploadChatImage(clinicId, img.file)
          )
        );
        imageUrls = urls;
      } catch (error: any) {
        toast.error(`Erro ao enviar imagem: ${error.message}`);
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    onSend(message.trim() || "Analise esta imagem.", imageUrls);
    setMessage("");
    setPendingImages([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newImages = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    setPendingImages((prev) => [...prev, ...newImages]);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeImage = (index: number) => {
    setPendingImages((prev) => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Image preview strip */}
      {pendingImages.length > 0 && (
        <div className="flex gap-2 mb-2 flex-wrap">
          {pendingImages.map((img, index) => (
            <div key={index} className="relative group">
              <img
                src={img.preview}
                alt={`Anexo ${index + 1}`}
                className="w-16 h-16 object-cover rounded-lg border"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 h-5 w-5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeImage(index)}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 items-center">
        {/* Image upload button */}
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-[60px] w-[48px] flex-shrink-0"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
        >
          <ImageIcon className="w-5 h-5" />
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageSelect}
          className="hidden"
        />

        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Descreva o caso, sintomas ou envie uma imagem..."
          disabled={disabled || uploading}
          className="flex-1 min-h-[60px] resize-none"
          rows={2}
        />
        <Button
          type="submit"
          size="icon"
          disabled={
            disabled ||
            uploading ||
            (!message.trim() && pendingImages.length === 0)
          }
          className="h-[60px] w-[60px] flex-shrink-0"
        >
          {disabled || uploading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        Pressione Ctrl+Enter para enviar
      </p>
    </form>
  );
}
