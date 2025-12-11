"use client"

import * as React from "react"
import {
  Check,
  Copy,
  Users,
  Loader2,
  CheckCircle2,
  Circle,
  Sparkles,
  Scale,
  Crown,
  ChevronDown,
  Square,
  PaperclipIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { MessageResponse } from "@/components/ai-elements/message"
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
import { COUNCIL_MODELS, CHAIRMAN_MODEL } from "@/lib/council-config"
import type { ConversationState, ModelStatus } from "@/lib/types"

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

const CHAIRMAN_MODEL_ID = CHAIRMAN_MODEL.id

// Example questions for the empty state
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

interface CouncilContentProps {
  state: ConversationState
  expandedStages: Record<number, boolean>
  onSubmit: (message: PromptInputMessage) => void
  onCancel: () => void
  onToggleStage: (stage: number) => void
}

export function CouncilContent({
  state,
  expandedStages,
  onSubmit,
  onCancel,
  onToggleStage,
}: CouncilContentProps) {
  const {
    question,
    files,
    isProcessing,
    currentStage,
    stageStatuses,
    modelStatuses,
    stage1Data,
    stage2Data,
    stage3Data,
    error,
  } = state

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

  const handleSubmit = (message: PromptInputMessage) => {
    if (message.text.trim() && !isProcessing) {
      onSubmit(message)
    }
  }

  return (
    <ScrollArea className="flex-1">
      <main className="container py-6">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Welcome State - shown when no processing */}
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
                        if (isProcessing) return
                        handleSubmit({ text: example.question, files: [] })
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
                  placeholder="What would you like the council to discuss?"
                  className="min-h-[80px]"
                  disabled={isProcessing}
                />
                <PromptInputFooter>
                  <PromptInputTools>
                    <AttachmentButton />
                  </PromptInputTools>
                  <div className="flex gap-1">
                    {isProcessing && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="h-8 w-8"
                        onClick={onCancel}
                      >
                        <Square className="h-4 w-4" />
                      </Button>
                    )}
                    <PromptInputSubmit
                      disabled={isProcessing}
                      status={isProcessing ? "streaming" : "ready"}
                    />
                  </div>
                </PromptInputFooter>
              </PromptInput>
            </CardContent>
          </Card>

          {/* User's Question Display */}
          {(isProcessing || currentStage > 0) && question && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">U</AvatarFallback>
                  </Avatar>
                  Your Question
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm whitespace-pre-wrap">{question}</p>
                {/* Display attached files */}
                {files.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {files.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 rounded-md border bg-muted/50 px-2 py-1"
                      >
                        {file.mediaType?.startsWith("image/") && file.url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={file.url}
                            alt={file.filename || "Image"}
                            className="h-8 w-8 rounded object-cover"
                          />
                        ) : (
                          <PaperclipIcon className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                          {file.filename || "Attachment"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

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
            <Collapsible open={expandedStages[1]} onOpenChange={() => onToggleStage(1)}>
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
            <Collapsible open={expandedStages[2]} onOpenChange={() => onToggleStage(2)}>
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
            <Collapsible open={expandedStages[3]} onOpenChange={() => onToggleStage(3)}>
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
        </div>
      </main>
    </ScrollArea>
  )
}
