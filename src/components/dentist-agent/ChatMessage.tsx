import { useState } from "react";
import { Stethoscope, User } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import type { DentistMessage } from "@/types/dentistAgent";

interface ChatMessageProps {
  message: DentistMessage;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";
  const isTool = message.role === "tool";

  // Don't display tool messages
  if (isTool) {
    return null;
  }

  return (
    <>
      <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
        {/* Avatar */}
        <div
          className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-[#a03f3d] text-white"
          )}
        >
          {isUser ? (
            <User className="w-4 h-4" />
          ) : (
            <Stethoscope className="w-4 h-4" />
          )}
        </div>

        {/* Message content */}
        <Card
          className={cn(
            "p-4 max-w-[80%]",
            isUser ? "bg-primary text-primary-foreground" : "bg-muted"
          )}
        >
          {/* Image thumbnails for user messages */}
          {isUser && message.image_urls && message.image_urls.length > 0 && (
            <div className="flex gap-2 mb-2 flex-wrap">
              {message.image_urls.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt={`Imagem ${i + 1}`}
                  className="w-20 h-20 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity border border-primary-foreground/20"
                  onClick={() => setExpandedImage(url)}
                />
              ))}
            </div>
          )}

          {isAssistant ? (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown
                skipHtml
                components={{
                  p: ({ children }) => (
                    <p className="mb-2 last:mb-0">{children}</p>
                  ),
                  ul: ({ children }) => (
                    <ul className="mb-2 ml-4 list-disc">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="mb-2 ml-4 list-decimal">{children}</ol>
                  ),
                  li: ({ children }) => <li className="mb-1">{children}</li>,
                  strong: ({ children }) => (
                    <strong className="font-bold">{children}</strong>
                  ),
                  code: ({ children }) => (
                    <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">
                      {children}
                    </code>
                  ),
                  pre: ({ children }) => (
                    <pre className="bg-muted p-2 rounded overflow-x-auto text-xs">
                      {children}
                    </pre>
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          ) : (
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          )}

          {/* Timestamp */}
          <div
            className={cn(
              "text-xs mt-2 pt-2 border-t",
              isUser
                ? "border-primary-foreground/20 text-primary-foreground/70"
                : "border-border text-muted-foreground"
            )}
          >
            {new Date(message.created_at).toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </Card>
      </div>

      {/* Expanded image overlay */}
      {expandedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setExpandedImage(null)}
        >
          <img
            src={expandedImage}
            alt="Imagem ampliada"
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        </div>
      )}
    </>
  );
}
