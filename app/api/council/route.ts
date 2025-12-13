import { streamText, type CoreUserMessage, type FilePart, type TextPart } from "ai"
import type { FileUIPart } from "ai"
import {
  MODELS,
  DEFAULT_CHAIRMAN,
  generateLabel,
} from "@/lib/council-config"

export const maxDuration = 120 // 2 minutes for the full council process

// File validation constants
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10MB
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
  "text/markdown",
  "application/json",
  "text/csv",
]

// Validate a file before processing
function isValidFile(file: FileUIPart): boolean {
  // Must have a URL
  if (!file.url) return false

  // URL must be a data URL (blob URLs won't work server-side)
  if (!file.url.startsWith("data:")) return false

  // Validate MIME type if provided
  if (file.mediaType && !ALLOWED_MIME_TYPES.includes(file.mediaType)) {
    return false
  }

  // Estimate size from base64 data URL (base64 is ~33% larger than original)
  const base64Match = file.url.match(/^data:[^;]+;base64,(.+)$/)
  if (base64Match) {
    const base64Data = base64Match[1]
    const estimatedSize = (base64Data.length * 3) / 4
    if (estimatedSize > MAX_FILE_SIZE_BYTES) return false
  }

  return true
}

// Helper to build message content with optional files
function buildUserMessage(text: string, files?: FileUIPart[]): CoreUserMessage {
  const content: (TextPart | FilePart)[] = []

  // Add text part
  content.push({ type: "text", text })

  // Add validated file parts
  if (files && files.length > 0) {
    for (const file of files) {
      if (isValidFile(file)) {
        content.push({
          type: "file",
          data: file.url,
          mediaType: file.mediaType || "application/octet-stream",
        })
      }
    }
  }

  return { role: "user", content }
}

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

interface CouncilResult {
  stage1: Stage1Response[]
  stage2: {
    evaluations: Stage2Evaluation[]
    labelToModel: Record<string, string>
    aggregateRankings: { modelId: string; modelName: string; avgRank: number; votes: number }[]
  }
  stage3: {
    synthesis: string
    chairman: string
  }
}

function parseRankingFromText(text: string, councilSize: number): string[] {
  // Look for FINAL RANKING section
  const rankingMatch = text.match(/FINAL RANKING[:\s]*([\s\S]*?)(?:$|(?=\n\n))/i)
  if (rankingMatch) {
    const rankingSection = rankingMatch[1]
    const responses = rankingSection.match(/Response\s+[A-Z]/gi) || []
    return responses.map((r) => r.trim())
  }

  // Fallback: extract any "Response X" mentions in order
  const fallback = text.match(/Response\s+[A-Z]/gi) || []
  return [...new Set(fallback)].slice(0, councilSize)
}

function calculateAggregateRankings(
  evaluations: Stage2Evaluation[],
  labelToModel: Record<string, string>,
  activeModels: typeof MODELS
): { modelId: string; modelName: string; avgRank: number; votes: number }[] {
  const rankings: Record<string, { total: number; count: number }> = {}

  // Initialize rankings for active models only
  for (const model of activeModels) {
    rankings[model.id] = { total: 0, count: 0 }
  }

  // Aggregate rankings from each evaluation
  for (const evaluation of evaluations) {
    evaluation.parsedRanking.forEach((label, index) => {
      const normalizedLabel = label.replace(/\s+/g, " ").trim()
      const modelName = labelToModel[normalizedLabel]
      if (modelName) {
        const model = activeModels.find((m) => m.name === modelName)
        if (model) {
          rankings[model.id].total += index + 1 // 1-indexed rank
          rankings[model.id].count += 1
        }
      }
    })
  }

  // Calculate averages and sort
  return activeModels.map((model) => ({
    modelId: model.id,
    modelName: model.name,
    avgRank: rankings[model.id].count > 0
      ? rankings[model.id].total / rankings[model.id].count
      : activeModels.length,
    votes: rankings[model.id].count,
  })).sort((a, b) => a.avgRank - b.avgRank)
}

function shuffleArray<T>(array: T[]): T[] {
  const result = [...array]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = result[i]
    result[i] = result[j]
    result[j] = temp
  }
  return result
}

