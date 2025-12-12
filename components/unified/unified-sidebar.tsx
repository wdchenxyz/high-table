"use client"

import * as React from "react"
import {
  MessageSquare,
  Users,
  Plus,
  Trash2,
  ChevronDown,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import type { StoredConversation, AppMode } from "@/lib/types"

interface UnifiedSidebarProps {
  mode: AppMode
  chatConversations: StoredConversation[]
  councilConversations: StoredConversation[]
  chatActiveId: string
  councilActiveId: string
  onChatSwitch: (id: string) => void
  onCouncilSwitch: (id: string) => void
  onChatCreate: () => void
  onCouncilCreate: () => void
  onChatDelete: (id: string) => void
  onCouncilDelete: (id: string) => void
  onModeChange: (mode: AppMode) => void
}

export function UnifiedSidebar({
  mode,
  chatConversations,
  councilConversations,
  chatActiveId,
  councilActiveId,
  onChatSwitch,
  onCouncilSwitch,
  onChatCreate,
  onCouncilCreate,
  onChatDelete,
  onCouncilDelete,
  onModeChange,
}: UnifiedSidebarProps) {
  const [chatExpanded, setChatExpanded] = React.useState(mode === "chat")
  const [councilExpanded, setCouncilExpanded] = React.useState(mode === "council")

  // Auto-expand active section when mode changes
  React.useEffect(() => {
    if (mode === "chat") {
      setChatExpanded(true)
    } else {
      setCouncilExpanded(true)
    }
  }, [mode])

  const handleChatClick = (id: string) => {
    if (mode !== "chat") {
      onModeChange("chat")
    }
    onChatSwitch(id)
  }

  const handleCouncilClick = (id: string) => {
    if (mode !== "council") {
      onModeChange("council")
    }
    onCouncilSwitch(id)
  }

  return (
    <Sidebar className="border-r">
      <SidebarHeader className="border-b px-4 py-3">
        <Button
          onClick={mode === "chat" ? onChatCreate : onCouncilCreate}
          className="w-full justify-start gap-2"
          variant="outline"
        >
          <Plus className="h-4 w-4" />
          {mode === "chat" ? "New chat" : "New deliberation"}
        </Button>
      </SidebarHeader>
      <SidebarContent>
        {/* Chat Section */}
        <Collapsible open={chatExpanded} onOpenChange={setChatExpanded}>
          <SidebarGroup>
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="cursor-pointer hover:bg-accent/50 rounded-md transition-colors flex items-center justify-between pr-2">
                <span className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Chats
                </span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform",
                    chatExpanded && "rotate-180"
                  )}
                />
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {chatConversations.map((conversation) => (
                    <SidebarMenuItem key={conversation.id}>
                      <SidebarMenuButton
                        isActive={mode === "chat" && conversation.id === chatActiveId}
                        onClick={() => handleChatClick(conversation.id)}
                      >
                        <MessageSquare className="h-4 w-4 shrink-0" />
                        <span className="truncate">{conversation.title}</span>
                      </SidebarMenuButton>
                      <SidebarMenuAction
                        onClick={() => onChatDelete(conversation.id)}
                        showOnHover
                      >
                        <Trash2 className="h-4 w-4" />
                      </SidebarMenuAction>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        {/* Council Section */}
        <Collapsible open={councilExpanded} onOpenChange={setCouncilExpanded}>
          <SidebarGroup>
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="cursor-pointer hover:bg-accent/50 rounded-md transition-colors flex items-center justify-between pr-2">
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Councils
                </span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform",
                    councilExpanded && "rotate-180"
                  )}
                />
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {councilConversations.map((conversation) => (
                    <SidebarMenuItem key={conversation.id}>
                      <SidebarMenuButton
                        isActive={mode === "council" && conversation.id === councilActiveId}
                        onClick={() => handleCouncilClick(conversation.id)}
                      >
                        <Users className="h-4 w-4 shrink-0" />
                        <span className="truncate">{conversation.title}</span>
                      </SidebarMenuButton>
                      <SidebarMenuAction
                        onClick={() => onCouncilDelete(conversation.id)}
                        showOnHover
                      >
                        <Trash2 className="h-4 w-4" />
                      </SidebarMenuAction>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>
      </SidebarContent>
      <SidebarFooter className="border-t p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Avatar className="h-8 w-8">
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
          <span>User</span>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
