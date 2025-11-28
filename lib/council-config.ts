// Council configuration
// Models that will participate in the council deliberation

export interface CouncilModel {
  id: string
  name: string
  provider: "openai" | "anthropic" | "google"
  model: string
}

// Council members - models that respond to user queries
export const COUNCIL_MODELS: CouncilModel[] = [
  {
    id: "gpt-4o",
    name: "GPT-4o",
    provider: "openai",
    model: "gpt-4o",
  },
  {
    id: "claude-sonnet",
    name: "Claude Sonnet",
    provider: "anthropic",
    model: "claude-sonnet-4-20250514",
  },
  {
    id: "gemini-pro",
    name: "Gemini Pro",
    provider: "google",
    model: "gemini-2.0-flash",
  },
]

// Chairman model - synthesizes the final answer
export const CHAIRMAN_MODEL: CouncilModel = {
  id: "gemini-chairman",
  name: "Gemini (Chairman)",
  provider: "google",
  model: "gemini-2.0-flash",
}

// Generate anonymous labels for responses (A, B, C, etc.)
export function generateLabel(index: number): string {
  return `Response ${String.fromCharCode(65 + index)}`
}
