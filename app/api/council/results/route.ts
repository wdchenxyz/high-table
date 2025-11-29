import { NextResponse } from "next/server"
import { Redis } from "@upstash/redis"

const redis = Redis.fromEnv()

const resultKey = (conversationId: string) => `council:results:${conversationId}`

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const conversationId = searchParams.get("conversationId")

    if (!conversationId) {
      return NextResponse.json({ error: "conversationId required" }, { status: 400 })
    }

    const result = await redis.get<unknown>(resultKey(conversationId))
    return NextResponse.json(result ?? null)
  } catch (error) {
    console.error("Error reading council result:", error)
    return NextResponse.json(null)
  }
}

export async function POST(req: Request) {
  try {
    const { conversationId, result } = await req.json()

    if (!conversationId) {
      return NextResponse.json({ error: "conversationId required" }, { status: 400 })
    }

    await redis.set(resultKey(conversationId), result)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error saving council result:", error)
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

    await redis.del(resultKey(conversationId))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting council result:", error)
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 })
  }
}
