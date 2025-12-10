"use client"

import * as React from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import type { FileUIPart } from "ai"
import {
  MessageSquare,
  Plus,
  PanelLeftClose,
  PanelLeft,
  Trash2,
  Loader2,
  PaperclipIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputTools,
  PromptInputButton,
  PromptInputSubmit,
  PromptInputAttachments,
  PromptInputAttachment,
  usePromptInputAttachments,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarFooter,
} from "@/components/ui/sidebar"

// Attachment button that uses the PromptInput context
function AttachmentButton() {
  const attachments = usePromptInputAttachments()
  return (
    <PromptInputButton
      type="button"
      onClick={() => attachments.openFileDialog()}
    >
      <PaperclipIcon className="h-4 w-4" />
    </PromptInputButton>
  )
}

interface StoredConversation {
  id: string
  title: string
  createdAt: string
}

// Active conversation ID is kept in localStorage for quick access
const ACTIVE_CONVERSATION_KEY = "chat-active-conversation"

function getActiveConversationId(): string {
  if (typeof window === "undefined") return ""
  return localStorage.getItem(ACTIVE_CONVERSATION_KEY) || ""
}

function saveActiveConversationId(id: string) {
  localStorage.setItem(ACTIVE_CONVERSATION_KEY, id)
}

// API-based storage functions
async function fetchConversations(): Promise<StoredConversation[]> {
  try {
    const res = await fetch("/api/conversations")
    if (!res.ok) return []
    return await res.json()
  } catch {
    return []
  }
}

async function saveConversationsToServer(conversations: StoredConversation[]) {
  try {
    await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(conversations),
    })
  } catch (error) {
    console.error("Failed to save conversations:", error)
  }
}

async function fetchMessages(conversationId: string) {
  try {
    const res = await fetch(`/api/messages?conversationId=${conversationId}`)
    if (!res.ok) return []
    return await res.json()
  } catch {
    return []
  }
}

async function saveMessagesToServer(conversationId: string, messages: unknown[]) {
  try {
    await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId, messages }),
    })
  } catch (error) {
    console.error("Failed to save messages:", error)
  }
}

async function deleteMessagesFromServer(conversationId: string) {
  try {
    await fetch(`/api/messages?conversationId=${conversationId}`, {
      method: "DELETE",
    })
  } catch (error) {
    console.error("Failed to delete messages:", error)
  }
}

