import { generateText, streamText } from "ai"
import { openai } from "@ai-sdk/openai"
import { anthropic } from "@ai-sdk/anthropic"
import { google } from "@ai-sdk/google"
import {
  COUNCIL_MODELS,
  CHAIRMAN_MODEL,
  generateLabel,
  type CouncilModel,
} from "@/lib/council-config"

export const maxDuration = 120 // 2 minutes for the full council process

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

async function queryModel(
  config: CouncilModel,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  try {
    const { text } = await generateText({
      model: `${config.provider}/${config.model}`,
      system: systemPrompt,
      prompt: userPrompt,
    })
    return text
  } catch (error) {
    console.error(`Error querying ${config.name}:`, error)
    return `[Error: Failed to get response from ${config.name}]`
  }
}

function parseRankingFromText(text: string): string[] {
  // Look for FINAL RANKING section
  const rankingMatch = text.match(/FINAL RANKING[:\s]*([\s\S]*?)(?:$|(?=\n\n))/i)
  if (rankingMatch) {
    const rankingSection = rankingMatch[1]
    const responses = rankingSection.match(/Response\s+[A-Z]/gi) || []
    return responses.map((r) => r.trim())
  }

  // Fallback: extract any "Response X" mentions in order
  const fallback = text.match(/Response\s+[A-Z]/gi) || []
  return [...new Set(fallback)].slice(0, COUNCIL_MODELS.length)
}

function calculateAggregateRankings(
  evaluations: Stage2Evaluation[],
  labelToModel: Record<string, string>
): { modelId: string; modelName: string; avgRank: number; votes: number }[] {
  const rankings: Record<string, { total: number; count: number }> = {}

  // Initialize rankings for all models
  for (const model of COUNCIL_MODELS) {
    rankings[model.id] = { total: 0, count: 0 }
  }

  // Aggregate rankings from each evaluation
  for (const evaluation of evaluations) {
    evaluation.parsedRanking.forEach((label, index) => {
      const normalizedLabel = label.replace(/\s+/g, " ").trim()
      const modelName = labelToModel[normalizedLabel]
      if (modelName) {
        const model = COUNCIL_MODELS.find((m) => m.name === modelName)
        if (model) {
          rankings[model.id].total += index + 1 // 1-indexed rank
          rankings[model.id].count += 1
        }
      }
    })
  }

  // Calculate averages and sort
  return COUNCIL_MODELS.map((model) => ({
    modelId: model.id,
    modelName: model.name,
    avgRank: rankings[model.id].count > 0
      ? rankings[model.id].total / rankings[model.id].count
      : COUNCIL_MODELS.length,
    votes: rankings[model.id].count,
  })).sort((a, b) => a.avgRank - b.avgRank)
}

export async function POST(request: Request) {
  const { question } = await request.json()

  if (!question || typeof question !== "string") {
    return new Response(JSON.stringify({ error: "Question is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  // Create a TransformStream for SSE
  const encoder = new TextEncoder()
  const stream = new TransformStream()
  const writer = stream.writable.getWriter()

  const sendEvent = async (event: string, data: unknown) => {
    await writer.write(
      encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
    )
  }

  // Process the council in the background
  ;(async () => {
    try {
      // ============ STAGE 1: Collect Responses ============
      await sendEvent("stage", { stage: 1, status: "started" })

      const stage1Promises = COUNCIL_MODELS.map(async (model, index) => {
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
            prompt: question,
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
          label: generateLabel(index),
        }
      })

      const stage1Responses = await Promise.all(stage1Promises)
      await sendEvent("stage", { stage: 1, status: "complete", data: stage1Responses })

      // ============ STAGE 2: Peer Evaluation ============
      await sendEvent("stage", { stage: 2, status: "started" })

      // Create label-to-model mapping
      const labelToModel: Record<string, string> = {}
      stage1Responses.forEach((response) => {
        labelToModel[response.label] = response.modelName
      })

      // Build anonymized responses for evaluation
      const anonymizedResponses = stage1Responses
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

      const stage2Promises = COUNCIL_MODELS.map(async (model) => {
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

        const parsedRanking = parseRankingFromText(fullEvaluation)

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
      const aggregateRankings = calculateAggregateRankings(evaluations, labelToModel)

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
        modelId: CHAIRMAN_MODEL.id,
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
          model: `${CHAIRMAN_MODEL.provider}/${CHAIRMAN_MODEL.model}`,
          system: "You are the Chairman of an AI council, responsible for synthesizing the collective wisdom of multiple AI models into a single, authoritative response.",
          prompt: synthesisPrompt,
        })

        for await (const chunk of result.textStream) {
          synthesis += chunk
          await sendEvent("model_chunk", {
            stage: 3,
            modelId: CHAIRMAN_MODEL.id,
            chunk,
          })
        }
      } catch (error) {
        console.error(`Error streaming synthesis from Chairman:`, error)
        synthesis = `[Error: Failed to get synthesis from Chairman]`
      }

      await sendEvent("model_status", {
        stage: 3,
        modelId: CHAIRMAN_MODEL.id,
        status: "complete",
        synthesis,
      })

      await sendEvent("stage", {
        stage: 3,
        status: "complete",
        data: {
          synthesis,
          chairman: CHAIRMAN_MODEL.name,
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
          chairman: CHAIRMAN_MODEL.name,
        },
      }

      await sendEvent("complete", result)
    } catch (error) {
      console.error("Council error:", error)
      await sendEvent("error", {
        message: error instanceof Error ? error.message : "Unknown error occurred",
      })
    } finally {
      await writer.close()
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
