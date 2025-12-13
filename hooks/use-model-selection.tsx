"use client"

import {
  createContext,
  useCallback,
  useContext,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react"
import { MODELS, DEFAULT_CHAIRMAN_ID, DEFAULT_CHAIRMAN, type CouncilModel } from "@/lib/council-config"

const COUNCIL_STORAGE_KEY = "high-table-council-models"
const CHAIRMAN_STORAGE_KEY = "high-table-chairman-model"

// Hydration detection using useSyncExternalStore
const emptySubscribe = () => () => {}
const getClientSnapshot = () => false
const getServerSnapshot = () => true

function getStoredCouncilIds(): string[] {
  if (typeof window === "undefined") return MODELS.map((m) => m.id)
  try {
    const stored = localStorage.getItem(COUNCIL_STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as string[]
      // Validate that stored IDs are still valid
      const validIds = parsed.filter((id) =>
        MODELS.some((m) => m.id === id)
      )
      // Ensure minimum 2 models
      if (validIds.length >= 2) {
        return validIds
      }
    }
  } catch {
    // Invalid JSON, return default
  }
  return MODELS.map((m) => m.id)
}

function getStoredChairmanId(): string {
  if (typeof window === "undefined") return DEFAULT_CHAIRMAN_ID
  try {
    const stored = localStorage.getItem(CHAIRMAN_STORAGE_KEY)
    if (stored && MODELS.some((m) => m.id === stored)) {
      return stored
    }
  } catch {
    // Invalid value, return default
  }
  return DEFAULT_CHAIRMAN_ID
}

interface ModelSelectionContextValue {
  selectedCouncilIds: string[]
  selectedCouncilModels: CouncilModel[]
  selectedChairmanId: string
  selectedChairman: CouncilModel
  isLoading: boolean
  isValid: boolean
  allModels: CouncilModel[]
  setSelectedCouncilIds: (ids: string[]) => boolean
  setSelectedChairmanId: (id: string) => boolean
  toggleCouncilModel: (modelId: string) => boolean
}

const ModelSelectionContext = createContext<ModelSelectionContextValue | null>(null)

export function ModelSelectionProvider({ children }: { children: ReactNode }) {
  // isLoading is true on server and during hydration, false on client after mount
  const isLoading = useSyncExternalStore(
    emptySubscribe,
    getClientSnapshot,
    getServerSnapshot
  )

  const [selectedCouncilIds, setSelectedCouncilIdsState] = useState<string[]>(
    getStoredCouncilIds
  )
  const [selectedChairmanId, setSelectedChairmanIdState] = useState<string>(
    getStoredChairmanId
  )

  // Persist council selection
  const setSelectedCouncilIds = useCallback((ids: string[]) => {
    // Validate minimum 2 models
    if (ids.length < 2) return false
    // Validate all IDs exist
    const validIds = ids.filter((id) => MODELS.some((m) => m.id === id))
    if (validIds.length < 2) return false

    setSelectedCouncilIdsState(validIds)
    if (typeof window !== "undefined") {
      localStorage.setItem(COUNCIL_STORAGE_KEY, JSON.stringify(validIds))
    }
    return true
  }, [])

  // Persist chairman selection
  const setSelectedChairmanId = useCallback((id: string) => {
    // Validate ID exists in models
    if (!MODELS.some((m) => m.id === id)) return false

    setSelectedChairmanIdState(id)
    if (typeof window !== "undefined") {
      localStorage.setItem(CHAIRMAN_STORAGE_KEY, id)
    }
    return true
  }, [])

  // Toggle a single council model (for checkbox interactions)
  const toggleCouncilModel = useCallback(
    (modelId: string) => {
      const isSelected = selectedCouncilIds.includes(modelId)
      if (isSelected) {
        // Don't allow deselecting if it would leave less than 2
        if (selectedCouncilIds.length <= 2) return false
        const newIds = selectedCouncilIds.filter((id) => id !== modelId)
        return setSelectedCouncilIds(newIds)
      } else {
        const newIds = [...selectedCouncilIds, modelId]
        return setSelectedCouncilIds(newIds)
      }
    },
    [selectedCouncilIds, setSelectedCouncilIds]
  )

  // Get selected model objects
  const selectedCouncilModels = MODELS.filter((m) =>
    selectedCouncilIds.includes(m.id)
  )

  const selectedChairman =
    MODELS.find((m) => m.id === selectedChairmanId) || DEFAULT_CHAIRMAN

  // Check if selection is valid (at least 2 council models)
  const isValid = selectedCouncilIds.length >= 2

  const contextValue: ModelSelectionContextValue = {
    selectedCouncilIds,
    selectedCouncilModels,
    selectedChairmanId,
    selectedChairman,
    isLoading,
    isValid,
    allModels: MODELS,
    setSelectedCouncilIds,
    setSelectedChairmanId,
    toggleCouncilModel,
  }

  return (
    <ModelSelectionContext.Provider value={contextValue}>
      {children}
    </ModelSelectionContext.Provider>
  )
}

export function useModelSelection(): ModelSelectionContextValue {
  const context = useContext(ModelSelectionContext)
  if (!context) {
    throw new Error("useModelSelection must be used within a ModelSelectionProvider")
  }
  return context
}