export async function POST(request: Request) {
  const { question, files, councilModelIds, chairmanModelId } = await request.json() as {
    question: string
    files?: FileUIPart[]
    councilModelIds?: string[]
    chairmanModelId?: string
  }

  if (!question || typeof question !== "string") {
    return new Response(JSON.stringify({ error: "Question is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  // Build user message with optional file attachments
  const userMessage = buildUserMessage(question, files)

  // Filter council models based on selection (default to all if not specified or invalid)
  const activeCouncilModels =
    councilModelIds && councilModelIds.length >= 2
      ? MODELS.filter((m) => councilModelIds.includes(m.id))
      : MODELS

  // Ensure we have at least 2 models after filtering
  const finalCouncilModels =
    activeCouncilModels.length >= 2 ? activeCouncilModels : MODELS

  // Select chairman model (default to DEFAULT_CHAIRMAN if not specified or invalid)
  const activeChairmanModel = chairmanModelId
    ? MODELS.find((m) => m.id === chairmanModelId) || DEFAULT_CHAIRMAN
    : DEFAULT_CHAIRMAN

  // Create a TransformStream for SSE
  const encoder = new TextEncoder()
  const stream = new TransformStream()
  const writer = stream.writable.getWriter()

  const sendEvent = async (event: string, data: unknown) => {
    try {
      await writer.write(
        encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
      )
    } catch {
      // Stream was closed (client disconnected), ignore
    }
  }

  // Process the council in the background
  ;(async () => {
    try {
      // ============ STAGE 1: Collect Responses ============
      await sendEvent("stage", { stage: 1, status: "started" })

      const stage1Promises = finalCouncilModels.map(async (model) => {
        await sendEvent("model_status", {
          stage: 1,
          modelId: model.id,
          status: "generating",
        })

        let fullContent = ""

        try {
          const result = streamText({
            model: `${model.provider}/${model.model}`,
            system: "You are a helpful AI assistant. Provide a thoughtful, accurate, and well-structured response.",
            messages: [userMessage],
          })

          for await (const chunk of result.textStream) {
            fullContent += chunk
            await sendEvent("model_chunk", {
              stage: 1,
              modelId: model.id,
              chunk,
            })
          }
        } catch (error) {
          console.error(`Error streaming from ${model.name}:`, error)
          fullContent = `[Error: Failed to get response from ${model.name}]`
        }

        await sendEvent("model_status", {
          stage: 1,
          modelId: model.id,
          status: "complete",
          content: fullContent,
        })

        return {
          modelId: model.id,
          modelName: model.name,
          content: fullContent,
        }
      })

      const rawStage1Responses = await Promise.all(stage1Promises)
      const labelPool = rawStage1Responses.map((_, index) => generateLabel(index))
      const shuffledLabels = shuffleArray(labelPool)
      const stage1Responses: Stage1Response[] = rawStage1Responses.map((response, index) => ({
        ...response,
        label: shuffledLabels[index],
      }))
      await sendEvent("stage", { stage: 1, status: "complete", data: stage1Responses })

      // ============ STAGE 2: Peer Evaluation ============
      await sendEvent("stage", { stage: 2, status: "started" })

      // Create label-to-model mapping
      const labelToModel: Record<string, string> = {}
      stage1Responses.forEach((response) => {
        labelToModel[response.label] = response.modelName
      })

      // Build anonymized responses for evaluation
      const anonymizedResponses = shuffleArray(stage1Responses)
        .map((r) => `${r.label}:\n${r.content}`)
        .join("\n\n---\n\n")

      const evaluationPrompt = `You are evaluating responses to the following question:

"${question}"

Here are the responses from different sources (anonymized):

${anonymizedResponses}

Please:
1. Evaluate each response based on accuracy, helpfulness, clarity, and depth
2. Provide a brief analysis of each response's strengths and weaknesses
3. End with a FINAL RANKING section that lists responses from best to worst

Format your ranking exactly like this:
FINAL RANKING:
1. Response X
2. Response Y
3. Response Z

Do not include any additional text after the ranking.`

      const stage2Promises = finalCouncilModels.map(async (model) => {
        await sendEvent("model_status", {
          stage: 2,
          modelId: model.id,
          status: "evaluating",
        })

        let fullEvaluation = ""

        try {
          const result = streamText({
            model: `${model.provider}/${model.model}`,
            system: "You are a fair and impartial judge evaluating AI responses. Be objective and thorough in your analysis.",
            prompt: evaluationPrompt,
          })

          for await (const chunk of result.textStream) {
            fullEvaluation += chunk
            await sendEvent("model_chunk", {
              stage: 2,
              modelId: model.id,
              chunk,
            })
          }
        } catch (error) {
          console.error(`Error streaming evaluation from ${model.name}:`, error)
          fullEvaluation = `[Error: Failed to get evaluation from ${model.name}]`
        }

        const parsedRanking = parseRankingFromText(fullEvaluation, finalCouncilModels.length)

        await sendEvent("model_status", {
          stage: 2,
          modelId: model.id,
          status: "complete",
          evaluation: fullEvaluation,
          parsedRanking,
        })

        return {
          modelId: model.id,
          modelName: model.name,
          evaluation: fullEvaluation,
          parsedRanking,
        }
      })

      const evaluations = await Promise.all(stage2Promises)
      const aggregateRankings = calculateAggregateRankings(evaluations, labelToModel, finalCouncilModels)

      await sendEvent("stage", {
        stage: 2,
        status: "complete",
        data: {
          evaluations,
          labelToModel,
          aggregateRankings,
        },
      })

      // ============ STAGE 3: Chairman Synthesis ============
      await sendEvent("stage", { stage: 3, status: "started" })
      await sendEvent("model_status", {
        stage: 3,
        modelId: activeChairmanModel.id,
        status: "synthesizing",
      })

      // Build context for chairman
      const rankingsSummary = aggregateRankings
        .map((r, i) => `${i + 1}. ${r.modelName} (avg rank: ${r.avgRank.toFixed(2)})`)
        .join("\n")

      const responsesWithRankings = stage1Responses
        .map((r) => {
          const ranking = aggregateRankings.find((ar) => ar.modelName === r.modelName)
          return `[${r.modelName}] (Peer ranking: #${ranking?.avgRank.toFixed(1) || "N/A"}):\n${r.content}`
        })
        .join("\n\n---\n\n")

      const synthesisPrompt = `As the Chairman of this AI council, synthesize the best possible answer to the user's question based on the council's deliberation.

Original Question: "${question}"

Council Responses (with peer rankings):
${responsesWithRankings}

Aggregate Peer Rankings:
${rankingsSummary}

Key Evaluation Insights:
${evaluations.map((e) => `${e.modelName}'s assessment highlights: ${e.evaluation.slice(0, 500)}...`).join("\n\n")}

Your task:
1. Synthesize the best elements from all responses
2. Give more weight to higher-ranked responses
3. Resolve any contradictions with the most accurate information
4. Provide a comprehensive, well-structured final answer

Begin your synthesis:`

      let synthesis = ""

      try {
        const result = streamText({
          model: `${activeChairmanModel.provider}/${activeChairmanModel.model}`,
          system: "You are the Chairman of an AI council, responsible for synthesizing the collective wisdom of multiple AI models into a single, authoritative response.",
          prompt: synthesisPrompt,
        })

        for await (const chunk of result.textStream) {
          synthesis += chunk
          await sendEvent("model_chunk", {
            stage: 3,
            modelId: activeChairmanModel.id,
            chunk,
          })
        }
      } catch (error) {
        console.error(`Error streaming synthesis from Chairman:`, error)
        synthesis = `[Error: Failed to get synthesis from Chairman]`
      }

      await sendEvent("model_status", {
        stage: 3,
        modelId: activeChairmanModel.id,
        status: "complete",
        synthesis,
      })

      await sendEvent("stage", {
        stage: 3,
        status: "complete",
        data: {
          synthesis,
          chairman: activeChairmanModel.name,
        },
      })

      // Send complete event
      const result: CouncilResult = {
        stage1: stage1Responses,
        stage2: {
          evaluations,
          labelToModel,
          aggregateRankings,
        },
        stage3: {
          synthesis,
          chairman: activeChairmanModel.name,
        },
      }

      await sendEvent("complete", result)
    } catch (error) {
      console.error("Council error:", error)
      await sendEvent("error", {
        message: error instanceof Error ? error.message : "Unknown error occurred",
      })
    } finally {
      try {
        await writer.close()
      } catch {
        // Stream already closed (client disconnected), ignore
      }
    }
  })()

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
