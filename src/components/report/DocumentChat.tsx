import { useState, useRef, useCallback, memo, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  MessageCircle,
  Send,
  X,
  Loader2,
  Maximize2,
  Minimize2,
} from "lucide-react";
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
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="mb-2 last:mb-0 leading-[1.65]">{children}</p>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="list-disc list-inside mb-2 space-y-0.5">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="list-decimal list-inside mb-2 space-y-0.5">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="ml-3">{children}</li>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold">{children}</strong>
  ),
  em: ({ children }: { children?: React.ReactNode }) => (
    <em className="italic">{children}</em>
  ),
  code: ({ children }: { children?: React.ReactNode }) => (
    <code className="bg-muted/60 px-1 py-0.5 rounded text-[12px] font-mono">
      {children}
    </code>
  ),
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className="text-base font-semibold mt-3 mb-1.5">{children}</h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="text-sm font-semibold mt-2.5 mb-1.5">{children}</h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="text-[13px] font-semibold mt-2 mb-1">{children}</h3>
  ),
};

interface ChatContentProps {
  isFullscreenView: boolean;
  messages: Array<{
    id: string;
    role: string;
    content?: string;
    parts?: Array<{ type: string; text?: string }>;
  }>;
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
    <div className="px-4 py-3 border-t border-border/30">
      <div className="flex gap-2 items-center">
        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ask about the documents..."
          disabled={isLoading}
          className="flex-1 h-9 text-[13px] bg-muted/30 border-border/30 focus-visible:border-border/60 placeholder:text-muted-foreground/40"
          autoComplete="off"
        />
        <Button
          onClick={onSend}
          disabled={!input.trim() || isLoading}
          size="icon"
          type="button"
          variant="ghost"
          className="h-9 w-9 text-muted-foreground hover:text-foreground flex-shrink-0"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-3.5 h-3.5" />
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

  const getMessageText = (msg: {
    content?: string;
    parts?: Array<{ type: string; text?: string }>;
  }): string => {
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

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
        <span className="text-[13px] font-medium text-foreground/70">
          Document Chat
        </span>
        <div className="flex items-center gap-1">
          {!isFullscreenView && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onMaximize}
              className="h-7 w-7 text-muted-foreground/50 hover:text-foreground"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={isFullscreenView ? onMinimize : onClose}
            className="h-7 w-7 text-muted-foreground/50 hover:text-foreground"
          >
            {isFullscreenView ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <X className="w-3.5 h-3.5" />
            )}
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea
        className="flex-1 px-4 py-4"
        ref={currentScrollRef}
        onWheel={(e) => {
          const scrollContainer = currentScrollRef.current?.querySelector(
            "[data-radix-scroll-area-viewport]",
          );
          if (scrollContainer) {
            scrollContainer.scrollTop += e.deltaY;
          }
        }}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center">
            <p className="text-[13px] text-muted-foreground/50">
              Ask anything about the documents in this legal pack.
            </p>
            <div className="flex flex-wrap justify-center gap-2 mt-4 max-w-xs">
              {[
                "What are the main risks?",
                "Summarise the charges",
                "Explain the covenants",
              ].map((q) => (
                <span
                  key={q}
                  className="text-[11px] text-muted-foreground/80 border border-border/30 rounded-full px-3 py-1"
                >
                  {q}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {messages.map((msg) => (
              <div key={msg.id}>
                {msg.role === "user" ? (
                  <div className="flex justify-end">
                    <div className="max-w-[80%] bg-foreground/[0.04] rounded-2xl rounded-br-md px-4 py-2.5">
                      <p className="text-[13px] text-foreground/80 whitespace-pre-wrap leading-[1.6]">
                        {getMessageText(msg)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="max-w-[90%]">
                    <div className="text-[13px] text-foreground/70 leading-[1.65]">
                      <ReactMarkdown components={markdownComponents}>
                        {getMessageText(msg)}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {isLoading &&
              messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex items-center gap-2 py-1">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-muted-foreground/30 rounded-full animate-pulse" />
                    <span className="w-1.5 h-1.5 bg-muted-foreground/30 rounded-full animate-pulse [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 bg-muted-foreground/30 rounded-full animate-pulse [animation-delay:300ms]" />
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

export function DocumentChat({
  reportId,
  propertyAddress,
  isDemo = false,
  isAnalysisComplete = true,
  buttonClassName,
}: DocumentChatProps) {
  const posthog = usePostHog();
  const [isOpen, setIsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fullscreenScrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fullscreenInputRef = useRef<HTMLInputElement>(null);

  const transport = useMemo(
    () =>
      new TextStreamChatTransport({
        api: CHAT_URL,
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          "Content-Type": "application/json",
        },
        body: { reportId },
        prepareSendMessagesRequest: ({ messages }) => {
          const formattedMessages = messages.map((msg) => {
            const textParts =
              msg.parts?.filter((part) => part.type === "text") || [];
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
    [reportId],
  );

  const { messages, sendMessage, status } = useChat({
    id: `document-chat-${reportId}`,
    transport,
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
          const scrollContainer = ref.current.querySelector(
            "[data-radix-scroll-area-viewport]",
          );
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

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

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
            buttonClassName
              ? "!rounded-r-none border-r-0 hover:!rounded-r-none focus-visible:!rounded-r-none"
              : "rounded-lg",
            "px-4 h-10 transition-colors duration-150 hover:bg-neutral-200",
            buttonClassName,
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
          buttonClassName,
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
        <div className="fixed bottom-4 right-4 w-[380px] h-[520px] bg-card border border-border/40 rounded-2xl shadow-xl flex flex-col z-50 overflow-hidden">
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

      {isFullscreen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setIsFullscreen(false);
              }
            }}
          >
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setIsFullscreen(false);
                }
              }}
              tabIndex={-1}
              aria-hidden="true"
            />
            <div
              className="relative w-full max-w-3xl h-[85vh] bg-card border border-border/40 rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden"
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
          document.body,
        )}
    </>
  );
}
