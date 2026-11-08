import type { ReactNode } from 'react'
import { Skeleton } from './Screen'

// la forma de lo que llega, con el aviso para lectores de pantalla: un documento (versión, términos, recurso, certificado, intento),
// un formulario (nuevo curso, importación) o un medio (vídeo, imagen). no una línea de texto en una pantalla vacía
function Shell({ label, slot, className, children }: { label: string; slot: string; className: string; children: ReactNode }) {
  return (
    <div role="status" data-slot={slot} className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  )
}

export function DocumentSkeleton({ label, lines = 6 }: { label: string; lines?: number }) {
  return (
    <Shell label={label} slot="document-skeleton" className="flex w-full flex-col gap-4">
      <Skeleton className="h-7 w-3/5 max-w-lg" />
      <Skeleton className="h-4 w-1/4" />
      <div className="flex flex-col gap-3 pt-2">
        {Array.from({ length: lines }, (_, line) => (
          <Skeleton key={line} className={`h-4 ${line % 3 === 2 ? 'w-2/3' : 'w-full'}`} />
        ))}
      </div>
    </Shell>
  )
}

export function FormSkeleton({ label, fields = 4 }: { label: string; fields?: number }) {
  return (
    <Shell label={label} slot="form-skeleton" className="flex w-full max-w-2xl flex-col gap-5">
      {Array.from({ length: fields }, (_, field) => (
        <div key={field} className="flex flex-col gap-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-11 w-full" />
        </div>
      ))}
      <Skeleton className="h-11 w-36" />
    </Shell>
  )
}

export function MediaSkeleton({ label }: { label: string }) {
  return (
    <Shell label={label} slot="media-skeleton" className="w-full">
      <Skeleton className="aspect-video w-full rounded-card" />
    </Shell>
  )
}
