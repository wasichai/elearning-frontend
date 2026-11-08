import { ExternalLink } from 'lucide-react'
import type { CSSProperties, JSX, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { Block, Cell, Inline, ReadingDocumentDto } from './readingApi'
import type { ReadingSize } from './readingPreferences'

// la lectura de un recurso HTML pintada en la página (ADR-0045): cada bloque del documento con un elemento propio y su
// texto como texto, nunca como HTML. es dato no confiable, así que aquí se vuelve a filtrar lo que el servidor ya filtra:
// - los id llevan el prefijo «lectura-» (y solo si son [A-Za-z0-9_-]): el autor no puede pisar los de la aplicación
// - solo son enlace los http(s) con servidor, mailto: y #ancla (reescrita con el mismo prefijo); el resto queda como texto
// - una figura solo con una imagen data: en base64 de un tipo que no ejecuta nada; si no, no se pinta
// el tipo que no se conoce no se pinta. la tipografía de lectura de Colofón (Newsreader, 20/33 escalada al tamaño que
// elige el estudiante) en la medida de 66ch; los colores, de los tokens: el modo sepia y el oscuro llegan solos

export const READING_ID_PREFIX = 'lectura-'

const SAFE_ID = /^[A-Za-z0-9_-]+$/
const SAFE_IMAGE = /^data:image\/(png|jpeg|gif|webp);base64,/

// el interlineado de text-reading (33/20) y el abierto del modo lectura sobre un tema oscuro (34/19)
const LEADING = '1.65'
const ROOMY_LEADING = '1.79'

const readingId = (id: string | null) => (id !== null && SAFE_ID.test(id) ? `${READING_ID_PREFIX}${id}` : undefined)

type Target = { href: string; external: boolean }

function linkTarget(href: string): Target | undefined {
  if (/^https?:\/\/[^\s/?#\\]+/i.test(href)) return { href, external: true }
  if (/^mailto:\S+$/i.test(href)) return { href, external: false }
  const anchor = /^#(.+)$/.exec(href)?.[1]
  const id = anchor === undefined ? undefined : readingId(anchor)
  return id === undefined ? undefined : { href: `#${id}`, external: false }
}

function plainText(content: Inline[]): string {
  return content
    .map((inline) => {
      switch (inline.type) {
        case 'text':
        case 'code':
          return inline.text
        case 'em':
        case 'strong':
        case 'link':
          return plainText(inline.content)
        case 'break':
          return ' '
        default:
          return ''
      }
    })
    .join('')
}

function children(block: Block): Block[] {
  switch (block.type) {
    case 'list':
      return block.items.flat()
    case 'quote':
    case 'admonition':
      return block.content
    case 'table':
      return [...block.head, ...block.body].flat().flatMap((cell) => cell.content)
    default:
      return []
  }
}

// los encabezados con ancla, en orden y ya con el id que lleva la página: el índice al margen enlaza a ellos
export function outline(document: ReadingDocumentDto): { id: string; level: number; text: string }[] {
  const walk = (blocks: Block[]): { id: string; level: number; text: string }[] =>
    blocks.flatMap((block) => {
      if (block.type !== 'heading') return walk(children(block))
      const id = readingId(block.id)
      return id === undefined ? [] : [{ id, level: block.level, text: plainText(block.content) }]
    })
  return walk(document.blocks)
}

interface ReadingDocumentProps {
  document: ReadingDocumentDto
  size: ReadingSize
  // el interlineado abierto del modo lectura sobre un tema oscuro
  roomy?: boolean
}

export function ReadingDocument({ document, size, roomy = false }: ReadingDocumentProps): JSX.Element {
  const scale = { '--reading-size': `${size}px`, '--reading-leading': roomy ? ROOMY_LEADING : LEADING } as CSSProperties
  return (
    <div
      data-reading=""
      style={scale}
      className="flex max-w-measure flex-col gap-[0.9em] font-read text-(length:--reading-size) leading-(--reading-leading) font-normal break-words hyphens-auto text-ink"
    >
      <Blocks blocks={document.blocks} />
    </div>
  )
}

function Blocks({ blocks }: { blocks: Block[] }) {
  return blocks.map((block, index) => <BlockView key={index} block={block} />)
}

// la jerarquía de la página: la lección es h2 y el recurso h3, así que los h2…h4 del documento caen en h4…h6
const HEADINGS = {
  2: { tag: 'h4', className: 'mt-[0.6em] text-[1.45em]/[1.25] font-[460] text-balance' },
  3: { tag: 'h5', className: 'mt-[0.4em] text-[1.2em]/[1.3] font-[520] text-balance' },
  4: { tag: 'h6', className: 'text-[1em]/[1.4] font-semibold' }
} as const

function BlockView({ block }: { block: Block }) {
  const { t } = useTranslation('classroom')
  switch (block.type) {
    case 'heading': {
      const heading = HEADINGS[block.level]
      if (!heading) return null
      const Tag = heading.tag
      return (
        // bajo la barra pegajosa de la lección al saltar a su ancla
        <Tag id={readingId(block.id)} className={`scroll-mt-20 ${heading.className}`}>
          <Inlines content={block.content} />
        </Tag>
      )
    }
    case 'paragraph':
      return (
        <p className="text-pretty">
          <Inlines content={block.content} />
        </p>
      )
    case 'list': {
      const List = block.ordered ? 'ol' : 'ul'
      return (
        <List className={`flex flex-col gap-[0.35em] pl-[1.4em] marker:text-ink-muted ${block.ordered ? 'list-decimal' : 'list-disc'}`}>
          {block.items.map((item, index) => (
            <li key={index} className="pl-[0.2em] [&>*+*]:mt-[0.5em]">
              <Blocks blocks={item} />
            </li>
          ))}
        </List>
      )
    }
    case 'table':
      return (
        // una tabla ancha se desplaza sola, y con el teclado
        <div tabIndex={0} className="overflow-x-auto">
          <table className="w-full border-collapse font-sans text-[0.8em]/[1.45] tabular-nums">
            {block.caption ? (
              <caption className="pb-2 text-left meta">
                <Inlines content={block.caption} />
              </caption>
            ) : null}
            {block.head.length > 0 ? (
              <thead className="bg-table-head">
                {block.head.map((row, index) => (
                  <Row key={index} cells={row} scope="col" />
                ))}
              </thead>
            ) : null}
            <tbody>
              {block.body.map((row, index) => (
                <Row key={index} cells={row} scope="row" />
              ))}
            </tbody>
          </table>
        </div>
      )
    case 'code':
      return (
        <pre tabIndex={0} className="overflow-x-auto rounded-md bg-surface-muted px-4 py-3 font-mono text-[0.8em]/[1.6] whitespace-pre hyphens-none">
          <code data-language={block.language ?? undefined}>{block.text}</code>
        </pre>
      )
    case 'quote':
      return (
        <figure className="border-l-2 border-border-control pl-[1em]">
          <blockquote className="flex flex-col gap-[0.6em] italic">
            <Blocks blocks={block.content} />
          </blockquote>
          {block.attribution ? (
            <figcaption className="mt-[0.4em] text-[0.85em] text-ink-muted">
              — <Inlines content={block.attribution} />
            </figcaption>
          ) : null}
        </figure>
      )
    case 'admonition': {
      const label = t(`reading.admonition.${block.kind}`)
      // la nota de Classroom: entre filetes, con su nombre en versalitas; el tipo lo dice la palabra, no solo el color
      const tone = block.kind === 'warning' ? 'border-t-warning' : block.kind === 'caution' ? 'border-t-danger' : ''
      return (
        <div role="note" aria-label={label} className={`grid grid-cols-[auto_minmax(0,1fr)] gap-x-3.5 border-y border-border py-[0.75em] ${tone}`}>
          <span aria-hidden="true" className="pt-[0.2em] meta">
            {label}
          </span>
          <div className="flex flex-col gap-[0.6em] text-[0.86em]/[1.55] italic">
            <Blocks blocks={block.content} />
          </div>
        </div>
      )
    }
    case 'figure':
      if (!SAFE_IMAGE.test(block.src)) return null
      return (
        <figure className="flex flex-col gap-2">
          <img src={block.src} alt={block.alt} className="h-auto max-w-full rounded-md" />
          {block.caption ? (
            <figcaption className="font-sans text-[0.8em] text-ink-muted">
              <Inlines content={block.caption} />
            </figcaption>
          ) : null}
        </figure>
      )
    case 'rule':
      return <hr className="my-[0.6em] border-border" />
    default:
      return null
  }
}

function Row({ cells, scope }: { cells: Cell[]; scope: 'col' | 'row' }) {
  return (
    <tr>
      {cells.map((cell, index) => {
        const Cell = cell.header ? 'th' : 'td'
        return (
          <Cell
            key={index}
            scope={cell.header ? scope : undefined}
            colSpan={cell.colspan}
            rowSpan={cell.rowspan}
            className={`border-b border-border px-3 py-2 text-left align-top ${cell.header ? 'font-semibold' : ''}`}
          >
            <Blocks blocks={cell.content} />
          </Cell>
        )
      })}
    </tr>
  )
}

function Inlines({ content }: { content: Inline[] }) {
  return content.map((inline, index) => <InlineView key={index} inline={inline} />)
}

function InlineView({ inline }: { inline: Inline }): ReactNode {
  switch (inline.type) {
    case 'text':
      return inline.text
    case 'em':
      return (
        <em>
          <Inlines content={inline.content} />
        </em>
      )
    case 'strong':
      return (
        <strong className="font-semibold">
          <Inlines content={inline.content} />
        </strong>
      )
    case 'code':
      return <code className="rounded-sm bg-surface-muted px-[0.25em] font-mono text-[0.85em]">{inline.text}</code>
    case 'link':
      return <ReadingLink href={inline.href} content={inline.content} />
    case 'break':
      return <br />
    default:
      return null
  }
}

const LINK = 'text-link underline decoration-1 underline-offset-[0.2em] hover:decoration-2'

function ReadingLink({ href, content }: { href: string; content: Inline[] }) {
  const { t } = useTranslation('classroom')
  const target = linkTarget(href)
  if (!target) return <Inlines content={content} />
  if (!target.external)
    return (
      <a href={target.href} className={LINK}>
        <Inlines content={content} />
      </a>
    )
  return (
    <a href={target.href} target="_blank" rel="noopener noreferrer" className={LINK}>
      <Inlines content={content} /> <ExternalLink aria-hidden="true" className="inline size-[0.75em] align-baseline" />
      <span className="sr-only">{t('reading.external')}</span>
    </a>
  )
}
