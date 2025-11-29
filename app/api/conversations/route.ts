import { NextResponse } from "next/server"
import { Redis } from "@upstash/redis"

const redis = Redis.fromEnv()
const CONVERSATIONS_KEY = "conversations"

export async function GET() {
  try {
    const conversations = await redis.get<unknown[]>(CONVERSATIONS_KEY)
    return NextResponse.json(conversations ?? [])
  } catch (error) {
    console.error("Error reading conversations:", error)
    return NextResponse.json([])
  }
}

export async function POST(req: Request) {
  try {
    const conversations = await req.json()
    await redis.set(CONVERSATIONS_KEY, conversations)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error saving conversations:", error)
    return NextResponse.json({ error: "Failed to save" }, { status: 500 })
  }
}
