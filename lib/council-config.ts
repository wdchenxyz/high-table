// Council configuration
// Models that can participate in council deliberation and/or act as chairman

export interface CouncilModel {
  id: string
  name: string
  provider: "openai" | "anthropic" | "google" | "xai"
  model: string
}

// All available models - can be used as council members or chairman
export const MODELS: CouncilModel[] = [
  {
    id: "gpt-5.2",
    name: "GPT 5.2",
    provider: "openai",
    model: "gpt-5.2",
  },
  {
    id: "claude-opus",
    name: "Claude Opus 4.5",
    provider: "anthropic",
    model: "claude-opus-4.5"
  },
  {
    id: "claude-sonnet",
    name: "Claude Sonnet 4.5",
    provider: "anthropic",
    model: "claude-sonnet-4.5"
  },
  {
    id: "gemini-3-pro",
    name: "Gemini 3 Pro",
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

// Default chairman model ID (must exist in MODELS)
export const DEFAULT_CHAIRMAN_ID = "gemini-pro"

// Helper to get default chairman model object
export const DEFAULT_CHAIRMAN = MODELS.find(m => m.id === DEFAULT_CHAIRMAN_ID)!

// Generate anonymous labels for responses (A, B, C, etc.)
export function generateLabel(index: number): string {
  return `Response ${String.fromCharCode(65 + index)}`
}
