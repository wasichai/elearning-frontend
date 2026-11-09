import { screen, within } from '@testing-library/react'
import type { WasichaiModule } from '@wasichai/core'
import { renderWithProviders } from '@wasichai/testing'
import type { ReactElement } from 'react'
import { describe, expect, it } from 'vitest'
import { runningHeadMessages } from './runningHeadMessages'
import { RunningHead } from './RunningHead'

// el nombre de la ruta viene de runningHeadMessages, que el módulo anfitrión pone bajo la clave runningHead
const classroomStub: WasichaiModule = {
  id: 'classroom',
  routes: [],
  i18n: { es: { runningHead: runningHeadMessages.es }, en: { runningHead: runningHeadMessages.en } }
}
const renderHead = (node: ReactElement, language?: string) => renderWithProviders(node, { modules: [classroomStub], language })

describe('RunningHead', () => {
  it('es la ruta de la página: las migas a la izquierda, con enlace salvo la actual, y el folio a la derecha', () => {
    renderHead(
      <RunningHead
        namespace="classroom"
        trail={[{ label: 'Mis cursos', to: '/mis-cursos' }, { label: 'Rentas municipales' }, { label: 'Unidad 2' }]}
        folio="6 / 14"
      />
    )
    const nav = within(screen.getByRole('navigation', { name: 'Ruta' }))
    expect(nav.getByRole('link', { name: 'Mis cursos' })).toHaveAttribute('href', '/mis-cursos')
    // solo la última es la página actual
    expect(nav.getByText('Unidad 2')).toHaveAttribute('aria-current', 'page')
    expect(nav.getByText('Rentas municipales')).not.toHaveAttribute('aria-current')
    expect(nav.getByText('6 / 14')).toBeVisible()
  })

  it('el folio lleva su etiqueta para el lector de pantalla; la cifra «1 / 15» es para el ojo', () => {
    renderHead(<RunningHead namespace="classroom" trail={[{ label: 'Mis cursos', to: '/mis-cursos' }]} folio="1 / 15" folioLabel="Lección 1 de 15" />)
    const nav = within(screen.getByRole('navigation', { name: 'Ruta' }))
    expect(nav.getByText('1 / 15')).toHaveAttribute('aria-hidden', 'true')
    expect(nav.getByText('Lección 1 de 15')).toHaveClass('sr-only')
  })

  it('en inglés la ruta es «Breadcrumb»', () => {
    renderHead(<RunningHead namespace="classroom" trail={[{ label: 'My courses', to: '/mis-cursos' }]} />, 'en')
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument()
  })

  it('corta con elipsis un título de 120 caracteres y deja el texto completo en title', () => {
    const long = 'T'.repeat(120)
    renderHead(<RunningHead namespace="classroom" trail={[{ label: 'Mis cursos', to: '/mis-cursos' }, { label: long }]} />)
    const title = screen.getByText(long)
    expect(title).toHaveAttribute('title', long)
    expect(title).toHaveClass('truncate')
    expect(title.closest('li')).toHaveClass('min-w-0')
  })

  it('una miga con enlace tampoco desborda: se corta y lleva su título completo', () => {
    const long = Array.from({ length: 4 }, () => 'Licencias de anuncios con SRTM').join(': ')
    renderHead(<RunningHead namespace="classroom" trail={[{ label: long, to: '/mis-cursos/mat-srtm-1' }, { label: 'Unidad 1' }]} />)
    const link = screen.getByRole('link', { name: long })
    expect(link).toHaveAttribute('title', long)
    expect(link).toHaveClass('truncate', 'min-w-0')
    expect(link.closest('li')).toHaveClass('min-w-0')
    expect(link.closest('li')).not.toHaveClass('shrink-0')
  })
})
