import { NextResponse } from "next/server"
import { readFile, writeFile, unlink, mkdir } from "fs/promises"
import { existsSync } from "fs"
import path from "path"

const DATA_DIR = path.join(process.cwd(), "data")
const MESSAGES_DIR = path.join(DATA_DIR, "messages")

async function ensureMessagesDir() {
  if (!existsSync(MESSAGES_DIR)) {
    await mkdir(MESSAGES_DIR, { recursive: true })
  }
}

function getMessageFile(conversationId: string) {
  return path.join(MESSAGES_DIR, `${conversationId}.json`)
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const conversationId = searchParams.get("conversationId")

    if (!conversationId) {
      return NextResponse.json({ error: "conversationId required" }, { status: 400 })
    }

    await ensureMessagesDir()
    const messageFile = getMessageFile(conversationId)

    if (!existsSync(messageFile)) {
      return NextResponse.json([])
    }

    const data = await readFile(messageFile, "utf-8")
    return NextResponse.json(JSON.parse(data))
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

    await ensureMessagesDir()
    const messageFile = getMessageFile(conversationId)
    await writeFile(messageFile, JSON.stringify(messages, null, 2))

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

    await ensureMessagesDir()
    const messageFile = getMessageFile(conversationId)

    if (existsSync(messageFile)) {
      await unlink(messageFile)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting messages:", error)
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 })
  }
}
