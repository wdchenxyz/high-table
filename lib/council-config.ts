// Council configuration
// Models that will participate in the council deliberation

export interface CouncilModel {
  id: string
  name: string
  provider: "openai" | "anthropic" | "google" | "xai"
  model: string
}

// Council members - models that respond to user queries
export const COUNCIL_MODELS: CouncilModel[] = [
  {
    id: "gpt-5.1",
    name: "GPT",
    provider: "openai",
    model: "gpt-5.1",
  },
  {
    id: "claude-sonnet",
    name: "Claude Sonnet",
    provider: "anthropic",
    model: "claude-sonnet-4.5"
  },
  {
    id: "gemini-pro",
    name: "Gemini Pro",
    provider: "google",
    model: "gemini-3-pro-preview",
  },
  {
    id: "grok-4.1-fast",
    name: "Grok 4.1 Fast",
    provider: "xai",
    model: "grok-4.1-fast-reasoning",
  },
]

// Chairman model - synthesizes the final answer
export const CHAIRMAN_MODEL: CouncilModel = {
  id: "gemini-chairman",
  name: "Gemini (Chairman)",
  provider: "google",
  model: "gemini-3-pro-preview",
}

// Generate anonymous labels for responses (A, B, C, etc.)
export function generateLabel(index: number): string {
  return `Response ${String.fromCharCode(65 + index)}`
}
