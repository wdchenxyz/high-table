"use client"

import * as React from "react"
import type { FileUIPart, UIMessage } from "ai"
import {
  MessageSquare,
  Loader2,
  PaperclipIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputTools,
  PromptInputSubmit,
  PromptInputAttachments,
  PromptInputAttachment,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input"
import { AttachmentButton } from "@/components/shared/attachment-button"

interface ChatContentProps {
  messages: UIMessage[]
  isLoading: boolean
  onSubmit: (message: PromptInputMessage) => void
}

export function ChatContent({
  messages,
  isLoading,
  onSubmit,
}: ChatContentProps) {
  const messagesEndRef = React.useRef<HTMLDivElement>(null)

  // Scroll to bottom when messages change
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Helper to extract text content from message parts
  const getMessageText = (message: UIMessage) => {
    return message.parts
      ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("") || ""
  }

  // Helper to extract file parts from message
  const getMessageFiles = (message: UIMessage) => {
    return message.parts?.filter(
      (p): p is FileUIPart => p.type === "file"
    ) || []
  }

  const handleSubmit = (message: PromptInputMessage) => {
    if (message.text.trim() && !isLoading) {
      onSubmit(message)
    }
  }

  return (
    <>
      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="mx-auto max-w-3xl space-y-6">
          {messages.length === 0 && (
            <div className="flex h-[60vh] flex-col items-center justify-center text-center">
              <MessageSquare className="mb-4 h-12 w-12 text-muted-foreground" />
              <h2 className="text-xl font-semibold">How can I help you today?</h2>
              <p className="mt-2 text-muted-foreground">
                Start a conversation by typing a message below.
              </p>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-4",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {message.role === "assistant" && (
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    AI
                  </AvatarFallback>
                </Avatar>
              )}
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-3",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                )}
              >
                {/* Display file attachments */}
                {getMessageFiles(message).length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-2">
                    {getMessageFiles(message).map((file, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "flex items-center gap-1.5 rounded-md px-2 py-1 text-xs",
                          message.role === "user"
                            ? "bg-primary-foreground/20"
                            : "bg-background"
                        )}
                      >
                        {file.mediaType?.startsWith("image/") && file.url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={file.url}
                            alt={file.filename || "Image"}
                            className="h-16 w-16 rounded object-cover"
                          />
                        ) : (
                          <>
                            <PaperclipIcon className="h-3 w-3" />
                            <span className="truncate max-w-[120px]">
                              {file.filename || "File"}
                            </span>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <p className="whitespace-pre-wrap">{getMessageText(message)}</p>
              </div>
              {message.role === "user" && (
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}

          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex gap-4 justify-start">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  AI
                </AvatarFallback>
              </Avatar>
              <div className="bg-muted rounded-2xl px-4 py-3">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t p-4">
        <div className="mx-auto max-w-3xl">
          <PromptInput
            onSubmit={handleSubmit}
            accept="image/*,.pdf,.txt,.md,.json,.csv"
            multiple
            className="rounded-lg"
          >
            <PromptInputAttachments>
              {(file) => <PromptInputAttachment key={file.id} data={file} />}
            </PromptInputAttachments>
            <PromptInputTextarea
              placeholder="Type your message..."
              className="min-h-[52px] max-h-[200px]"
              disabled={isLoading}
            />
            <PromptInputFooter>
              <PromptInputTools>
                <AttachmentButton />
              </PromptInputTools>
              <PromptInputSubmit
                disabled={isLoading}
                status={isLoading ? "streaming" : "ready"}
              />
            </PromptInputFooter>
          </PromptInput>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>
    </>
  )
}
