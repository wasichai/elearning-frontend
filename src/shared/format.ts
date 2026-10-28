// formato de fechas, horas y cantidades, en el idioma de la interfaz (catálogo y aula)

// diferencia (ms) entre la hora de pared de la zona y UTC en ese instante
function zoneOffset(instant: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric'
  }).formatToParts(instant)
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value)
  return Date.UTC(part('year'), part('month') - 1, part('day'), part('hour'), part('minute'), part('second')) - instant
}

// una fecha civil YYYY-MM-DD de la edición, como el mediodía de ese día en su zona: formateada con esa misma zona
// sale el mismo día esté donde esté el navegador (new Date('2026-11-09') es medianoche UTC: en Lima sería el día 8)
export function civilDateInstant(date: string, timeZone: string): Date {
  const [year = 0, month = 1, day = 1] = date.split('-').map(Number)
  const noonUtc = Date.UTC(year, month - 1, day, 12)
  return new Date(noonUtc - zoneOffset(noonUtc, timeZone))
}

export function formatCivilDate(date: string, timeZone: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone }).format(civilDateInstant(date, timeZone))
}

export function formatCivilRange(start: string, end: string, timeZone: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone }).formatRange(civilDateInstant(start, timeZone), civilDateInstant(end, timeZone))
}

export function formatNumber(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value)
}

// el nombre de la zona en el idioma de la interfaz («hora estándar de Perú»), para decir en qué hora van las fechas
export function timeZoneLabel(timeZone: string, locale: string): string {
  const parts = new Intl.DateTimeFormat(locale, { timeZone, timeZoneName: 'long' }).formatToParts(new Date())
  return parts.find((part) => part.type === 'timeZoneName')?.value ?? timeZone
}

export function formatInstant(instant: string, locale: string, timeZone?: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone }).format(new Date(instant))
}

export function languageName(code: string, locale: string): string {
  try {
    return new Intl.DisplayNames([locale], { type: 'language' }).of(code) ?? code
  } catch {
    return code
  }
}

// fecha y hora de un instante en una zona (la de la edición), en el idioma de la interfaz
export function formatDateTime(instant: string | number | Date, locale: string, timeZone: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone }).format(new Date(instant))
}

// solo la hora de un instante en una zona
export function formatTime(instant: string | number | Date, locale: string, timeZone: string): string {
  return new Intl.DateTimeFormat(locale, { timeStyle: 'short', timeZone }).format(new Date(instant))
}
