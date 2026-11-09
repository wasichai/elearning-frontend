import { useWasichaiConfig } from '@wasichai/core'
import { useState } from 'react'
import { zonedDateTime } from '../../shared/format'
import type { AgendaRange, AgendaSession } from './agenda'
import { paddedDayRange, WEEK_DAYS } from './dashboard'
import { readStored, writeStored } from './readingPreferences'

// lo que decide el horario del estudiante (Schedule.dc.html), sin pintar nada. una semana es de lunes a domingo y se nombra por su lunes,
// una fecha civil YYYY-MM-DD. cada sesión cae en el día de su edición (su timeZone), no en el del navegador

const CIVIL_DATE = /^(\d{4})-(\d{2})-(\d{2})$/
const pad = (value: number) => String(value).padStart(2, '0')
const civil = (date: Date) => `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`

// el mediodía UTC de una fecha civil: con timeZone 'UTC' se formatea siempre ese mismo día
export function civilNoon(date: string): Date {
  const [, year, month, day] = CIVIL_DATE.exec(date)!.map(Number)
  return new Date(Date.UTC(year!, month! - 1, day!, 12))
}

export function addDays(date: string, days: number): string {
  const noon = civilNoon(date)
  noon.setUTCDate(noon.getUTCDate() + days)
  return civil(noon)
}

function mondayOf(date: string): string {
  // getUTCDay: 0 es domingo
  return addDays(date, -((civilNoon(date).getUTCDay() + 6) % 7))
}

