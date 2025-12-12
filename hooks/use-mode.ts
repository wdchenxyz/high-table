"use client"

import { useCallback, useEffect, useState, useSyncExternalStore } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import type { AppMode } from "@/lib/types"

const MODE_STORAGE_KEY = "high-table-mode"

// Hydration detection using useSyncExternalStore
const emptySubscribe = () => () => {}
const getClientSnapshot = () => false
const getServerSnapshot = () => true

export function useMode() {
  const searchParams = useSearchParams()
  const router = useRouter()

  // isLoading is true on server and during hydration, false on client after mount
  const isLoading = useSyncExternalStore(
    emptySubscribe,
    getClientSnapshot,
    getServerSnapshot
  )

  // Get mode from URL first, then localStorage, default to "chat"
  const urlMode = searchParams.get("mode") as AppMode | null
  const [localMode, setLocalMode] = useState<AppMode>(() => {
    if (typeof window === "undefined") return "chat"
    return (localStorage.getItem(MODE_STORAGE_KEY) as AppMode) || "chat"
  })

  // URL takes precedence over localStorage
  const mode: AppMode = urlMode && (urlMode === "chat" || urlMode === "council")
    ? urlMode
    : localMode

  const setMode = useCallback(
    (newMode: AppMode) => {
      // Save to localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem(MODE_STORAGE_KEY, newMode)
      }
      setLocalMode(newMode)
      // Update URL
      router.push(`/?mode=${newMode}`)
    },
    [router]
  )

  // Sync localStorage when URL mode changes (sync to external system, not setting React state)
  useEffect(() => {
    if (urlMode && (urlMode === "chat" || urlMode === "council")) {
      localStorage.setItem(MODE_STORAGE_KEY, urlMode)
    }
  }, [urlMode])

  return { mode, setMode, isLoading }
}
