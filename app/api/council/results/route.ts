import { NextResponse } from "next/server"
import { readFile, writeFile, unlink, mkdir } from "fs/promises"
import { existsSync } from "fs"
import path from "path"

const DATA_DIR = path.join(process.cwd(), "data")
const COUNCIL_DIR = path.join(DATA_DIR, "council")
const RESULTS_DIR = path.join(COUNCIL_DIR, "results")

async function ensureResultsDir() {
  if (!existsSync(RESULTS_DIR)) {
    await mkdir(RESULTS_DIR, { recursive: true })
  }
}

function getResultFile(conversationId: string) {
  return path.join(RESULTS_DIR, `${conversationId}.json`)
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const conversationId = searchParams.get("conversationId")

    if (!conversationId) {
      return NextResponse.json({ error: "conversationId required" }, { status: 400 })
    }

    await ensureResultsDir()
    const resultFile = getResultFile(conversationId)

    if (!existsSync(resultFile)) {
      return NextResponse.json(null)
    }

    const data = await readFile(resultFile, "utf-8")
    return NextResponse.json(JSON.parse(data))
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

    await ensureResultsDir()
    const resultFile = getResultFile(conversationId)
    await writeFile(resultFile, JSON.stringify(result, null, 2))

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

    await ensureResultsDir()
    const resultFile = getResultFile(conversationId)

    if (existsSync(resultFile)) {
      await unlink(resultFile)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting council result:", error)
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 })
  }
}
