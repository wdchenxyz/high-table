import type { FileUIPart } from "ai"

export interface StoredConversation {
  id: string
  title: string
  createdAt: string
}

export type AppMode = "chat" | "council"

// Council-specific types
export interface Stage1Response {
  modelId: string
  modelName: string
  content: string
  label: string
}

export interface Stage2Evaluation {
  modelId: string
  modelName: string
  evaluation: string
  parsedRanking: string[]
}

export interface AggregateRanking {
  modelId: string
  modelName: string
  avgRank: number
  votes: number
}

export interface Stage2Data {
  evaluations: Stage2Evaluation[]
  labelToModel: Record<string, string>
  aggregateRankings: AggregateRanking[]
}

export interface Stage3Data {
  synthesis: string
  chairman: string
}

export interface ModelStatus {
  status: "idle" | "generating" | "evaluating" | "synthesizing" | "complete" | "error"
  content?: string
  evaluation?: string
  parsedRanking?: string[]
  synthesis?: string
}

export type StageStatus = "idle" | "started" | "complete"

export interface CouncilResult {
  question: string
  stage1Data: Stage1Response[]
  stage2Data: Stage2Data | null
  stage3Data: Stage3Data | null
  stageStatuses: Record<number, StageStatus>
}

export interface ConversationState {
  question: string
  files: FileUIPart[]
  currentStage: number
  stageStatuses: Record<number, StageStatus>
  modelStatuses: Record<number, Record<string, ModelStatus>>
  stage1Data: Stage1Response[]
  stage2Data: Stage2Data | null
  stage3Data: Stage3Data | null
  isProcessing: boolean
  error: string | null
}

export const createEmptyConversationState = (): ConversationState => ({
  question: "",
  files: [],
  currentStage: 0,
  stageStatuses: { 1: "idle", 2: "idle", 3: "idle" },
  modelStatuses: { 1: {}, 2: {}, 3: {} },
  stage1Data: [],
  stage2Data: null,
  stage3Data: null,
  isProcessing: false,
  error: null,
})
