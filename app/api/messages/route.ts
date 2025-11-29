import { NextResponse } from "next/server"
import { Redis } from "@upstash/redis"

const redis = Redis.fromEnv()

const messagesKey = (conversationId: string) => `messages:${conversationId}`

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const conversationId = searchParams.get("conversationId")

    if (!conversationId) {
      return NextResponse.json({ error: "conversationId required" }, { status: 400 })
    }

    const messages = await redis.get<unknown[]>(messagesKey(conversationId))
    return NextResponse.json(messages ?? [])
  } catch (error) {
    console.error("Error reading messages:", error)
    return NextResponse.json([])
  }
}

export async function POST(req: Request) {
  try {
    const { conversationId, messages } = await req.json()

    if (!conversationId) {
      return NextResponse.json({ error: "conversationId required" }, { status: 400 })
    }

    await redis.set(messagesKey(conversationId), messages)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error saving messages:", error)
    return NextResponse.json({ error: "Failed to save" }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const conversationId = searchParams.get("conversationId")

    if (!conversationId) {
      return NextResponse.json({ error: "conversationId required" }, { status: 400 })
    }

    await redis.del(messagesKey(conversationId))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting messages:", error)
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 })
  }
}
