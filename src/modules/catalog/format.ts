// formato de fechas, horas y cantidades del catálogo, en el idioma de la interfaz

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