// hoy, en el reloj del navegador: la semana por defecto y el día que se marca
export function localToday(now: number): string {
  const date = new Date(now)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

// los años que admite ?semana=: fuera de ellos, la semana o sus vecinas dejarían de escribirse como YYYY-MM-DD
const FIRST_YEAR = 1900
const LAST_YEAR = 9998

// el lunes de la semana que pide la URL (?semana=2026-11-18 → 2026-11-16), o undefined si no es una fecha que exista en esos años
export function requestedWeek(param: string | null): string | undefined {
  const match = param ? CIVIL_DATE.exec(param) : null
  if (!match || Number(match[1]) < FIRST_YEAR || Number(match[1]) > LAST_YEAR || civil(civilNoon(param!)) !== param) return undefined
  return mondayOf(param!)
}

// la semana visible: la de la URL o, sin ella o si no vale, la de hoy
export function parseWeek(param: string | null, now: number): string {
  return requestedWeek(param) ?? mondayOf(localToday(now))
}

function weekDates(monday: string): string[] {
  return Array.from({ length: WEEK_DAYS }, (_, offset) => addDays(monday, offset))
}

// lo que se pide a la agenda: la semana, con el día de margen de paddedDayRange, desde la medianoche local de su lunes
export function scheduleRange(monday: string): AgendaRange {
  const [, year, month, day] = CIVIL_DATE.exec(monday)!.map(Number)
  return paddedDayRange(new Date(year!, month! - 1, day!), WEEK_DAYS)
}

export interface ScheduleDay {
  date: string
  // las sesiones que empiezan este día
  sessions: AgendaSession[]
  // las que empezaron un día anterior y terminan este (cruzan la medianoche): se pintan como continuación, pero no cuentan otra vez
  continued: AgendaSession[]
}

const DAY_MINUTES = 24 * 60

// cuándo empieza y termina una sesión en la zona de su edición: fecha civil y minuto del día. una que acaba justo a medianoche acaba el día
// anterior, a las 24:00, y no continúa en el siguiente
function span(session: AgendaSession) {
  const at = (instant: string) => {
    const { date, time } = zonedDateTime(instant, session.timeZone)
    const [hours = 0, minutes = 0] = time.split(':').map(Number)
    return { date, minutes: hours * 60 + minutes }
  }
  const start = at(session.start)
  const end = at(session.end)
  if (end.date > start.date && end.minutes === 0)
    return { startDate: start.date, startMinutes: start.minutes, endDate: addDays(end.date, -1), endMinutes: DAY_MINUTES }
  return { startDate: start.date, startMinutes: start.minutes, endDate: end.date, endMinutes: end.minutes }
}

// los siete días de la semana con sus sesiones, cada una en el día de su edición y en el orden de la agenda (por inicio); lo que la agenda
// trae de más por el margen queda fuera. una sesión que cruza la medianoche continúa en cada día siguiente hasta que acaba
export function scheduleDays(agenda: AgendaSession[], monday: string): ScheduleDay[] {
  const spans = agenda.map((session) => ({ session, ...span(session) }))
  return weekDates(monday).map((date) => ({
    date,
    sessions: spans.filter((item) => item.startDate === date).map((item) => item.session),
    continued: spans.filter((item) => item.startDate < date && date <= item.endDate).map((item) => item.session)
  }))
}

// el minuto del día en que empieza y en que termina una sesión en ese día: en el de su inicio, el suyo; en un día de continuación, desde
// la medianoche. si sigue después de ese día, se corta a medianoche
function minutesOn(session: AgendaSession, date: string): { start: number; end: number } {
  const { startDate, startMinutes, endDate, endMinutes } = span(session)
  const start = date === startDate ? startMinutes : 0
  return { start, end: date === endDate ? Math.max(endMinutes, start + 1) : DAY_MINUTES }
}

const dayRanges = (day: ScheduleDay) => [...day.sessions, ...day.continued].map((session) => minutesOn(session, day.date))

// las horas que pinta la rejilla: de la hora en que empieza la primera sesión de la semana a la hora en que acaba la última
export function timeline(days: ScheduleDay[]): { first: number; last: number } {
  const all = days.flatMap(dayRanges)
  if (all.length === 0) return { first: 0, last: 0 }
  const first = Math.floor(Math.min(...all.map((range) => range.start)) / 60)
  const last = Math.ceil(Math.max(...all.map((range) => range.end)) / 60)
  return { first, last: Math.max(last, first + 1) }
}

export interface Placement {
  session: AgendaSession
  // minutos desde la medianoche, en la zona de la edición
  start: number
  end: number
  // el bloque es la continuación, en este día, de una sesión que empezó el anterior
  continuation: boolean
  // las que se pisan van lado a lado: el carril de esta y cuántos tiene su grupo de solape (una sola, todo el ancho)
  lane: number
  lanes: number
}

// por grupos de solape: un grupo se cierra cuando la siguiente empieza después de que acaben todas las suyas. dentro, cada una toma el
// primer carril libre, y el grupo reparte el ancho entre los carriles que usó
export function placements(day: ScheduleDay): Placement[] {
  const result: Placement[] = []
  let group: Omit<Placement, 'lanes'>[] = []
  let ends: number[] = []
  const close = () => {
    result.push(...group.map((item) => ({ ...item, lanes: ends.length })))
    group = []
    ends = []
  }
  const items = [
    ...day.continued.map((session) => ({ session, continuation: true, ...minutesOn(session, day.date) })),
    ...day.sessions.map((session) => ({ session, continuation: false, ...minutesOn(session, day.date) }))
  ]
  for (const item of items.sort((a, b) => a.start - b.start)) {
    if (group.length > 0 && item.start >= Math.max(...ends)) close()
    const free = ends.findIndex((end) => end <= item.start)
    const lane = free >= 0 ? free : ends.length
    ends[lane] = item.end
    group.push({ ...item, lane })
  }
  close()
  return result
}

export type ScheduleView = 'week' | 'list'

function parseScheduleView(stored: string | null): ScheduleView {
  try {
    const value: unknown = stored === null ? null : JSON.parse(stored)
    return typeof value === 'object' && value !== null && (value as { view?: unknown }).view === 'list' ? 'list' : 'week'
  } catch {
    return 'week'
  }
}

// la vista elegida (semana o lista), guardada en este navegador como las preferencias de lectura (<prefix>.schedule)
export function useScheduleView(): [ScheduleView, (view: ScheduleView) => void] {
  const { storagePrefix } = useWasichaiConfig()
  const key = `${storagePrefix}.schedule`
  const [view, setView] = useState(() => readStored(key, parseScheduleView))
  return [
    view,
    (next) => {
      setView(next)
      writeStored(key, { view: next })
    }
  ]
}
