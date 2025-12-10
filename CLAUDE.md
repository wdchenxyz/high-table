# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

High Table is a multi-AI deliberation platform built with Next.js 16. It has two modes:
- **Chat Mode**: One-on-one conversations with a single AI assistant
- **Council Mode**: Multi-stage deliberation where multiple AI models (GPT 5.1, Claude Sonnet 4.5, Gemini 3 Pro, Grok 4.1) respond, evaluate each other anonymously, and a Chairman model synthesizes a final answer

## Commands

```bash
npm run dev     # Start development server (localhost:3000)
npm run build   # Production build
npm run lint    # ESLint
```

## Architecture

### Tech Stack
- Next.js 16 with App Router, React 19, TypeScript 5
- Vercel AI SDK (@ai-sdk/react, @ai-sdk/anthropic, @ai-sdk/openai, @ai-sdk/google)
- Tailwind CSS 4, shadcn/ui (Radix UI)
- Upstash Redis for storage

### Key Directories
- `app/` - Next.js App Router pages and API routes
- `app/api/council/route.ts` - Main council orchestrator (3-stage deliberation)
- `components/ai-elements/` - AI content rendering (message, code-block, etc.)
- `components/ui/` - shadcn/ui components
- `lib/council-config.ts` - Council model definitions

### Council Deliberation Flow (3 stages)
1. **Response Generation**: All council models respond in parallel (streamed via SSE)
2. **Peer Evaluation**: Each model evaluates anonymized responses, produces rankings
3. **Synthesis**: Chairman model produces final answer using ranked responses

### API Patterns
- All AI responses use Server-Sent Events (SSE) for real-time streaming
- Events: `stage`, `model_status`, `model_chunk`, `error`, `complete`
- Conversation state persisted to Upstash Redis

### State Management
- React hooks only (no external state library)
- `useChat` from @ai-sdk/react for chat mode
- Per-conversation state objects for council mode
- localStorage for active conversation ID

### Styling
- Tailwind CSS with CSS variables for theming
- Dark mode via next-themes
- shadcn/ui new-york style

## Environment Variables

Required in `.env.local`:
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GOOGLE_GENERATIVE_AI_API_KEY`
- `XAI_API_KEY`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- Optional: `BASIC_AUTH_USER`, `BASIC_AUTH_PASS`
