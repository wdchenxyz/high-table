"use client"

import { Suspense } from "react"
import { UnifiedPage } from "@/components/unified/unified-page"

function LoadingFallback() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-muted-foreground">Loading...</div>
    </div>
  )
}

export default function Home() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <UnifiedPage />
    </Suspense>
  )
}
