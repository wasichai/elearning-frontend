import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useNow } from './useNow'

let renders = 0
function Clock() {
  const now = useNow()
  renders += 1
  return <time>{now}</time>
}
const shown = () => Number(screen.getByRole('time').textContent)

beforeEach(() => {
  renders = 0
  vi.useFakeTimers({ now: Date.UTC(2026, 10, 11, 17, 0, 10) })
})
afterEach(() => vi.useRealTimers())

describe('useNow', () => {
  it('se refresca cada minuto', () => {
    render(<Clock />)
    const first = shown()
    act(() => void vi.advanceTimersByTime(60_000))
    expect(shown()).toBe(first + 60_000)
  })

  it('al volver a la pestaña toma la hora de ahora, y ocultarla no hace nada', () => {
    render(<Clock />)
    const first = shown()
    vi.setSystemTime(first + 3 * 3_600_000)
    const visibility = vi.spyOn(document, 'visibilityState', 'get')
    visibility.mockReturnValue('hidden')
    act(() => void document.dispatchEvent(new Event('visibilitychange')))
    expect(shown()).toBe(first)
    visibility.mockReturnValue('visible')
    act(() => void document.dispatchEvent(new Event('visibilitychange')))
    expect(shown()).toBe(first + 3 * 3_600_000)
  })

  it('no vuelve a pintar si sigue en el mismo minuto', () => {
    render(<Clock />)
    const before = renders
    // volver a la pestaña a los 5 segundos: mismo minuto, mismo valor
    vi.setSystemTime(Date.now() + 5_000)
    act(() => void document.dispatchEvent(new Event('visibilitychange')))
    expect(renders).toBe(before)
  })

  it('al desmontar quita el intervalo y el oyente', () => {
    const { unmount } = render(<Clock />)
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
