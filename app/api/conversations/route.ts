import { NextResponse } from "next/server"
import { readFile, writeFile, mkdir } from "fs/promises"
import { existsSync } from "fs"
import path from "path"

const DATA_DIR = path.join(process.cwd(), "data")
const CONVERSATIONS_FILE = path.join(DATA_DIR, "conversations.json")

async function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true })
  }
}

async function getConversations() {
  await ensureDataDir()
  if (!existsSync(CONVERSATIONS_FILE)) {
    return []
  }
  const data = await readFile(CONVERSATIONS_FILE, "utf-8")
  return JSON.parse(data)
}

async function saveConversations(conversations: unknown[]) {
  await ensureDataDir()
  await writeFile(CONVERSATIONS_FILE, JSON.stringify(conversations, null, 2))
}

export async function GET() {
  try {
    const conversations = await getConversations()
    return NextResponse.json(conversations)
  } catch (error) {
    console.error("Error reading conversations:", error)
    return NextResponse.json([])
  }
}

export async function POST(req: Request) {
  try {
    const conversations = await req.json()
    await saveConversations(conversations)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error saving conversations:", error)
    return NextResponse.json({ error: "Failed to save" }, { status: 500 })
  }
}
