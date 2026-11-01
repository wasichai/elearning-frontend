import { useWasichaiConfig } from '@wasichai/core'
import { useState } from 'react'
import { DEFAULT_READING_SIZE, READING_SIZES } from './reading'

// lo que el estudiante elige en la barra de la lección: el modo lectura y el tamaño del texto de la lectura. se guarda en
// este navegador con el storagePrefix (<prefix>.reading), como el tema y el idioma de Wasichai; es una comodidad: si el
// navegador no deja guardar, la elección vale mientras dure la página
export interface ReadingPreferences {
  mode: boolean
  size?: number
}

export interface ReadingControls extends ReadingPreferences {
  shownSize: number
  canShrink: boolean
  canGrow: boolean
  toggleMode: () => void
  shrink: () => void
  grow: () => void
}

// lo guardado, si se entiende; si no, los valores de siempre
export function parseReadingPreferences(stored: string | null): ReadingPreferences {
  try {
    const value: unknown = stored === null ? null : JSON.parse(stored)
    if (typeof value !== 'object' || value === null) return { mode: false }
    const { mode, size } = value as Record<string, unknown>
    const step = READING_SIZES.find((candidate) => candidate === size)
    return { mode: mode === true, ...(step === undefined ? {} : { size: step }) }
  } catch {
    return { mode: false }
  }
}

function load(key: string): ReadingPreferences {
  try {
    return parseReadingPreferences(localStorage.getItem(key))
  } catch {
    return { mode: false }
  }
}

function save(key: string, preferences: ReadingPreferences) {
  try {
    localStorage.setItem(key, JSON.stringify(preferences))
  } catch {
    // sin almacenamiento (modo privado, cuota): la elección vale solo en esta página
  }
}

export function useReadingPreferences(): ReadingControls {
  const { storagePrefix } = useWasichaiConfig()
  const key = `${storagePrefix}.reading`
  const [preferences, setPreferences] = useState(() => load(key))
  const update = (next: ReadingPreferences) => {
    setPreferences(next)
    save(key, next)
  }
  const shownSize = preferences.size ?? DEFAULT_READING_SIZE
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
    shrink: () => resize(-1),
    grow: () => resize(1)
  }
}
