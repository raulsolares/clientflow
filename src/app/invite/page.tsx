'use client'

import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import InviteAcceptContent from './content'

export default function InviteAcceptPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-lime" />
          <p className="text-sm text-muted-foreground">Cargando invitación...</p>
        </div>
      </div>
    }>
      <InviteAcceptContent />
    </Suspense>
  )
}
