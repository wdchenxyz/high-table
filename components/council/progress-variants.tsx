"use client"

import { Sparkles, Scale, Crown } from "lucide-react"
import { cn } from "@/lib/utils"
import type { CouncilModel } from "@/lib/council-config"

interface ProgressVariantProps {
  stageStatuses: Record<number, "idle" | "started" | "complete">
  modelStatuses: Record<number, Record<string, { status: string }>>
  selectedCouncilModels: CouncilModel[]
  selectedChairman: CouncilModel
}

// Mini Animated Icons (~50px) - Shimmer effect on icons
export function ProgressMiniAnimated({
  stageStatuses,
  modelStatuses,
  selectedCouncilModels,
}: ProgressVariantProps) {
  return (
    <div className="flex items-center justify-center gap-3 py-2">
      {/* Stage 1 */}
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-300",
            stageStatuses[1] === "complete"
              ? "border-green-500 bg-green-50 text-green-600 dark:bg-green-950/30"
              : stageStatuses[1] === "started"
                ? "border-primary bg-primary/10 text-primary animate-pulse"
                : "border-muted-foreground/30 bg-muted/50 text-muted-foreground"
          )}
        >
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium">Responses</span>
          {stageStatuses[1] !== "idle" && (
            <div className="flex gap-0.5">
              {selectedCouncilModels.map((model) => {
                const status = modelStatuses[1]?.[model.id]?.status
                return (
                  <div
                    key={model.id}
                    title={model.name}
                    className={cn(
                      "h-1.5 w-1.5 rounded-full transition-all duration-300",
                      status === "complete"
                        ? "bg-green-500"
                        : status === "generating"
                          ? "bg-blue-500 animate-pulse"
                          : "bg-muted-foreground/30"
                    )}
                  />
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Connector */}
      <div
        className={cn(
          "w-6 h-0.5 transition-all duration-500",
          stageStatuses[1] === "complete" ? "bg-green-500" : "bg-muted-foreground/30"
        )}
      />

      {/* Stage 2 */}
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-300",
            stageStatuses[2] === "complete"
              ? "border-green-500 bg-green-50 text-green-600 dark:bg-green-950/30"
              : stageStatuses[2] === "started"
                ? "border-primary bg-primary/10 text-primary animate-pulse"
                : "border-muted-foreground/30 bg-muted/50 text-muted-foreground"
          )}
        >
          <Scale className="h-4 w-4" />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium">Evaluation</span>
          {stageStatuses[2] !== "idle" && (
            <div className="flex gap-0.5">
              {selectedCouncilModels.map((model) => {
                const status = modelStatuses[2]?.[model.id]?.status
                return (
                  <div
                    key={model.id}
                    title={model.name}
                    className={cn(
                      "h-1.5 w-1.5 rounded-full transition-all duration-300",
                      status === "complete"
                        ? "bg-green-500"
                        : status === "evaluating"
                          ? "bg-blue-500 animate-pulse"
                          : "bg-muted-foreground/30"
                    )}
                  />
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Connector */}
      <div
        className={cn(
          "w-6 h-0.5 transition-all duration-500",
          stageStatuses[2] === "complete" ? "bg-green-500" : "bg-muted-foreground/30"
        )}
      />

      {/* Stage 3 */}
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-300",
            stageStatuses[3] === "complete"
              ? "border-green-500 bg-green-50 text-green-600 dark:bg-green-950/30"
              : stageStatuses[3] === "started"
                ? "border-yellow-500 bg-yellow-500/10 text-yellow-600 animate-pulse"
                : "border-muted-foreground/30 bg-muted/50 text-muted-foreground"
          )}
        >
          <Crown className="h-4 w-4" />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium">Synthesis</span>
          {stageStatuses[3] !== "idle" && (
            <div
              title="Chairman"
              className={cn(
                "h-1.5 w-1.5 rounded-full transition-all duration-300",
                stageStatuses[3] === "complete"
                  ? "bg-green-500"
                  : stageStatuses[3] === "started"
                    ? "bg-yellow-500 animate-pulse"
                    : "bg-muted-foreground/30"
              )}
            />
          )}
        </div>
      </div>
    </div>
  )
}
