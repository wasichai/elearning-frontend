import { Skeleton } from './Screen'

// la forma de una lista de tarjetas mientras llega (las versiones del estudio, la bandeja de revisión), con el aviso para lectores de
// pantalla. no una línea de texto en una pantalla vacía
export function ListSkeleton({ label, rows = 3 }: { label: string; rows?: number }) {
  return (
    <div role="status" data-slot="list-skeleton" className="flex flex-col gap-4">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, row) => (
        <div key={row} className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5">
          <Skeleton className="h-5 w-2/5" />
          <Skeleton className="h-4 w-1/4" />
          <div className="flex gap-3 pt-1">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-32" />
          </div>
        </div>
      ))}
    </div>
  )
}
