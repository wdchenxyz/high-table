"use client"

import * as React from "react"

export interface Message {
  id: string
  role: "user" | "assistant"
  content: string
}

export interface Conversation {
  id: string
  title: string
  messages: Message[]
  createdAt: string // ISO string for JSON serialization
}

const STORAGE_KEY = "chat-conversations"
const ACTIVE_CONVERSATION_KEY = "chat-active-conversation"

const defaultConversation: Conversation = {
  id: "1",
  title: "Welcome conversation",
  messages: [
    {
      id: "1",
      role: "assistant",
      content: "Hello! How can I help you today?",
    },
  ],
  createdAt: new Date().toISOString(),
}

export function useConversations() {
  const [conversations, setConversations] = React.useState<Conversation[]>([])
  const [activeConversationId, setActiveConversationId] = React.useState<string>("")
  const [isLoaded, setIsLoaded] = React.useState(false)

  // Load from localStorage on mount
  React.useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    const storedActive = localStorage.getItem(ACTIVE_CONVERSATION_KEY)

    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Conversation[]
        setConversations(parsed)
        setActiveConversationId(storedActive || parsed[0]?.id || "")
      } catch {
        setConversations([defaultConversation])
        setActiveConversationId(defaultConversation.id)
      }
    } else {
      setConversations([defaultConversation])
      setActiveConversationId(defaultConversation.id)
    }
    setIsLoaded(true)
  }, [])

  // Save to localStorage whenever conversations change
  React.useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations))
    }
  }, [conversations, isLoaded])

  // Save active conversation ID
  React.useEffect(() => {
    if (isLoaded && activeConversationId) {
      localStorage.setItem(ACTIVE_CONVERSATION_KEY, activeConversationId)
    }
  }, [activeConversationId, isLoaded])

  const activeConversation = conversations.find(
    (c) => c.id === activeConversationId
  )

  const createConversation = React.useCallback(() => {
    const newConversation: Conversation = {
      id: Date.now().toString(),
      title: "New conversation",
      messages: [],
      createdAt: new Date().toISOString(),
    }
    setConversations((prev) => [newConversation, ...prev])
    setActiveConversationId(newConversation.id)
    return newConversation
  }, [])

  const deleteConversation = React.useCallback((id: string) => {
    setConversations((prev) => {
      const filtered = prev.filter((c) => c.id !== id)
      if (filtered.length === 0) {
        const newDefault = { ...defaultConversation, id: Date.now().toString() }
        setActiveConversationId(newDefault.id)
        return [newDefault]
      }
      return filtered
    })
    setActiveConversationId((currentId) => {
      if (currentId === id) {
        const remaining = conversations.filter((c) => c.id !== id)
        return remaining[0]?.id || ""
      }
      return currentId
    })
  }, [conversations])

  const addMessage = React.useCallback((conversationId: string, message: Message) => {
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === conversationId) {
          const updatedMessages = [...c.messages, message]
          return {
            ...c,
            messages: updatedMessages,
            title:
              c.messages.length === 0 && message.role === "user"
                ? message.content.slice(0, 30) + (message.content.length > 30 ? "..." : "")
                : c.title,
          }
        }
        return c
      })
    )
  }, [])

  return {
    conversations,
    activeConversation,
    activeConversationId,
    setActiveConversationId,
    createConversation,
    deleteConversation,
    addMessage,
    isLoaded,
  }
}
