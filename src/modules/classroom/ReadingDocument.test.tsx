import { screen, within } from '@testing-library/react'
import { renderWithProviders } from '@wasichai/testing'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { classroomModule } from './module'
import { outline, ReadingDocument } from './ReadingDocument'
import type { ReadingDocumentDto } from './readingApi'
import type { ReadingSize } from './readingPreferences'
import { readingDocument } from './test/fixtures'

// la lectura nativa (ADR-0045 del backend): el documento de bloques se pinta con componentes propios. el contenido es dato
// no confiable: nada de HTML del autor, ids con prefijo, enlaces y figuras filtrados otra vez aquí

const PIXEL = 'data:image/png;base64,iVBORw0KGgo='
const text = (value: string) => ({ type: 'text', text: value }) as const

const everyBlock: ReadingDocumentDto = {
  title: 'Portal del estudiante',
  blocks: [
    { type: 'heading', level: 2, id: '_entrar', content: [text('Entrar al portal')] },
    { type: 'heading', level: 3, id: '_cuenta', content: [text('La cuenta')] },
    { type: 'heading', level: 4, id: null, content: [text('Sin ancla')] },
    {
      type: 'paragraph',
      content: [
        text('Con '),
        { type: 'strong', content: [text('su cuenta')] },
        text(', '),
        { type: 'em', content: [text('su clave')] },
        text(' y '),
        { type: 'code', text: 'ssh' },
        { type: 'break' },
        { type: 'link', href: 'https://example.org/portal', content: [text('el portal')] },
        text(' · '),
        { type: 'link', href: 'mailto:mesa@example.org', content: [text('la mesa de ayuda')] },
        text(' · '),
        { type: 'link', href: '#_cuenta', content: [text('ver la cuenta')] }
      ]
    },
    { type: 'list', ordered: true, items: [[{ type: 'paragraph', content: [text('Primero')] }], [{ type: 'paragraph', content: [text('Segundo')] }]] },
    { type: 'list', ordered: false, items: [[{ type: 'paragraph', content: [text('Una viñeta')] }]] },
    {
      type: 'table',
      caption: [text('Horarios')],
      head: [
        [
          { content: [{ type: 'paragraph', content: [text('Día')] }], colspan: 1, rowspan: 1, header: true },
          { content: [{ type: 'paragraph', content: [text('Hora')] }], colspan: 1, rowspan: 1, header: true }
        ]
      ],
      body: [[{ content: [{ type: 'paragraph', content: [text('Lunes y martes')] }], colspan: 2, rowspan: 1, header: false }]]
    },
    { type: 'code', language: 'kotlin', text: 'fun main() {\n  println("hola")\n}' },
    { type: 'quote', content: [{ type: 'paragraph', content: [text('Leer es releer.')] }], attribution: [text('Anónimo')] },
    { type: 'admonition', kind: 'warning', content: [{ type: 'paragraph', content: [text('Cierre la sesión al salir.')] }] },
    { type: 'figure', src: PIXEL, alt: 'El portal', caption: [text('La entrada')] },
    { type: 'rule' }
  ]
}

function renderReading(document: ReadingDocumentDto, size: ReadingSize = 19, roomy = false) {
  return renderWithProviders(<ReadingDocument document={document} size={size} roomy={roomy} />, { modules: [classroomModule()] })
}

