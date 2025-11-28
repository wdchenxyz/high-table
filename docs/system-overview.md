# High Table System Overview

_Last updated: 2025-11-28_

This document summarizes the structure of the **high-table** repository, the major runtime flows, and the supporting UI/infra primitives. It should give new contributors enough context to understand how the pieces fit together before diving into specific files. For a deeper dive into prompt engineering choices for the LLM council, see `docs/llm-council-idea.md`.

> Paths in this document are repository-relative (for example, `app/council/page.tsx`).

---

## 1. Purpose & Scope

- A Next.js 16 (App Router) monorepo that assembles two AI-centric experiences:
  - A **chat workspace** powered by the Vercel AI SDK (`@ai-sdk/react`) with persistent multi-conversation history.
  - An **LLM Council** that runs a three-stage deliberation loop (parallel responses → peer evaluation → chairman synthesis) across multiple model providers.
- Everything runs inside the Next.js app:
  - UI routes live under `app/…`.
  - Server actions and APIs live under `app/api/…`.
  - Persistent state is file-based (`data/…`) for ease of local prototyping.
- The repo also contains a reusable **AI UI component kit** (`components/ai-elements`) that can be embedded in future surfaces.

---

## 2. Technology Stack

- **Runtime**: Next.js 16 + React 19, TypeScript, App Router layout.
- **Styling**: Tailwind CSS v4 pipeline (see `app/globals.css`) with CSS variables for themes, `tw-animate-css` for canned animations, and Geist fonts loaded via `next/font`.
- **AI Integration**: Vercel AI SDK (`ai`, `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/google`) and the `DefaultChatTransport` helper for streaming responses over HTTP.
- **State & Utilities**: localStorage for quick client-side persistence, file-backed JSON storage on the server (`fs/promises`, `path`), `nanoid` for attachment IDs, `use-stick-to-bottom` for chat scrolling, `tokenlens` for token/cost math.
- **UI Libraries**: shadcn/radix components under `components/ui`, `lucide-react` icons, `@xyflow/react` for graph/canvas-style elements used by the AI UI kit, `streamdown` for markdown/MDX-like rendering, `motion` for micro-animations.

---

## 3. User-Facing Surfaces

### 3.1 Chat Workspace (`app/chat/page.tsx`)

- Client component that wraps the `useChat` hook (`@ai-sdk/react`) with a custom `DefaultChatTransport` pointed at `/api/chat`.
- Keeps a list of conversations (`StoredConversation[]`) fetched from `/api/conversations`, remembers the active ID in `localStorage` (`chat-active-conversation`), and persists individual message histories under `/api/messages`.
- Each sidebar action (create, delete, switch) syncs both client state and server files; deleting a conversation also deletes its `data/messages/{id}.json`.
- Messages stream live via AI SDK events; once a response finishes (`status` transitions from `streaming` to `ready`) the full transcript is flushed to the server for persistence.
- UX highlights: conversational sidebar built with `SidebarProvider`, scrollable transcript via `ScrollArea`, composer using the shared `Textarea` component, loading indicators via `Loader2`.

### 3.2 LLM Council (`app/council/page.tsx`)

- Rich client component orchestrating a 3-stage flow. Each conversation maintains an independent `ConversationState` object (question, stage statuses, per-model status snapshots, and cached results).
- Streaming data arrives via Server-Sent Events (SSE) from `/api/council`. The handler interprets `stage`, `model_status`, `model_chunk`, and `error` events to update the view in real time.
- Conversations list and persisted council results live under separate endpoints (`/api/council/conversations` and `/api/council/results`). Files are written to `data/council/conversations.json` and `data/council/results/{id}.json`.
- UI features:
  - Sidebar for multiple deliberations with destructive actions mirrored to disk.
  - Progress tracking component derived from `stageStatuses`.
  - Stage 1 & 2 outputs rendered in tab sets, streaming chunks merged with final payloads.
  - Aggregate ranking summaries plus anonymized → de-anonymized mapping (client renders actual model names with context explaining anonymity).
  - Stage 3 chairman synthesis with copy buttons and streaming indicator.
  - Ability to abort an in-flight deliberation via `AbortController` (currently triggered implicitly when deleting or switching while streaming).

### 3.3 Landing Page (`app/page.tsx`)

- Default create-next-app placeholder. It currently serves as a static splash and does not connect to the AI flows.

---

## 4. Server/API Layer

All server logic resides under `app/api`. Each route is a standalone file exporting HTTP methods.

