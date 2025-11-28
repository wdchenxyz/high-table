"use client"

import * as React from "react"
import {
  Users,
  Send,
  Loader2,
  CheckCircle2,
  Circle,
  ArrowLeft,
  Sparkles,
  Scale,
  Crown,
} from "lucide-react"
import Link from "next/link"

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
import { MessageResponse } from "@/components/ai-elements/message"

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

export default function CouncilPage() {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim() || isProcessing) return

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

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center gap-4">
          <Link href="/chat">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h1 className="font-semibold">LLM Council</h1>
          </div>
          <Badge variant="secondary" className="ml-auto">
            3-Stage Deliberation
          </Badge>
        </div>
      </header>

      <main className="container flex-1 py-6">
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
                {stage1Data.length > 0 ? (
                  <Tabs defaultValue={stage1Data[0]?.modelId} className="w-full">
                    <TabsList className="w-full justify-start">
                      {stage1Data.map((response) => (
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
                    {stage1Data.map((response) => (
                      <TabsContent key={response.modelId} value={response.modelId}>
                        <ScrollArea className="h-[300px] rounded-md border p-4">
                          <div className="prose prose-sm max-w-none dark:prose-invert">
                            <Badge variant="secondary" className="mb-2">
                              {response.label}
                            </Badge>
                            <MessageResponse>{response.content}</MessageResponse>
                          </div>
                        </ScrollArea>
                      </TabsContent>
                    ))}
                  </Tabs>
                ) : (
                  <div className="grid gap-4 md:grid-cols-3">
                    {Object.entries(modelStatuses[1] || {})
                      .filter(([, status]) =>
                        ["generating", "idle"].includes(status.status)
                      )
                      .map(([modelId, status]) => (
                        <Card key={modelId} className="border-dashed">
                          <CardContent className="flex items-center gap-3 pt-6">
                            {getStatusIcon(status.status)}
                            <div>
                              <p className="font-medium">{modelId}</p>
                              <p className="text-sm text-muted-foreground">
                                {getStatusText(status.status)}
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                )}
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
                {stage2Data?.evaluations ? (
                  <Accordion type="single" collapsible className="w-full">
                    {stage2Data.evaluations.map((evaluation) => (
                      <AccordionItem key={evaluation.modelId} value={evaluation.modelId}>
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center gap-2">
                            {getStatusIcon("complete")}
                            <span>{evaluation.modelName}&apos;s Evaluation</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-4 pt-2">
                            <ScrollArea className="h-[200px] rounded-md border p-4">
                              <div className="prose prose-sm max-w-none dark:prose-invert">
                                <MessageResponse>
                                  {stage2Data.labelToModel
                                    ? deAnonymizeText(
                                        evaluation.evaluation,
                                        stage2Data.labelToModel
                                      )
                                    : evaluation.evaluation}
                                </MessageResponse>
                              </div>
                            </ScrollArea>
                            {evaluation.parsedRanking.length > 0 && (
                              <Collapsible>
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
                                          {stage2Data.labelToModel?.[label] && (
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
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                ) : (
                  <div className="grid gap-4 md:grid-cols-3">
                    {Object.entries(modelStatuses[2] || {})
                      .filter(([, status]) => status.status === "evaluating")
                      .map(([modelId, status]) => (
                        <Card key={modelId} className="border-dashed">
                          <CardContent className="flex items-center gap-3 pt-6">
                            {getStatusIcon(status.status)}
                            <div>
                              <p className="font-medium">{modelId}</p>
                              <p className="text-sm text-muted-foreground">
                                {getStatusText(status.status)}
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                )}
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
                {stage3Data?.synthesis ? (
                  <ScrollArea className="h-[400px] rounded-md border bg-background p-4">
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <MessageResponse>{stage3Data.synthesis}</MessageResponse>
                    </div>
                  </ScrollArea>
                ) : (
                  <Card className="border-dashed">
                    <CardContent className="flex items-center gap-3 pt-6">
                      {getStatusIcon(
                        modelStatuses[3]?.["gemini-chairman"]?.status || "synthesizing"
                      )}
                      <div>
                        <p className="font-medium">Chairman</p>
                        <p className="text-sm text-muted-foreground">
                          {getStatusText(
                            modelStatuses[3]?.["gemini-chairman"]?.status || "synthesizing"
                          )}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
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
    </div>
  )
}
