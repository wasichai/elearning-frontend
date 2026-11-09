import { Clock } from 'lucide-react'
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

const STAGE_TONE: Record<DeadlineStage, string> = {
  plenty: 'bg-surface-muted text-ink',
  fiveMinutes: 'bg-warning-soft text-warning',
  oneMinute: 'bg-danger-soft text-danger',
  over: 'bg-danger-soft text-danger'
}

// el tiempo que queda, sin parpadeos: el tramo se dice con su tono y su palabra. el plazo lo pone el servidor; aquí solo se cuenta hasta él.
// el lector de pantalla oye el paso a 5 minutos y a 1 minuto, una vez: el texto no cambia dentro del tramo. al acabarse lo dice el aviso del intento
export function Countdown({ deadline, now }: { deadline: string; now: number }) {
  const { t } = useTranslation('classroom')
  const remaining = Date.parse(deadline) - now
  const stage = deadlineStage(remaining)
  return (
    <div data-stage={stage} className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-secondary ${STAGE_TONE[stage]}`}>
      <Clock aria-hidden="true" className="size-4 shrink-0" />
      {/* en poco ancho, la palabra debajo de la cifra: cabe junto a «Guardar» y «Entregar» a 360 px */}
      <span className="flex flex-col leading-4 @2xl:flex-row @2xl:items-center @2xl:gap-1.5">
        <span role="timer" aria-live="off" aria-label={t('attempt.timeLeft')} className="font-semibold tabular-nums">
          {formatRemaining(remaining)}
        </span>
        {stage === 'plenty' ? null : <span className="text-secondary font-medium">{t(`attempt.stageWord.${stage}`)}</span>}
      </span>
      <span role="status" aria-live="polite" className="sr-only">
        {stage === 'fiveMinutes' || stage === 'oneMinute' ? t(`attempt.stage.${stage}`) : ''}
      </span>
    </div>
  )
}

// el plazo con su fecha y la zona de la edición
export function DeadlineNote({ deadline, timeZone }: { deadline: string; timeZone: string }) {
  const { t, i18n } = useTranslation('classroom')
  return <p>{t('attempt.deadline', { when: formatDateTime(deadline, i18n.language, timeZone), zone: timeZoneLabel(timeZone, i18n.language) })}</p>
}
