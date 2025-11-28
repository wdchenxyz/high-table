"use client"

import * as React from "react"
import {
  Check,
  Copy,
  Users,
  Send,
  Loader2,
  CheckCircle2,
  Circle,
  Sparkles,
  Scale,
  Crown,
  Plus,
  PanelLeftClose,
  PanelLeft,
  Trash2,
  ChevronDown,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { MessageResponse } from "@/components/ai-elements/message"
import { COUNCIL_MODELS, CHAIRMAN_MODEL } from "@/lib/council-config"

// Types matching the API response
interface Stage1Response {
  modelId: string
  modelName: string
  content: string
  label: string
}

interface Stage2Evaluation {
  modelId: string
  modelName: string
  evaluation: string
  parsedRanking: string[]
}

interface AggregateRanking {
  modelId: string
  modelName: string
  avgRank: number
  votes: number
}

interface Stage2Data {
  evaluations: Stage2Evaluation[]
  labelToModel: Record<string, string>
  aggregateRankings: AggregateRanking[]
}

interface Stage3Data {
  synthesis: string
  chairman: string
}

interface ModelStatus {
  status: "idle" | "generating" | "evaluating" | "synthesizing" | "complete" | "error"
  content?: string
  evaluation?: string
  parsedRanking?: string[]
  synthesis?: string
}

type StageStatus = "idle" | "started" | "complete"

// Conversation types
interface StoredConversation {
  id: string
  title: string
  createdAt: string
}

interface CouncilResult {
  question: string
  stage1Data: Stage1Response[]
  stage2Data: Stage2Data | null
  stage3Data: Stage3Data | null
  stageStatuses: Record<number, StageStatus>
}

interface ConversationState {
  question: string
  currentStage: number
  stageStatuses: Record<number, StageStatus>
  modelStatuses: Record<number, Record<string, ModelStatus>>
  stage1Data: Stage1Response[]
  stage2Data: Stage2Data | null
  stage3Data: Stage3Data | null
  isProcessing: boolean
  error: string | null
}

const createEmptyConversationState = (): ConversationState => ({
  question: "",
  currentStage: 0,
  stageStatuses: { 1: "idle", 2: "idle", 3: "idle" },
  modelStatuses: { 1: {}, 2: {}, 3: {} },
  stage1Data: [],
  stage2Data: null,
  stage3Data: null,
  isProcessing: false,
  error: null,
})

const CHAIRMAN_MODEL_ID = CHAIRMAN_MODEL.id

// Example questions for the empty state - kept short for compact display
const EXAMPLE_QUESTIONS = [
  {
    title: "Technical",
    question: "Microservices vs monolith for a startup?",
  },
  {
    title: "Philosophy",
    question: "Is consciousness just information processing?",
  },
  {
    title: "Strategy",
    question: "When should a company build vs buy software?",
  },
  {
    title: "Creative",
    question: "How can cities reduce food waste?",
  },
]

interface CopyResponseButtonProps {
  text: string
  label?: string
}

const CopyResponseButton = ({ text, label = "Copy" }: CopyResponseButtonProps) => {
  const [copied, setCopied] = React.useState(false)
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const handleCopy = React.useCallback(async () => {
    if (!text) return

    try {
      if (typeof navigator === "undefined" || !navigator.clipboard) {
        throw new Error("Clipboard API is not available")
      }

      await navigator.clipboard.writeText(text)
      setCopied(true)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      timeoutRef.current = setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error("Failed to copy response", error)
    }
  }, [text])

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-muted-foreground hover:text-foreground"
      onClick={handleCopy}
      disabled={!text}
      aria-label={label}
      title={copied ? "Copied!" : label}
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    </Button>
  )
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

// Active conversation ID stored in localStorage
const ACTIVE_COUNCIL_KEY = "council-active-conversation"

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

export default function CouncilPage() {
  // Sidebar and conversation state
  const [sidebarOpen, setSidebarOpen] = React.useState(true)
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

      // Load result for current conversation
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
  const {
    question,
    isProcessing,
    currentStage,
    stageStatuses,
    modelStatuses,
    stage1Data,
    stage2Data,
    stage3Data,
    error,
  } = activeConversationState

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeConversationId) return

    const conversationId = activeConversationId
    const currentState = conversationStates[conversationId] ?? createEmptyConversationState()
    const trimmedQuestion = currentState.question.trim()

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
        body: JSON.stringify({ question: trimmedQuestion }),
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const getStatusIcon = (status: ModelStatus["status"]) => {
    switch (status) {
      case "generating":
      case "evaluating":
      case "synthesizing":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
      case "complete":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case "error":
        return <Circle className="h-4 w-4 text-red-500" />
      default:
        return <Circle className="h-4 w-4 text-muted-foreground" />
    }
  }

  // De-anonymize label to show model name
  const deAnonymizeText = (text: string, labelToModel: Record<string, string>) => {
    let result = text
    for (const [label, modelName] of Object.entries(labelToModel)) {
      result = result.replace(new RegExp(label, "gi"), `**${modelName}**`)
    }
    return result
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
    if (currentStage === 2 && stageStatuses[1] === "complete") {
      setExpandedStages((prev) => ({ ...prev, 1: false, 2: true }))
    } else if (currentStage === 3 && stageStatuses[2] === "complete") {
      setExpandedStages((prev) => ({ ...prev, 1: false, 2: false, 3: true }))
    }
  }, [currentStage, stageStatuses])

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
            New deliberation
          </Button>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Deliberations</SidebarGroupLabel>
            <SidebarGroupContent>
              <ScrollArea className="h-[calc(100vh-180px)]">
                <SidebarMenu>
                  {conversations.map((conversation) => (
                    <SidebarMenuItem key={conversation.id} className="group">
                      <SidebarMenuButton
                        isActive={conversation.id === activeConversationId}
                        onClick={() => switchConversation(conversation.id)}
                      >
                        <Users className="h-4 w-4 shrink-0" />
                        <span className="truncate">{conversation.title}</span>
                      </SidebarMenuButton>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 opacity-0 group-hover:opacity-100"
                        onClick={() => deleteConversation(conversation.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
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
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h1 className="font-semibold">
              {activeConversation?.title || "High Table"}
            </h1>
          </div>
          <Badge variant="secondary" className="ml-auto">
            3-Stage Deliberation
          </Badge>
        </header>

        <ScrollArea className="flex-1">
          <main className="container py-6">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Question Input */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Ask the High Table
              </CardTitle>
              <CardDescription>
                Submit a question for the High Table to deliberate on. Multiple models will
                provide responses, evaluate each other anonymously, and a chairman will
                synthesize the final answer.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Textarea
                  value={question}
                  onChange={(e) => {
                    if (!activeConversationId) return
                    const value = e.target.value
                    updateConversationState(activeConversationId, (prev) => ({
                      ...prev,
                      question: value,
                    }))
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="What would you like the council to discuss?"
                  className="min-h-[100px] resize-none"
                  disabled={isProcessing}
                />
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Press Enter to submit, Shift+Enter for new line
                  </p>
                  <Button type="submit" disabled={!question.trim() || isProcessing}>
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Submit to High Table
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Progress Stepper */}
          {(isProcessing || currentStage > 0) && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  {/* Stage 1 */}
                  <div className="flex flex-1 flex-col items-center">
                    <div
                      className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all duration-300",
                        stageStatuses[1] === "complete"
                          ? "border-green-500 bg-green-50 text-green-600 dark:bg-green-950/30"
                          : stageStatuses[1] === "started"
                            ? "border-primary bg-primary/10 text-primary animate-pulse"
                            : "border-muted-foreground/30 bg-muted/50 text-muted-foreground"
                      )}
                    >
                      <Sparkles className="h-6 w-6" />
                    </div>
                    <span
                      className={cn(
                        "mt-2 text-xs font-medium",
                        stageStatuses[1] !== "idle" ? "text-foreground" : "text-muted-foreground"
                      )}
                    >
                      Responses
                    </span>
                    {/* Model Progress Dots */}
                    <div className="mt-1 flex gap-1">
                      {COUNCIL_MODELS.map((model) => {
                        const status = modelStatuses[1]?.[model.id]?.status
                        return (
                          <div
                            key={model.id}
                            title={model.name}
                            className={cn(
                              "h-2 w-2 rounded-full transition-all duration-300",
                              status === "complete"
                                ? "bg-green-500"
                                : status === "generating"
                                  ? "bg-blue-500 animate-pulse"
                                  : "bg-muted-foreground/30"
                            )}
                          />
                        )
                      })}
                    </div>
                  </div>

                  {/* Connector 1-2 */}
                  <div
                    className={cn(
                      "h-0.5 flex-1 mx-2 transition-all duration-500",
                      stageStatuses[1] === "complete" ? "bg-green-500" : "bg-muted-foreground/30"
                    )}
                  />

                  {/* Stage 2 */}
                  <div className="flex flex-1 flex-col items-center">
                    <div
                      className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all duration-300",
                        stageStatuses[2] === "complete"
                          ? "border-green-500 bg-green-50 text-green-600 dark:bg-green-950/30"
                          : stageStatuses[2] === "started"
                            ? "border-primary bg-primary/10 text-primary animate-pulse"
                            : "border-muted-foreground/30 bg-muted/50 text-muted-foreground"
                      )}
                    >
                      <Scale className="h-6 w-6" />
                    </div>
                    <span
                      className={cn(
                        "mt-2 text-xs font-medium",
                        stageStatuses[2] !== "idle" ? "text-foreground" : "text-muted-foreground"
                      )}
                    >
                      Evaluation
                    </span>
                    {/* Model Progress Dots */}
                    <div className="mt-1 flex gap-1">
                      {COUNCIL_MODELS.map((model) => {
                        const status = modelStatuses[2]?.[model.id]?.status
                        return (
                          <div
                            key={model.id}
                            title={model.name}
                            className={cn(
                              "h-2 w-2 rounded-full transition-all duration-300",
                              status === "complete"
                                ? "bg-green-500"
                                : status === "evaluating"
                                  ? "bg-blue-500 animate-pulse"
                                  : "bg-muted-foreground/30"
                            )}
                          />
                        )
                      })}
                    </div>
                  </div>

                  {/* Connector 2-3 */}
                  <div
                    className={cn(
                      "h-0.5 flex-1 mx-2 transition-all duration-500",
                      stageStatuses[2] === "complete" ? "bg-green-500" : "bg-muted-foreground/30"
                    )}
                  />

                  {/* Stage 3 */}
                  <div className="flex flex-1 flex-col items-center">
                    <div
                      className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all duration-300",
                        stageStatuses[3] === "complete"
                          ? "border-green-500 bg-green-50 text-green-600 dark:bg-green-950/30"
                          : stageStatuses[3] === "started"
                            ? "border-yellow-500 bg-yellow-500/10 text-yellow-600 animate-pulse"
                            : "border-muted-foreground/30 bg-muted/50 text-muted-foreground"
                      )}
                    >
                      <Crown className="h-6 w-6" />
                    </div>
                    <span
                      className={cn(
                        "mt-2 text-xs font-medium",
                        stageStatuses[3] !== "idle" ? "text-foreground" : "text-muted-foreground"
                      )}
                    >
                      Synthesis
                    </span>
                    {/* Chairman Progress Dot */}
                    <div className="mt-1 flex gap-1">
                      <div
                        title={CHAIRMAN_MODEL.name}
                        className={cn(
                          "h-2 w-2 rounded-full transition-all duration-300",
                          stageStatuses[3] === "complete"
                            ? "bg-green-500"
                            : stageStatuses[3] === "started"
                              ? "bg-yellow-500 animate-pulse"
                              : "bg-muted-foreground/30"
                        )}
                      />
                    </div>
                  </div>
                </div>

                {/* Status Text */}
                <div className="mt-4 text-center text-sm text-muted-foreground">
                  {stageStatuses[3] === "complete" ? (
                    <span className="text-green-600 font-medium">Deliberation complete</span>
                  ) : stageStatuses[3] === "started" ? (
                    <span>Chairman is synthesizing the final answer...</span>
                  ) : stageStatuses[2] === "started" ? (
                    <span>
                      Models evaluating responses ({Object.values(modelStatuses[2] || {}).filter(s => s.status === "complete").length}/{COUNCIL_MODELS.length})
                    </span>
                  ) : stageStatuses[1] === "started" ? (
                    <span>
                      Generating responses ({Object.values(modelStatuses[1] || {}).filter(s => s.status === "complete").length}/{COUNCIL_MODELS.length})
                    </span>
                  ) : (
                    <span>Starting deliberation...</span>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error Display */}
          {error && (
            <Card className="border-destructive">
              <CardContent className="pt-6">
                <p className="text-destructive">{error}</p>
              </CardContent>
            </Card>
          )}

          {/* Stage 1: Individual Responses */}
          {(stageStatuses[1] !== "idle" || stage1Data.length > 0) && (
            <Collapsible open={expandedStages[1]} onOpenChange={() => toggleStage(1)}>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer select-none hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5" />
                        Stage 1: High Table Responses
                        {stageStatuses[1] === "complete" && (
                          <Badge variant="outline" className="ml-2 text-green-600">
                            Complete
                          </Badge>
                        )}
                      </CardTitle>
                      <ChevronDown
                        className={cn(
                          "h-5 w-5 text-muted-foreground transition-transform duration-200",
                          expandedStages[1] && "rotate-180"
                        )}
                      />
                    </div>
                    <CardDescription>
                      Each council member provides their independent response to your question.
                    </CardDescription>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent>
                {(() => {
                  // Get models with streaming content or completed data
                  const streamingModels = Object.entries(modelStatuses[1] || {})
                    .filter(([, status]) => status.content || status.status === "generating")
                    .map(([modelId, status]) => ({
                      modelId,
                      modelName: COUNCIL_MODELS.find((m) => m.id === modelId)?.name || modelId,
                      content: status.content || "",
                      label: stage1Data.find((r) => r.modelId === modelId)?.label || "",
                      status: status.status,
                    }))

                  // Use stage1Data if complete, otherwise use streaming data
                  const displayModels = stage1Data.length > 0 ? stage1Data : streamingModels

                  if (displayModels.length > 0) {
                    return (
                      <Tabs defaultValue={displayModels[0]?.modelId} className="w-full">
                        <TabsList className="w-full justify-start">
                          {displayModels.map((response) => (
                            <TabsTrigger
                              key={response.modelId}
                              value={response.modelId}
                              className="flex items-center gap-2"
                            >
                              {getStatusIcon(modelStatuses[1]?.[response.modelId]?.status || "complete")}
                              {response.modelName}
                            </TabsTrigger>
                          ))}
                        </TabsList>
                        {displayModels.map((response) => {
                          // Get content from streaming state if available, otherwise from response
                          const streamingContent = modelStatuses[1]?.[response.modelId]?.content
                          const content = streamingContent || response.content

                          return (
                            <TabsContent key={response.modelId} value={response.modelId}>
                              <div className="mb-2 flex justify-end">
                                <CopyResponseButton text={content} label="Copy response" />
                              </div>
                              <ScrollArea className="h-[300px] rounded-md border p-4">
                                <div className="prose prose-sm max-w-none dark:prose-invert">
                                  {response.label && (
                                    <Badge variant="secondary" className="mb-2">
                                      {response.label}
                                    </Badge>
                                  )}
                                  <MessageResponse>{content}</MessageResponse>
                                </div>
                              </ScrollArea>
                            </TabsContent>
                          )
                        })}
                      </Tabs>
                    )
                  }

                  // Show loading state if no models have started yet
                  return (
                    <div className="flex items-center justify-center py-8 text-muted-foreground">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Waiting for council members to respond...
                    </div>
                  )
                })()}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )}

          {/* Stage 2: Peer Evaluation */}
          {(stageStatuses[2] !== "idle" || stage2Data) && (
            <Collapsible open={expandedStages[2]} onOpenChange={() => toggleStage(2)}>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer select-none hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Scale className="h-5 w-5" />
                        Stage 2: Peer Evaluation
                        {stageStatuses[2] === "complete" && (
                          <Badge variant="outline" className="ml-2 text-green-600">
                            Complete
                          </Badge>
                        )}
                      </CardTitle>
                      <ChevronDown
                        className={cn(
                          "h-5 w-5 text-muted-foreground transition-transform duration-200",
                          expandedStages[2] && "rotate-180"
                        )}
                      />
                    </div>
                    <CardDescription>
                      Each model evaluates other responses anonymously (as Response A, B, C).
                      Model names shown below are de-anonymized for your convenience.
                    </CardDescription>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-4">
                {/* Aggregate Rankings */}
                {stage2Data?.aggregateRankings && (
                  <div className="rounded-lg border bg-muted/50 p-4">
                    <h4 className="mb-3 font-medium">Aggregate Peer Rankings</h4>
                    <div className="space-y-2">
                      {stage2Data.aggregateRankings.map((ranking, index) => (
                        <div
                          key={ranking.modelId}
                          className="flex items-center justify-between rounded-md bg-background p-2"
                        >
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={index === 0 ? "default" : "secondary"}
                              className="w-6 justify-center"
                            >
                              {index + 1}
                            </Badge>
                            <span className="font-medium">{ranking.modelName}</span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Avg Rank: {ranking.avgRank.toFixed(2)} ({ranking.votes} votes)
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Individual Evaluations */}
                {(() => {
                  // Get models with streaming evaluation content
                  const streamingEvaluations = Object.entries(modelStatuses[2] || {})
                    .filter(([, status]) => status.evaluation || status.status === "evaluating")
                    .map(([modelId, status]) => ({
                      modelId,
                      modelName: COUNCIL_MODELS.find((m) => m.id === modelId)?.name || modelId,
                      evaluation: status.evaluation || "",
                      parsedRanking: status.parsedRanking || [],
                      status: status.status,
                    }))

                  // Use stage2Data if complete, otherwise use streaming data
                  const displayEvaluations = stage2Data?.evaluations || streamingEvaluations

                  if (displayEvaluations.length > 0) {
                    return (
                      <Tabs defaultValue={displayEvaluations[0]?.modelId} className="w-full">
                        <TabsList className="w-full justify-start">
                          {displayEvaluations.map((evaluation) => (
                            <TabsTrigger
                              key={evaluation.modelId}
                              value={evaluation.modelId}
                              className="flex items-center gap-2"
                            >
                              {getStatusIcon(modelStatuses[2]?.[evaluation.modelId]?.status || "complete")}
                              {evaluation.modelName}
                            </TabsTrigger>
                          ))}
                        </TabsList>
                        {displayEvaluations.map((evaluation) => {
                          // Get content from streaming state if available
                          const streamingContent = modelStatuses[2]?.[evaluation.modelId]?.evaluation
                          const content = streamingContent || evaluation.evaluation

                          return (
                            <TabsContent key={evaluation.modelId} value={evaluation.modelId}>
                              <ScrollArea className="h-[300px] rounded-md border p-4">
                                <div className="prose prose-sm max-w-none dark:prose-invert">
                                  <MessageResponse>
                                    {stage2Data?.labelToModel
                                      ? deAnonymizeText(content, stage2Data.labelToModel)
                                      : content}
                                  </MessageResponse>
                                </div>
                              </ScrollArea>
                              {evaluation.parsedRanking && evaluation.parsedRanking.length > 0 && (
                                <Collapsible className="mt-4">
                                  <CollapsibleTrigger asChild>
                                    <Button variant="outline" size="sm">
                                      View Extracted Ranking
                                    </Button>
                                  </CollapsibleTrigger>
                                  <CollapsibleContent className="mt-2">
                                    <div className="rounded-md bg-muted p-3">
                                      <ol className="list-inside list-decimal space-y-1 text-sm">
                                        {evaluation.parsedRanking.map((label, idx) => (
                                          <li key={idx}>
                                            {label}
                                            {stage2Data?.labelToModel?.[label] && (
                                              <span className="ml-2 text-muted-foreground">
                                                ({stage2Data.labelToModel[label]})
                                              </span>
                                            )}
                                          </li>
                                        ))}
                                      </ol>
                                    </div>
                                  </CollapsibleContent>
                                </Collapsible>
                              )}
                            </TabsContent>
                          )
                        })}
                      </Tabs>
                    )
                  }

                  // Show loading state if no models have started yet
                  return (
                    <div className="flex items-center justify-center py-8 text-muted-foreground">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Waiting for evaluations to begin...
                    </div>
                  )
                })()}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )}

          {/* Stage 3: Chairman Synthesis */}
          {(stageStatuses[3] !== "idle" || stage3Data) && (
            <Collapsible open={expandedStages[3]} onOpenChange={() => toggleStage(3)}>
              <Card className="border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20">
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer select-none hover:bg-green-100/50 dark:hover:bg-green-900/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Crown className="h-5 w-5 text-yellow-600" />
                        Stage 3: Chairman&apos;s Synthesis
                        {stageStatuses[3] === "complete" && (
                          <Badge variant="outline" className="ml-2 text-green-600">
                            Complete
                          </Badge>
                        )}
                      </CardTitle>
                      <ChevronDown
                        className={cn(
                          "h-5 w-5 text-muted-foreground transition-transform duration-200",
                          expandedStages[3] && "rotate-180"
                        )}
                      />
                    </div>
                    <CardDescription>
                      {stage3Data?.chairman || "The Chairman"} synthesizes the council&apos;s
                      collective wisdom into a final answer.
                    </CardDescription>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent>
                {(() => {
                  // Get streaming synthesis content
                  const streamingSynthesis = modelStatuses[3]?.[CHAIRMAN_MODEL_ID]?.synthesis
                  const synthesis = stage3Data?.synthesis || streamingSynthesis
                  const chairmanStatus =
                    modelStatuses[3]?.[CHAIRMAN_MODEL_ID]?.status || "synthesizing"

                  if (synthesis) {
                    return (
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            {getStatusIcon(chairmanStatus)}
                            <span>
                              {chairmanStatus === "complete" ? "Synthesis complete" : "Synthesizing..."}
                            </span>
                          </div>
                          <CopyResponseButton text={synthesis} label="Copy synthesis" />
                        </div>
                        <ScrollArea className="h-[400px] rounded-md border bg-background p-4">
                          <div className="prose prose-sm max-w-none dark:prose-invert">
                            <MessageResponse>{synthesis}</MessageResponse>
                          </div>
                        </ScrollArea>
                      </div>
                    )
                  }

                  // Show loading state if synthesis hasn't started
                  return (
                    <div className="flex items-center justify-center py-8 text-muted-foreground">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Chairman is preparing synthesis...
                    </div>
                  )
                })()}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )}

          {/* Empty State - Compact */}
          {currentStage === 0 && !isProcessing && (
            <div className="flex flex-col items-center justify-center text-center py-4">
              <Users className="mb-3 h-12 w-12 text-muted-foreground/50" />
              <h2 className="text-lg font-semibold">Welcome to the High Table</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Multiple AI models will deliberate on your question.
              </p>
              <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                {COUNCIL_MODELS.map((model) => (
                  <Badge key={model.id} variant="outline" className="text-xs px-2 py-0.5">
                    <Sparkles className="mr-1 h-3 w-3" />
                    {model.name}
                  </Badge>
                ))}
              </div>

              {/* Example Questions - Compact Grid */}
              <div className="mt-4 w-full max-w-xl">
                <p className="mb-2 text-xs text-muted-foreground">
                  Or try one of these
                </p>
                <div className="grid gap-2 grid-cols-2">
                  {EXAMPLE_QUESTIONS.map((example, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        if (!activeConversationId) return
                        updateConversationState(activeConversationId, (prev) => ({
                          ...prev,
                          question: example.question,
                        }))
                      }}
                      className="group flex items-start gap-2 rounded-md border bg-card px-3 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      <Badge variant="secondary" className="shrink-0 text-[10px] px-1.5 py-0 mt-0.5">
                        {example.title}
                      </Badge>
                      <span className="text-muted-foreground group-hover:text-accent-foreground">
                        {example.question}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
          </main>
        </ScrollArea>
      </SidebarInset>
    </SidebarProvider>
  )
}
