import { describe, expect, it } from 'vitest'
import { playedFraction, watchedEnough } from './video'

// tramos reproducidos como los da HTMLMediaElement.played
function ranges(...spans: Array<[number, number]>): TimeRanges {
  return { length: spans.length, start: (i: number) => spans[i]![0], end: (i: number) => spans[i]![1] }
}

describe('playedFraction', () => {
  it('suma los tramos reproducidos sobre la duración', () => {
    expect(playedFraction({ duration: 100, played: ranges([0, 30], [50, 70]) })).toBe(0.5)
    expect(playedFraction({ duration: 100, played: ranges([0, 100]) })).toBe(1)
  })

  it('sin duración conocida o sin nada reproducido es 0', () => {
    expect(playedFraction({ duration: Number.NaN, played: ranges([0, 30]) })).toBe(0)
    expect(playedFraction({ duration: Number.POSITIVE_INFINITY, played: ranges([0, 30]) })).toBe(0)
    expect(playedFraction({ duration: 0, played: ranges() })).toBe(0)
    expect(playedFraction({ duration: 100, played: ranges() })).toBe(0)
  })
})

describe('watchedEnough', () => {
  it('con un umbral menor que 1, basta haber reproducido esa fracción', () => {
    expect(watchedEnough({ duration: 100, played: ranges([0, 89]) }, 0.9)).toBe(false)
    expect(watchedEnough({ duration: 100, played: ranges([0, 90]) }, 0.9)).toBe(true)
  })

  it('saltar al final no es reproducir: cuenta lo reproducido, no la posición', () => {
    expect(watchedEnough({ duration: 100, played: ranges([0, 5], [95, 100]) }, 0.9)).toBe(false)
  })

  it('con el umbral en el final, timeupdate nunca completa: lo hace el evento ended', () => {
    expect(watchedEnough({ duration: 100, played: ranges([0, 100]) }, 1)).toBe(false)
  })
})
