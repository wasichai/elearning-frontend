import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { lessonMark, StateMark, type MarkState } from './StateMark'

describe('StateMark', () => {
  it('cada estado tiene su forma: contorno, medio círculo, lleno con visto y lleno sin visto', () => {
    const shape = (state: MarkState) => {
      const { container } = render(<StateMark state={state} />)
      const svg = container.querySelector('svg')!
      return { circles: svg.querySelectorAll('circle').length, paths: svg.querySelectorAll('path').length, hidden: svg.getAttribute('aria-hidden') }
    }
    expect(shape('todo')).toEqual({ circles: 1, paths: 0, hidden: 'true' })
    expect(shape('started')).toEqual({ circles: 1, paths: 1, hidden: 'true' })
    expect(shape('done')).toEqual({ circles: 1, paths: 1, hidden: 'true' })
    expect(shape('passed')).toEqual({ circles: 1, paths: 1, hidden: 'true' })
    expect(shape('used')).toEqual({ circles: 1, paths: 0, hidden: 'true' })
  })

  it('los colores salen de los tokens', () => {
    const { container } = render(<StateMark state="passed" />)
    expect(container.innerHTML).not.toMatch(/#[0-9a-f]{3,6}/i)
  })

  it('hecho (completada o aprobada) va en tinta, como los segmentos del progreso; la marca nunca se pinta de marca', () => {
    const mark = (state: MarkState) => render(<StateMark state={state} />).container.querySelector('svg')!
    const done = mark('done')
    const passed = mark('passed')
    expect(done.querySelector('circle')).toHaveClass('fill-ink')
    expect(passed.querySelector('circle')).toHaveClass('fill-ink')
    expect(done.innerHTML).not.toContain('brand')
    // aprobada se distingue de completada por la forma: su visto lleva un segundo trazo
    expect(passed.querySelector('path')!.getAttribute('d')).not.toBe(done.querySelector('path')!.getAttribute('d'))
  })

  it('el estado de una lección del aula', () => {
    expect(['NO_INICIADA', 'INICIADA', 'COMPLETADA', 'APROBADA'].map((status) => lessonMark(status as never))).toEqual(['todo', 'started', 'done', 'passed'])
  })
})
