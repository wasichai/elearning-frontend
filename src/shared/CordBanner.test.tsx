import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CordBanner } from './CordBanner'

const draw = (seed: string) => render(<CordBanner seed={seed} />).container.querySelector('svg')!.innerHTML

describe('CordBanner', () => {
  it('la misma semilla da siempre el mismo patrón, y otra semilla otro', () => {
    expect(draw('srtm-anuncios')).toBe(draw('srtm-anuncios'))
    expect(draw('srtm-anuncios')).not.toBe(draw('sgspe-introductorio'))
  })

  it('es decorativa para un lector de pantalla', () => {
    const { container } = render(<CordBanner seed="x" />)
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('pinta con tokens: sigue al tema', () => {
    expect(draw('color')).not.toMatch(/#[0-9a-f]{3,6}/i)
  })
})
