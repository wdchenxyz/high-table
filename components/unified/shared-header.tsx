"use client"

import { PanelLeftClose, PanelLeft, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ModeSwitch } from "./mode-switch"
import type { AppMode } from "@/lib/types"

interface SharedHeaderProps {
  title: string
  mode: AppMode
  onModeChange: (mode: AppMode) => void
  sidebarOpen: boolean
  onSidebarToggle: () => void
  isProcessing?: boolean
}

export function SharedHeader({
  title,
  mode,
  onModeChange,
  sidebarOpen,
  onSidebarToggle,
  isProcessing,
}: SharedHeaderProps) {
  return (
    <header className="flex h-14 items-center gap-4 border-b px-4">
      <Button
        variant="ghost"
        size="icon"
        onClick={onSidebarToggle}
      >
        {sidebarOpen ? (
          <PanelLeftClose className="h-5 w-5" />
        ) : (
          <PanelLeft className="h-5 w-5" />
        )}
      </Button>
      <div className="flex items-center gap-2">
        {mode === "council" && <Users className="h-5 w-5 text-primary" />}
        <h1 className="font-semibold">{title}</h1>
      </div>
      <div className="ml-auto">
        <ModeSwitch
          mode={mode}
          onModeChange={onModeChange}
          disabled={isProcessing}
        />
      </div>
    </header>
  )
}