describe('ReadingDocument', () => {
  it('renders every block type', () => {
    const { container } = renderReading(everyBlock)

    expect(screen.getByRole('heading', { name: 'Entrar al portal' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'La cuenta' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Sin ancla' })).not.toHaveAttribute('id')
    expect(screen.getByText('su cuenta').tagName).toBe('STRONG')
    expect(screen.getByText('su clave').tagName).toBe('EM')
    expect(screen.getByText('ssh').tagName).toBe('CODE')
    expect(container.querySelector('br')).toBeInTheDocument()

    const ordered = container.querySelector('ol')!
    expect(
      within(ordered)
        .getAllByRole('listitem')
        .map((item) => item.textContent)
    ).toEqual(['Primero', 'Segundo'])
    expect(container.querySelector('ul')).toHaveTextContent('Una viñeta')

    const table = screen.getByRole('table', { name: 'Horarios' })
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((cell) => cell.textContent)
    ).toEqual(['Día', 'Hora'])
    expect(within(table).getByRole('cell', { name: 'Lunes y martes' })).toHaveAttribute('colspan', '2')

    // el código, tal cual: con sus espacios y saltos
    expect(container.querySelector('pre code')?.textContent).toBe('fun main() {\n  println("hola")\n}')
    expect(container.querySelector('blockquote')).toHaveTextContent('Leer es releer.')
    expect(screen.getByText('— Anónimo').tagName).toBe('FIGCAPTION')

    // la admonición se nombra con palabra, no solo con color
    const warning = screen.getByRole('note', { name: 'Advertencia' })
    expect(warning).toHaveTextContent('Cierre la sesión al salir.')

    expect(screen.getByRole('img', { name: 'El portal' })).toHaveAttribute('src', PIXEL)
    expect(screen.getByText('La entrada').tagName).toBe('FIGCAPTION')
    expect(container.querySelector('hr')).toBeInTheDocument()
  })

  it('never uses dangerouslySetInnerHTML', () => {
    for (const file of ['ReadingDocument.tsx', 'Resources.tsx', 'readingApi.ts'])
      expect(readFileSync(join(import.meta.dirname, file), 'utf8'), file).not.toMatch(/dangerouslySetInnerHTML|innerHTML|srcDoc|<iframe/)
  })

  it('unknown block type is skipped', () => {
    const document = {
      title: null,
      blocks: [
        { type: 'html', html: '<img src=x onerror=alert(1)>' },
        { type: 'paragraph', content: [{ type: 'script', text: 'alert(1)' }, text('Lo que se entiende')] }
      ]
    } as unknown as ReadingDocumentDto
    const { container } = renderReading(document)

    expect(screen.getByText('Lo que se entiende')).toBeInTheDocument()
    expect(container.querySelector('img')).not.toBeInTheDocument()
    expect(container).not.toHaveTextContent('alert(1)')
  })

  it('outline lists h2 to h4 with ids', () => {
    expect(outline(everyBlock)).toEqual([
      { id: 'lectura-_entrar', level: 2, text: 'Entrar al portal' },
      { id: 'lectura-_cuenta', level: 3, text: 'La cuenta' }
    ])
  })

  it('figure with a foreign src is not rendered', () => {
    const foreign = (src: string) => ({ type: 'figure', src, alt: src, caption: null }) as const
    const { container } = renderReading({
      title: null,
      blocks: [
        foreign('https://rastreo.example/pixel.png'),
        foreign('data:image/svg+xml;base64,PHN2Zz4='),
        foreign('data:text/html;base64,PGgxPg=='),
        foreign('/api/objects/version_recurso/records/vr-html/files/archivo'),
        foreign('javascript:alert(1)')
      ]
    })

    expect(container.querySelector('img, figure')).not.toBeInTheDocument()
  })

  it('pinta los id con el prefijo lectura- y reescribe con él las anclas internas', () => {
    const { container } = renderReading(everyBlock)

    expect(screen.getByRole('heading', { name: 'Entrar al portal' })).toHaveAttribute('id', 'lectura-_entrar')
    expect(screen.getByRole('heading', { name: 'La cuenta' })).toHaveAttribute('id', 'lectura-_cuenta')
    expect(screen.getByRole('link', { name: 'ver la cuenta' })).toHaveAttribute('href', '#lectura-_cuenta')
    // ningún id del autor sin prefijo: no pisa los de la aplicación
    for (const element of container.querySelectorAll('[id]')) expect(element.id).toMatch(/^lectura-/)
  })

  it('un id que no es [A-Za-z0-9_-] no se pinta', () => {
    renderReading({ title: null, blocks: [{ type: 'heading', level: 2, id: 'x" onclick="y', content: [text('Raro')] }] })
    expect(screen.getByRole('heading', { name: 'Raro' })).not.toHaveAttribute('id')
  })

  it('el enlace externo abre otra pestaña, sin opener ni referer, y lo dice', () => {
    renderReading(everyBlock)

    const external = screen.getByRole('link', { name: 'el portal (abre en otra pestaña)' })
    expect(external).toHaveAttribute('href', 'https://example.org/portal')
    expect(external).toHaveAttribute('target', '_blank')
    expect(external).toHaveAttribute('rel', 'noopener noreferrer')
    expect(external.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')

    const mail = screen.getByRole('link', { name: 'la mesa de ayuda' })
    expect(mail).toHaveAttribute('href', 'mailto:mesa@example.org')
    expect(mail).not.toHaveAttribute('target')
    expect(screen.getByRole('link', { name: 'ver la cuenta' })).not.toHaveAttribute('target')
  })

  it('un enlace con otro destino queda como su texto', () => {
    renderReading({
      title: null,
      blocks: [
        {
          type: 'paragraph',
          content: [
            { type: 'link', href: 'javascript:alert(1)', content: [text('uno')] },
            { type: 'link', href: 'data:text/html,hola', content: [text('dos')] },
            { type: 'link', href: '/relativo', content: [text('tres')] },
            { type: 'link', href: '//otro.example', content: [text('cuatro')] }
          ]
        }
      ]
    })

    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getByText('unodostrescuatro')).toBeInTheDocument()
  })

  it('el tamaño elegido y el interlineado abierto llegan a la lectura', () => {
    const { container, unmount } = renderReading(everyBlock, 21)
    const root = () => container.querySelector<HTMLElement>('[data-reading]')!
    expect(root().style.getPropertyValue('--reading-size')).toBe('21px')
    expect(root().style.getPropertyValue('--reading-leading')).toBe('1.65')
    unmount()

    const roomy = renderReading(everyBlock, 19, true)
    const element = roomy.container.querySelector<HTMLElement>('[data-reading]')!
    expect(element.style.getPropertyValue('--reading-size')).toBe('19px')
    expect(element.style.getPropertyValue('--reading-leading')).toBe('1.79')
  })

  it('el fixture de «Lo que necesita para entrar»: un h2, la nota y un párrafo', () => {
    renderReading(readingDocument)
    expect(screen.getByRole('heading', { name: 'Entrar y salir del portal' })).toBeInTheDocument()
    expect(screen.getByRole('note', { name: 'Nota' })).toHaveTextContent(/^NotaLectura ilustrativa de la demostración/)
  })
})
