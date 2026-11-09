import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { useRovingToolbar } from './useRovingToolbar'

function Bar({ secondDisabled = false }: { secondDisabled?: boolean }) {
  const toolbar = useRovingToolbar<HTMLDivElement>()
  return (
    <>
      <button>antes</button>
      <div role="toolbar" aria-label="Herramientas" {...toolbar}>
        <button>uno</button>
        <button disabled={secondDisabled}>dos</button>
        <button>tres</button>
      </div>
      <button>después</button>
    </>
  )
}

const tabindexes = () => screen.getAllByRole('button').map((button) => button.getAttribute('tabindex'))

describe('useRovingToolbar', () => {
  it('la barra es un solo tabstop: Tab entra por el primer botón y sale al siguiente control', async () => {
    render(<Bar />)
    expect(tabindexes()).toEqual([null, '0', '-1', '-1', null])

    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'antes' })).toHaveFocus()
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'uno' })).toHaveFocus()
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'después' })).toHaveFocus()
  })

  it('las flechas mueven el foco entre botones, dan la vuelta, y Inicio y Fin van a los extremos', async () => {
    render(<Bar />)
    await userEvent.tab()
    await userEvent.tab()
    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getByRole('button', { name: 'dos' })).toHaveFocus()
    // el tabstop viaja con el foco
    expect(tabindexes()).toEqual([null, '-1', '0', '-1', null])
    await userEvent.keyboard('{ArrowRight}{ArrowRight}')
    expect(screen.getByRole('button', { name: 'uno' })).toHaveFocus()
    await userEvent.keyboard('{ArrowLeft}')
    expect(screen.getByRole('button', { name: 'tres' })).toHaveFocus()
    await userEvent.keyboard('{Home}')
    expect(screen.getByRole('button', { name: 'uno' })).toHaveFocus()
    await userEvent.keyboard('{End}')
    expect(screen.getByRole('button', { name: 'tres' })).toHaveFocus()
  })

  it('al volver a la barra con Tab cae en el último botón usado', async () => {
    render(<Bar />)
    await userEvent.tab()
    await userEvent.tab()
    await userEvent.keyboard('{ArrowRight}')
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'después' })).toHaveFocus()
    await userEvent.tab({ shift: true })
    expect(screen.getByRole('button', { name: 'dos' })).toHaveFocus()
  })

  it('salta los botones deshabilitados', async () => {
    render(<Bar secondDisabled />)
    await userEvent.tab()
    await userEvent.tab()
    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getByRole('button', { name: 'tres' })).toHaveFocus()
  })
})
