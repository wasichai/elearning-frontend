import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'

// las fronteras de un módulo de src/modules (CLAUDE.md, reglas 3 y 5), comprobadas por cada módulo en su boundaries.test.ts:
// - ninguna URL de pantalla escrita a mano: los enlaces salen de useWasichaiLinks() por clave de ruta
// - nada importado de otro módulo de src/modules: cada experiencia se registra y se prueba sola (src/shared sí se puede)
// - ningún texto visible escrito en un componente: todo pasa por el i18n del módulo
// las rutas REST que recibe el cliente de la API ('/lms/…') no son enlaces y no cuentan.

export const MODULES_ROOT = resolve(import.meta.dirname, '../modules')

export function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return entry.name === 'test' ? [] : sourceFiles(path)
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : []
  })
}

// to="…", to={'…'}, to={`…`}, href=…, navigate('…'): cualquier literal, absoluto o relativo
const LITERAL_LINK = /(?:\b(?:to|href)=\{?|\bnavigate\()\s*["'`]/

export function literalLinks(source: string): string[] {
  return source.split('\n').filter((line) => LITERAL_LINK.test(line))
}

// los import/export … from '…' e import('…') que salen del módulo hacia otro de src/modules
export function foreignModuleImports(file: string, source: string, moduleDir: string, modulesRoot = MODULES_ROOT): string[] {
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

export function handWrittenText(source: string): string[] {
  return source.split('\n').filter((line) => JSX_TEXT.test(line) || VISIBLE_ATTRIBUTE.test(line))
}

// las líneas que incumplen `check` en los archivos de `dir`, como «archivo: línea»
export function offenders(dir: string, check: (file: string, source: string) => string[], extension = /\.tsx?$/): string[] {
  return sourceFiles(dir)
    .filter((file) => extension.test(file))
    .flatMap((file) => check(file, readFileSync(file, 'utf8')).map((hit) => `${relative(dir, file)}: ${hit.trim()}`))
}
