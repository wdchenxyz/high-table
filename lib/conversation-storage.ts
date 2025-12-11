import type { StoredConversation } from "@/lib/types"

export interface ConversationStorageConfig {
  localStorageKey: string
  apiEndpoint: string
}

export function createConversationStorage(config: ConversationStorageConfig) {
  const { localStorageKey, apiEndpoint } = config

  function getActiveConversationId(): string {
    if (typeof window === "undefined") return ""
    return localStorage.getItem(localStorageKey) || ""
  }

  function saveActiveConversationId(id: string) {
    localStorage.setItem(localStorageKey, id)
  }

  async function fetchConversations(): Promise<StoredConversation[]> {
    try {
      const res = await fetch(apiEndpoint)
      if (!res.ok) return []
      return await res.json()
    } catch {
      return []
    }
  }

  async function saveConversationsToServer(conversations: StoredConversation[]) {
    try {
      await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(conversations),
      })
    } catch (error) {
      console.error("Failed to save conversations:", error)
    }
  }

  return {
    getActiveConversationId,
    saveActiveConversationId,
    fetchConversations,
    saveConversationsToServer,
  }
}
