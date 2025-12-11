"use client"

import * as React from "react"
import type {
  StoredConversation,
  ConversationState,
  CouncilResult,
  Stage1Response,
  Stage2Data,
  Stage3Data,
  ModelStatus,
  StageStatus,
} from "@/lib/types"
import { createEmptyConversationState } from "@/lib/types"
import { CHAIRMAN_MODEL } from "@/lib/council-config"
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input"

const ACTIVE_COUNCIL_KEY = "council-active-conversation"
const CHAIRMAN_MODEL_ID = CHAIRMAN_MODEL.id

function getActiveConversationId(): string {
  if (typeof window === "undefined") return ""
  return localStorage.getItem(ACTIVE_COUNCIL_KEY) || ""
}

function saveActiveConversationId(id: string) {
  localStorage.setItem(ACTIVE_COUNCIL_KEY, id)
}

// API storage functions
async function fetchConversations(): Promise<StoredConversation[]> {
  try {
    const res = await fetch("/api/council/conversations")
    if (!res.ok) return []
    return await res.json()
  } catch {
    return []
  }
}

async function saveConversationsToServer(conversations: StoredConversation[]) {
  try {
    await fetch("/api/council/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(conversations),
    })
  } catch (error) {
    console.error("Failed to save council conversations:", error)
  }
}