export default function ChatPage() {
  const [sidebarOpen, setSidebarOpen] = React.useState(true)
  const [conversations, setConversations] = React.useState<StoredConversation[]>([])
  const [activeConversationId, setActiveConversationId] = React.useState<string>("")
  const [isLoaded, setIsLoaded] = React.useState(false)
  const messagesEndRef = React.useRef<HTMLDivElement>(null)
  const prevStatusRef = React.useRef<string>("")
  const initialLoadDoneRef = React.useRef(false)

  // Use the AI SDK useChat hook
  const {
    messages,
    sendMessage,
    status,
    setMessages,
  } = useChat({
    id: activeConversationId,
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
  })

  // Initialize from server
  React.useEffect(() => {
    async function loadData() {
      const stored = await fetchConversations()
      const activeId = getActiveConversationId()

      let currentId: string
      if (stored.length === 0) {
        const defaultConversation: StoredConversation = {
          id: "default",
          title: "New conversation",
          createdAt: new Date().toISOString(),
        }
        setConversations([defaultConversation])
        currentId = defaultConversation.id
        await saveConversationsToServer([defaultConversation])
        saveActiveConversationId(defaultConversation.id)
      } else {
        setConversations(stored)
        currentId = activeId || stored[0].id
      }

      setActiveConversationId(currentId)
      setIsLoaded(true)
    }

    loadData()
  }, [])

  // Load stored messages after initial load
  React.useEffect(() => {
    async function loadMessages() {
      if (isLoaded && activeConversationId && !initialLoadDoneRef.current) {
        const storedMessages = await fetchMessages(activeConversationId)
        if (storedMessages.length > 0) {
          setMessages(storedMessages)
        }
        initialLoadDoneRef.current = true
      }
    }

    loadMessages()
  }, [isLoaded, activeConversationId, setMessages])

  const isLoading = status === "streaming" || status === "submitted"

  // Save messages to server when streaming completes
  React.useEffect(() => {
    // Save when status changes from streaming/submitted to ready
    if (
      prevStatusRef.current === "streaming" &&
      status === "ready" &&
      activeConversationId &&
      messages.length > 0
    ) {
      saveMessagesToServer(activeConversationId, messages)
    }
    prevStatusRef.current = status
  }, [status, activeConversationId, messages])

  // Update conversation title
  const updateConversationTitle = React.useCallback((id: string, content: string) => {
    setConversations((prev) => {
      const updated = prev.map((c) => {
        if (c.id === id && c.title === "New conversation") {
          return {
            ...c,
            title: content.slice(0, 30) + (content.length > 30 ? "..." : ""),
          }
        }
        return c
      })
      saveConversationsToServer(updated)
      return updated
    })
  }, [])

  // Handle title update when first message is sent
  React.useEffect(() => {
    if (messages.length === 1 && messages[0].role === "user") {
      const content = messages[0].parts
        ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text)
        .join("") || ""
      if (content) {
        updateConversationTitle(activeConversationId, content)
      }
    }
  }, [messages, activeConversationId, updateConversationTitle])

  // Scroll to bottom when messages change
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Switch conversation
  const switchConversation = async (id: string) => {
    // Save current messages before switching
    if (activeConversationId && messages.length > 0) {
      await saveMessagesToServer(activeConversationId, messages)
    }

    setActiveConversationId(id)
    saveActiveConversationId(id)

    // Load messages for the new conversation
    const storedMessages = await fetchMessages(id)
    setMessages(storedMessages)
  }

  // Create new conversation
  const createConversation = async () => {
    // Save current messages before switching
    if (activeConversationId && messages.length > 0) {
      await saveMessagesToServer(activeConversationId, messages)
    }

    const newConversation: StoredConversation = {
      id: Date.now().toString(),
      title: "New conversation",
      createdAt: new Date().toISOString(),
    }
    const updated = [newConversation, ...conversations]
    setConversations(updated)
    await saveConversationsToServer(updated)
    setActiveConversationId(newConversation.id)
    saveActiveConversationId(newConversation.id)
    setMessages([])
  }

  // Delete conversation
  const deleteConversation = async (id: string) => {
    const filtered = conversations.filter((c) => c.id !== id)
    // Delete the messages for this conversation
    await deleteMessagesFromServer(id)

    if (filtered.length === 0) {
      const newDefault: StoredConversation = {
        id: Date.now().toString(),
        title: "New conversation",
        createdAt: new Date().toISOString(),
      }
      setConversations([newDefault])
      await saveConversationsToServer([newDefault])
      setActiveConversationId(newDefault.id)
      saveActiveConversationId(newDefault.id)
      setMessages([])
    } else {
      setConversations(filtered)
      await saveConversationsToServer(filtered)
      if (activeConversationId === id) {
        const nextId = filtered[0].id
        setActiveConversationId(nextId)
        saveActiveConversationId(nextId)
        // Load messages for the next conversation
        const storedMessages = await fetchMessages(nextId)
        setMessages(storedMessages)
      }
    }
  }

  const handleSubmit = (message: PromptInputMessage) => {
    if (message.text.trim() && !isLoading) {
      sendMessage({
        text: message.text,
        files: message.files,
      })
    }
  }

  // Helper to extract text content from message parts
  const getMessageText = (message: typeof messages[0]) => {
    return message.parts
      ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("") || ""
  }

  // Helper to extract file parts from message
  const getMessageFiles = (message: typeof messages[0]) => {
    return message.parts?.filter(
      (p): p is FileUIPart => p.type === "file"
    ) || []
  }

  // Show loading state while hydrating
  if (!isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  const activeConversation = conversations.find(
    (c) => c.id === activeConversationId
  )

  return (
    <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
      <Sidebar className="border-r">
        <SidebarHeader className="border-b px-4 py-3">
          <Button
            onClick={createConversation}
            className="w-full justify-start gap-2"
            variant="outline"
          >
            <Plus className="h-4 w-4" />
            New chat
          </Button>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Conversations</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {conversations.map((conversation) => (
                  <SidebarMenuItem key={conversation.id}>
                    <SidebarMenuButton
                      isActive={conversation.id === activeConversationId}
                      onClick={() => switchConversation(conversation.id)}
                    >
                      <MessageSquare className="h-4 w-4 shrink-0" />
                      <span className="truncate">{conversation.title}</span>
                    </SidebarMenuButton>
                    <SidebarMenuAction
                      onClick={() => deleteConversation(conversation.id)}
                      showOnHover
                    >
                      <Trash2 className="h-4 w-4" />
                    </SidebarMenuAction>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="border-t p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Avatar className="h-8 w-8">
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
            <span>User</span>
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="flex flex-col">
        {/* Header */}
        <header className="flex h-14 items-center gap-4 border-b px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? (
              <PanelLeftClose className="h-5 w-5" />
            ) : (
              <PanelLeft className="h-5 w-5" />
            )}
          </Button>
          <h1 className="font-semibold">
            {activeConversation?.title || "Chat"}
          </h1>
        </header>

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
      </SidebarInset>
    </SidebarProvider>
  )
}
