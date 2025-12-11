"use client"

import * as React from "react"
import { useMode } from "@/hooks/use-mode"
import { useChatConversations } from "@/hooks/use-chat-conversations"
import { useCouncilConversations } from "@/hooks/use-council-conversations"
import {
  SidebarProvider,
  SidebarInset,
} from "@/components/ui/sidebar"
import { UnifiedSidebar } from "./unified-sidebar"
import { SharedHeader } from "./shared-header"
import { ChatContent } from "./chat-content"
import { CouncilContent } from "./council-content"

export function UnifiedPage() {
  const { mode, setMode, isLoading: modeLoading } = useMode()
  const [sidebarOpen, setSidebarOpen] = React.useState(true)

  const chatHook = useChatConversations()
  const councilHook = useCouncilConversations()

  // Show loading state while hydrating
  if (modeLoading || !chatHook.isLoaded || !councilHook.isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  const title = mode === "chat"
    ? chatHook.activeConversation?.title || "Chat"
    : councilHook.activeConversation?.title || "High Table"

  const isProcessing = councilHook.activeConversationState.isProcessing

  const handleModeChange = (newMode: typeof mode) => {
    // Don't allow mode change while processing
    if (isProcessing) return
    setMode(newMode)
  }

  const handleChatSubmit = (message: { text: string; files: import("ai").FileUIPart[] }) => {
    if (message.text.trim() && !chatHook.isLoading) {
      chatHook.sendMessage({
        text: message.text,
        files: message.files,
      })
    }
  }

  return (
    <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
      <UnifiedSidebar
        mode={mode}
        chatConversations={chatHook.conversations}
        councilConversations={councilHook.conversations}
        chatActiveId={chatHook.activeConversationId}
        councilActiveId={councilHook.activeConversationId}
        onChatSwitch={chatHook.switchConversation}
        onCouncilSwitch={councilHook.switchConversation}
        onChatCreate={chatHook.createConversation}
        onCouncilCreate={councilHook.createConversation}
        onChatDelete={chatHook.deleteConversation}
        onCouncilDelete={councilHook.deleteConversation}
        onModeChange={handleModeChange}
      />
      <SidebarInset className="flex flex-col">
        <SharedHeader
          title={title}
          mode={mode}
          onModeChange={handleModeChange}
          sidebarOpen={sidebarOpen}
          onSidebarToggle={() => setSidebarOpen(!sidebarOpen)}
          isProcessing={isProcessing}
        />
        {mode === "chat" ? (
          <ChatContent
            messages={chatHook.messages}
            isLoading={chatHook.isLoading}
            onSubmit={handleChatSubmit}
          />
        ) : (
          <CouncilContent
            state={councilHook.activeConversationState}
            expandedStages={councilHook.expandedStages}
            onSubmit={councilHook.handleSubmit}
            onCancel={councilHook.handleCancel}
            onToggleStage={councilHook.toggleStage}
          />
        )}
      </SidebarInset>
    </SidebarProvider>
  )
}