| Route | Purpose | Implementation Notes |
| --- | --- | --- |
| `app/api/chat/route.ts` | Streams single-model chat completions. | Uses `streamText` with `openai("gpt-4o-mini")`; applies a simple system prompt and relays UI-friendly streaming responses with `toUIMessageStreamResponse()`. |
| `app/api/conversations/route.ts` | CRUD for chat conversation metadata. | Reads/writes `data/conversations.json`, lazily creating the directory. |
| `app/api/messages/route.ts` | CRUD for chat message transcripts (per conversation). | Stores each conversation under `data/messages/{id}.json`; supports GET/POST/DELETE. |
| `app/api/council/route.ts` | Full three-stage LLM council orchestrator. | Streams SSE events while sequentially invoking Stage 1–3 logic (see Section 5). |
| `app/api/council/conversations/route.ts` | CRUD for council conversation metadata. | Same pattern as chat conversations but namespaced under `data/council/`. |
| `app/api/council/results/route.ts` | CRUD for persisted council results per conversation. | Each run writes an entire `CouncilResult` object to `data/council/results/{id}.json`. |

**Persistence model:** plain JSON files. This keeps local development friction-free but implies that serverless deployments need either persistent disks or an alternative storage adapter.

---

## 5. LLM Council Orchestration

Configuration lives in `lib/council-config.ts`:

- `COUNCIL_MODELS`: array of `{ id, name, provider, model }` describing each council member. Providers span `openai`, `anthropic`, `google`, and `xai`. The example configuration uses placeholder model IDs such as `gpt-5.1`, `claude-sonnet-4.5`, etc.
- `CHAIRMAN_MODEL`: the synthesizer (currently Gemini Pro preview).
- `generateLabel(index)`: helper that produces `Response A`, `Response B`, … for anonymizing Stage 1 outputs.

`app/api/council/route.ts` executes the flow:

1. **Stage 1 – Collect Responses**
   - Kicks off parallel `streamText` calls for each council model with a shared system prompt.
   - Streams back `model_chunk` events for incremental UI updates and a final `model_status` with `content`.
   - After all models return, assigns shuffled anonymity labels before emitting `stage:1` completion with the labeled payload.

2. **Stage 2 – Peer Evaluation**
   - Builds a `labelToModel` map and an anonymized prompt containing all Stage 1 responses.
   - Each model judges every response, again streamed chunk-by-chunk; results are parsed for the `FINAL RANKING` section via `parseRankingFromText`.
   - Uses `calculateAggregateRankings` to average ranks (lower is better) across evaluators. Emits the structured evaluations, label map, and aggregate leaderboard.

3. **Stage 3 – Chairman Synthesis**
   - Prepares a synthesis prompt containing Stage 1 responses (with their peer rank) and highlights of Stage 2 evaluations.
   - Streams the chairman model output and emits it as the final stage data plus `stage:3` completion.

4. **Completion/Error Handling**
   - Sends a final `complete` event with the assembled result object, or an `error` event if any stage throws.

**SSE Event Contract**

| Event | Description | Key Payload Fields |
| --- | --- | --- |
| `stage` | Stage lifecycle updates. | `{ stage: 1\|2\|3, status: "started" \| "complete", data?: … }` |
| `model_status` | Per-model status updates. | `{ stage, modelId, status, content?, evaluation?, parsedRanking?, synthesis? }` |
| `model_chunk` | Streaming token chunks. | `{ stage, modelId, chunk }` |
| `complete` | Final assembled result (all three stages). | `{ stage1, stage2, stage3 }` |
| `error` | Terminal errors surfaced to the client. | `{ message }` |

The front-end (`app/council/page.tsx`) folds these updates into its local `conversationStates`. It also defers writing `data/council/results/{id}.json` until Stage 3 is marked complete to avoid saving half-finished runs.

---

## 6. Client State & Persistence Patterns

### Chat (`app/chat/page.tsx`)

- `useChat` manages the live message array. Supplementary React state holds the list of conversations, the current input, and some hydration flags.
- `prevStatusRef` watches for the `streaming → ready` transition to trigger persistence.
- Before switching or creating conversations, the component flushes the current transcript via `saveMessagesToServer`.
- Titles auto-populate from the first user message (`"New conversation"` placeholder until then).

### LLM Council (`app/council/page.tsx`)

- `conversationStates` is an object keyed by conversation ID. Each value includes:
  - `question`
  - `stageStatuses`: stage → `"idle" | "started" | "complete"`
  - `modelStatuses`: nested dictionary storing per-model Stage 1/2/3 progress/chunks
  - `stage1Data`, `stage2Data`, `stage3Data`
  - `isProcessing`, `error`