async function fetchResult(conversationId: string): Promise<CouncilResult | null> {
  try {
    const res = await fetch(`/api/council/results?conversationId=${conversationId}`)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

async function saveResultToServer(conversationId: string, result: CouncilResult) {
  try {
    await fetch("/api/council/results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId, result }),
    })
  } catch (error) {
    console.error("Failed to save council result:", error)
  }
}

async function deleteResultFromServer(conversationId: string) {
  try {
    await fetch(`/api/council/results?conversationId=${conversationId}`, {
      method: "DELETE",
    })
  } catch (error) {
    console.error("Failed to delete council result:", error)
  }
}

const buildModelStatusesFromResult = (
  result: CouncilResult
): Record<number, Record<string, ModelStatus>> => {
  const statuses: Record<number, Record<string, ModelStatus>> = {
    1: {},
    2: {},
    3: {},
  }

  for (const response of result.stage1Data) {
    statuses[1][response.modelId] = {
      status: "complete",
      content: response.content,
    }
  }

  if (result.stage2Data) {
    for (const evaluation of result.stage2Data.evaluations) {
      statuses[2][evaluation.modelId] = {
        status: "complete",
        evaluation: evaluation.evaluation,
        parsedRanking: evaluation.parsedRanking,
      }
    }
  }

  if (result.stage3Data?.synthesis) {
    statuses[3][CHAIRMAN_MODEL_ID] = {
      status: "complete",
      synthesis: result.stage3Data.synthesis,
    }
  }

  return statuses
}

const mapResultToState = (result: CouncilResult): ConversationState => ({
  ...createEmptyConversationState(),
  question: result.question,
  stage1Data: result.stage1Data,
  stage2Data: result.stage2Data,
  stage3Data: result.stage3Data,
  modelStatuses: buildModelStatusesFromResult(result),
  stageStatuses: result.stageStatuses,
  currentStage:
    result.stageStatuses[3] === "complete"
      ? 3
      : result.stageStatuses[2] === "complete"
        ? 2
        : result.stageStatuses[1] === "complete"
          ? 1
          : 0,
})

export function useCouncilConversations() {
  // Sidebar and conversation state
  const [conversations, setConversations] = React.useState<StoredConversation[]>([])
  const [activeConversationId, setActiveConversationId] = React.useState<string>("")
  const [isLoaded, setIsLoaded] = React.useState(false)

  // Track which stage cards are expanded (default all expanded)
  const [expandedStages, setExpandedStages] = React.useState<Record<number, boolean>>({
    1: true,
    2: true,
    3: true,
  })

  // Ref to track abort controller for canceling ongoing requests
  const abortControllerRef = React.useRef<AbortController | null>(null)
  // Track which conversation is currently processing
  const processingConversationIdRef = React.useRef<string | null>(null)

  // Per-conversation deliberation state
  const [conversationStates, setConversationStates] = React.useState<Record<string, ConversationState>>({})
  const savedResultsRef = React.useRef<Record<string, boolean>>({})

  const ensureConversationState = React.useCallback(
    (id: string, overrides?: Partial<ConversationState>) => {
      setConversationStates((prev) => {
        if (prev[id]) return prev
        return {
          ...prev,
          [id]: { ...createEmptyConversationState(), ...overrides },
        }
      })
    },
    []
  )

  const updateConversationState = React.useCallback(
    (id: string, updater: (prev: ConversationState) => ConversationState) => {
      setConversationStates((prev) => {
        const previous = prev[id] ?? createEmptyConversationState()
        return {
          ...prev,
          [id]: updater(previous),
        }
      })
    },
    []
  )

  const resetConversationState = React.useCallback(
    (id: string, options?: { keepQuestion?: boolean }) => {
      setConversationStates((prev) => {
        const previous = prev[id]
        const nextQuestion = options?.keepQuestion ? previous?.question ?? "" : ""
        return {
          ...prev,
          [id]: {
            ...createEmptyConversationState(),
            question: nextQuestion,
          },
        }
      })
      savedResultsRef.current[id] = false
    },
    []
  )

  const loadConversationState = React.useCallback(
    async (id: string) => {
      const result = await fetchResult(id)
      if (result) {
        setConversationStates((prev) => ({
          ...prev,
          [id]: mapResultToState(result),
        }))
        savedResultsRef.current[id] = true
      } else {
        ensureConversationState(id)
      }
    },
    [ensureConversationState]
  )

  // Initialize conversations from server
  React.useEffect(() => {
    async function loadData() {
      const stored = await fetchConversations()
      const activeId = getActiveConversationId()

      let currentId: string
      if (stored.length === 0) {
        const defaultConversation: StoredConversation = {
          id: "default",
          title: "New deliberation",
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
      await loadConversationState(currentId)
      setIsLoaded(true)
    }

    loadData()
  }, [ensureConversationState, loadConversationState])

  React.useEffect(() => {
    if (activeConversationId) {
      ensureConversationState(activeConversationId)
    }
  }, [activeConversationId, ensureConversationState])

  // Auto-save results when stage 3 completes
  React.useEffect(() => {
    for (const [conversationId, state] of Object.entries(conversationStates)) {
      if (
        state.stageStatuses[3] === "complete" &&
        state.stage3Data &&
        !savedResultsRef.current[conversationId]
      ) {
        savedResultsRef.current[conversationId] = true
        const result: CouncilResult = {
          question: state.question,
          stage1Data: state.stage1Data,
          stage2Data: state.stage2Data,
          stage3Data: state.stage3Data,
          stageStatuses: state.stageStatuses,
        }
        void saveResultToServer(conversationId, result)
      }
    }
  }, [conversationStates])

  const activeConversationState =
    conversationStates[activeConversationId] ?? createEmptyConversationState()

  // Update conversation title when question is submitted
  const updateConversationTitle = React.useCallback((id: string, content: string) => {
    setConversations((prev) => {
      const updated = prev.map((c) => {
        if (c.id === id && c.title === "New deliberation") {
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

  // Switch conversation
  const switchConversation = async (id: string) => {
    if (id === activeConversationId) return

    setActiveConversationId(id)
    saveActiveConversationId(id)

    if (!conversationStates[id]) {
      await loadConversationState(id)
    }
  }

  // Create new conversation
  const createConversation = async () => {
    const newConversation: StoredConversation = {
      id: Date.now().toString(),
      title: "New deliberation",
      createdAt: new Date().toISOString(),
    }
    const updated = [newConversation, ...conversations]
    setConversations(updated)
    await saveConversationsToServer(updated)
    setActiveConversationId(newConversation.id)
    saveActiveConversationId(newConversation.id)
    resetConversationState(newConversation.id, { keepQuestion: false })
  }

  // Delete conversation
  const deleteConversation = async (id: string) => {
    const filtered = conversations.filter((c) => c.id !== id)
    await deleteResultFromServer(id)

    setConversationStates((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    delete savedResultsRef.current[id]

    if (processingConversationIdRef.current === id && abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
      processingConversationIdRef.current = null
    }

    if (filtered.length === 0) {
      const newDefault: StoredConversation = {
        id: Date.now().toString(),
        title: "New deliberation",
        createdAt: new Date().toISOString(),
      }
      setConversations([newDefault])
      await saveConversationsToServer([newDefault])
      setActiveConversationId(newDefault.id)
      saveActiveConversationId(newDefault.id)
      resetConversationState(newDefault.id, { keepQuestion: false })
    } else {
      setConversations(filtered)
      await saveConversationsToServer(filtered)
      if (activeConversationId === id) {
        const nextId = filtered[0].id
        setActiveConversationId(nextId)
        saveActiveConversationId(nextId)
        if (!conversationStates[nextId]) {
          await loadConversationState(nextId)
        }
      }
    }
  }

  const handleSSEEvent = React.useCallback(
    (conversationId: string, event: string, data: unknown) => {
      switch (event) {
        case "stage": {
          const { stage, status, data: stageData } = data as {
            stage: number
            status: StageStatus
            data?: unknown
          }
          updateConversationState(conversationId, (prev) => {
            const updated: ConversationState = {
              ...prev,
              currentStage: stage,
              stageStatuses: { ...prev.stageStatuses, [stage]: status },
            }

            if (status === "complete" && stageData) {
              if (stage === 1) {
                updated.stage1Data = stageData as Stage1Response[]
              } else if (stage === 2) {
                updated.stage2Data = stageData as Stage2Data
              } else if (stage === 3) {
                updated.stage3Data = stageData as Stage3Data
              }
            }

            return updated
          })
          break
        }

        case "model_status": {
          const { stage, modelId, status, content, evaluation, parsedRanking, synthesis } =
            data as {
              stage: number
              modelId: string
              status: ModelStatus["status"]
              content?: string
              evaluation?: string
              parsedRanking?: string[]
              synthesis?: string
            }

          updateConversationState(conversationId, (prev) => {
            const stageStatuses = prev.modelStatuses[stage] || {}
            const previousStatus = stageStatuses[modelId] || {}

            return {
              ...prev,
              modelStatuses: {
                ...prev.modelStatuses,
                [stage]: {
                  ...stageStatuses,
                  [modelId]: {
                    ...previousStatus,
                    status,
                    content: content ?? previousStatus.content,
                    evaluation: evaluation ?? previousStatus.evaluation,
                    parsedRanking: parsedRanking ?? previousStatus.parsedRanking,
                    synthesis: synthesis ?? previousStatus.synthesis,
                  },
                },
              },
            }
          })
          break
        }

        case "model_chunk": {
          const { stage, modelId, chunk } = data as {
            stage: number
            modelId: string
            chunk: string
          }

          updateConversationState(conversationId, (prev) => {
            const stageStatuses = prev.modelStatuses[stage] || {}
            const currentStatus = stageStatuses[modelId] || {}

            let updates: Partial<ModelStatus> = {}
            if (stage === 1) {
              updates = {
                status: currentStatus.status || "generating",
                content: (currentStatus.content || "") + chunk,
              }
            } else if (stage === 2) {
              updates = {
                status: currentStatus.status || "evaluating",
                evaluation: (currentStatus.evaluation || "") + chunk,
              }
            } else if (stage === 3) {
              updates = {
                status: currentStatus.status || "synthesizing",
                synthesis: (currentStatus.synthesis || "") + chunk,
              }
            }

            return {
              ...prev,
              modelStatuses: {
                ...prev.modelStatuses,
                [stage]: {
                  ...stageStatuses,
                  [modelId]: {
                    ...currentStatus,
                    ...updates,
                  },
                },
              },
            }
          })
          break
        }

        case "error": {
          const { message } = data as { message: string }
          updateConversationState(conversationId, (prev) => ({
            ...prev,
            error: message,
          }))
          break
        }
      }
    },
    [updateConversationState]
  )

  const handleSubmit = async (message: PromptInputMessage) => {
    if (!activeConversationId) return

    const conversationId = activeConversationId
    const currentState = conversationStates[conversationId] ?? createEmptyConversationState()
    const trimmedQuestion = message.text.trim()

    if (!trimmedQuestion || currentState.isProcessing) return

    if (
      processingConversationIdRef.current &&
      processingConversationIdRef.current !== conversationId
    ) {
      updateConversationState(conversationId, (prev) => ({
        ...prev,
        error: "Another deliberation is currently running. Please wait for it to finish.",
      }))
      return
    }

    updateConversationTitle(conversationId, trimmedQuestion)

    const abortController = new AbortController()
    abortControllerRef.current = abortController
    processingConversationIdRef.current = conversationId

    updateConversationState(conversationId, (prev) => ({
      ...prev,
      question: trimmedQuestion,
      files: message.files,
      isProcessing: true,
      currentStage: 0,
      stageStatuses: { 1: "idle", 2: "idle", 3: "idle" },
      modelStatuses: { 1: {}, 2: {}, 3: {} },
      stage1Data: [],
      stage2Data: null,
      stage3Data: null,
      error: null,
    }))
    savedResultsRef.current[conversationId] = false

    // Reset expanded stages for new deliberation
    setExpandedStages({ 1: true, 2: true, 3: true })

    try {
      const response = await fetch("/api/council", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmedQuestion, files: message.files }),
        signal: abortController.signal,
      })

      if (!response.ok) {
        throw new Error("Failed to start council deliberation")
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error("No response stream")

      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        let currentEvent = ""
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            currentEvent = line.slice(7)
          } else if (line.startsWith("data: ") && currentEvent) {
            const data = JSON.parse(line.slice(6))
            handleSSEEvent(conversationId, currentEvent, data)
            currentEvent = ""
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return
      }
      updateConversationState(conversationId, (prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : "An error occurred",
      }))
    } finally {
      updateConversationState(conversationId, (prev) => ({
        ...prev,
        isProcessing: false,
      }))
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null
      }
      if (processingConversationIdRef.current === conversationId) {
        processingConversationIdRef.current = null
      }
    }
  }

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    if (processingConversationIdRef.current) {
      updateConversationState(processingConversationIdRef.current, (prev) => ({
        ...prev,
        isProcessing: false,
      }))
      processingConversationIdRef.current = null
    }
  }

  // Toggle stage expansion
  const toggleStage = (stage: number) => {
    setExpandedStages((prev) => ({
      ...prev,
      [stage]: !prev[stage],
    }))
  }

  // Auto-collapse previous stages when a new stage starts
  React.useEffect(() => {
    const { currentStage, stageStatuses } = activeConversationState
    if (currentStage === 2 && stageStatuses[1] === "complete") {
      setExpandedStages((prev) => ({ ...prev, 1: false, 2: true }))
    } else if (currentStage === 3 && stageStatuses[2] === "complete") {
      setExpandedStages((prev) => ({ ...prev, 1: false, 2: false, 3: true }))
    }
  }, [activeConversationState])

  const activeConversation = conversations.find(
    (c) => c.id === activeConversationId
  )

  return {
    conversations,
    activeConversationId,
    activeConversation,
    isLoaded,
    conversationStates,
    activeConversationState,
    expandedStages,
    switchConversation,
    createConversation,
    deleteConversation,
    handleSubmit,
    handleCancel,
    toggleStage,
  }
}
