import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { describe, expect, it } from 'vitest'

// las fronteras del módulo (CLAUDE.md, reglas 3 y 5):
// - ninguna URL de pantalla escrita a mano: los enlaces salen de useWasichaiLinks() por clave de ruta
// - nada importado de otro módulo de src/modules: cada experiencia se registra y se prueba sola
// - ningún texto visible escrito en un componente: todo pasa por el i18n del módulo
// las rutas REST que recibe el cliente de la API ('/lms/public/…') no son enlaces y no cuentan.

const MODULE_DIR = import.meta.dirname
const MODULES_ROOT = dirname(MODULE_DIR)

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return entry.name === 'test' ? [] : sourceFiles(path)
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : []
  })
}

// to="…", to={'…'}, to={`…`}, href=…, navigate('…'): cualquier literal, absoluto o relativo
const LITERAL_LINK = /(?:\b(?:to|href)=\{?|\bnavigate\()\s*["'`]/

function literalLinks(source: string): string[] {
  return source.split('\n').filter((line) => LITERAL_LINK.test(line))
}

// los import/export … from '…' e import('…') que salen del módulo hacia otro de src/modules
function foreignModuleImports(file: string, source: string, moduleDir = MODULE_DIR, modulesRoot = MODULES_ROOT): string[] {
  const specifiers = [...source.matchAll(/(?:\bfrom\s*|\bimport\s*\(?\s*)["']([^"']+)["']/g)].map((match) => match[1]!)
  return specifiers.filter((specifier) => {
    if (!specifier.startsWith('.') && !specifier.startsWith('/')) return /(^|\/)src\/modules\//.test(specifier)
    const target = resolve(dirname(file), specifier)
    return target.startsWith(modulesRoot + sep) && !(target === moduleDir || target.startsWith(moduleDir + sep))
  })
}

// texto con letras entre etiquetas JSX o en un atributo visible escrito a mano
const JSX_TEXT = />\s*[^\s<>{}]*\p{L}[^<>{}]*</u
const VISIBLE_ATTRIBUTE = /\b(?:aria-label|placeholder|title|alt)="[^"]*\p{L}/u

function handWrittenText(source: string): string[] {
  return source.split('\n').filter((line) => JSX_TEXT.test(line) || VISIBLE_ATTRIBUTE.test(line))
}

function offenders(check: (file: string, source: string) => string[], extension = /\.tsx?$/) {
  return sourceFiles(MODULE_DIR)
    .filter((file) => extension.test(file))
    .flatMap((file) => check(file, readFileSync(file, 'utf8')).map((hit) => `${relative(MODULE_DIR, file)}: ${hit.trim()}`))
}

describe('fronteras del módulo catalog', () => {
  it('revisa los archivos del módulo', () => {
    expect(sourceFiles(MODULE_DIR).map((file) => relative(MODULE_DIR, file))).toEqual(
      expect.arrayContaining(['CatalogPage.tsx', 'CourseDetailPage.tsx', 'api.ts'])
    )
  })

  it('no escribe URLs de pantalla a mano', () => {
    expect(offenders((_file, source) => literalLinks(source))).toEqual([])
  })

  it('no importa de otro módulo', () => {
    expect(offenders(foreignModuleImports)).toEqual([])
  })

  it('no escribe texto visible en los componentes', () => {
    expect(offenders((_file, source) => handWrittenText(source), /\.tsx$/)).toEqual([])
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
      `import { useQuery } from '@tanstack/react-query'`
    ].join('\n')

    expect(foreignModuleImports(file, source)).toEqual([
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
