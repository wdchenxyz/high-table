"use client"

import * as React from "react"
import {
  MessageSquare,
  Plus,
  Send,
  PanelLeftClose,
  PanelLeft,
  Trash2,
  MoreHorizontal,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarFooter,
} from "@/components/ui/sidebar"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
}

interface Conversation {
  id: string
  title: string
  messages: Message[]
  createdAt: Date
}

export default function ChatPage() {
  const [sidebarOpen, setSidebarOpen] = React.useState(true)
  const [conversations, setConversations] = React.useState<Conversation[]>([
    {
      id: "1",
      title: "Welcome conversation",
      messages: [
        {
          id: "1",
          role: "assistant",
          content: "Hello! How can I help you today?",
        },
      ],
      createdAt: new Date(),
    },
  ])
  const [activeConversationId, setActiveConversationId] = React.useState("1")
  const [inputValue, setInputValue] = React.useState("")
  const messagesEndRef = React.useRef<HTMLDivElement>(null)

  const activeConversation = conversations.find(
    (c) => c.id === activeConversationId
  )

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  React.useEffect(() => {
    scrollToBottom()
  }, [activeConversation?.messages])

  const handleNewConversation = () => {
    const newConversation: Conversation = {
      id: Date.now().toString(),
      title: "New conversation",
      messages: [],
      createdAt: new Date(),
    }
    setConversations([newConversation, ...conversations])
    setActiveConversationId(newConversation.id)
  }

  const handleDeleteConversation = (id: string) => {
    const filtered = conversations.filter((c) => c.id !== id)
    setConversations(filtered)
    if (activeConversationId === id && filtered.length > 0) {
      setActiveConversationId(filtered[0].id)
    }
  }

  const handleSendMessage = () => {
    if (!inputValue.trim() || !activeConversation) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue.trim(),
    }

    // Simulate assistant response
    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content:
        "This is a simulated response. Connect to an AI backend to get real responses.",
    }

    const updatedConversations = conversations.map((c) => {
      if (c.id === activeConversationId) {
        const updatedMessages = [...c.messages, userMessage, assistantMessage]
        return {
          ...c,
          messages: updatedMessages,
          title:
            c.messages.length === 0
              ? inputValue.slice(0, 30) + (inputValue.length > 30 ? "..." : "")
              : c.title,
        }
      }
      return c
    })

    setConversations(updatedConversations)
    setInputValue("")
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
      <Sidebar className="border-r">
        <SidebarHeader className="border-b px-4 py-3">
          <Button
            onClick={handleNewConversation}
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
              <ScrollArea className="h-[calc(100vh-180px)]">
                <SidebarMenu>
                  {conversations.map((conversation) => (
                    <SidebarMenuItem key={conversation.id}>
                      <SidebarMenuButton
                        isActive={conversation.id === activeConversationId}
                        onClick={() =>
                          setActiveConversationId(conversation.id)
                        }
                        className="group justify-between"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <MessageSquare className="h-4 w-4 shrink-0" />
                          <span className="truncate">{conversation.title}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteConversation(conversation.id)
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </ScrollArea>
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
            {activeConversation?.messages.length === 0 && (
              <div className="flex h-[60vh] flex-col items-center justify-center text-center">
                <MessageSquare className="mb-4 h-12 w-12 text-muted-foreground" />
                <h2 className="text-xl font-semibold">How can I help you today?</h2>
                <p className="mt-2 text-muted-foreground">
                  Start a conversation by typing a message below.
                </p>
              </div>
            )}

            {activeConversation?.messages.map((message) => (
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
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
                {message.role === "user" && (
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback>U</AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="border-t p-4">
          <div className="mx-auto max-w-3xl">
            <div className="relative flex items-end gap-2">
              <Textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
                className="min-h-[52px] max-h-[200px] resize-none pr-12"
                rows={1}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputValue.trim()}
                size="icon"
                className="absolute bottom-2 right-2 h-8 w-8"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
