"use client"

import * as React from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import type { StoredConversation } from "@/lib/types"
import { createConversationStorage } from "@/lib/conversation-storage"

const chatStorage = createConversationStorage({
  localStorageKey: "chat-active-conversation",
  apiEndpoint: "/api/conversations",
})

const {
  getActiveConversationId,
  saveActiveConversationId,
  fetchConversations,
  saveConversationsToServer,
} = chatStorage

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

export function useChatConversations() {
  const [conversations, setConversations] = React.useState<StoredConversation[]>([])
  const [activeConversationId, setActiveConversationId] = React.useState<string>("")
  const [isLoaded, setIsLoaded] = React.useState(false)
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
        const storedMessages = await fetchMessages(nextId)
        setMessages(storedMessages)
      }
    }
  }

  const activeConversation = conversations.find(
    (c) => c.id === activeConversationId
  )

  return {
    conversations,
    activeConversationId,
    activeConversation,
    isLoaded,
    messages,
    sendMessage,
    status,
    isLoading,
    setMessages,
    switchConversation,
    createConversation,
    deleteConversation,
  }
}
