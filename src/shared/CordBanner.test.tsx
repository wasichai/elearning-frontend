import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CordBanner } from './CordBanner'

const draw = (seed: string) => render(<CordBanner seed={seed} />).container.querySelector('svg')!.innerHTML

describe('CordBanner', () => {
  it('la misma semilla da siempre el mismo patrón, y otra semilla otro', () => {
    expect(draw('srtm-anuncios')).toBe(draw('srtm-anuncios'))
    expect(draw('srtm-anuncios')).not.toBe(draw('sgspe-introductorio'))
  })

  it.each(['srtm-anuncios', 'sgspe-introductorio', 'catastro', 'x'])('los nudos de %s caben en la banda y no se solapan', (seed) => {
    const height = 96
    const { container } = render(<CordBanner seed={seed} height={height} />)
    const groups = [...container.querySelectorAll('g')]
    expect(groups.length).toBeGreaterThan(0)
    for (const group of groups) {
      const knots = [...group.querySelectorAll('circle')].map((knot) => ({ y: Number(knot.getAttribute('cy')), r: Number(knot.getAttribute('r')) }))
      for (const { y, r } of knots) expect(y + r).toBeLessThanOrEqual(height)
      for (let index = 1; index < knots.length; index++) expect(knots[index]!.y - knots[index - 1]!.y).toBeGreaterThanOrEqual(knots[index]!.r * 2)
    }
  })

  it('no se escala: los nudos miden lo mismo a cualquier ancho', () => {
    const { container } = render(<CordBanner seed="x" />)
    expect(container.querySelector('svg')).not.toHaveAttribute('viewBox')
  })

  it('es decorativa para un lector de pantalla', () => {
    const { container } = render(<CordBanner seed="x" />)
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('pinta con tokens: sigue al tema', () => {
    expect(draw('color')).not.toMatch(/#[0-9a-f]{3,6}/i)
  })
})
