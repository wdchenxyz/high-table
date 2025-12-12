"use client"

import { PaperclipIcon } from "lucide-react"
import {
  PromptInputButton,
  usePromptInputAttachments,
} from "@/components/ai-elements/prompt-input"

export function AttachmentButton() {
  const attachments = usePromptInputAttachments()
  return (
    <PromptInputButton
      type="button"
      onClick={() => attachments.openFileDialog()}
    >
      <PaperclipIcon className="h-4 w-4" />
    </PromptInputButton>
  )
}