- `savedResultsRef` ensures that completed runs are only persisted once.
- `AbortController` + `processingConversationIdRef` guard against running multiple deliberations simultaneously.
- UI utilities (`getStageProgress`, `deAnonymizeText`, streaming placeholders) are pure helpers inside the component.

### Shared Patterns

- Both experiences cache an “active conversation ID” in `localStorage` (`chat-active-conversation` and `council-active-conversation`) to restore context on reload.
- Both surfaces stream content incrementally and reconcile streaming buffers with final server responses before persisting.

---

## 7. Data Layout

```
data/
├── conversations.json              # chat sidebar metadata
├── messages/
│   ├── default.json                # per-conversation transcripts
│   └── <conversationId>.json
└── council/
    ├── conversations.json          # council sidebar metadata
    └── results/
        └── <conversationId>.json   # persisted CouncilResult objects
```

- The API layer lazily creates directories and files (`ensureDataDir`, `ensureMessagesDir`, etc.). Any deployment strategy must provide writable storage.
- Structures are simple arrays/objects to keep serialization straightforward.

---

## 8. UI Component Systems

### 8.1 Design System (`components/ui`)

- shadcn/Radix-derived primitives (buttons, cards, dialogs, dropdowns, tabs, sidebar, etc.) aliased via `@/components/ui/*`.
- `components/ui/sidebar.tsx` implements a responsive sidebar with keyboard shortcuts, persistent cookie-backed open state, and mobile sheet fallback.

### 8.2 AI Elements (`components/ai-elements`)

A collection of higher-level, AI-focused building blocks. Highlights include:

- **Conversation & Chat**: `Conversation`, `Message`, `MessageResponse` (renders markdown via `Streamdown`), `PromptInput` (rich composer with attachments, slash commands, keyboard shortcuts), `Suggestions`.
- **Reasoning & Visibility**: `Reasoning`, `ChainOfThought`, `Plan`, `Task`, `Queue`, `Context` (token/cost meter powered by `tokenlens`), `Tool` (renders tool-call transcripts + approvals via `Confirmation`).
- **Artifacts & Media**: `Artifact`, `CodeBlock` (Shiki highlighting with dark/light themes), `Image`, `WebPreview`, `Sources`/`InlineCitation`.
- **Graph/Workflow Primitives**: `Canvas`, `Node`, `Edge`, `Panel`, `Toolbar`, `Controls`, `Connection`—thin wrappers over `@xyflow/react` for future agent visualizations.
- **Misc Utilities**: `Loader`, `Shimmer`, `OpenIn` (open prompts in third-party UIs), `Checkpoint`, `Queue`, `MessageBranch` navigation helpers.

Even though the current pages only tap into a subset of these components, the kit standardizes UX for future flows.

---

## 9. Styling & Layout

- `app/layout.tsx` sets up Geist fonts and wires `globals.css`.
- `app/globals.css`:
  - Imports Tailwind’s base layers (`@import "tailwindcss"`).
  - Defines `@theme inline` tokens for colors/radius.
  - Declares light/dark CSS variables for backgrounds, primary colors, sidebar palette, chart colors, etc.
  - Applies `@custom-variant dark` and base layer utilities.
- `next.config.ts` whitelists `https://models.dev/logos/**` for remote images (used by the Model Selector logos).

---

## 10. Configuration & Tooling

- **Package scripts** (`package.json`): `dev`, `build`, `start`, `lint`.
- **TypeScript** (`tsconfig.json`): strict mode, path alias `@/*`, bundler-based module resolution.
- **Linting** (`eslint.config.mjs`): Next.js recommended configs with expanded ignore list.
- **Env vars** (`env.example`): currently expects `AI_GATEWAY_API_KEY` for the AI SDK providers. Copy to `.env.local` during setup.
- **Dependencies of note**:
  - `ai` v5 for streaming.
  - `@xyflow/react` for node-based visualizations.
  - `streamdown` (markdown renderer) and `shiki` (syntax highlighting).
  - `embla-carousel-react` for inline citations, `cmdk` for command bars.

---

## 11. Additional Resources & Next Steps

- `docs/llm-council-idea.md` captures prompt architecture nuances and design rationale for the council flow.
- Sample persisted data is available under `data/…` to help understand expected JSON shapes.
- When extending the system, consider:
  1. Replacing file-based persistence with a proper database for multi-user deployments.
  2. Surfacing the AI Elements component library inside actual pages (e.g., integrate `PromptInput` inside `/chat`).
  3. Exposing model configuration in the UI instead of editing `lib/council-config.ts`.
  4. Adding automated tests or health checks for the SSE pipeline (currently manual).

This overview should make it easier to navigate the repo, reason about data flow, and identify the right extension points for future work.
