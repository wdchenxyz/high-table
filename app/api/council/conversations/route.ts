import { NextResponse } from "next/server"
import { Redis } from "@upstash/redis"

const redis = Redis.fromEnv()
const CONVERSATIONS_KEY = "council:conversations"

export async function GET() {
  try {
    const conversations = await redis.get<unknown[]>(CONVERSATIONS_KEY)
    return NextResponse.json(conversations ?? [])
  } catch (error) {
    console.error("Error reading council conversations:", error)
    return NextResponse.json([])
  }
}

export async function POST(req: Request) {
  try {
    const conversations = await req.json()
    await redis.set(CONVERSATIONS_KEY, conversations)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error saving council conversations:", error)
    return NextResponse.json({ error: "Failed to save" }, { status: 500 })
  }
}
