import { coreModule, createRegistry } from '@wasichai/core'
import { describe, expect, it } from 'vitest'
import { modules } from './modules'

describe('modules', () => {
  // lo mismo que hace WasichaiApp al montar: un id repetido, una ruta o un menú inválidos lanzan aquí y no en el navegador
  it('forman un registro válido junto a coreModule', () => {
    const registry = createRegistry([coreModule, ...modules])

    expect(registry.modules.map((module) => module.id)).toEqual([coreModule.id, 'catalog', 'classroom'])
    expect(registry.routes.length).toBeGreaterThan(0)
  })
})
