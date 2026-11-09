import { describe, expect, it } from 'vitest'
import { smallButtons } from './boundaries'

describe('smallButtons', () => {
  it('detecta un <Button size="sm">, también en varias líneas y con funciones en otras props', () => {
    expect(smallButtons('<Button size="sm">Guardar</Button>')).toHaveLength(1)
    expect(smallButtons("<Button size='sm' />")).toHaveLength(1)
    expect(smallButtons('<Button\n  variant="ghost"\n  onClick={() => save()}\n  size={"sm"}\n>\n  Guardar\n</Button>')).toHaveLength(1)
  })

  it('no detecta otros componentes con size="sm" ni botones de otro tamaño', () => {
    expect(smallButtons('<SegmentedProgress units={units} size="sm" />')).toEqual([])
    expect(smallButtons('<Button size="icon">x</Button>\n<SegmentedProgress size="sm" />')).toEqual([])
    expect(smallButtons('<Button>Guardar</Button>\n<p size="sm">')).toEqual([])
  })
})
