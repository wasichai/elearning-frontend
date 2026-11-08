import { describe, expect, it } from 'vitest'
import { emptyStatesWithoutIcon, MODULES_ROOT, offenders } from './test/boundaries'

// cada estado vacío dice de qué es con su icono (H14 de la épica #179): el genérico de core no distingue una bandeja de una lista
describe('estados vacíos', () => {
  it('cada <EmptyState> de los módulos lleva su icono', () => {
    expect(offenders(MODULES_ROOT, (_file, source) => emptyStatesWithoutIcon(source), /\.tsx$/)).toEqual([])
  })

  it('la regla reconoce un vacío sin icono y uno con él', () => {
    expect(emptyStatesWithoutIcon("<EmptyState title={t('a')} />")).toHaveLength(1)
    expect(emptyStatesWithoutIcon("<EmptyState title={t('a')} icon={Inbox}>")).toEqual([])
  })
})

// cada pantalla carga con la forma de lo que llega (pendiente de la épica #179), no con el «Cargando…» de core en una pantalla vacía
const LOADING_STATE = /<LoadingState\b/g

describe('estados de carga', () => {
  it('ningún módulo carga con <LoadingState>: usa un esqueleto de src/shared', () => {
    expect(offenders(MODULES_ROOT, (_file, source) => source.match(LOADING_STATE) ?? [], /\.tsx$/)).toEqual([])
  })
})
