import { screen } from '@testing-library/react'
import type { CallerPermissions, WasichaiModule } from '@wasichai/core'
import { TEST_USER, renderWithProviders } from '@wasichai/testing'
import { describe, expect, it } from 'vitest'
import { PublicLayout } from './PublicLayout'

// «Mis cursos» es del aula: src/shared no importa ningún módulo, así que basta su ruta y su etiqueta
const classroomStub: WasichaiModule = {
  id: 'classroom',
  routes: [{ id: 'enrollments', path: 'mis-cursos', chrome: 'shell', component: () => null }],
  i18n: { es: { nav: { myCourses: 'Mis cursos' } } }
}

// la entrada de la cabecera pública: con sesión vuelve al trabajo, y nunca a una pantalla que el servidor rechazaría (403)
function renderLayout(permissions: CallerPermissions | null) {
  return renderWithProviders(
    <PublicLayout>
      <p>contenido</p>
    </PublicLayout>,
    { modules: [classroomStub], user: permissions === null ? null : TEST_USER, permissions }
  )
}

describe('PublicLayout', () => {
  it('sin sesión ofrece iniciar sesión', () => {
    renderLayout(null)
    expect(screen.getByRole('link', { name: 'Iniciar sesión' })).toBeVisible()
  })

  it('con sesión y matrículas lleva a «Mis cursos»', () => {
    renderLayout({ admin: false, objects: { matricula: ['READ'] } })
    expect(screen.getByRole('link', { name: 'Mis cursos' })).toHaveAttribute('href', '/mis-cursos')
  })

  it('con sesión y sin permiso de matrículas lleva al inicio, no a «Mis cursos»', () => {
    renderLayout({ admin: false, objects: { curso: ['READ'] } })
    expect(screen.queryByRole('link', { name: 'Mis cursos' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Inicio' })).toHaveAttribute('href', '/')
  })
})
