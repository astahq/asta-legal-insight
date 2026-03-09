import { useState, useRef, useCallback, memo } from "react";
import { createPortal } from "react-dom";
import { MessageCircle, Send, X, Loader2, Bot, User, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonGroupText } from "@/components/ui/button-group";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { usePostHog } from "posthog-js/react";
import { useChat } from "@ai-sdk/react";
import { TextStreamChatTransport } from "ai";
import ReactMarkdown from "react-markdown";

interface DocumentChatProps {
  reportId: string;
  propertyAddress: string;
  isDemo?: boolean;
  isAnalysisComplete?: boolean;
  buttonClassName?: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/document-chat`;

const markdownComponents = {
  p: ({ children }: { children?: React.ReactNode }) => <p className="mb-2 last:mb-0">{children}</p>,
  ul: ({ children }: { children?: React.ReactNode }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
  ol: ({ children }: { children?: React.ReactNode }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
  li: ({ children }: { children?: React.ReactNode }) => <li className="ml-4">{children}</li>,
  strong: ({ children }: { children?: React.ReactNode }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }: { children?: React.ReactNode }) => <em className="italic">{children}</em>,
  code: ({ children }: { children?: React.ReactNode }) => (
    <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>
  ),
  h1: ({ children }: { children?: React.ReactNode }) => <h1 className="text-lg font-semibold mt-4 mb-2">{children}</h1>,
  h2: ({ children }: { children?: React.ReactNode }) => <h2 className="text-base font-semibold mt-3 mb-2">{children}</h2>,
  h3: ({ children }: { children?: React.ReactNode }) => <h3 className="text-sm font-semibold mt-2 mb-1">{children}</h3>,
};

interface ChatContentProps {
  isFullscreenView: boolean;
  messages: Array<{ id: string; role: string; content?: string; parts?: Array<{ type: string; text?: string }> }>;
  isLoading: boolean;
  input: string;
  inputRef: React.RefObject<HTMLInputElement>;
  fullscreenInputRef: React.RefObject<HTMLInputElement>;
  scrollRef: React.RefObject<HTMLDivElement>;
  fullscreenScrollRef: React.RefObject<HTMLDivElement>;
  onInputChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onSend: () => void;
  onMaximize: () => void;
  onMinimize: () => void;
  onClose: () => void;
}

interface ChatInputProps {
  input: string;
  inputRef: React.RefObject<HTMLInputElement>;
  isLoading: boolean;
  onInputChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onSend: () => void;
}

const ChatInput = memo(function ChatInput({
  input,
  inputRef,
  isLoading,
  onInputChange,
  onKeyDown,
  onSend,
}: ChatInputProps) {
  return (
    <div className="p-4 border-t border-border">
      <div className="flex gap-2">
        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ask about the documents..."
          disabled={isLoading}
          className="flex-1"
          autoComplete="off"
        />
        <Button
          onClick={onSend}
          disabled={!input.trim() || isLoading}
          size="icon"
          type="button"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  );
});

const ChatContent = memo(function ChatContent({
  isFullscreenView,
  messages,
  isLoading,
  input,
  inputRef,
  fullscreenInputRef,
  scrollRef,
  fullscreenScrollRef,
  onInputChange,
  onKeyDown,
  onSend,
  onMaximize,
  onMinimize,
  onClose,
}: ChatContentProps) {
  const currentScrollRef = isFullscreenView ? fullscreenScrollRef : scrollRef;
  const currentInputRef = isFullscreenView ? fullscreenInputRef : inputRef;

  const getMessageText = (msg: { content?: string; parts?: Array<{ type: string; text?: string }> }): string => {
    if (typeof msg.content === "string") {
      return msg.content;
    }
    if (msg.parts) {
      return msg.parts
        .filter((part) => part.type === "text" && part.text)
        .map((part) => part.text)
        .join("");
    }
    return "";
  };

  const renderMessageContent = (content: string) => {
    return (
      <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0 prose-headings:my-3 prose-headings:font-semibold">
        <ReactMarkdown components={markdownComponents}>
          {content}
        </ReactMarkdown>
      </div>
    );
  };

  return (
    <>
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-primary" />
          <span className="font-semibold text-foreground">Document Chat</span>
        </div>
        <div className="flex items-center gap-2">
          {!isFullscreenView && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onMaximize}
              className="h-8 w-8"
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={isFullscreenView ? onMinimize : onClose}
            className="h-8 w-8"
          >
            {isFullscreenView ? <Minimize2 className="w-4 h-4" /> : <X className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      <ScrollArea 
        className="flex-1 p-4" 
        ref={currentScrollRef}
        onWheel={(e) => {
          const scrollContainer = currentScrollRef.current?.querySelector('[data-radix-scroll-area-viewport]');
          if (scrollContainer) {
            scrollContainer.scrollTop += e.deltaY;
          }
        }}
      >
        {messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <Bot className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">
              Ask me anything about the documents in this legal pack.
            </p>
            <p className="text-xs mt-2">
              e.g. "What are the main risks?" or "Explain the charges"
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex gap-2",
                  msg.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  )}
                >
                  {msg.role === "assistant" ? (
                    renderMessageContent(getMessageText(msg))
                  ) : (
                    <p className="whitespace-pre-wrap">
                      {getMessageText(msg)}
                    </p>
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div className="bg-muted rounded-lg px-3 py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      <ChatInput
        input={input}
        inputRef={currentInputRef}
        isLoading={isLoading}
        onInputChange={onInputChange}
        onKeyDown={onKeyDown}
        onSend={onSend}
      />
    </>
  );
});

export function DocumentChat({ reportId, propertyAddress, isDemo = false, isAnalysisComplete = true, buttonClassName }: DocumentChatProps) {
  const posthog = usePostHog();
  const [isOpen, setIsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fullscreenScrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fullscreenInputRef = useRef<HTMLInputElement>(null);

  const { messages, sendMessage, status } = useChat({
    id: `document-chat-${reportId}`,
    transport: new TextStreamChatTransport({
      api: CHAT_URL,
      headers: {
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        "Content-Type": "application/json",
      },
      prepareSendMessagesRequest: ({ messages }) => {
        const formattedMessages = messages.map((msg) => {
          const textParts = msg.parts?.filter((part) => part.type === "text") || [];
          const content = textParts.map((part) => part.text).join("");
          return {
            role: msg.role,
            content,
          };
        });
        return {
          body: {
            messages: formattedMessages,
            reportId,
          },
        };
      },
    }),
    onError: (error) => {
      toast.error(error.message || "Failed to send message, please try again.");
    },
    onFinish: () => {
      posthog.capture("talk_with_documents_message_sent", {
        button_name: "Talk with Documents",
      });
      requestAnimationFrame(() => {
        const ref = isFullscreen ? fullscreenScrollRef : scrollRef;
        if (ref.current) {
          const scrollContainer = ref.current.querySelector('[data-radix-scroll-area-viewport]');
          if (scrollContainer) {
            scrollContainer.scrollTop = scrollContainer.scrollHeight;
          }
        }
      });
    },
  });

  const [input, setInput] = useState("");
  const isLoading = status === "streaming" || status === "submitted";

  const handleInputChange = useCallback((value: string) => {
    setInput(value);
  }, []);

  const handleSend = useCallback(() => {
    if (!input.trim() || status !== "ready") return;
    sendMessage({ text: input.trim() });
    setInput("");
  }, [input, status, sendMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleOpen = useCallback(() => {
    setIsOpen(true);
    posthog.capture("talk_with_documents_button_clicked", {
      button_name: "Talk with Documents",
    });
  }, [posthog]);

  const handleMaximize = useCallback(() => {
    setIsFullscreen(true);
  }, []);

  const handleMinimize = useCallback(() => {
    setIsFullscreen(false);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);


  if (!isOpen) {
    const isDisabled = !isDemo && !isAnalysisComplete;
    if (isDemo) {
      return (
        <ButtonGroupText
          className={cn(
            buttonClassName ? "!rounded-r-none border-r-0 hover:!rounded-r-none focus-visible:!rounded-r-none" : "rounded-lg",
            "px-4 h-10 transition-colors duration-150 hover:bg-neutral-200",
            buttonClassName
          )}
        >
          <MessageCircle className="w-4 h-4 shrink-0" strokeWidth={1.5} />
          <span className="text-sm">Talk with Documents</span>
        </ButtonGroupText>
      );
    }
    return (
      <Button
        variant="secondary"
        onClick={handleOpen}
        disabled={isDisabled}
        size="default"
        className={cn(
          "[&_svg]:size-5 transition-colors duration-150",
          buttonClassName
            ? "!rounded-r-none border-r-0 hover:!rounded-r-none focus-visible:!rounded-r-none active:!rounded-r-none hover:bg-neutral-200"
            : "rounded-full",
          isDisabled && "opacity-50 cursor-not-allowed",
          buttonClassName
        )}
      >
        <MessageCircle className="w-4 h-4 shrink-0" strokeWidth={1.5} />
        Talk with Documents
      </Button>
    );
  }

  return (
    <>
      {!isFullscreen && (
        <div className="fixed bottom-4 right-4 w-96 h-[500px] bg-card border border-border rounded-lg shadow-xl flex flex-col z-50">
          <ChatContent
            isFullscreenView={false}
            messages={messages}
            isLoading={isLoading}
            input={input}
            inputRef={inputRef}
            fullscreenInputRef={fullscreenInputRef}
            scrollRef={scrollRef}
            fullscreenScrollRef={fullscreenScrollRef}
            onInputChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onSend={handleSend}
            onMaximize={handleMaximize}
            onMinimize={handleMinimize}
            onClose={handleClose}
          />
        </div>
      )}

      {isFullscreen && typeof document !== "undefined" && createPortal(
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setIsFullscreen(false);
            }
          }}
        >
          <div 
            className="fixed inset-0 bg-black/80"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setIsFullscreen(false);
              }
            }}
            tabIndex={-1}
            aria-hidden="true"
          />
          <div 
            className="relative w-full max-w-4xl h-[90vh] bg-card border border-border rounded-lg shadow-xl flex flex-col z-50"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.stopPropagation();
                setIsFullscreen(false);
              }
            }}
          >
            <ChatContent
              isFullscreenView={true}
              messages={messages}
              isLoading={isLoading}
              input={input}
              inputRef={inputRef}
              fullscreenInputRef={fullscreenInputRef}
              scrollRef={scrollRef}
              fullscreenScrollRef={fullscreenScrollRef}
              onInputChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onSend={handleSend}
              onMaximize={handleMaximize}
              onMinimize={handleMinimize}
              onClose={handleClose}
            />
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
