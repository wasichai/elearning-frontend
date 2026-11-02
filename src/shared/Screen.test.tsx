import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { Breadcrumbs, ScreenBody, ScreenHeader, Section, Skeleton, Stat, StatList } from './Screen'

describe('ScreenHeader', () => {
  it('abre la pantalla con su único h1, y la acción y los hechos a la vista', () => {
    render(<ScreenHeader title="Mis cursos" subtitle="Dónde vas" actions={<button>Actuar</button>} meta={<span>Dato</span>} />)
    expect(screen.getByRole('heading', { level: 1, name: 'Mis cursos' })).toBeVisible()
    expect(screen.getByText('Dónde vas')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Actuar' })).toBeVisible()
    expect(screen.getByText('Dato')).toBeVisible()
  })

  it('cabecera y cuerpo comparten el mismo contenedor: el título se alinea con el contenido', () => {
    const { container } = render(
      <>
        <ScreenHeader title="T" width="wide" />
        <ScreenBody width="wide">contenido</ScreenBody>
      </>
    )
    const header = container.querySelector('header > div')!
    const body = screen.getByText('contenido')
    for (const token of ['max-w-[96rem]', 'mx-auto', 'px-4']) {
      expect(header.className).toContain(token)
      expect(body.className).toContain(token)
    }
  })
})

describe('Breadcrumbs', () => {
  it('enlaza lo anterior y marca la pantalla actual', () => {
    render(
      <MemoryRouter>
        <Breadcrumbs label="Ruta" items={[{ label: 'Mis cursos', to: '/mis-cursos' }, { label: 'SRTM', to: '/mis-cursos/1' }, { label: 'Sesiones' }]} />
      </MemoryRouter>
    )
    const nav = screen.getByRole('navigation', { name: 'Ruta' })
    expect(within(nav).getByRole('link', { name: 'SRTM' })).toHaveAttribute('href', '/mis-cursos/1')
    expect(within(nav).queryByRole('link', { name: 'Sesiones' })).toBeNull()
    expect(within(nav).getByText('Sesiones')).toHaveAttribute('aria-current', 'page')
  })
})

describe('Section', () => {
  it('nombra la sección con su título', () => {
    render(<Section title="Próximas sesiones">lista</Section>)
    expect(screen.getByRole('region', { name: 'Próximas sesiones' })).toHaveTextContent('lista')
    expect(screen.getByRole('heading', { level: 2, name: 'Próximas sesiones' })).toBeVisible()
  })

  it('el nivel del título se puede bajar para no saltar la jerarquía', () => {
    render(
      <Section title="Dentro" level={3}>
        x
      </Section>
    )
    expect(screen.getByRole('heading', { level: 3, name: 'Dentro' })).toBeVisible()
  })
})

describe('Stat', () => {
  it('es una lista de definiciones: etiqueta y cifra van unidas', () => {
    render(
      <StatList>
        <Stat label="Matriculados" value={38} hint="en esta edición" />
      </StatList>
    )
    expect(screen.getByRole('term')).toHaveTextContent('Matriculados')
    expect(screen.getAllByRole('definition').map((node) => node.textContent)).toEqual(['38', 'en esta edición'])
  })
})

describe('Skeleton', () => {
  it('se pinta con el color del borde: el del fondo de la página no se vería sobre ella', () => {
    const { container } = render(<Skeleton />)
    expect(container.firstChild).toHaveClass('bg-border')
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true')
  })
})
