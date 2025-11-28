"use client"

import * as React from "react"
import {
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
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
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
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarFooter,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { MessageResponse } from "@/components/ai-elements/message"
import { COUNCIL_MODELS } from "@/lib/council-config"

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

  // Council deliberation state
  const [question, setQuestion] = React.useState("")
  const [isProcessing, setIsProcessing] = React.useState(false)
  const [currentStage, setCurrentStage] = React.useState(0)
  const [stageStatuses, setStageStatuses] = React.useState<Record<number, StageStatus>>({
    1: "idle",
    2: "idle",
    3: "idle",
  })
  const [modelStatuses, setModelStatuses] = React.useState<Record<number, Record<string, ModelStatus>>>({
    1: {},
    2: {},
    3: {},
  })
  const [stage1Data, setStage1Data] = React.useState<Stage1Response[]>([])
  const [stage2Data, setStage2Data] = React.useState<Stage2Data | null>(null)
  const [stage3Data, setStage3Data] = React.useState<Stage3Data | null>(null)
  const [error, setError] = React.useState<string | null>(null)

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
      const result = await fetchResult(currentId)
      if (result) {
        setQuestion(result.question)
        setStage1Data(result.stage1Data)
        setStage2Data(result.stage2Data)
        setStage3Data(result.stage3Data)
        setStageStatuses(result.stageStatuses)
        setCurrentStage(result.stageStatuses[3] === "complete" ? 3 :
                       result.stageStatuses[2] === "complete" ? 2 :
                       result.stageStatuses[1] === "complete" ? 1 : 0)
      }

      setIsLoaded(true)
    }

    loadData()
  }, [])

  // Save result when deliberation completes
  React.useEffect(() => {
    if (activeConversationId && stageStatuses[3] === "complete" && stage3Data) {
      const result: CouncilResult = {
        question,
        stage1Data,
        stage2Data,
        stage3Data,
        stageStatuses,
      }
      saveResultToServer(activeConversationId, result)
    }
  }, [activeConversationId, stageStatuses, stage3Data, question, stage1Data, stage2Data])

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

  // Reset state for new/switched conversation
  const resetDeliberationState = () => {
    setQuestion("")
    setIsProcessing(false)
    setCurrentStage(0)
    setStageStatuses({ 1: "idle", 2: "idle", 3: "idle" })
    setModelStatuses({ 1: {}, 2: {}, 3: {} })
    setStage1Data([])
    setStage2Data(null)
    setStage3Data(null)
    setError(null)
  }

  // Switch conversation
  const switchConversation = async (id: string) => {
    if (id === activeConversationId) return

    setActiveConversationId(id)
    saveActiveConversationId(id)

    // Reset and load new conversation's result
    resetDeliberationState()
    const result = await fetchResult(id)
    if (result) {
      setQuestion(result.question)
      setStage1Data(result.stage1Data)
      setStage2Data(result.stage2Data)
      setStage3Data(result.stage3Data)
      setStageStatuses(result.stageStatuses)
      setCurrentStage(result.stageStatuses[3] === "complete" ? 3 :
                     result.stageStatuses[2] === "complete" ? 2 :
                     result.stageStatuses[1] === "complete" ? 1 : 0)
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
    resetDeliberationState()
  }

  // Delete conversation
  const deleteConversation = async (id: string) => {
    const filtered = conversations.filter((c) => c.id !== id)
    await deleteResultFromServer(id)

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
      resetDeliberationState()
    } else {
      setConversations(filtered)
      await saveConversationsToServer(filtered)
      if (activeConversationId === id) {
        const nextId = filtered[0].id
        setActiveConversationId(nextId)
        saveActiveConversationId(nextId)
        resetDeliberationState()
        const result = await fetchResult(nextId)
        if (result) {
          setQuestion(result.question)
          setStage1Data(result.stage1Data)
          setStage2Data(result.stage2Data)
          setStage3Data(result.stage3Data)
          setStageStatuses(result.stageStatuses)
          setCurrentStage(result.stageStatuses[3] === "complete" ? 3 :
                         result.stageStatuses[2] === "complete" ? 2 :
                         result.stageStatuses[1] === "complete" ? 1 : 0)
        }
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim() || isProcessing) return

    // Update conversation title
    updateConversationTitle(activeConversationId, question.trim())

    // Reset state
    setIsProcessing(true)
    setCurrentStage(0)
    setStageStatuses({ 1: "idle", 2: "idle", 3: "idle" })
    setModelStatuses({ 1: {}, 2: {}, 3: {} })
    setStage1Data([])
    setStage2Data(null)
    setStage3Data(null)
    setError(null)

    try {
      const response = await fetch("/api/council", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question.trim() }),
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
            handleSSEEvent(currentEvent, data)
            currentEvent = ""
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSSEEvent = (event: string, data: unknown) => {
    switch (event) {
      case "stage": {
        const { stage, status, data: stageData } = data as {
          stage: number
          status: StageStatus
          data?: unknown
        }
        setCurrentStage(stage)
        setStageStatuses((prev) => ({ ...prev, [stage]: status }))

        if (status === "complete") {
          if (stage === 1 && stageData) {
            setStage1Data(stageData as Stage1Response[])
          } else if (stage === 2 && stageData) {
            setStage2Data(stageData as Stage2Data)
          } else if (stage === 3 && stageData) {
            setStage3Data(stageData as Stage3Data)
          }
        }
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

        setModelStatuses((prev) => ({
          ...prev,
          [stage]: {
            ...prev[stage],
            [modelId]: {
              status,
              content: content || prev[stage]?.[modelId]?.content,
              evaluation: evaluation || prev[stage]?.[modelId]?.evaluation,
              parsedRanking: parsedRanking || prev[stage]?.[modelId]?.parsedRanking,
              synthesis: synthesis || prev[stage]?.[modelId]?.synthesis,
            },
          },
        }))
        break
      }

      case "model_chunk": {
        const { stage, modelId, chunk } = data as {
          stage: number
          modelId: string
          chunk: string
        }

        setModelStatuses((prev) => {
          const currentStatus = prev[stage]?.[modelId] || {}

          // Determine which field to update based on stage
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
            [stage]: {
              ...prev[stage],
              [modelId]: {
                ...currentStatus,
                ...updates,
              },
            },
          }
        })
        break
      }

      case "error": {
        const { message } = data as { message: string }
        setError(message)
        break
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const getStageProgress = () => {
    if (currentStage === 0) return 0
    if (stageStatuses[3] === "complete") return 100
    if (currentStage === 3) return 85
    if (stageStatuses[2] === "complete") return 66
    if (currentStage === 2) return 50
    if (stageStatuses[1] === "complete") return 33
    return 15
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

  const getStatusText = (status: ModelStatus["status"]) => {
    switch (status) {
      case "generating":
        return "Generating response..."
      case "evaluating":
        return "Evaluating peers..."
      case "synthesizing":
        return "Synthesizing..."
      case "complete":
        return "Complete"
      case "error":
        return "Error"
      default:
        return "Waiting"
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
              {activeConversation?.title || "LLM Council"}
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
                Ask the Council
              </CardTitle>
              <CardDescription>
                Submit a question for the AI council to deliberate on. Multiple models will
                provide responses, evaluate each other anonymously, and a chairman will
                synthesize the final answer.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
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
                        Submit to Council
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Progress Bar */}
          {(isProcessing || currentStage > 0) && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Council Progress</span>
                    <span>{getStageProgress()}%</span>
                  </div>
                  <Progress value={getStageProgress()} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span
                      className={cn(
                        stageStatuses[1] !== "idle" && "text-primary font-medium"
                      )}
                    >
                      Stage 1: Responses
                    </span>
                    <span
                      className={cn(
                        stageStatuses[2] !== "idle" && "text-primary font-medium"
                      )}
                    >
                      Stage 2: Evaluation
                    </span>
                    <span
                      className={cn(
                        stageStatuses[3] !== "idle" && "text-primary font-medium"
                      )}
                    >
                      Stage 3: Synthesis
                    </span>
                  </div>
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Stage 1: Council Responses
                  {stageStatuses[1] === "complete" && (
                    <Badge variant="outline" className="ml-2 text-green-600">
                      Complete
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Each council member provides their independent response to your question.
                </CardDescription>
              </CardHeader>
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
            </Card>
          )}

          {/* Stage 2: Peer Evaluation */}
          {(stageStatuses[2] !== "idle" || stage2Data) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scale className="h-5 w-5" />
                  Stage 2: Peer Evaluation
                  {stageStatuses[2] === "complete" && (
                    <Badge variant="outline" className="ml-2 text-green-600">
                      Complete
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Each model evaluates other responses anonymously (as Response A, B, C).
                  Model names shown below are de-anonymized for your convenience.
                </CardDescription>
              </CardHeader>
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
            </Card>
          )}

          {/* Stage 3: Chairman Synthesis */}
          {(stageStatuses[3] !== "idle" || stage3Data) && (
            <Card className="border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-yellow-600" />
                  Stage 3: Chairman&apos;s Synthesis
                  {stageStatuses[3] === "complete" && (
                    <Badge variant="outline" className="ml-2 text-green-600">
                      Complete
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  {stage3Data?.chairman || "The Chairman"} synthesizes the council&apos;s
                  collective wisdom into a final answer.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {(() => {
                  // Get streaming synthesis content
                  const streamingSynthesis = modelStatuses[3]?.["gemini-chairman"]?.synthesis
                  const synthesis = stage3Data?.synthesis || streamingSynthesis
                  const chairmanStatus = modelStatuses[3]?.["gemini-chairman"]?.status || "synthesizing"

                  if (synthesis) {
                    return (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {getStatusIcon(chairmanStatus)}
                          <span>
                            {chairmanStatus === "complete" ? "Synthesis complete" : "Synthesizing..."}
                          </span>
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
            </Card>
          )}

          {/* Empty State */}
          {currentStage === 0 && !isProcessing && (
            <div className="flex h-[40vh] flex-col items-center justify-center text-center">
              <Users className="mb-4 h-16 w-16 text-muted-foreground/50" />
              <h2 className="text-xl font-semibold">Welcome to the LLM Council</h2>
              <p className="mt-2 max-w-md text-muted-foreground">
                Ask a question above to begin the deliberation process. Multiple AI models
                will collaborate to provide you with the best possible answer.
              </p>
              <div className="mt-6 flex gap-4">
                <Badge variant="outline" className="px-3 py-1">
                  <Sparkles className="mr-1 h-3 w-3" />
                  GPT-5.1
                </Badge>
                <Badge variant="outline" className="px-3 py-1">
                  <Sparkles className="mr-1 h-3 w-3" />
                  Claude Sonnet 4.5
                </Badge>
                <Badge variant="outline" className="px-3 py-1">
                  <Sparkles className="mr-1 h-3 w-3" />
                  Gemini 3 Pro
                </Badge>
                <Badge variant="outline" className="px-3 py-1">
                  <Sparkles className="mr-1 h-3 w-3" />
                  Grok 4.1 Fast
                </Badge>
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
