import { useWasichaiLinks } from '@wasichai/core'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@wasichai/ui'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { formatCivilRange, formatNumber, timeZoneLabel } from '../../shared/format'
import { Breadcrumbs, ScreenBody, ScreenHeader, SectionTabs } from '../../shared/Screen'
import { useOfferings } from './api'
import type { TeachingOffering } from './contract'
import { OfferingStatusBadge, type LeaveGuard } from './parts'
import { TEACHING_ROUTES } from './routes'

export type OfferingSectionKey = 'roster' | 'queue' | 'sessions'

// el marco común de las secciones de una edición: su cabecera con la ruta, el selector y las pestañas por URL. sin la edición en la lista
// (aún no llega, o no es de esta persona: lo dice el contenido) la cabecera se queda con lo que sabe.
// lo que se hace dentro de una corrección o de una asistencia no va aquí: de un trabajo a medias no se sale de un toque
// leave: si la sección tiene un trabajo a medias, sus enlaces y el selector avisan antes de salir
export function OfferingSection({
  code,
  section,
  heading,
  leave,
  children
}: {
  code: string
  section: OfferingSectionKey
  heading?: string
  leave?: LeaveGuard
  children: ReactNode
}) {
  const { t, i18n } = useTranslation('teaching')
  const links = useWasichaiLinks()
  const locale = i18n.language
  const offerings = useOfferings().data
  const offering = offerings?.find((candidate) => candidate.code === code)
  const pending = offering?.pendingAttempts ?? 0
  const home = links.to(TEACHING_ROUTES.offerings)
  const tabs = {
    roster: links.to(TEACHING_ROUTES.roster, { code }),
    queue: links.to(TEACHING_ROUTES.queue, { code }),
    sessions: links.to(TEACHING_ROUTES.sessions, { code })
  }
  return (
    <>
      <ScreenHeader
        width="wide"
        breadcrumbs={
          <div onClickCapture={leave?.guardArea([home])}>
            <Breadcrumbs label={t('frame.breadcrumbs')} items={[{ label: t('nav.offerings'), to: home }]} />
          </div>
        }
        title={offering?.course.title ?? t('roster.title')}
        actions={
          offering && offerings && offerings.length > 1 ? (
            <OfferingSwitcher current={offering} offerings={offerings} section={section} leave={leave} />
          ) : undefined
        }
        meta={
          offering ? (
            <>
              <OfferingStatusBadge status={offering.status} />
              <span>{offering.course.code}</span>
              <span className="text-ink">{formatCivilRange(offering.startDate, offering.endDate, offering.timeZone, locale)}</span>
              <span>{t('offering.timeZone', { zone: timeZoneLabel(offering.timeZone, locale) })}</span>
            </>
          ) : undefined
        }
      >
        {/* una edición que no está entre las suyas no tiene secciones a las que ir */}
        {offerings && !offering ? null : (
          <div onClickCapture={leave?.guardArea(Object.values(tabs))}>
            <SectionTabs
              label={t('frame.sections')}
              items={[
                { label: t('frame.roster'), to: tabs.roster, end: true },
                { label: pending > 0 ? t('frame.queuePending', { value: formatNumber(pending, locale) }) : t('frame.queue'), to: tabs.queue },
                { label: t('frame.sessions'), to: tabs.sessions }
              ]}
            />
          </div>
        )}
      </ScreenHeader>
      <ScreenBody width="wide">
        {heading ? <h2 className="sr-only">{heading}</h2> : null}
        {children}
      </ScreenBody>
    </>
  )
}

// cambiar de edición sin volver al panel: lleva a la misma sección de la otra. con una sola edición no hay nada que elegir
function OfferingSwitcher({
  current,
  offerings,
  section,
  leave
}: {
  current: TeachingOffering
  offerings: TeachingOffering[]
  section: OfferingSectionKey
  leave?: LeaveGuard
}) {
  const { t, i18n } = useTranslation('teaching')
  const links = useWasichaiLinks()
  const navigate = useNavigate()
  return (
    <Select
      value={current.code}
      onValueChange={(code) => {
        const to = links.to(TEACHING_ROUTES[section], { code })
        if (leave) leave.request(to)
        else void navigate(to)
      }}
    >
      <SelectTrigger aria-label={t('frame.switch')} className="min-h-11 w-full text-left sm:w-96 [&>span]:truncate">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {offerings.map((offering) => (
          <SelectItem key={offering.code} value={offering.code}>
            {t('frame.option', {
              course: offering.course.title,
              dates: formatCivilRange(offering.startDate, offering.endDate, offering.timeZone, i18n.language)
            })}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
