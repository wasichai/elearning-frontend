import { relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { foreignModuleImports, handWrittenText, literalLinks, offenders, sourceFiles } from '../../test/boundaries'

// las fronteras del módulo (src/test/boundaries.ts, cuyas comprobaciones prueba el catálogo con casos sintéticos):
// enlaces por clave de ruta, nada importado de otro módulo, textos por i18n
const MODULE_DIR = import.meta.dirname

describe('fronteras del módulo classroom', () => {
  it('revisa los archivos del módulo', () => {
    expect(sourceFiles(MODULE_DIR).map((file) => relative(MODULE_DIR, file))).toEqual(
      expect.arrayContaining(['MyCoursesPage.tsx', 'ClassroomPage.tsx', 'api.ts'])
    )
  })

  it('no escribe URLs de pantalla a mano', () => {
    expect(offenders(MODULE_DIR, (_file, source) => literalLinks(source))).toEqual([])
  })

  it('no importa de otro módulo', () => {
    expect(offenders(MODULE_DIR, (file, source) => foreignModuleImports(file, source, MODULE_DIR))).toEqual([])
  })

  it('no escribe texto visible en los componentes', () => {
    expect(offenders(MODULE_DIR, (_file, source) => handWrittenText(source), /\.tsx$/)).toEqual([])
  })
})
