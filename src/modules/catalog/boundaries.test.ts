import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { foreignModuleImports, handWrittenText, literalLinks, offenders, sourceFiles } from '../../test/boundaries'

// las fronteras del módulo (src/test/boundaries.ts): enlaces por clave de ruta, nada de otro módulo, textos por i18n

const MODULE_DIR = import.meta.dirname

describe('fronteras del módulo catalog', () => {
  it('revisa los archivos del módulo', () => {
    expect(sourceFiles(MODULE_DIR).map((file) => relative(MODULE_DIR, file))).toEqual(
      expect.arrayContaining(['CatalogPage.tsx', 'CourseDetailPage.tsx', 'api.ts'])
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

// las comprobaciones muerden: casos sintéticos que deben caer, y los que no
describe('las comprobaciones de frontera detectan lo prohibido', () => {
  it('URLs literales en to=, href= y navigate(', () => {
    const bad = [`<Link to="/cursos">`, `<Link to={'/cursos/' + slug}>`, 'navigate(`/cursos/${slug}`)', `<a href="cursos">`, `navigate( '/login' )`]
    const good = [
      `<Link to={links.to(CATALOG_ROUTES.course, { slug })}>`,
      `navigate(links.home())`,
      `client.request('/lms/public/catalog/courses')`,
      `const to = 'x'`
    ]

    expect(bad.map((line) => literalLinks(line).length)).toEqual([1, 1, 1, 1, 1])
    expect(good.flatMap((line) => literalLinks(line))).toEqual([])
  })

  it('imports de otro módulo de src/modules', () => {
    const file = join(MODULE_DIR, 'CatalogPage.tsx')
    const source = [
      `import { useEnrollment } from '../enrollment/api'`,
      `export { ClassroomPage } from '../classroom/ClassroomPage'`,
      `const page = () => import('../../modules/teacher/module')`,
      `import { x } from 'src/modules/editorial/x'`,
      `import { api } from './api'`,
      `import { CatalogPage } from '../catalog/CatalogPage'`,
      `import { modules } from '../../modules'`,
      `import { formatNumber } from '../../shared/format'`,
      `import { useQuery } from '@tanstack/react-query'`
    ].join('\n')

    expect(foreignModuleImports(file, source, MODULE_DIR)).toEqual([
      '../enrollment/api',
      '../classroom/ClassroomPage',
      '../../modules/teacher/module',
      'src/modules/editorial/x'
    ])
  })

  it('texto visible escrito en JSX', () => {
    const bad = [`<h1>Catálogo de cursos</h1>`, `<Button>Reintentar</Button>`, `<Input placeholder="Buscar" />`, `<button aria-label="Next">`]
    const good = [
      `<h1>{t('catalog.title')}</h1>`,
      `<span className="text-ink-muted"> · </span>`,
      `<Fact label={t('course.level')}>{value}</Fact>`,
      `{a > b ? x : y}`
    ]

    expect(bad.map((line) => handWrittenText(line).length)).toEqual([1, 1, 1, 1])
    expect(good.flatMap((line) => handWrittenText(line))).toEqual([])
  })
})
