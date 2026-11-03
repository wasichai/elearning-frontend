import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Dialog, DialogContent, DialogTitle } from '@wasichai/ui'
import { useEffect, useState } from 'react'
import { describe, expect, it } from 'vitest'
import { ReturnFocus } from './ReturnFocus'

function Page({ moveFocus = false }: { moveFocus?: boolean }) {
  const [open, setOpen] = useState(false)
  const [closed, setClosed] = useState(false)
  useEffect(() => {
    if (moveFocus && closed) document.getElementById('title')!.focus()
  }, [moveFocus, closed])
  return (
    <>
      <button onClick={() => setOpen(true)}>abrir</button>
      <h2 tabIndex={-1} id="title">
        título
      </h2>
      {open ? (
        <ReturnFocus>
          <Dialog
            open
            onOpenChange={(next) => {
              setOpen(next)
              setClosed(!next)
            }}
          >
            <DialogContent aria-describedby={undefined}>
              <DialogTitle>diálogo</DialogTitle>
            </DialogContent>
          </Dialog>
        </ReturnFocus>
      ) : null}
    </>
  )
}

describe('ReturnFocus', () => {
  it('al cerrar un diálogo sin trigger, el foco vuelve a quien lo abrió', async () => {
    render(<Page />)
    await userEvent.click(screen.getByRole('button', { name: 'abrir' }))
    await screen.findByRole('dialog')
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.getByRole('button', { name: 'abrir' })).toHaveFocus())
  })

  it('no le quita el foco a lo que ya lo recibió, como el título de lo que se abrió', async () => {
    render(<Page moveFocus />)
    await userEvent.click(screen.getByRole('button', { name: 'abrir' }))
    await screen.findByRole('dialog')
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(screen.getByRole('heading', { name: 'título' })).toHaveFocus()
  })
})
