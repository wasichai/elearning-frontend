import { useEffect, useRef, useState, type ReactNode } from 'react'

// un formulario en línea que sustituye al botón que lo abre: al cerrarse, el botón vuelve y el foco con él (si no, se pierde en la página)
export function useFocusOnClose<T extends HTMLElement>(open: boolean) {
  const opener = useRef<T>(null)
  const wasOpen = useRef(open)
  useEffect(() => {
    if (wasOpen.current && !open) opener.current?.focus()
    wasOpen.current = open
  }, [open])
  return opener
}

// ConfirmDialog, ReasonDialog y un Dialog sin DialogTrigger pierden el foco al cerrarse: Radix lo devuelve a su trigger y no tienen. esto
// lo devuelve a lo que estaba enfocado al abrirlos, salvo que ya no exista o que el foco haya ido a otro sitio (el título de lo que se abrió).
// se monta con el diálogo y va a la vez que él. mientras @wasichai/ui no lo resuelva
export function ReturnFocus({ children }: { children?: ReactNode }) {
  const [opener] = useState(() => document.activeElement)
  useEffect(
    () => () => {
      // tras retirar el diálogo: mientras está, su trampa de foco lo traería de vuelta
      setTimeout(() => {
        const lost = document.activeElement === document.body || document.activeElement === null
        if (lost && opener instanceof HTMLElement && opener.isConnected) opener.focus()
      })
    },
    [opener]
  )
  return children
}
