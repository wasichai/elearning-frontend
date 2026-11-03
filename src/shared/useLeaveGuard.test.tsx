import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link, MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it } from 'vitest'
import { useLeaveGuard } from './useLeaveGuard'

function Page({ active }: { active: boolean }) {
  const guard = useLeaveGuard(active)
  return (
    <>
      <Link to="/otra">interno</Link>
      <a href="https://example.com/fuera" onClick={(event) => event.preventDefault()}>
        externo
      </a>
      <button onClick={() => guard.request('/otra')}>selector</button>
      {guard.leaving ? (
        <>
          <p>¿salir?</p>
          <button onClick={guard.stay}>quedarme</button>
          <button onClick={guard.leave}>salir</button>
        </>
      ) : null}
    </>
  )
}

function renderPage(active: boolean) {
  return render(
    <MemoryRouter initialEntries={['/trabajo']}>
      {/* un enlace fuera de la pantalla, como los del menú del shell */}
      <Link to="/menu">menú</Link>
      <Routes>
        <Route path="/trabajo" element={<Page active={active} />} />
        <Route path="/otra" element={<p>otra pantalla</p>} />
        <Route path="/menu" element={<p>pantalla del menú</p>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('useLeaveGuard', () => {
  it('sin nada a medias, los enlaces y las peticiones navegan sin preguntar', async () => {
    renderPage(false)
    await userEvent.click(screen.getByRole('button', { name: 'selector' }))
    expect(screen.getByText('otra pantalla')).toBeInTheDocument()
  })

  it('con algo a medias, un enlace pregunta; «quedarme» no se mueve y «salir» lleva a su destino', async () => {
    renderPage(true)
    await userEvent.click(screen.getByRole('link', { name: 'interno' }))
    expect(screen.getByText('¿salir?')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'quedarme' }))
    expect(screen.queryByText('¿salir?')).not.toBeInTheDocument()
    expect(screen.queryByText('otra pantalla')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('link', { name: 'interno' }))
    await userEvent.click(screen.getByRole('button', { name: 'salir' }))
    expect(screen.getByText('otra pantalla')).toBeInTheDocument()
  })

  it('también pregunta por un enlace de fuera de la pantalla, como el menú del shell', async () => {
    renderPage(true)
    await userEvent.click(screen.getByRole('link', { name: 'menú' }))
    expect(screen.getByText('¿salir?')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'salir' }))
    expect(screen.getByText('pantalla del menú')).toBeInTheDocument()
  })

  it('también pregunta lo que navega sin un enlace, como un selector', async () => {
    renderPage(true)
    await userEvent.click(screen.getByRole('button', { name: 'selector' }))
    expect(screen.getByText('¿salir?')).toBeInTheDocument()
  })

  it('un enlace externo o abierto en otra pestaña no pregunta', async () => {
    renderPage(true)
    await userEvent.click(screen.getByRole('link', { name: 'externo' }))
    expect(screen.queryByText('¿salir?')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('link', { name: 'interno' }), { ctrlKey: true })
    expect(screen.queryByText('¿salir?')).not.toBeInTheDocument()
  })

  it('al recargar o cerrar, solo avisa el navegador si hay algo a medias', () => {
    renderPage(true)
    const event = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
  })
})
