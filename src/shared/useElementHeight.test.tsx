import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useElementHeight } from './useElementHeight'

// un ResizeObserver de mentira que registra qué nodos observa y deja dispararlo a mano
const observed: Element[] = []
let fire: (() => void) | undefined

beforeEach(() => {
  observed.length = 0
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(private callback: (entries: { target: Element }[]) => void) {}
      observe(target: Element) {
        observed.push(target)
        fire = () => this.callback([{ target }])
      }
      disconnect() {
        fire = undefined
      }
    }
  )
})
afterEach(() => vi.unstubAllGlobals())

function Probe({ as: Tag }: { as: 'header' | 'section' }) {
  const { ref, height } = useElementHeight<HTMLElement>()
  return (
    <Tag ref={ref} data-testid="probe" data-height={height}>
      x
    </Tag>
  )
}

describe('useElementHeight', () => {
  it('mide el nodo y vuelve a observar si el elemento cambia', () => {
    const { rerender, getByTestId } = render(<Probe as="header" />)
    expect(observed).toHaveLength(1)
    vi.spyOn(observed[0]!, 'getBoundingClientRect').mockReturnValue({ height: 40 } as DOMRect)
    act(() => fire?.())
    expect(getByTestId('probe').dataset.height).toBe('40')

    // otro tipo de elemento: React monta un nodo nuevo y el hook debe observarlo
    rerender(<Probe as="section" />)
    expect(observed).toHaveLength(2)
    expect(observed[1]).toBe(getByTestId('probe'))
    vi.spyOn(observed[1]!, 'getBoundingClientRect').mockReturnValue({ height: 72 } as DOMRect)
    act(() => fire?.())
    expect(getByTestId('probe').dataset.height).toBe('72')
  })
})
