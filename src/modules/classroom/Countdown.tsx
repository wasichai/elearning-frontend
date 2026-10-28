import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatDateTime, timeZoneLabel } from '../../shared/format'

// el plazo de un intento: lo impone el servidor; aquí solo se cuenta hacia atrás para que la persona lo vea venir

// el instante actual, refrescado cada segundo mientras `active`
export function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [active])
  return now
}

// lo que queda como h:mm:ss o mm:ss; nunca negativo
export function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  const pad = (value: number) => String(value).padStart(2, '0')
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`
}

// el tramo en que va el plazo: el lector de pantalla solo oye el cambio de tramo, no cada segundo
export type DeadlineStage = 'plenty' | 'fiveMinutes' | 'oneMinute' | 'over'

export function deadlineStage(ms: number): DeadlineStage {
  if (ms <= 0) return 'over'
  if (ms <= 60_000) return 'oneMinute'
  if (ms <= 5 * 60_000) return 'fiveMinutes'
  return 'plenty'
}

export function Countdown({ deadline, timeZone, now }: { deadline: string; timeZone: string; now: number }) {
  const { t, i18n } = useTranslation('classroom')
  const remaining = Date.parse(deadline) - now
  const stage = deadlineStage(remaining)
  const tone = stage === 'plenty' ? 'text-ink' : 'text-danger'
  return (
    <div className="flex flex-col gap-0.5 rounded-md border border-border bg-surface px-4 py-2 text-sm">
      <p className="flex items-baseline gap-2">
        <span className="text-ink-muted">{t('attempt.timeLeft')}</span>
        {/* role timer: el valor se lee al llegar a él, sin anunciar cada segundo */}
        <span role="timer" aria-live="off" className={`font-semibold tabular-nums ${tone}`}>
          {formatRemaining(remaining)}
        </span>
      </p>
      <p className="text-xs text-ink-muted">
        {t('attempt.deadline', { when: formatDateTime(deadline, i18n.language, timeZone), zone: timeZoneLabel(timeZone, i18n.language) })}
      </p>
      <p role="status" className="sr-only">
        {stage === 'plenty' ? '' : t(`attempt.stage.${stage}`)}
      </p>
    </div>
  )
}
