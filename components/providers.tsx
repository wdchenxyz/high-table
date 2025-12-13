"use client"

import { ThemeProvider } from "@/components/theme-provider"
import { ModelSelectionProvider } from "@/hooks/use-model-selection"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <ModelSelectionProvider>
        {children}
      </ModelSelectionProvider>
    </ThemeProvider>
  )
}
