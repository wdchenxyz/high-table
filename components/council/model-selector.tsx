"use client"

import * as React from "react"
import { Users, Crown, ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useModelSelection } from "@/hooks/use-model-selection"

interface ModelSelectorProps {
  disabled?: boolean
}

export function ModelSelector({ disabled }: ModelSelectorProps) {
  const {
    selectedCouncilIds,
    selectedCouncilModels,
    selectedChairmanId,
    selectedChairman,
    isLoading,
    allModels,
    toggleCouncilModel,
    setSelectedChairmanId,
  } = useModelSelection()

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
      </div>
    )
  }

  const allSelected = selectedCouncilIds.length === allModels.length

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      {/* Council Models Selector */}
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-muted-foreground" />
        <span className="text-muted-foreground">Council:</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1 px-2"
              disabled={disabled}
            >
              {allSelected ? (
                <span>All {allModels.length} models</span>
              ) : (
                <div className="flex items-center gap-1">
                  {selectedCouncilModels.slice(0, 2).map((model) => (
                    <Badge
                      key={model.id}
                      variant="secondary"
                      className="px-1.5 py-0 text-[10px]"
                    >
                      {model.id}
                    </Badge>
                  ))}
                  {selectedCouncilModels.length > 2 && (
                    <span className="text-xs text-muted-foreground">
                      +{selectedCouncilModels.length - 2}
                    </span>
                  )}
                </div>
              )}
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel className="text-xs">
              Select models (min. 2)
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {allModels.map((model) => {
              const isSelected = selectedCouncilIds.includes(model.id)
              const isLastTwo =
                selectedCouncilIds.length === 2 && isSelected

              return (
                <DropdownMenuCheckboxItem
                  key={model.id}
                  checked={isSelected}
                  disabled={isLastTwo}
                  onCheckedChange={() => toggleCouncilModel(model.id)}
                  className={cn(isLastTwo && "opacity-50")}
                >
                  <div className="flex items-center justify-between w-full">
                    <span>{model.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {model.provider}
                    </span>
                  </div>
                </DropdownMenuCheckboxItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Chairman Selector */}
      <div className="flex items-center gap-2">
        <Crown className="h-4 w-4 text-yellow-600" />
        <span className="text-muted-foreground">Chairman:</span>
        <Select
          value={selectedChairmanId}
          onValueChange={setSelectedChairmanId}
          disabled={disabled}
        >
          <SelectTrigger size="sm" className="h-7 w-auto gap-1 px-2">
            <SelectValue>
              <span className="text-xs">{selectedChairman.name}</span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent align="start">
            {allModels.map((model) => (
              <SelectItem key={model.id} value={model.id}>
                <div className="flex items-center justify-between w-full gap-4">
                  <span>{model.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {model.provider}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
