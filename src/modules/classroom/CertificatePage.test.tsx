import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { mockFetch, renderWithProviders, type FetchMock, type MockRoute } from '@wasichai/testing'
import { Route, Routes } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CertificatePage, VerifyPage } from './CertificatePage'
import { classroomModule } from './module'
import { certificate, problem } from './test/fixtures'

// la verificación pública de un certificado (ADR-0016): sin sesión, imprimible

const PUBLIC = '/lms/public/certificates/K7Q2-M9XW-4RTB'

let fetchMock: FetchMock
afterEach(() => {
  fetchMock?.restore()
  vi.restoreAllMocks()
})

function renderCertificate(routes: MockRoute[], route = '/certificados/K7Q2-M9XW-4RTB', language?: string) {
  fetchMock = mockFetch(routes)
  return renderWithProviders(
    <Routes>
      <Route path="/certificados" element={<VerifyPage />} />
      <Route path="/certificados/:code" element={<CertificatePage />} />
    </Routes>,
    { modules: [classroomModule()], route, user: null, permissions: null, language }
  )
}

describe('CertificatePage', () => {
  it('sin sesión, muestra el certificado verificado con todo lo certificado, y lo imprime', async () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {})
    renderCertificate([{ path: PUBLIC, body: certificate }])

    // titular y curso en la letra de lectura (PantallaCertificado)
    expect(await screen.findByRole('heading', { level: 1, name: 'Rosa Quispe Mamani' })).toHaveClass('font-read')
    // la banda de verificación: icono y palabra, qué significa, a quién, qué curso y el código; fuera del papel
    const band = screen.getByRole('status')
    expect(band).toHaveTextContent('Certificado válido')
    expect(band).toHaveTextContent('No comprueba la identidad de quien lo presenta.')
    expect(band.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    const facts = within(band.parentElement!)
    expect(facts.getByText('Rosa Quispe Mamani')).toBeInTheDocument()
    expect(facts.getByText('Introducción al SGSPE')).toBeInTheDocument()
    expect(facts.getByText('K7Q2-M9XW-4RTB')).toHaveClass('font-mono')
    expect(band.parentElement!.parentElement).toHaveClass('print:hidden')
    expect(screen.getByText('aprobó el curso «Introducción al SGSPE».')).toHaveClass('font-read')
    // el documento se fija al tema claro de Quipu, se vea la página como se vea, y tiene la proporción de un A4 apaisado
    const sheet = screen.getByRole('article', { name: 'Rosa Quispe Mamani' })
    expect(sheet).toHaveAttribute('data-theme', 'colofon')
    expect(sheet).toHaveStyle({ colorScheme: 'light' })
    expect(sheet).toHaveClass('bg-surface', 'sm:aspect-[297/210]')
    expect(screen.getByText('SGSPE-101 · versión 1')).toBeInTheDocument()
    expect(screen.getByText('7 sept – 16 oct 2026')).toBeInTheDocument()
    expect(screen.getByText('18 h')).toBeInTheDocument()
    expect(screen.getByText('Completar todas las lecciones: 3 de 3 lecciones')).toBeInTheDocument()
    expect(screen.getByText('Código K7Q2-M9XW-4RTB')).toBeInTheDocument()
    expect(document.title).toBe('Certificado de Rosa Quispe Mamani · Introducción al SGSPE')
    expect(fetchMock.calls[0]?.headers.authorization).toBeUndefined()

    await userEvent.click(screen.getByRole('button', { name: 'Imprimir' }))
    expect(print).toHaveBeenCalledTimes(1)
    // al imprimir solo queda el certificado
    expect(screen.getByRole('button', { name: 'Imprimir' }).parentElement).toHaveClass('print:hidden')
    // no hay descarga propia: el PDF sale del diálogo de impresión, y se dice así
    expect(screen.getByText('Para tenerlo en PDF, elige «Guardar como PDF» en el diálogo de impresión.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /descargar/i })).not.toBeInTheDocument()
  })

  it('un código desconocido (404) es la respuesta de la verificación, con el formulario para otro', async () => {
    renderCertificate([{ path: /^\/lms\/public\/certificates\//, status: 404, body: problem(404, 'No existe') }], '/certificados/MAL-CODIGO')

    expect(await screen.findByRole('heading', { level: 1, name: 'No encontramos un certificado con el código MAL-CODIGO' })).toBeInTheDocument()
    expect(screen.getByText('Revisa que esté completo y vuelve a intentarlo.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument()
    // volver a intentarlo, con lo escrito a mano para corregirlo
    expect(screen.getByRole('textbox', { name: 'Código del certificado' })).toHaveValue('MAL-CODIGO')
    expect(screen.getByRole('heading', { level: 2, name: 'Qué significa verificar' })).toBeInTheDocument()
    expect(screen.queryByText('Certificado válido')).not.toBeInTheDocument()
  })

  it('un certificado fuera de contrato o un error del servidor se explican y dejan reintentar', async () => {
    renderCertificate([{ path: PUBLIC, status: 503, body: problem(503, 'fallo') }])

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('No pudimos verificar el certificado')
    expect(alert).toHaveTextContent('Código del error: 503')
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })

  it('verificar un código lleva a su página, en mayúsculas y sin espacios', async () => {
    renderCertificate([{ path: PUBLIC, body: certificate }], '/certificados')

    expect(screen.getByRole('heading', { level: 1, name: 'Verificar un certificado' })).toBeInTheDocument()
    await userEvent.type(screen.getByRole('textbox', { name: 'Código del certificado' }), ' k7q2-m9xw-4rtb ')
    await userEvent.click(screen.getByRole('button', { name: 'Verificar' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Rosa Quispe Mamani' })).toBeInTheDocument()
  })

  it('en inglés', async () => {
    renderCertificate([{ path: PUBLIC, body: certificate }], undefined, 'en')

    expect(await screen.findByText('passed the course “Introducción al SGSPE”.')).toBeInTheDocument()
    expect(screen.getByText('Certificate of achievement')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Print' })).toBeInTheDocument()
  })
})
