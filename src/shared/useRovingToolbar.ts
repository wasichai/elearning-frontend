import { useCallback, useEffect, useRef, type FocusEvent, type KeyboardEvent } from 'react'

// el patrón ARIA «toolbar» (https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/): un único tabstop para toda la barra y las flechas
// izquierda y derecha (más Inicio y Fin) para pasar de un botón a otro, con un roving tabindex. los botones son de @wasichai/ui y no
// reciben tabIndex por props, así que se ajusta en el DOM tras cada render: solo el botón actual queda con tabindex 0. los deshabilitados y
// los ocultos (display: none) no cuentan
const ITEMS = 'button, [role="button"], a[href]'

const available = (element: HTMLElement) =>
  !element.hasAttribute('disabled') && element.getAttribute('aria-disabled') !== 'true' && getComputedStyle(element).display !== 'none'

export function useRovingToolbar<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const current = useRef<HTMLElement | null>(null)
  const items = useCallback(() => [...(ref.current?.querySelectorAll<HTMLElement>(ITEMS) ?? [])].filter(available), [])
  const sync = useCallback(() => {
    const list = items()
    const chosen = current.current && list.includes(current.current) ? current.current : list[0]
    current.current = chosen ?? null
    for (const item of list) item.tabIndex = item === chosen ? 0 : -1
  }, [items])
  // tras cada render: un botón que se habilita, se deshabilita o aparece (el modo lectura) cambia quién puede tomar el tabstop
  useEffect(sync)
  const onFocus = useCallback(
    (event: FocusEvent<T>) => {
      if (items().includes(event.target as HTMLElement)) {
        current.current = event.target as HTMLElement
        sync()
      }
    },
    [items, sync]
  )
  const onKeyDown = useCallback(
    (event: KeyboardEvent<T>) => {
      const keys: Record<string, (at: number, count: number) => number> = {
        ArrowRight: (at, count) => (at + 1) % count,
        ArrowLeft: (at, count) => (at - 1 + count) % count,
        Home: () => 0,
        End: (_, count) => count - 1
      }
      const move = keys[event.key]
      const list = items()
      const at = list.indexOf(event.target as HTMLElement)
      if (!move || at < 0 || event.altKey || event.ctrlKey || event.metaKey) return
      event.preventDefault()
      const next = list[move(at, list.length)]
      if (next) {
        current.current = next
        sync()
        next.focus()
      }
    },
    [items, sync]
  )
  return { ref, onFocus, onKeyDown }
}
