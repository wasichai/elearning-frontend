import { useWasichaiConfig } from '@wasichai/core'
import { useState } from 'react'

// el tamaño del texto de la lectura que elige el estudiante: de 18 a 24px, de 2 en 2. la escala parte del token
// --text-reading (20/33 en src/index.css), el tamaño por defecto; el interlineado guarda su proporción (ReadingDocument)
export const READING_SIZES = [18, 20, 22, 24] as const
export const DEFAULT_READING_SIZE = 20
export type ReadingSize = (typeof READING_SIZES)[number]

// lo que el estudiante elige en la barra de la lección: el modo lectura y el tamaño del texto de la lectura. se guarda en
// este navegador con el storagePrefix (<prefix>.reading), como el tema y el idioma de Wasichai; es una comodidad: si el
// navegador no deja guardar, la elección vale mientras dure la página
export interface ReadingPreferences {
  mode: boolean
  size?: ReadingSize
  // en escritorio, el índice plegado para que la lectura ocupe la columna
  syllabusHidden?: boolean
  // el modo foco: solo el texto, sin el índice ni las notas al margen
  focus?: boolean
}

export interface ReadingControls extends ReadingPreferences {
  shownSize: ReadingSize
  canShrink: boolean
  canGrow: boolean
  toggleMode: () => void
  toggleSyllabus: () => void
  toggleFocus: () => void
  shrink: () => void
  grow: () => void
}

// lo guardado, si se entiende; si no, los valores de siempre
export function parseReadingPreferences(stored: string | null): ReadingPreferences {
  try {
    const value: unknown = stored === null ? null : JSON.parse(stored)
    if (typeof value !== 'object' || value === null) return { mode: false }
    const { mode, size, syllabusHidden, focus } = value as Record<string, unknown>
    const step = READING_SIZES.find((candidate) => candidate === size)
    return {
      mode: mode === true,
      ...(step === undefined ? {} : { size: step }),
      ...(syllabusHidden === true ? { syllabusHidden: true } : {}),
      ...(focus === true ? { focus: true } : {})
    }
  } catch {
    return { mode: false }
  }
}

// lo guardado en este navegador con esa clave, leído por parse (que entiende también null); sin almacenamiento, lo que parse dé por defecto.
// lo usan la lectura y el horario (la vista elegida)
export function readStored<T>(key: string, parse: (stored: string | null) => T): T {
  try {
    return parse(localStorage.getItem(key))
  } catch {
    return parse(null)
  }
}

export function writeStored(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // sin almacenamiento (modo privado, cuota): la elección vale solo en esta página
  }
}

export function useReadingPreferences(): ReadingControls {
  const { storagePrefix } = useWasichaiConfig()
  const key = `${storagePrefix}.reading`
  const [preferences, setPreferences] = useState(() => readStored(key, parseReadingPreferences))
  const update = (next: ReadingPreferences) => {
    setPreferences(next)
    writeStored(key, next)
  }
  const shownSize: ReadingSize = preferences.size ?? DEFAULT_READING_SIZE
  const index = READING_SIZES.findIndex((step) => step === shownSize)
  const resize = (offset: number) => {
    const size = READING_SIZES[index + offset]
    if (size !== undefined) update({ ...preferences, size })
  }
  return {
    ...preferences,
    shownSize,
    canShrink: index > 0,
    canGrow: index < READING_SIZES.length - 1,
    toggleMode: () => update({ ...preferences, mode: !preferences.mode }),
    // con el modo foco puesto, «Índice» lo quita y vuelve a mostrar el índice: lo que se pide es verlo
    toggleSyllabus: () =>
      update(preferences.focus ? { ...preferences, focus: false, syllabusHidden: false } : { ...preferences, syllabusHidden: !preferences.syllabusHidden }),
    toggleFocus: () => update({ ...preferences, focus: !preferences.focus }),
    shrink: () => resize(-1),
    grow: () => resize(1)
  }
}
