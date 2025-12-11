"use client"

import { MessageSquare, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import type { AppMode } from "@/lib/types"

interface ModeSwitchProps {
  mode: AppMode
  onModeChange: (mode: AppMode) => void
  disabled?: boolean
}

export function ModeSwitch({ mode, onModeChange, disabled }: ModeSwitchProps) {
  return (
    <div className="flex items-center rounded-lg border bg-muted p-1">
      <button
        onClick={() => onModeChange("chat")}
        disabled={disabled}
        className={cn(
          "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
          mode === "chat"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
          disabled && "cursor-not-allowed opacity-50"
        )}
      >
        <MessageSquare className="h-4 w-4" />
        Chat
      </button>
      <button
        onClick={() => onModeChange("council")}
        disabled={disabled}
        className={cn(
          "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
          mode === "council"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
          disabled && "cursor-not-allowed opacity-50"
        )}
      >
        <Users className="h-4 w-4" />
        Council
      </button>
    </div>
  )
}
